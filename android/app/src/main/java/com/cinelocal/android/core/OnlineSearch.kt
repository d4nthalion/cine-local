package com.cinelocal.android.core

/**
 * Búsqueda en TMDB cuando la biblioteca no tiene nada (como en escritorio).
 * Sin dependencias de Android, para poder probarla.
 */
object OnlineSearch {

    /** Lo que se pide a TMDB: el título y, si la búsqueda acaba en un año, ese año aparte */
    data class Query(val text: String, val year: Int?)

    /** Máximo de películas de TMDB que se muestran */
    const val LIMIT = 20

    private val TRAILING_YEAR = Regex("^(.*\\S)\\s+((?:19|20)\\d{2})$")

    /**
     * "dune 2021" → ("dune", 2021); "1917" → ("1917", null); vacío → null.
     * Un año del futuro es parte del título: "Blade Runner 2049" se busca tal cual.
     */
    fun parse(raw: String, maxYear: Int = java.time.Year.now().value + 1): Query? {
        val s = raw.trim().replace(Regex("\\s+"), " ")
        if (s.isEmpty()) return null
        val m = TRAILING_YEAR.find(s) ?: return Query(s, null)
        val year = m.groupValues[2].toInt()
        return if (year > maxYear) Query(s, null) else Query(m.groupValues[1], year)
    }

    /** Clave de una película pedida desde la búsqueda (las de Letterboxd usan la suya) */
    fun requestKey(tmdbId: Int) = "tmdb:$tmdbId"

    /**
     * Película de TMDB lista para la hoja de "Pedir descarga". Si ya está en Letterboxd se usa esa entrada,
     * para que lo pedido desde la watchlist y desde la búsqueda sea lo mismo.
     */
    fun entryFor(tmdbId: Int, title: String, originalTitle: String?, year: Int?, poster: String?, known: LbEntry?): LbEntry =
        known?.copy(poster = known.poster ?: poster, localTitle = known.localTitle ?: title)
            ?: LbEntry(
                key = requestKey(tmdbId),
                film = LbFilm(title = originalTitle?.takeIf { it.isNotBlank() } ?: title, year = year),
                tmdbId = tmdbId,
                poster = poster,
                localTitle = title
            )
}
