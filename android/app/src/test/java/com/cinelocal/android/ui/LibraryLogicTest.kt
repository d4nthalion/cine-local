package com.cinelocal.android.ui

import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.LibraryItem
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LibraryLogicTest {

    private fun ep(s: Int, e: Int, name: String = "S${s}E$e") = Episode("$name-id", "Serie/$name.mkv", "$name.mkv", season = s, episode = e)

    // 1x02 tiene dos versiones (como «Galactica 1x02» y «Galáctica 1x02 [1080p][Dual]»)
    private val serie = Title(
        LibraryItem(
            "bsg", "series", "Serie", "Battlestar Galactica", seasons = listOf(1, 2),
            episodes = listOf(ep(1, 1), ep(1, 2), ep(1, 2, "S1E2-dual"), ep(1, 3), ep(2, 1))
        ), null
    )
    private fun seen(vararg paths: String, at: Long = 1) = paths.associateWith { Progress(0.0, 0.0, true, at) }

    @Test fun unaVersionVistaCuentaComoVisto() {
        val p = seen("Serie/S1E1.mkv", "Serie/S1E2.mkv", "Serie/S1E3.mkv", "Serie/S2E1.mkv")
        assertEquals(setOf(1 to 1, 1 to 2, 1 to 3, 2 to 1), seenEpisodes(serie, p))
        assertTrue(isWatched(serie, p))   // la otra versión de 1x02 no hace falta verla
    }

    @Test fun continuarSaltaLasVersionesYaVistas() {
        // visto hasta 1x02 (una versión): lo siguiente es 1x03, no la otra versión de 1x02
        val p = seen("Serie/S1E1.mkv", "Serie/S1E2.mkv", at = 5)
        val st = seriesState(serie, p)
        assertEquals(SeriesMode.NEXT, st.mode)
        assertEquals(1 to 3, st.ep.season to st.ep.episode)
    }

    @Test fun archivosDeUnEpisodio() {
        assertEquals(listOf("Serie/S1E2.mkv", "Serie/S1E2-dual.mkv"), episodePaths(serie, serie.item.episodes[1]))
        assertFalse(isWatched(serie, seen("Serie/S1E2.mkv")))
    }
}
