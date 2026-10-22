package com.cinelocal.android.data

import com.cinelocal.android.core.RateWindow
import com.cinelocal.android.core.SegEntry
import com.cinelocal.android.core.SegRequest
import com.cinelocal.android.core.SegStore
import com.cinelocal.android.core.Segment
import com.cinelocal.android.core.SkipSegments
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Tramos de intro, resumen y créditos desde TheIntroDB (https://api.theintrodb.org), con caché en skip.json.
 *
 * - Una petición por vídeo, al empezar a verlo (y la del siguiente episodio en segundo plano); al pedir una
 *   descarga también se guardan los suyos, para que lo descargado los tenga sin conexión.
 * - Lo encontrado vale 30 días y lo no encontrado (404) 7. Sin red se usa lo guardado aunque haya caducado.
 * - Peticiones anónimas: 25 cada 10 s y un límite diario. Se va con margen y, ante un 429, se espera lo que
 *   diga Retry-After sin preguntar más.
 * Las llamadas de red ([get], [refresh]) nunca desde el hilo principal.
 */
class IntroDb(
    dir: File,
    private val scope: CoroutineScope,
    private val version: () -> String,
    private val http: OkHttpClient = client
) {
    val store = JsonStore(File(dir, "skip.json"), SegStore.serializer(), SegStore(), scope)
    private val rate = RateWindow()
    private val lock = Any()

    /** Lo guardado (aunque haya caducado), sin red */
    fun cached(req: SegRequest): SegEntry? = store.value.entries[req.key]

    /**
     * Los tramos del vídeo: lo guardado si sigue valiendo; si no, pregunta a la API. Si no se puede
     * (sin red, límite alcanzado…), lo guardado aunque haya caducado, o nada.
     */
    fun get(req: SegRequest): List<Segment> {
        val now = System.currentTimeMillis()
        val c = cached(req)
        if (c != null && SkipSegments.fresh(c, now)) return c.segments
        return (fetch(req) ?: c)?.segments.orEmpty()
    }

    /** Guarda en segundo plano los tramos de [reqs] que falten o hayan caducado (siguiente episodio, descargas) */
    fun prefetch(reqs: List<SegRequest>) {
        val todo = reqs.distinctBy { it.key }.filter { r -> cached(r)?.let { !SkipSegments.fresh(it, System.currentTimeMillis()) } ?: true }
        if (todo.isEmpty()) return
        scope.launch(Dispatchers.IO) {
            for (r in todo) {
                if (cached(r)?.let { SkipSegments.fresh(it, System.currentTimeMillis()) } == true) continue
                if (fetch(r, maxWaitMs = 10_000) == null && rate.blockedUntil > System.currentTimeMillis()) break
            }
        }
    }

    /**
     * Pregunta a la API y guarda el resultado (también el "no lo tiene"). null si no hubo respuesta válida:
     * sin red, error del servidor o límite de peticiones (no se guarda nada, para volver a intentarlo).
     */
    private fun fetch(req: SegRequest, maxWaitMs: Long = 3_000): SegEntry? {
        synchronized(lock) {
            val wait = rate.waitMs(System.currentTimeMillis())
            if (wait > maxWaitMs) return null
            if (wait > 0) Thread.sleep(wait)
            rate.record(System.currentTimeMillis())
        }
        val url = API.toHttpUrl().newBuilder().apply {
            addQueryParameter("tmdb_id", req.tmdbId.toString())
            if (req.isEpisode) {
                addQueryParameter("season", req.season.toString())
                addQueryParameter("episode", req.episode.toString())
            }
        }.build()
        val request = Request.Builder().url(url)
            .header("Accept", "application/json")
            .header("User-Agent", "CineLocal-Android/${version()}")
            .build()
        val entry = try {
            http.newCall(request).execute().use { res ->
                val now = System.currentTimeMillis()
                when {
                    res.code == 429 -> {
                        synchronized(lock) { rate.backoff(now, SkipSegments.retryAfterMs(res.header("Retry-After"))) }
                        null
                    }
                    res.code == 404 -> SegEntry(now, found = false)
                    res.isSuccessful -> {
                        val segs = SkipSegments.parse(res.body?.string().orEmpty())
                        SegEntry(now, found = true, segments = segs)
                    }
                    else -> null   // 5xx…: se vuelve a intentar la próxima vez
                }
            }
        } catch (_: IOException) { null }
        if (entry != null) store.update { s -> SkipSegments.prune(SegStore(s.entries + (req.key to entry)), System.currentTimeMillis()) }
        return entry
    }

    companion object {
        const val API = "https://api.theintrodb.org/v4/media"

        /** Tiempos cortos: si la API tarda, el vídeo se ve igual, sin botón */
        private val client: OkHttpClient by lazy {
            Tmdb.defaultClient.newBuilder().connectTimeout(5, TimeUnit.SECONDS).readTimeout(8, TimeUnit.SECONDS).build()
        }
    }
}
