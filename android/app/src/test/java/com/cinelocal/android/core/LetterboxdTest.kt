package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class LetterboxdTest {

    // Misma estructura que /usuario/films/ (recortada)
    private fun gridItem(name: String, slug: String, viewing: String) = """
        <li class="griditem">
          <div class="react-component" data-component-class="LazyPoster" data-item-name="$name" data-item-slug="$slug"
               data-item-link="/film/$slug/" data-item-full-display-name="$name">
            <div class="poster film-poster"><img src="empty.png" class="image" alt="x"/></div>
          </div>
          <p class="poster-viewingdata" data-item-uid="film:1">$viewing</p>
        </li>"""

    private val grid = """<ul class="grid">""" +
        gridItem("Wildwood (2026)", "wildwood-2026", """<span class="rating -micro -darker rated-6">★★★</span>""") +
        gridItem("Am&eacute;lie (2001)", "amelie", """<span class="rating -micro -darker rated-9">★★★★½</span> <span class="like liked-micro has-icon icon-liked icon-16"><span class="icon"></span></span>""") +
        gridItem("Sin a&#241;o", "sin-anio", "") +
        """</ul><div class="pagination"><a href="/user/films/page/2/">2</a> <a href="/user/films/page/49/">49</a></div>"""

    @Test fun cuadricula() {
        val films = Letterboxd.parseGrid(grid)
        assertEquals(3, films.size)
        assertEquals(LbParsed("wildwood-2026", "Wildwood", 2026, 3.0, false), films[0])
        assertEquals("Am&eacute;lie", films[1].title)   // entidad con nombre que no se decodifica: se queda tal cual
        assertEquals(4.5, films[1].rating!!, 0.0)
        assertTrue(films[1].liked)
        assertEquals(LbParsed("sin-anio", "Sin año", null, null, false), films[2])
    }

    @Test fun ultimaPagina() {
        assertEquals(49, Letterboxd.lastPage(grid))
        assertEquals(1, Letterboxd.lastPage("<ul></ul>"))
    }

    @Test fun rss() {
        val xml = """<rss><channel>
            <item> <title>The Night That Binds Us, 2026</title> <link>https://letterboxd.com/u/film/the-night-that-binds-us/</link>
              <letterboxd:watchedDate>2026-10-14</letterboxd:watchedDate> <letterboxd:filmTitle>The Night That Binds Us</letterboxd:filmTitle>
              <letterboxd:filmYear>2026</letterboxd:filmYear> <letterboxd:memberLike>No</letterboxd:memberLike> <tmdb:movieId>1785681</tmdb:movieId> </item>
            <item> <title>I Play Rocky, 2026 - ★★½</title> <link>https://letterboxd.com/u/film/i-play-rocky/</link>
              <letterboxd:watchedDate>2026-10-13</letterboxd:watchedDate> <letterboxd:filmTitle>I Play Rocky</letterboxd:filmTitle>
              <letterboxd:filmYear>2026</letterboxd:filmYear> <letterboxd:memberRating>2.5</letterboxd:memberRating>
              <letterboxd:memberLike>Yes</letterboxd:memberLike> <tmdb:movieId>1286656</tmdb:movieId> </item>
            <item> <title>Una lista</title> <link>https://letterboxd.com/u/list/x/</link> </item>
        </channel></rss>"""
        val r = Letterboxd.parseRss(xml)
        assertEquals(2, r.size)
        assertEquals(LbParsed("the-night-that-binds-us", "The Night That Binds Us", 2026, null, false, 1785681, "2026-10-14"), r[0])
        assertEquals(2.5, r[1].rating!!, 0.0)
        assertTrue(r[1].liked)
        assertEquals(1286656, r[1].tmdbId)
    }

    @Test fun csvConComillas() {
        val rows = Letterboxd.parseCsv("﻿Date,Name,Year\r\n2024-01-01,\"Crimes and Misdemeanors, Again\",1989\n2024-02-02,\"Say \"\"Hi\"\"\",2000\n")
        assertEquals(2, rows.size)
        assertEquals("Crimes and Misdemeanors, Again", rows[0]["Name"])
        assertEquals("Say \"Hi\"", rows[1]["Name"])
        assertEquals("2000", rows[1]["Year"])
    }

    private fun zip(vararg files: Pair<String, String>): ByteArray {
        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { z -> for ((n, c) in files) { z.putNextEntry(ZipEntry(n)); z.write(c.toByteArray()); z.closeEntry() } }
        return out.toByteArray()
    }

    @Test fun exportacion() {
        val films = Letterboxd.parseExport(zip(
            "watched.csv" to "Date,Name,Year,Letterboxd URI\n2024-01-01,Blue Velvet,1986,x\n2024-01-02,Alien,1979,x\n",
            "diary.csv" to "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-03-01,Blue Velvet,1986,x,4.5,,,2024-02-28\n2024-03-02,Blue Velvet,1986,x,4.5,Yes,,2023-01-01\n",
            "ratings.csv" to "Date,Name,Year,Letterboxd URI,Rating\n2024-03-01,Blue Velvet,1986,x,4.5\n",
            "likes/films.csv" to "Date,Name,Year,Letterboxd URI\n2024-03-01,Alien,1979,x\n",
            "watchlist.csv" to "Date,Name,Year,Letterboxd URI\n2024-04-01,Eraserhead,1977,x\n2024-04-02,Inland Empire,2006,x\n"
        ))
        val bv = films.getValue(Letterboxd.keyOf("Blue Velvet", 1986))
        assertTrue(bv.watched)
        assertEquals(4.5, bv.rating!!, 0.0)
        assertEquals("2024-02-28", bv.date)            // la fecha más reciente del diario
        assertTrue(films.getValue(Letterboxd.keyOf("Alien", 1979)).liked)
        val ie = films.getValue(Letterboxd.keyOf("Inland Empire", 2006))
        assertTrue(ie.watchlist)
        assertFalse(ie.watched)
        assertEquals(1, ie.wlOrder)
        assertEquals(4, films.size)
    }

    @Test(expected = IllegalArgumentException::class) fun zipQueNoEsDeLetterboxd() { Letterboxd.parseExport(zip("otra.txt" to "hola")) }
    @Test(expected = IllegalArgumentException::class) fun noEsUnZip() { Letterboxd.parseExport("hola".toByteArray()) }

    @Test fun fichaDePelicula() {
        assertEquals(1018, Letterboxd.tmdbIdFromFilmPage("""<body class="film" data-tmdb-id="1018" data-tmdb-type="movie">"""))
        assertNull(Letterboxd.tmdbIdFromFilmPage("""<body data-tmdb-id="1406" data-tmdb-type="tv">"""))
        assertNull(Letterboxd.tmdbIdFromFilmPage("<body>"))
    }

    @Test fun utilidades() {
        assertEquals("amelie|2001", Letterboxd.keyOf("Amélie", 2001))
        assertEquals("fast and furious|", Letterboxd.keyOf("Fast & Furious", null))
        assertEquals("davidehrlich", Letterboxd.cleanUser(" https://letterboxd.com/davidehrlich/films/ "))
        assertEquals("tu_usuario", Letterboxd.cleanUser("@tu_usuario"))
        assertEquals("★★★½", Letterboxd.stars(3.5))
        assertEquals("½", Letterboxd.stars(0.5))
        assertEquals("", Letterboxd.stars(null))
    }
}
