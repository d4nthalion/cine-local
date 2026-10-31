package com.cinelocal.android.data

import com.cinelocal.android.core.CastMember
import com.cinelocal.android.core.EpisodeMeta
import com.cinelocal.android.core.Meta
import com.cinelocal.android.core.SeasonMeta
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.text.Normalizer
import java.util.Locale
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Metadatos desde TMDB. Traducción de src/main/metadata.js (API key v3 o token de lectura v4). */
class Tmdb(key: String, private val language: String = "es-ES", region: String? = null, private val http: OkHttpClient = defaultClient) {

    private val key = key.trim()
    private val region = (region ?: language.substringAfter('-', "ES")).uppercase(Locale.ROOT)
    private val lang = language.substringBefore('-')

    val enabled get() = key.isNotEmpty()

    data class SearchResult(val id: Int, val title: String, val originalTitle: String?, val year: Int?, val poster: String?, val overview: String?, val votes: Int = 0)

    private fun get(endpoint: String, params: Map<String, String?> = emptyMap(), attempt: Int = 0): JsonObject {
        val url = (API + endpoint).toHttpUrl().newBuilder().apply {
            if (!key.startsWith("eyJ")) addQueryParameter("api_key", key)
            params.forEach { (k, v) -> if (!v.isNullOrEmpty()) addQueryParameter(k, v) }
        }.build()
        val req = Request.Builder().url(url).header("accept", "application/json").apply {
            if (key.startsWith("eyJ")) header("Authorization", "Bearer $key")
        }.build()
        val res = try { http.newCall(req).execute() } catch (e: IOException) {
            throw IOException("No se pudo conectar con TMDB. Comprueba tu conexión a Internet.")
        }
        res.use {
            if (it.code == 429 && attempt < 4) {
                Thread.sleep(1000L * (attempt + 1))
                return get(endpoint, params, attempt + 1)
            }
            if (it.code == 401) throw IOException("API key de TMDB no válida")
            if (!it.isSuccessful) throw IOException("TMDB ${it.code}")
            return Json.parseToJsonElement(it.body!!.string()) as JsonObject
        }
    }

    fun test() { get("/configuration") }

    fun search(type: String, query: String, year: Int?): List<SearchResult> {
        val ep = if (type == "movie") "/search/movie" else "/search/tv"
        val yearKey = if (type == "movie") "year" else "first_air_date_year"
        val base = mapOf("query" to query, "language" to language, "include_adult" to "false")
        var r = get(ep, if (year != null) base + (yearKey to year.toString()) else base)
        if (r.arr("results").isEmpty() && year != null) r = get(ep, base)
        return r.arr("results").mapNotNull { it as? JsonObject }.map { x ->
            SearchResult(
                id = x.int("id") ?: 0,
                title = x.str("title") ?: x.str("name") ?: "",
                originalTitle = x.str("original_title") ?: x.str("original_name"),
                year = (x.str("release_date") ?: x.str("first_air_date"))?.take(4)?.toIntOrNull(),
                poster = img(x.str("poster_path"), "w342"),
                overview = x.str("overview"),
                votes = x.int("vote_count") ?: 0
            )
        }
    }

    /** Título y póster de una película por su id (null si TMDB no la tiene) */
    fun movieBasic(id: Int): SearchResult? = try {
        val x = get("/movie/$id", mapOf("language" to language))
        SearchResult(id, x.str("title") ?: "", x.str("original_title"), x.str("release_date")?.take(4)?.toIntOrNull(), img(x.str("poster_path"), "w342"), null)
    } catch (_: IOException) { null }

