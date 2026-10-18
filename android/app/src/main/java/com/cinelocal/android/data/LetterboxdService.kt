package com.cinelocal.android.data

import android.content.Context
import com.cinelocal.android.core.LbData
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.LbFilm
import com.cinelocal.android.core.LbMatch
import com.cinelocal.android.core.LbParsed
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Letterboxd.keyOf
import com.cinelocal.android.core.Letterboxd.norm
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs

data class LbStatus(val running: Boolean = false, val text: String = "", val error: String? = null)

/**
 * Sincronización con Letterboxd (traducción de LetterboxdService en src/main/letterboxd.js).
 * Guarda en letterboxd.json las películas del perfil y su id de TMDB.
 */
class LetterboxdService(
    context: Context,
    dir: File,
    private val scope: CoroutineScope,
    private val tmdb: () -> Tmdb,
    private val libraryIndex: () -> Map<String, Int>,   // keyOf(título, año) -> id de TMDB de tu biblioteca
    private val onUpdated: () -> Unit
) {
    val store = JsonStore(File(dir, "letterboxd.json"), LbData.serializer(), LbData(), scope)
    private val fetcher = LetterboxdFetcher(context).apply { onWait = { setStatus(text = "Letterboxd pide ir más despacio · reintentando en $it s…") } }

    private val _status = MutableStateFlow(LbStatus())
    val status: StateFlow<LbStatus> = _status.asStateFlow()

    private var job: Job? = null
    val busy get() = job?.isActive == true

    /** Comprobación de Cloudflare que hay que enseñar (ver LetterboxdFetcher.challenge) */
    val challenge get() = fetcher.challenge.asStateFlow()

    /** Cancela la sincronización en curso */
    fun cancel() {
        job?.cancel()
        _status.value = LbStatus(error = "Sincronización cancelada")
    }

    private fun setStatus(running: Boolean = _status.value.running, text: String = _status.value.text, error: String? = _status.value.error) =
        _status.update { LbStatus(running, text, error) }

    /** Películas con su id de TMDB */
    fun entries(d: LbData = store.value): List<LbEntry> = d.films.map { (k, f) ->
        val m = d.ids[k]
        LbEntry(k, f, m?.id, m?.poster, m?.title)
    }

    /** Borra los datos del perfil (se conservan los ids de TMDB ya encontrados) */
    fun reset() {
        job?.cancel()
        store.set(LbData(ids = store.value.ids))
        _status.value = LbStatus()
        onUpdated()
    }

    /** Sincroniza con el perfil: completa (todas las páginas) o rápida (sólo el RSS de las últimas entradas) */
    fun sync(rawUser: String, full: Boolean) {
        if (busy) return
        val user = Letterboxd.cleanUser(rawUser)
        job = scope.launch {
            try { runSync(user, full) }
            catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (e: Exception) { setStatus(running = false, text = "", error = e.message ?: e.javaClass.simpleName) }
            finally { withContext(kotlinx.coroutines.NonCancellable) { fetcher.close() } }
        }
    }

    private suspend fun runSync(user: String, full: Boolean) {
        if (user.isEmpty()) throw IllegalArgumentException("Indica tu usuario de Letterboxd")
        setStatus(running = true, error = null, text = "Conectando con Letterboxd…")
        val prev = if (store.value.user == user) store.value.films else emptyMap()
        val notFound = "No existe el usuario «$user» en Letterboxd (o su perfil es privado)"

        var rss: List<LbParsed> = emptyList()
        try { rss = Letterboxd.parseRss(fetcher.get("/$user/rss/")) }
        catch (e: LbHttpException) { if (e.code == 404) throw IllegalStateException(notFound); if (!full) throw e }

        val films = LinkedHashMap<String, LbFilm>()
        if (full) {
            fun add(f: LbParsed, patch: (LbFilm) -> LbFilm) {
                val k = keyOf(f.title, f.year)
                val cur = films[k] ?: LbFilm(title = f.title, year = f.year, slug = f.slug, date = prev[k]?.date)
                films[k] = patch(cur)
            }
            suspend fun pages(base: String, label: String, each: (LbParsed, Int) -> Unit): Int {
                var html = try { fetcher.get("/$user/$base/") } catch (e: LbHttpException) { if (e.code == 404) return 0; throw e }
                val total = Letterboxd.lastPage(html)
                var n = 0
                for (p in 1..total) {
                    if (p > 1) html = fetcher.get("/$user/$base/page/$p/")
                    setStatus(text = "$label · página $p de $total")
                    for (f in Letterboxd.parseGrid(html)) each(f, n++)
                }
                return n
            }
            val seen = pages("films", "Leyendo tus películas vistas") { f, _ -> add(f) { it.copy(watched = true, rating = f.rating, liked = f.liked) } }
            if (seen == 0 && rss.isEmpty()) throw IllegalStateException(notFound)
            pages("watchlist", "Leyendo tu watchlist") { f, i -> add(f) { it.copy(watchlist = true, wlOrder = i) } }
        } else {
            films.putAll(prev)
        }

        // el RSS aporta fechas e ids de TMDB exactos (y, en la sincronización rápida, lo último que has visto)
        val ids = HashMap(store.value.ids)
        for (r in rss) {
            val k = keyOf(r.title, r.year)
            val cur = films[k] ?: LbFilm(title = r.title, year = r.year, slug = r.slug, watched = true)
            val newer = cur.date == null || (r.date != null && r.date >= cur.date)
            films[k] = cur.copy(
                watched = true,
                watchlist = if (full) cur.watchlist else false,
                slug = cur.slug ?: r.slug,
                rating = if (full) cur.rating ?: r.rating else if (newer && r.rating != null) r.rating else cur.rating,
                liked = cur.liked || r.liked,
                date = if (r.date != null && (cur.date == null || r.date > cur.date)) r.date else cur.date
            )
            if (r.tmdbId != null && ids[k]?.id != r.tmdbId) ids[k] = LbMatch(r.tmdbId)
        }

        val resolved = resolve(films, ids)
        val now = System.currentTimeMillis()
        store.update { it.copy(user = user, films = films, ids = resolved, syncedAt = now, source = "profile", fullAt = if (full) now else it.fullAt) }
        store.flush()
        setStatus(running = false, text = "", error = null)
        onUpdated()
    }

    /** Importa el ZIP de Letterboxd → Settings → Data → Export your data */
    fun importExport(bytes: ByteArray, user: String) {
        if (busy) return
        job = scope.launch {
            setStatus(running = true, error = null, text = "Leyendo la exportación…")
            try {
                val films = Letterboxd.parseExport(bytes)
                val ids = resolve(films, HashMap(store.value.ids))
                val now = System.currentTimeMillis()
                // cuenta como sincronización completa: la próxima automática sólo añadirá lo último del RSS
                store.update { it.copy(user = Letterboxd.cleanUser(user), films = films, ids = ids, syncedAt = now, fullAt = now, source = "export") }
                store.flush()
                setStatus(running = false, text = "", error = null)
                onUpdated()
            } catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (e: Exception) { setStatus(running = false, text = "", error = e.message ?: "No se pudo leer el ZIP") }
            finally { withContext(kotlinx.coroutines.NonCancellable) { fetcher.close() } }
        }
    }

    /** Asigna a cada película su id de TMDB: biblioteca local, luego búsqueda en TMDB y, como último recurso, la ficha de Letterboxd */
    private suspend fun resolve(films: Map<String, LbFilm>, start: Map<String, LbMatch>): Map<String, LbMatch> {
        val ids = ConcurrentHashMap(start)
        val local = libraryIndex()
        val week = 7L * 24 * 3600 * 1000
        val now = System.currentTimeMillis()
        val pending = mutableListOf<Pair<String, LbFilm>>()
        for ((k, f) in films) {
            val m = ids[k]
            if (m?.id != null && m.poster != null) continue
            val lid = local[k] ?: f.year?.let { y -> local[keyOf(f.title, y - 1)] ?: local[keyOf(f.title, y + 1)] }
            if (lid != null && ids[k]?.id == null) ids[k] = LbMatch(lid)
            val cur = ids[k]
            if (cur?.id == null && cur?.miss != null && now - cur.miss < week) continue   // sin coincidencia hace poco: no repetir
            if (cur?.id != null && !f.watchlist) continue   // el póster sólo hace falta para la watchlist
            pending += k to f
        }

        val api = tmdb()
        val misses = ConcurrentHashMap.newKeySet<String>()
        val done = java.util.concurrent.atomic.AtomicInteger()
        val queue = ArrayDeque(pending)
        val lock = Mutex()
        suspend fun work(k: String, f: LbFilm) {
            try {
                val known = ids[k]?.id
                if (known != null) {   // ya sabemos el id: sólo falta el póster para la watchlist
                    if (f.watchlist && api.enabled && ids[k]?.poster == null) {
                        api.movieBasic(known)?.let { ids[k] = LbMatch(known, it.poster, it.title) }
                    }
                    return
                }
                if (!api.enabled) return
                val results = try { api.search("movie", f.title, f.year) } catch (_: Exception) { emptyList() }
                val t = norm(f.title)
                fun near(y: Int?) = f.year == null || y == null || abs(y - f.year) <= 1
                val hit = results.firstOrNull { (norm(it.title) == t || norm(it.originalTitle) == t) && near(it.year) }
                    ?: f.year?.let { y -> results.firstOrNull { it.year == y } }
                if (hit != null) ids[k] = LbMatch(hit.id, hit.poster, hit.title) else misses += k
            } finally {
                val n = done.incrementAndGet()
                if (n % 10 == 0 || n == pending.size) setStatus(text = "Emparejando con TMDB · $n de ${pending.size}")
            }
        }
        withContext(Dispatchers.IO) {
            coroutineScope {
                (1..4).map {
                    async {
                        while (true) {
                            val next = lock.withLock { queue.removeFirstOrNull() } ?: break
                            work(next.first, next.second)
                        }
                    }
                }.awaitAll()
            }
        }

        // sin coincidencia clara: la ficha de Letterboxd lleva el id de TMDB (pocas, para no cargar su web)
        for (k in misses.filter { films[it]?.slug != null }.take(40)) {
            val f = films.getValue(k)
            setStatus(text = "Comprobando «${f.title}» en Letterboxd…")
            try {
                val id = Letterboxd.tmdbIdFromFilmPage(fetcher.get("/film/${f.slug}/")) ?: continue
                val m = if (api.enabled) withContext(Dispatchers.IO) { api.movieBasic(id) } else null
                ids[k] = LbMatch(id, m?.poster, m?.title)
            } catch (_: Exception) { /* se queda sin emparejar */ }
        }
        if (api.enabled) for (k in misses) if (ids[k]?.id == null) ids[k] = LbMatch(miss = System.currentTimeMillis())
        return HashMap(ids)
    }
}
