package com.cinelocal.android.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.longOrNull

// "Saltar intro / resumen / créditos" con los datos de TheIntroDB (api.theintrodb.org).
// Aquí solo hay lógica pura (sin Android) para poder probarla: lectura y limpieza de la respuesta,
// qué tramo está activo en cada momento, qué botón se muestra y cuándo caduca lo guardado.

/** Tipo de tramo: los cuatro arrays de la respuesta de TheIntroDB */
@Serializable
enum class SegKind { INTRO, RECAP, CREDITS, PREVIEW }

/**
 * Un tramo del vídeo, en milisegundos. [endMs] null: hasta el final (créditos que acaban con el archivo).
 * El inicio null de la API ya se guarda como 0.
 */
@Serializable
data class Segment(val kind: SegKind, val startMs: Long, val endMs: Long? = null)

/** Lo guardado de un vídeo: [found] false si TheIntroDB no lo tiene (404), para no volver a preguntar en unos días */
@Serializable
data class SegEntry(val at: Long, val found: Boolean, val segments: List<Segment> = emptyList())

/** skip.json: por clave de [SegRequest] */
@Serializable
data class SegStore(val entries: Map<String, SegEntry> = emptyMap())

/** Qué se pregunta a TheIntroDB: una película (solo el id de TMDB) o un episodio de una serie */
data class SegRequest(val tmdbId: Int, val season: Int? = null, val episode: Int? = null) {
    val isEpisode get() = season != null && episode != null
    val key get() = if (isEpisode) "tv:$tmdbId:$season:$episode" else "movie:$tmdbId"
}

/** El botón que se muestra: [seekTo] para saltar dentro del vídeo, o [next] para pasar al siguiente episodio */
data class SkipAction(val kind: SegKind, val label: String, val seekTo: Long? = null, val next: Boolean = false, val segment: Segment)

/**
 * Límite de peticiones a TheIntroDB (sin clave: 25 cada 10 s; aquí 20, con margen) y la espera tras un 429.
 * No es seguro entre hilos: quien lo use lo protege.
 */
class RateWindow(private val max: Int = 20, private val windowMs: Long = 10_000) {
    private val times = ArrayDeque<Long>()
    /** Hasta cuándo no se pregunta (Retry-After de un 429) */
    var blockedUntil = 0L
        private set

    /** Milisegundos que hay que esperar para poder hacer otra petición ahora (0: ya) */
    fun waitMs(now: Long): Long {
        while (times.isNotEmpty() && now - times.first() >= windowMs) times.removeFirst()
        if (now < blockedUntil) return blockedUntil - now
        return if (times.size < max) 0 else times.first() + windowMs - now
    }

    fun record(now: Long) { times.addLast(now) }

    fun backoff(now: Long, retryAfterMs: Long) { blockedUntil = maxOf(blockedUntil, now + retryAfterMs) }
}

object SkipSegments {

    const val DAY = 24L * 3600 * 1000
    /** Lo encontrado se vuelve a preguntar a los 30 días (por si se corrige); lo no encontrado, a los 7 */
    const val FOUND_TTL = 30 * DAY
    const val MISSING_TTL = 7 * DAY
    /** Al saltar se cae medio segundo después del final del tramo, para no ver el último fotograma */
    const val SKIP_PAD_MS = 500L
    /** El botón se quita en el último segundo del tramo (ya no merece la pena) */
    const val TAIL_MS = 1000L

    private val json = Json { ignoreUnknownKeys = true }

    /**
     * Lee la respuesta de `GET /v4/media`: arrays `intro`, `recap`, `credits` y `preview` de `{start_ms, end_ms}`.
     * - start null ⇒ 0; end null ⇒ hasta el final.
     * - Se descarta lo que no tiene sentido: {0,0} ("no tiene"), final antes del inicio, negativos,
     *   y un final null fuera de créditos y avances (una intro "hasta el final" no es una intro).
     * Devuelve los tramos ordenados por inicio. Un JSON roto da lista vacía.
     */
    fun parse(body: String): List<Segment> {
        val root = runCatching { json.parseToJsonElement(body) as? JsonObject }.getOrNull() ?: return emptyList()
        val out = mutableListOf<Segment>()
        for (kind in SegKind.entries) {
            val arr = root[kind.name.lowercase()] as? JsonArray ?: continue
            for (el in arr) {
                val o = el as? JsonObject ?: continue
                val start = (o["start_ms"] as? JsonPrimitive)?.longOrNull ?: 0L
                val end = (o["end_ms"] as? JsonPrimitive)?.longOrNull
                normalize(kind, start, end)?.let(out::add)
            }
        }
        return out.sortedBy { it.startMs }
    }