    /**
     * Mejor coincidencia para un nombre de archivo/carpeta. Entiende "Director - Título"
     * comprobando el director contra TMDB con tolerancia a erratas. Devuelve el id de TMDB o null.
     */
    fun findBest(type: String, rawTitle: String, fileYear: Int?): Int? {
        var title = cleanQuery(rawTitle)
        var year = fileYear
        // "1955 - El rey de los monstruos": el año delante, no un director
        Regex("^((?:19|20)\\d\\d)\\s+[-–—]\\s+(.+)$").find(title)?.let { m ->
            title = m.groupValues[2]
            if (year == null) year = m.groupValues[1].toInt()
        }
        val parts = title.split(Regex("\\s+[-–—]\\s+")).map { it.trim() }.filter { it.isNotEmpty() }
        data class Attempt(val q: String, val hint: String?)
        val attempts = mutableListOf<Attempt>()
        if (parts.size >= 2) {
            val left = parts[0]
            val right = parts.drop(1).joinToString(" ")
            attempts += listOf(Attempt(right, left), Attempt(title, null), Attempt(left, right))
        } else attempts += Attempt(title, null)
        // variantes: "The VVitch" -> "The Witch"; números romanos al final
        for (a in attempts.toList()) {
            if (a.q.contains("VV")) attempts += a.copy(q = a.q.replace("VV", "W"))
            Regex("^(.*\\S)\\s+(II|III|IV|V|VI)$").find(a.q)?.let { m ->
                attempts += a.copy(q = "${m.groupValues[1]} Part ${m.groupValues[2]}")
                attempts += a.copy(q = "${m.groupValues[1]} ${romanToInt(m.groupValues[2])}")
            }
        }
        // "Godzilla 2000, el dinosaurio mutante" -> "Godzilla 2000" si con todo no hay nada
        for (a in attempts.toList()) {
            val head = a.q.substringBefore(',').trim()
            if (head != a.q && head.length > 2) attempts += a.copy(q = head)
        }

        var fallback: Int? = null
        for (a in attempts) {
            val results = try { search(type, a.q, year) } catch (e: IOException) {
                if (e.message?.contains(Regex("no válida|conectar")) == true) throw e
                continue
            }
            if (results.isEmpty()) continue
            val ranked = rankResults(results, a.q, year)
            if (fallback == null) fallback = ranked[0].id
            when {
                a.hint != null && type == "movie" -> {
                    for (r in ranked.take(5)) {
                        val directors = try { directorsOf(r.id) } catch (_: IOException) { emptyList() }
                        if (directors.any { personMatches(a.hint, it) }) return r.id
                    }
                }
                a.hint != null -> continue  // en series no se comprueba el creador
                else -> return ranked[0].id
            }
        }
        return fallback
    }

    private fun directorsOf(movieId: Int): List<String> =
        get("/movie/$movieId/credits").arr("crew").objs().filter { it.str("job") == "Director" }.mapNotNull { it.str("name") }

    private fun pickLogo(images: JsonObject?): String? {
        val logos = images?.arr("logos")?.objs() ?: return null
        val pick = logos.firstOrNull { it.str("iso_639_1") == lang } ?: logos.firstOrNull { it.str("iso_639_1") == "en" } ?: logos.firstOrNull()
        return img(pick?.str("file_path"), "w500")
    }

    fun movie(id: Int): Meta {
        val d = get("/movie/$id", mapOf(
            "language" to language,
            "append_to_response" to "credits,images,release_dates,videos",
            "include_image_language" to "$lang,en,null"
        ))
        val overview = d.str("overview")?.ifBlank { null }
            ?: runCatching { get("/movie/$id", mapOf("language" to "en-US")).str("overview") }.getOrNull()
        val rel = d.obj("release_dates")?.arr("results")?.objs().orEmpty()
        val cert = (rel.firstOrNull { it.str("iso_3166_1") == region } ?: rel.firstOrNull { it.str("iso_3166_1") == "US" })
            ?.arr("release_dates")?.objs()?.mapNotNull { it.str("certification")?.ifBlank { null } }?.firstOrNull()
        val crew = d.obj("credits")?.arr("crew")?.objs().orEmpty()
        return Meta(
            tmdbId = d.int("id") ?: id,
            title = d.str("title") ?: "",
            originalTitle = d.str("original_title"),
            tagline = d.str("tagline")?.ifBlank { null },
            overview = overview,
            year = d.str("release_date")?.take(4)?.toIntOrNull(),
            runtime = d.int("runtime")?.takeIf { it > 0 },
            rating = rating(d),
            genres = d.arr("genres").objs().mapNotNull { it.str("name") },
            poster = img(d.str("poster_path"), "w500"),
            backdrop = img(d.str("backdrop_path"), "w1280") ?: img(d.obj("images")?.arr("backdrops")?.objs()?.firstOrNull()?.str("file_path"), "w1280"),
            logo = pickLogo(d.obj("images")),
            certification = cert,
            director = crew.filter { it.str("job") == "Director" }.mapNotNull { it.str("name") }.joinToString(", ").ifBlank { null },
            cast = castOf(d.obj("credits")),
            trailer = trailerOf(d.obj("videos"))
        )
    }

