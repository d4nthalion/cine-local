package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NameParserTest {

    private fun name(raw: String) = NameParser.parseName(raw, maxYear = 2027)

    @Test fun peliculaConAnioEntreParentesis() = assertEquals(NameParser.ParsedName("Dune Parte Dos", 2024), name("Dune Parte Dos (2024).mkv"))
    @Test fun nombreDeRelease() = assertEquals(NameParser.ParsedName("The Matrix", 1999), name("The.Matrix.1999.1080p.BluRay.mkv"))
    @Test fun anioAlPrincipioNoEsAnio() = assertEquals(NameParser.ParsedName("2001 A Space Odyssey", 1968), name("2001.A.Space.Odyssey.1968.mkv"))
    @Test fun anioSeguidoDeTitulo() = assertEquals(NameParser.ParsedName("Blade Runner 2049", null), name("Blade Runner 2049.mkv"))
    @Test fun etiquetasEspanolas() = assertEquals("Anticristo", name("Anticristo [BDrip 1080p][Castellano AC3 5.1].mkv").title)
    @Test fun directorYTitulo() = assertEquals(NameParser.ParsedName("Scorsese - Taxi Driver", null), name("Scorsese - Taxi Driver.mkv"))
    @Test fun carpetaDeSerie() = assertEquals(NameParser.ParsedName("Dark", 2017), name("Dark (2017)"))
    @Test fun carpetaConTemporada() = assertEquals("Breaking Bad", name("Breaking.Bad.S01-S05.1080p").title)

    @Test fun episodios() {
        assertEquals(NameParser.ParsedEpisode(1, 2), NameParser.parseEpisode("Breaking.Bad.S01E02.mkv", null))
        assertEquals(NameParser.ParsedEpisode(2, 1), NameParser.parseEpisode("Breaking Bad 2x01.mkv", null))
        assertEquals(NameParser.ParsedEpisode(1, 2), NameParser.parseEpisode("Serie Cap.102.mkv", null))
        assertEquals(NameParser.ParsedEpisode(3, 5), NameParser.parseEpisode("Episodio 5.mkv", 3))
        assertEquals(NameParser.ParsedEpisode(1, 2), NameParser.parseEpisode("02 - Título.mkv", null))
        assertEquals(NameParser.ParsedEpisode(1, 1, 2), NameParser.parseEpisode("Show.S01E01E02.mkv", null))
        assertNull(NameParser.parseEpisode("Pelicula.mkv", null))
    }

    @Test fun temporadaDeCarpeta() {
        assertEquals(1, NameParser.seasonFromDir("Temporada 1"))
        assertEquals(2, NameParser.seasonFromDir("Season 02"))
        assertEquals(3, NameParser.seasonFromDir("S03"))
        assertEquals(0, NameParser.seasonFromDir("Especiales"))
        assertNull(NameParser.seasonFromDir("Extras de rodaje"))
    }

    @Test fun ordenNatural() {
        val sorted = listOf("Episodio 10", "episodio 2", "Episodio 1").sortedWith(NameParser.naturalOrder)
        assertEquals(listOf("Episodio 1", "episodio 2", "Episodio 10"), sorted)
    }

    @Test fun escaneo() {
        val tree = mapOf(
            "" to listOf(
                FsEntry("Dune (2021).mkv", false, 10), FsEntry("Dune (2021).es.srt", false, 1),
                FsEntry("sample.mkv", false, 1), FsEntry("Dark (2017)", true), FsEntry("Vacía", true)
            ),
            "Dark (2017)" to listOf(FsEntry("Temporada 1", true), FsEntry("Extras", true)),
            "Dark (2017)/Temporada 1" to listOf(FsEntry("Dark.S01E02.mkv", false), FsEntry("Dark.S01E01.mkv", false), FsEntry("bonus.mkv", false)),
            "Dark (2017)/Extras" to listOf(FsEntry("making of.mkv", false)),
            "Vacía" to emptyList()
        )
        val items = LibraryScanner.scan { tree[it] ?: emptyList() }
        assertEquals(listOf("Dark", "Dune"), items.map { it.title })
        val dune = items.first { it.isMovie }
        assertEquals(listOf(SubFile("Dune (2021).es.srt", "spa", false)), dune.subs)
        val dark = items.first { !it.isMovie }
        assertEquals(listOf("T1:E1", "T1:E2", "T1:E3"), dark.episodes.map { it.label })
        assertEquals("bonus.mkv", dark.episodes.last().fileName)
        assertEquals("Dark (2017)/Temporada 1/Dark.S01E01.mkv", dark.episodes.first().path)
    }

    @Test fun idiomas() {
        assert(Languages.matches("Castellano AC3 5.1", "spa"))
        assert(!Languages.matches("Forzados", "spa"))
        assert(Languages.isForced("Forzados Castellano"))
        assertEquals("eng", Languages.detect(".en"))
    }
}
