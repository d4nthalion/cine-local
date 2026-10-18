package com.cinelocal.android.core

import kotlinx.serialization.Serializable
import java.io.ByteArrayInputStream
import java.text.Normalizer
import java.util.Locale
import java.util.zip.ZipInputStream

// Letterboxd no tiene API pública: se lee el perfil público (películas vistas con nota, "me gusta",
// watchlist y RSS del diario) o se importa el ZIP que Letterboxd permite exportar.
// Traducción de src/main/letterboxd.js (la parte que no depende de la red).

/** Una película de tu perfil de Letterboxd */
@Serializable
data class LbFilm(
    val title: String,
    val year: Int? = null,
    val slug: String? = null,
    val rating: Double? = null,      // de 0.5 a 5
    val liked: Boolean = false,
    val watched: Boolean = false,
    val watchlist: Boolean = false,
    val date: String? = null,        // fecha del diario, "2026-10-14"
    val wlOrder: Int? = null         // posición en la watchlist
) {
    val url get() = slug?.let { "https://letterboxd.com/film/$it/" }
}

/** Película de TMDB que corresponde a una de Letterboxd. id == null: se buscó y no se encontró (miss = cuándo). */
@Serializable
data class LbMatch(val id: Int? = null, val poster: String? = null, val title: String? = null, val miss: Long? = null)

@Serializable
data class LbData(
    val films: Map<String, LbFilm> = emptyMap(),   // clave: keyOf(título, año)
    val ids: Map<String, LbMatch> = emptyMap(),    // se conserva aunque se borren los datos
    val user: String = "",
    val syncedAt: Long = 0,
    val fullAt: Long = 0,
    val source: String? = null                     // "profile" | "export"
)

/** Película de Letterboxd con su id de TMDB, lista para pintar */
data class LbEntry(val key: String, val film: LbFilm, val tmdbId: Int?, val poster: String?, val localTitle: String?)

/** Película leída de una página o del RSS, antes de juntarla con lo ya conocido */
data class LbParsed(
    val slug: String?,
    val title: String,
    val year: Int?,
    val rating: Double?,
    val liked: Boolean,
    val tmdbId: Int? = null,
    val date: String? = null
)

object Letterboxd {

    const val BASE = "https://letterboxd.com"

    fun norm(s: String?): String = Normalizer.normalize((s ?: "").lowercase(Locale.ROOT), Normalizer.Form.NFD)
        .replace(Regex("[\\u0300-\\u036f]"), "")
        .replace("&", " and ")
        .replace(Regex("[^a-z0-9 ]+"), " ")
        .replace(Regex("\\s+"), " ")
        .trim()

    fun keyOf(title: String?, year: Int?) = norm(title) + "|" + (year ?: "")

    /** Usuario a partir de lo que se escriba: "@usuario", "letterboxd.com/usuario/films/"… */
    fun cleanUser(input: String) = input.trim()
        .removePrefix("@")
        .replace(Regex("^https?://(www\\.)?letterboxd\\.com/", RegexOption.IGNORE_CASE), "")
        .replace(Regex("/.*$"), "")

    fun stars(r: Double?): String {
        if (r == null || r <= 0) return ""
        return "★".repeat(r.toInt()) + if (r % 1 != 0.0) "½" else ""
    }

    fun decodeHtml(s: String?): String = (s ?: "")
        .replace(Regex("&#(\\d+);")) { String(Character.toChars(it.groupValues[1].toInt())) }
        .replace(Regex("&#x([0-9a-fA-F]+);")) { String(Character.toChars(it.groupValues[1].toInt(16))) }
        .replace("&quot;", "\"").replace("&apos;", "'").replace("&#39;", "'")
        .replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ").replace("&amp;", "&")

    /** "Título (2024)" -> título y año */
    private fun splitName(name: String): Pair<String, Int?> {
        val d = decodeHtml(name)
        val m = Regex("^(.*\\S)\\s+\\((\\d{4})\\)$").find(d) ?: return d to null
        return m.groupValues[1] to m.groupValues[2].toInt()
    }

    /** Películas de una cuadrícula de pósteres (/films/, /watchlist/) */
    fun parseGrid(html: String): List<LbParsed> {
        val out = mutableListOf<LbParsed>()
        for (chunk in html.split(Regex("<li class=\"(?:griditem|poster-container)")).drop(1)) {
            val slug = Regex("data-(?:item|film)-slug=\"([^\"]+)\"").find(chunk)?.groupValues?.get(1) ?: continue
            val name = Regex("data-item-(?:full-display-)?name=\"([^\"]+)\"").find(chunk)?.groupValues?.get(1)
            val (title, year) = if (name != null) splitName(name)
                else decodeHtml(Regex("alt=\"([^\"]*)\"").find(chunk)?.groupValues?.get(1) ?: slug) to null
            val rated = Regex("\\brated-(\\d+)\\b").find(chunk)?.groupValues?.get(1)?.toInt()
            out += LbParsed(slug, title, year, rated?.let { it / 2.0 }, chunk.contains("icon-liked"))
        }
        return out
    }

    /** Número de páginas de una cuadrícula, según los enlaces de paginación */
    fun lastPage(html: String): Int =
        Regex("/page/(\\d+)/\"").findAll(html).maxOfOrNull { it.groupValues[1].toInt() }?.coerceAtLeast(1) ?: 1

