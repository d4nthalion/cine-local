package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PlayQueueTest {

    private val eps = listOf("S/E1.mkv", "S/E2.mkv", "S/E3.mkv", "S/E4.mkv")
    private fun local(vararg i: Int): (String) -> Boolean = { p -> i.any { eps[it] == p } }
    private val online = { true }
    private val offline = { false }
    private fun never(): () -> Boolean = { throw AssertionError("no hacía falta comprobar la red") }

    // ---------------------------------------------------------------- por dónde empezar

    @Test fun `lo descargado se reproduce sin mirar la red`() {
        assertEquals(PlayQueue.Pick(1), PlayQueue.start(eps, 1, explicit = true, isMovie = false, isLocal = local(1), reachable = never()))
        assertEquals(PlayQueue.Pick(1), PlayQueue.start(eps, 1, explicit = false, isMovie = false, isLocal = local(1), reachable = never()))
    }

    @Test fun `con conexion se reproduce lo pedido aunque no este descargado`() {
        assertEquals(PlayQueue.Pick(0), PlayQueue.start(eps, 0, explicit = false, isMovie = false, isLocal = local(1), reachable = online))
    }

    @Test fun `sin conexion Reproducir pasa al siguiente descargado`() {
        // el caso del informe: solo E2 descargado y el botón principal pide E1
        val p = PlayQueue.start(eps, 0, explicit = false, isMovie = false, isLocal = local(1), reachable = offline)
        assertEquals(PlayQueue.Pick(1), p)
        assertTrue(p.switched(0))
        assertEquals(2, PlayQueue.start(eps, 1, false, false, local(0, 2), offline).index)
    }

    @Test fun `sin conexion y nada descargado despues vuelve al primero descargado`() {
        assertEquals(0, PlayQueue.start(eps, 3, false, false, local(0, 1), offline).index)
    }

    @Test fun `sin conexion y nada descargado avisa`() {
        val p = PlayQueue.start(eps, 0, false, false, local(), offline)
        assertNull(p.index)
        assertEquals(PlayQueue.NOTHING_DOWNLOADED, p.message)
    }

    @Test fun `sin conexion un capitulo elegido sin descargar avisa en vez de ir al PC`() {
        val p = PlayQueue.start(eps, 0, explicit = true, isMovie = false, isLocal = local(1), reachable = offline)
        assertNull(p.index)
        assertEquals(PlayQueue.EPISODE_NOT_DOWNLOADED, p.message)
        assertFalse(p.switched(0))
    }

    @Test fun `peliculas`() {
        val m = listOf("Peli.mkv")
        assertEquals(PlayQueue.Pick(0), PlayQueue.start(m, 0, false, true, { true }, never()))
        assertEquals(PlayQueue.Pick(0), PlayQueue.start(m, 0, false, true, { false }, online))
        assertEquals(PlayQueue.MOVIE_NOT_DOWNLOADED, PlayQueue.start(m, 0, false, true, { false }, offline).message)
    }

    @Test fun `indice fuera de rango`() {
        assertNull(PlayQueue.start(eps, -1, false, false, local(0), online).index)
        assertNull(PlayQueue.start(emptyList(), 0, false, false, { true }, online).index)
    }

    // ---------------------------------------------------------------- siguiente

    @Test fun `siguiente descargado sin mirar la red`() {
        assertEquals(2, PlayQueue.next(eps, 1, local(2), never()))
    }

    @Test fun `siguiente con conexion aunque no este descargado`() {
        assertEquals(1, PlayQueue.next(eps, 0, local(0), online))
    }

    @Test fun `sin conexion se salta lo no descargado`() {
        assertEquals(3, PlayQueue.next(eps, 0, local(0, 3), offline))
        assertNull(PlayQueue.next(eps, 1, local(1), offline))
    }

    @Test fun `la red se comprueba una sola vez`() {
        var n = 0
        PlayQueue.next(eps, 0, local(0), { n++; false })
        assertEquals(1, n)
    }

    @Test fun `al final no hay siguiente`() {
        assertNull(PlayQueue.next(eps, 3, local(0, 1, 2, 3), online))
    }
}