    /** Un tramo válido o null */
    fun normalize(kind: SegKind, start: Long, end: Long?): Segment? {
        val s = start.coerceAtLeast(0)
        if (end == null) return if (kind == SegKind.CREDITS || kind == SegKind.PREVIEW) Segment(kind, s, null) else null
        if (end <= s) return null   // {0,0} y rangos al revés
        return Segment(kind, s, end)
    }

    /** ¿Sigue valiendo lo guardado? */
    fun fresh(e: SegEntry, now: Long): Boolean {
        val age = now - e.at
        return age >= 0 && age < if (e.found) FOUND_TTL else MISSING_TTL
    }

    /** Quita lo caducado hace mucho (lo caducado reciente se conserva para usarlo sin conexión) */
    fun prune(store: SegStore, now: Long, keepStale: Long = 90 * DAY): SegStore =
        SegStore(store.entries.filterValues { now - it.at < keepStale })

    /**
     * Los tramos que valen para este archivo. Un archivo con dos episodios (S01E01-E02) solo usa los del
     * principio (intro y resumen), porque los créditos que da la API son los del primer episodio.
     * Los que empiezan después del final del archivo (otra versión, otro montaje) se ignoran.
     */
    fun forFile(segments: List<Segment>, multiEpisode: Boolean, lengthMs: Long): List<Segment> =
        segments.filter { s ->
            (!multiEpisode || s.kind == SegKind.INTRO || s.kind == SegKind.RECAP) &&
                (lengthMs <= 0 || s.startMs < lengthMs)
        }

    /** Final efectivo de un tramo: el del archivo si no tiene, y nunca más allá del archivo */
    fun endOf(s: Segment, lengthMs: Long): Long? = when {
        s.endMs == null -> lengthMs.takeIf { it > 0 }
        lengthMs > 0 -> minOf(s.endMs, lengthMs)
        else -> s.endMs
    }

    /** El tramo en el que está [timeMs] (sin el último segundo), o null */
    fun active(segments: List<Segment>, timeMs: Long, lengthMs: Long): Segment? =
        segments.firstOrNull { s ->
            val end = endOf(s, lengthMs) ?: Long.MAX_VALUE
            timeMs >= s.startMs && timeMs < end - TAIL_MS
        }

    /** A dónde se salta: medio segundo después del final, sin pasar del último segundo del archivo */
    fun skipTarget(s: Segment, lengthMs: Long): Long? {
        val end = s.endMs ?: return null
        val t = end + SKIP_PAD_MS
        return if (lengthMs > 0) minOf(t, lengthMs - 1000).coerceAtLeast(0) else t
    }

    /**
     * El botón para el momento [timeMs]:
     * - intro: «Saltar intro»; resumen: «Saltar resumen» (saltan al final del tramo).
     * - créditos y avance del siguiente: con siguiente episodio, «Siguiente episodio».
     *   Sin siguiente (película, último episodio o sin reproducción automática): «Saltar créditos» solo si
     *   después queda algo del archivo (una escena tras los créditos); si los créditos acaban con el archivo,
     *   no hay botón: cerrar el reproductor de golpe sorprende más que ayuda y salir ya está a un toque.
     * [hasNext] solo se consulta en los créditos (mira lo descargado en el disco).
     */
    fun action(segments: List<Segment>, timeMs: Long, lengthMs: Long, hasNext: () -> Boolean): SkipAction? {
        val s = active(segments, timeMs, lengthMs) ?: return null
        return when (s.kind) {
            SegKind.INTRO -> skipTarget(s, lengthMs)?.let { SkipAction(s.kind, "Saltar intro", seekTo = it, segment = s) }
            SegKind.RECAP -> skipTarget(s, lengthMs)?.let { SkipAction(s.kind, "Saltar resumen", seekTo = it, segment = s) }
            SegKind.CREDITS, SegKind.PREVIEW -> when {
                hasNext() -> SkipAction(s.kind, "Siguiente episodio", next = true, segment = s)
                else -> {
                    val end = s.endMs
                    // tiene que quedar contenido de verdad después (más de 5 s), no el negro final
                    if (end != null && (lengthMs <= 0 || lengthMs - end > 5000))
                        skipTarget(s, lengthMs)?.let { SkipAction(s.kind, if (s.kind == SegKind.CREDITS) "Saltar créditos" else "Saltar avance", seekTo = it, segment = s) }
                    else null
                }
            }
        }
    }

    /**
     * Cuánto esperar según la cabecera Retry-After de un 429 (segundos; si viene como fecha u otra cosa, 60 s).
     * Como mucho un día (el límite diario de la API).
     */
    fun retryAfterMs(header: String?): Long {
        val secs = header?.trim()?.toLongOrNull() ?: 60L
        return secs.coerceIn(1L, 24L * 3600) * 1000
    }

}