    /** RSS del diario: trae el id de TMDB, la nota y la fecha de las últimas entradas */
    fun parseRss(xml: String): List<LbParsed> = xml.split("<item>").drop(1).mapNotNull { item ->
        fun tag(t: String) = Regex("<$t>([\\s\\S]*?)</$t>").find(item)?.groupValues?.get(1)?.trim()?.ifEmpty { null }
        val title = tag("letterboxd:filmTitle") ?: return@mapNotNull null   // listas y otras entradas
        LbParsed(
            slug = tag("link")?.let { Regex("/film/([^/]+)/").find(it)?.groupValues?.get(1) },
            title = decodeHtml(title),
            year = tag("letterboxd:filmYear")?.toIntOrNull(),
            rating = tag("letterboxd:memberRating")?.toDoubleOrNull(),
            liked = tag("letterboxd:memberLike") == "Yes",
            tmdbId = tag("tmdb:movieId")?.toIntOrNull(),
            date = tag("letterboxd:watchedDate")
        )
    }

    /** CSV con comillas, como los que exporta Letterboxd. Devuelve una fila por línea, por nombre de columna. */
    fun parseCsv(input: String): List<Map<String, String>> {
        val text = input.removePrefix("﻿")
        val rows = mutableListOf<List<String>>()
        var row = mutableListOf<String>()
        val cur = StringBuilder()
        var q = false
        var i = 0
        while (i < text.length) {
            val c = text[i]
            if (q) {
                if (c == '"') { if (i + 1 < text.length && text[i + 1] == '"') { cur.append('"'); i++ } else q = false }
                else cur.append(c)
            } else when (c) {
                '"' -> q = true
                ',' -> { row += cur.toString(); cur.clear() }
                '\n', '\r' -> {
                    if (c == '\r' && i + 1 < text.length && text[i + 1] == '\n') i++
                    row += cur.toString(); cur.clear()
                    if (row.size > 1 || row[0].isNotEmpty()) rows += row
                    row = mutableListOf()
                }
                else -> cur.append(c)
            }
            i++
        }
        if (cur.isNotEmpty() || row.isNotEmpty()) { row += cur.toString(); rows += row }
        if (rows.isEmpty()) return emptyList()
        val head = rows[0].map { it.trim() }
        return rows.drop(1).map { r -> head.mapIndexed { j, h -> h to (r.getOrNull(j) ?: "") }.toMap() }
    }

    /** Archivos de un ZIP (nombre -> contenido) */
    fun readZip(bytes: ByteArray): Map<String, ByteArray> {
        val files = mutableMapOf<String, ByteArray>()
        try {
            ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
                while (true) {
                    val e = zip.nextEntry ?: break
                    if (!e.isDirectory) files[e.name] = zip.readBytes()
                }
            }
        } catch (e: Exception) {
            throw IllegalArgumentException("El archivo no es un ZIP válido")
        }
        if (files.isEmpty()) throw IllegalArgumentException("El archivo no es un ZIP válido")
        return files
    }

    /** Convierte el ZIP exportado de Letterboxd en la misma lista de películas que la lectura del perfil */
    fun parseExport(bytes: ByteArray): Map<String, LbFilm> {
        val files = readZip(bytes)
        if (files.keys.none { Regex("(^|/)(watched|ratings|watchlist)\\.csv$").containsMatchIn(it) }) {
            throw IllegalArgumentException("Ese ZIP no parece una exportación de Letterboxd (faltan watched.csv / ratings.csv / watchlist.csv)")
        }
        fun find(re: String): List<Map<String, String>> =
            files.entries.firstOrNull { Regex(re).containsMatchIn(it.key) }?.let { parseCsv(it.value.toString(Charsets.UTF_8)) }.orEmpty()

        val films = linkedMapOf<String, LbFilm>()
        fun edit(r: Map<String, String>, fn: (LbFilm) -> LbFilm) {
            val name = r["Name"].orEmpty()
            val year = r["Year"]?.toIntOrNull()
            val k = keyOf(name, year)
            films[k] = fn(films[k] ?: LbFilm(title = name, year = year))
        }
        for (r in find("(^|/)watched\\.csv$")) edit(r) { it.copy(watched = true) }
        for (r in find("(^|/)diary\\.csv$")) edit(r) {
            val d = r["Watched Date"]?.ifEmpty { null } ?: r["Date"]?.ifEmpty { null }
            it.copy(watched = true, date = if (d != null && (it.date == null || d > it.date)) d else it.date)
        }
        for (r in find("(^|/)ratings\\.csv$")) edit(r) { it.copy(watched = true, rating = r["Rating"]?.toDoubleOrNull()?.takeIf { x -> x > 0 }) }
        for (r in find("(^|/)likes/films\\.csv$")) edit(r) { it.copy(liked = true) }
        find("(^|/)watchlist\\.csv$").forEachIndexed { i, r -> edit(r) { it.copy(watchlist = true, wlOrder = i) } }
        return films
    }

    /** id de TMDB de la ficha de una película en Letterboxd (null si no lo tiene o es una serie) */
    fun tmdbIdFromFilmPage(html: String): Int? {
        val id = Regex("data-tmdb-id=\"(\\d+)\"").find(html)?.groupValues?.get(1)?.toIntOrNull() ?: return null
        val type = Regex("data-tmdb-type=\"(\\w+)\"").find(html)?.groupValues?.get(1)
        return if (type == "tv") null else id
    }
}