    fun tv(id: Int, seasons: List<Int>): Meta {
        val d = get("/tv/$id", mapOf(
            "language" to language,
            "append_to_response" to "credits,images,content_ratings,videos",
            "include_image_language" to "$lang,en,null"
        ))
        val overview = d.str("overview")?.ifBlank { null }
            ?: runCatching { get("/tv/$id", mapOf("language" to "en-US")).str("overview") }.getOrNull()
        val cr = d.obj("content_ratings")?.arr("results")?.objs().orEmpty()
        val cert = (cr.firstOrNull { it.str("iso_3166_1") == region } ?: cr.firstOrNull { it.str("iso_3166_1") == "US" })?.str("rating")

        val seasonData = mutableMapOf<Int, SeasonMeta>()
        for (n in seasons) {
            try {
                val s = get("/tv/$id/season/$n", mapOf("language" to language))
                seasonData[n] = SeasonMeta(
                    name = s.str("name"),
                    overview = s.str("overview")?.ifBlank { null },
                    poster = img(s.str("poster_path"), "w342"),
                    episodes = s.arr("episodes").objs().associate { e ->
                        (e.int("episode_number") ?: 0) to EpisodeMeta(
                            name = e.str("name"),
                            overview = e.str("overview")?.ifBlank { null },
                            still = img(e.str("still_path"), "w500"),
                            runtime = e.int("runtime"),
                            airDate = e.str("air_date")
                        )
                    }
                )
            } catch (_: IOException) { /* temporada inexistente en TMDB */ }
        }
        return Meta(
            tmdbId = d.int("id") ?: id,
            title = d.str("name") ?: "",
            originalTitle = d.str("original_name"),
            tagline = d.str("tagline")?.ifBlank { null },
            overview = overview,
            year = d.str("first_air_date")?.take(4)?.toIntOrNull(),
            endYear = if (d.str("status") == "Ended") d.str("last_air_date")?.take(4)?.toIntOrNull() else null,
            runtime = (d["episode_run_time"] as? JsonArray)?.firstOrNull()?.let { (it as? JsonPrimitive)?.intOrNull },
            rating = rating(d),
            genres = d.arr("genres").objs().mapNotNull { it.str("name") },
            poster = img(d.str("poster_path"), "w500"),
            backdrop = img(d.str("backdrop_path"), "w1280") ?: img(d.obj("images")?.arr("backdrops")?.objs()?.firstOrNull()?.str("file_path"), "w1280"),
            logo = pickLogo(d.obj("images")),
            certification = cert?.ifBlank { null },
            creators = d.arr("created_by").objs().mapNotNull { it.str("name") }.joinToString(", ").ifBlank { null },
            cast = castOf(d.obj("credits")),
            trailer = trailerOf(d.obj("videos")),
            seasons = seasonData
        )
    }

    companion object {
        private const val API = "https://api.themoviedb.org/3"
        private const val IMG = "https://image.tmdb.org/t/p/"

        val defaultClient: OkHttpClient by lazy {
            OkHttpClient.Builder().connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS).build()
        }

        fun img(p: String?, size: String) = if (p.isNullOrEmpty()) null else IMG + size + p

        private fun rating(d: JsonObject) = d.num("vote_average")?.takeIf { it > 0 }?.let { (it * 10).roundToInt() / 10.0 }

        private fun castOf(credits: JsonObject?) = credits?.arr("cast")?.objs().orEmpty().take(15).map {
            CastMember(it.str("name") ?: "", it.str("character"), img(it.str("profile_path"), "w185"))
        }

        private fun trailerOf(videos: JsonObject?) = videos?.arr("results")?.objs()
            ?.firstOrNull { it.str("site") == "YouTube" && it.str("type") == "Trailer" }
            ?.let { "https://www.youtube.com/watch?v=${it.str("key")}" }

