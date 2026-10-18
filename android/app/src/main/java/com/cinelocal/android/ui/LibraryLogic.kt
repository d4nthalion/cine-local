package com.cinelocal.android.ui

import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.EpisodeMeta
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.NameParser
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title

// Misma lógica que las funciones equivalentes de src/renderer/app.js

enum class SeriesMode { START, RESUME, NEXT, DONE }
data class SeriesState(val ep: Episode, val mode: SeriesMode, val at: Long, val p: Progress? = null)

/** Para una serie: episodio a reproducir y estado */
fun seriesState(t: Title, progress: Map<String, Progress>): SeriesState {
    val eps = t.item.episodes
    var last: Episode? = null
    var lastAt = 0L
    for (e in eps) {
        val p = progress[e.path]
        if (p != null && p.at > lastAt) { lastAt = p.at; last = e }
    }
    if (last == null) return SeriesState(eps.first(), SeriesMode.START, 0)
    val p = progress.getValue(last.path)
    if (!p.watched && p.pos > 0) return SeriesState(last, SeriesMode.RESUME, lastAt, p)
    val idx = eps.indexOf(last)
    val next = eps.drop(idx + 1).firstOrNull { progress[it.path]?.watched != true }
    if (next != null) return SeriesState(next, SeriesMode.NEXT, lastAt)
    return SeriesState(eps.first(), SeriesMode.DONE, lastAt)
}

data class ContinueEntry(val title: Title, val at: Long, val p: Progress?, val ep: Episode?)

fun continueList(titles: List<Title>, progress: Map<String, Progress>): List<ContinueEntry> {
    val out = mutableListOf<ContinueEntry>()
    for (t in titles) {
        if (t.isMovie) {
            val p = progress[t.item.path]
            if (p != null && !p.watched && p.pos > 30) out += ContinueEntry(t, p.at, p, null)
        } else if (t.item.episodes.isNotEmpty()) {
            val st = seriesState(t, progress)
            if (st.mode == SeriesMode.RESUME || st.mode == SeriesMode.NEXT) out += ContinueEntry(t, st.at, st.p, st.ep)
        }
    }
    return out.sortedByDescending { it.at }
}

enum class Sort(val label: String) { ADDED("Añadido recientemente"), TITLE("Título"), YEAR("Año"), RATING("Valoración"), MINE("Mi nota (Letterboxd)") }

fun sortTitles(list: List<Title>, sort: Sort, lb: Map<Int, LbEntry> = emptyMap()): List<Title> = when (sort) {
    Sort.TITLE -> list.sortedWith(compareBy(NameParser.naturalOrder) { it.name })
    Sort.YEAR -> list.sortedByDescending { it.year ?: 0 }
    Sort.RATING -> list.sortedByDescending { it.meta?.rating ?: 0.0 }
    Sort.ADDED -> list.sortedByDescending { it.item.added }
    // tu nota primero; sin nota, las que te gustaron; después el resto por valoración de TMDB
    Sort.MINE -> list.sortedWith(
        compareByDescending<Title> { lbOf(it, lb)?.film?.rating ?: 0.0 }
            .thenByDescending { lbOf(it, lb)?.film?.liked == true }
            .thenByDescending { it.meta?.rating ?: 0.0 }
    )
}

/** Datos de Letterboxd de una película de la biblioteca */
fun lbOf(t: Title, lb: Map<Int, LbEntry>): LbEntry? = if (t.isMovie) t.meta?.tmdbId?.let { lb[it] } else null

/** Watchlist de Letterboxd en su orden, con la película de la biblioteca si ya la tienes */
fun watchlistEntries(entries: List<LbEntry>, titles: List<Title>): List<Pair<LbEntry, Title?>> {
    val owned = titles.filter { it.isMovie && it.meta?.tmdbId != null }.associateBy { it.meta!!.tmdbId }
    return entries.filter { it.film.watchlist }.sortedBy { it.film.wlOrder ?: Int.MAX_VALUE }
        .map { it to it.tmdbId?.let { id -> owned[id] } }
}

private val MONTHS = listOf("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")

/** "2024-01-28" -> "28 de enero de 2024" */
fun fmtDate(iso: String): String {
    val p = iso.take(10).split('-').mapNotNull { it.toIntOrNull() }
    return if (p.size == 3 && p[1] in 1..12) "${p[2]} de ${MONTHS[p[1] - 1]} de ${p[0]}" else iso
}

private val MONTHS_SHORT = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")

/** "2024-01-28" -> "28 ene 2024" */
fun fmtDateShort(iso: String): String {
    val p = iso.take(10).split('-').mapNotNull { it.toIntOrNull() }
    return if (p.size == 3 && p[1] in 1..12) "${p[2]} ${MONTHS_SHORT[p[1] - 1]} ${p[0]}" else iso
}

fun allGenres(list: List<Title>): List<Pair<String, Int>> =
    list.flatMap { it.meta?.genres.orEmpty() }.groupingBy { it }.eachCount().toList().sortedByDescending { it.second }

fun isWatched(t: Title, progress: Map<String, Progress>): Boolean =
    if (t.isMovie) progress[t.item.path]?.watched == true
    else t.item.episodes.isNotEmpty() && t.item.episodes.all { progress[it.path]?.watched == true }

fun epMeta(t: Title, e: Episode): EpisodeMeta? = t.meta?.seasons?.get(e.season)?.episodes?.get(e.episode)

fun fraction(p: Progress?): Float = if (p == null || p.dur <= 0) 0f else (p.pos / p.dur).toFloat().coerceIn(0f, 1f)

fun fmtRuntime(min: Int?): String {
    if (min == null || min <= 0) return ""
    val h = min / 60
    val m = min % 60
    return if (h > 0) (if (m > 0) "$h h $m min" else "$h h") else "$m min"
}

fun fmtLeft(sec: Double): String {
    val m = Math.round(sec / 60).toInt()
    return if (m >= 60) "Quedan ${m / 60} h ${m % 60} min" else "Quedan ${maxOf(1, m)} min"
}

fun fmtClock(ms: Long): String {
    val s = (ms / 1000).coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%d:%02d".format(m, sec)
}

/** "2019 · 2 h 12 min · 16 · ★ 7.8" */
fun metaLine(t: Title): String {
    val m = t.meta
    val parts = mutableListOf<String>()
    t.year?.let { y -> parts += if (m?.endYear != null && m.endYear != y) "$y–${m.endYear}" else "$y" }
    if (t.isMovie) fmtRuntime(m?.runtime).takeIf { it.isNotEmpty() }?.let { parts += it }
    else {
        val n = t.item.seasons.size
        parts += if (n == 1) "1 temporada" else "$n temporadas"
    }
    m?.certification?.let { parts += it }
    m?.rating?.let { parts += "★ $it" }
    return parts.joinToString("  ·  ")
}
