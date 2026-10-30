package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class ListsTest {

    private val alien = ListEntry("movie:348", tmdb = 348, title = "Alien", year = 1979)
    private val dune = ListEntry("movie:438631", tmdb = 438631, title = "Dune", year = 2021)

    @Test fun crearRenombrarYBorrar() {
        var l = Lists.create(emptyList(), "  Terror  ", alien)
        assertEquals("Terror", l.single().name)
        assertEquals(listOf(alien), l.single().items)
        l = Lists.rename(l, l[0].id, "Miedo")
        assertEquals("Miedo", l[0].name)
        assertTrue(Lists.delete(l, l[0].id).isEmpty())
    }

    @Test fun nombresRepetidosOVacios() {
        val l = Lists.create(emptyList(), "Terror")
        assertThrows(Lists.ListException::class.java) { Lists.create(l, "terror") }
        assertThrows(Lists.ListException::class.java) { Lists.create(l, "Mi lista") }
        assertThrows(Lists.ListException::class.java) { Lists.create(l, "   ") }
    }

    @Test fun anadirYQuitar() {
        var l = Lists.create(emptyList(), "Ver", alien)
        l = Lists.toggle(l, l[0].id, dune)
        assertEquals(listOf("Dune", "Alien"), l[0].items.map { it.title })   // lo último, primero
        l = Lists.toggle(l, l[0].id, alien)
        assertEquals(listOf("Dune"), l[0].items.map { it.title })
        assertTrue(Lists.contains(l, "movie:438631"))
    }

    @Test fun tituloDeLaBibliotecaPorSuFichaDeTmdb() {
        val item = LibraryItem("abc", "movie", "Peliculas/Dune (2021).mkv", "Dune", 2021)
        val t = Title(item, Meta(tmdbId = 438631, title = "Dune"))
        assertEquals("movie:438631", Lists.entryOf(t).key)
        assertEquals(t, Lists.owned(dune, listOf(t)))
        assertNull(Lists.owned(alien, listOf(t)))
        // sin ficha, por el id del archivo
        val sinFicha = Title(item.copy(id = "xyz"), null)
        assertEquals("id:xyz", Lists.entryOf(sinFicha).key)
        assertEquals(sinFicha, Lists.owned(Lists.entryOf(sinFicha), listOf(sinFicha)))
    }

    @Test fun watchlistConLoDeMiListaYPrimera() {
        val propias = Lists.create(emptyList(), "Terror", alien)
        val l = Lists.withWatchlist(propias, listOf(dune, dune))
        assertEquals(listOf(Lists.WATCHLIST, propias[0].id), l.map { it.id })
        assertEquals("Watchlist", l[0].name)
        assertEquals(listOf(dune), l[0].items)                        // sin repetidos
        assertEquals(l, Lists.withWatchlist(l, listOf(alien)))        // si ya existe, no se toca
    }

    @Test fun laWatchlistNoSeRenombraNiSeBorra() {
        val l = Lists.withWatchlist(emptyList(), emptyList())
        assertThrows(Lists.ListException::class.java) { Lists.rename(l, Lists.WATCHLIST, "Otra") }
        assertThrows(Lists.ListException::class.java) { Lists.delete(l, Lists.WATCHLIST) }
        assertThrows(Lists.ListException::class.java) { Lists.create(l, "watchlist") }
        assertEquals(listOf("Dune"), Lists.toggle(l, Lists.WATCHLIST, dune)[0].items.map { it.title })
    }

    @Test fun tituloGuardadoAntesDeTenerFicha() {
        // se guardó sin ficha (por su id) y después llegó la ficha: se reconoce y se quita esa entrada
        val item = LibraryItem("abc", "movie", "Peliculas/Dune (2021).mkv", "Dune", 2021)
        val antes = Lists.entryOf(Title(item, null))
        val l = Lists.toggle(Lists.withWatchlist(emptyList(), emptyList()), Lists.WATCHLIST, antes)
        val conFicha = Title(item, Meta(438631, "Dune"))
        assertTrue(Lists.containsTitle(l, conFicha))
        assertEquals(antes, Lists.entryIn(Lists.watchlist(l), conFicha))
        assertTrue(Lists.toggle(l, Lists.WATCHLIST, Lists.entryIn(Lists.watchlist(l), conFicha))[0].items.isEmpty())
    }
}
