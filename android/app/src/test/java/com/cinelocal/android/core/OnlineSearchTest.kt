package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class OnlineSearchTest {

    private fun q(s: String) = OnlineSearch.parse(s, maxYear = 2027)

    @Test fun yearAtTheEndRefinesTheSearch() {
        assertEquals(OnlineSearch.Query("dune", 2021), q("dune 2021"))
        assertEquals(OnlineSearch.Query("El padrino", 1972), q("  El   padrino 1972 "))
        assertEquals(OnlineSearch.Query("Blade Runner 2049", 2017), q("Blade Runner 2049 2017"))
    }

    @Test fun withoutYear() {
        assertEquals(OnlineSearch.Query("oppenheimer", null), q("oppenheimer"))
        // un año solo es el título (1917), y los números que no son años no cuentan
        assertEquals(OnlineSearch.Query("1917", null), q("1917"))
        // un año del futuro es parte del título
        assertEquals(OnlineSearch.Query("Blade Runner 2049", null), q("Blade Runner 2049"))
        assertEquals(OnlineSearch.Query("apollo 13", null), q("apollo 13"))
        assertEquals(OnlineSearch.Query("dune 1850", null), q("dune 1850"))
        assertEquals(OnlineSearch.Query("dune2021", null), q("dune2021"))
    }

    @Test fun emptyIsNothing() {
        assertNull(q(""))
        assertNull(q("   "))
    }

    @Test fun entryFromTmdb() {
        val e = OnlineSearch.entryFor(693134, "Dune: Parte dos", "Dune: Part Two", 2024, "p.jpg", null)
        assertEquals("tmdb:693134", e.key)
        assertEquals("Dune: Part Two", e.film.title)
        assertEquals("Dune: Parte dos", e.localTitle)
        assertEquals(2024, e.film.year)
        assertFalse(e.film.watchlist)
    }

    @Test fun entryReusesLetterboxd() {
        val lb = LbEntry("dune part two|2024", LbFilm("Dune: Part Two", 2024, "dune-part-two", watchlist = true), 693134, null, null)
        val e = OnlineSearch.entryFor(693134, "Dune: Parte dos", "Dune: Part Two", 2024, "p.jpg", lb)
        assertEquals(lb.key, e.key)
        assertEquals("p.jpg", e.poster)
        assertEquals("Dune: Parte dos", e.localTitle)
    }
}