        // ---------- utilidades de coincidencia ----------
        // compiladas una vez: norm() se llama miles de veces al buscar en la biblioteca
        private val ACCENTS = Regex("[\\u0300-\\u036f]")
        private val NON_ALNUM = Regex("[^a-z0-9 ]+")
        private val SPACES = Regex("\\s+")

        fun norm(s: String?): String = Normalizer.normalize((s ?: "").lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(ACCENTS, "")
            .replace("&", " and ")
            .replace(NON_ALNUM, " ")
            .replace(SPACES, " ")
            .trim()

        fun cleanQuery(t: String) = t
            .replace(Regex("\\((?:imax|remastered|remasterizad[ao]|extended|director'?s cut|version extendida|versión extendida|4k|uhd)\\)", RegexOption.IGNORE_CASE), " ")
            .replace(Regex("\\s+I$"), "")
            .replace(Regex("\\s+"), " ")
            .trim()

        private fun romanToInt(r: String) = mapOf("II" to "2", "III" to "3", "IV" to "4", "V" to "5", "VI" to "6")[r] ?: r

        fun lev(a: String, b: String): Int {
            if (a == b) return 0
            if (a.isEmpty() || b.isEmpty()) return max(a.length, b.length)
            var prev = IntArray(b.length + 1) { it }
            for (i in 1..a.length) {
                val cur = IntArray(b.length + 1)
                cur[0] = i
                for (j in 1..b.length) {
                    cur[j] = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + if (a[i - 1] == b[j - 1]) 0 else 1)
                }
                prev = cur
            }
            return prev[b.length]
        }

        /** "Scorssese" ~ "Martin Scorsese", "Hitchcock" ~ "Alfred Hitchcock" */
        fun personMatches(hint: String, name: String): Boolean {
            val h = norm(hint).split(' ').filter { it.length >= 3 }
            val n = norm(name).split(' ').filter { it.length >= 2 }
            if (h.isEmpty() || n.isEmpty()) return false
            val surname = n.last()
            return h.any { w ->
                val tol = if (w.length >= 7) 2 else if (w.length >= 4) 1 else 0
                lev(w, surname) <= tol || n.any { x -> x.length >= 4 && lev(w, x) <= tol && w[0] == x[0] }
            }
        }

        /** Como rankResults de src/main/metadata.js: año, título y, entre parecidos, la más votada en TMDB */
        fun rankResults(results: List<SearchResult>, query: String, year: Int?): List<SearchResult> {
            val q = norm(query)
            val qt = q.split(' ')
            fun has(t: String): Boolean { val set = t.split(' ').toSet(); return qt.all { it in set } }
            return results.mapIndexed { i, r ->
                var s = -i * 0.5
                val t = norm(r.title)
                val o = norm(r.originalTitle)
                if (t == q || o == q) s += 10.0
                else if (t.startsWith(q) || o.startsWith(q)) s += 4.0
                if (has(t) || has(o)) s += 3.0
                // el año pesa más que el título exacto: «Terminator 2 (1991)» no es «Shocking Dark» (1989)
                if (year != null) {
                    val d = r.year?.let { abs(it - year) } ?: 6
                    s += when (d) { 0 -> 6.0; 1 -> 3.0; else -> -min(6, d).toDouble() }
                }
                s += 2 * log10(r.votes + 1.0)
                r to s
            }.sortedByDescending { it.second }.map { it.first }
        }
    }
}

// ---------- acceso cómodo al JSON ----------
private fun JsonObject.str(k: String): String? = (this[k] as? JsonPrimitive)?.takeIf { it.isString }?.content
private fun JsonObject.int(k: String): Int? = (this[k] as? JsonPrimitive)?.intOrNull
private fun JsonObject.num(k: String): Double? = (this[k] as? JsonPrimitive)?.doubleOrNull
private fun JsonObject.obj(k: String): JsonObject? = this[k] as? JsonObject
private fun JsonObject.arr(k: String): JsonArray = this[k] as? JsonArray ?: JsonArray(emptyList())
private fun JsonArray.objs(): List<JsonObject> = mapNotNull { it as? JsonObject }
