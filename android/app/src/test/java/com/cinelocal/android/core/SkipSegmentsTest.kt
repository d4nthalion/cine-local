package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SkipSegmentsTest {

    private val never: () -> Boolean = { throw AssertionError("no hacía falta mirar si hay siguiente") }
    private val yes = { true }
    private val no = { false }

    // ---------------------------------------------------------------- lectura de la respuesta

    @Test fun `Twin Peaks S1E2 intro desde el principio`() {
        val segs = SkipSegments.parse("""{"tvdb_id":70533,"type":"tv","season":1,"episode":2,"intro":[{"start_ms":null,"end_ms":91000}]}""")
        assertEquals(listOf(Segment(SegKind.INTRO, 0, 91_000)), segs)
    }

    @Test fun `Breaking Bad S1E2 creditos hasta el final`() {
        val segs = SkipSegments.parse("""{"tvdb_id":81189,"type":"tv","season":1,"episode":2,"credits":[{"start_ms":2843000,"end_ms":null}]}""")
        assertEquals(listOf(Segment(SegKind.CREDITS, 2_843_000, null)), segs)
    }

    @Test fun `Dark S1E1 cero cero es que no tiene`() {
        assertTrue(SkipSegments.parse("""{"recap":[{"start_ms":0,"end_ms":0}],"credits":[{"start_ms":0,"end_ms":0}]}""").isEmpty())
    }

    @Test fun `rangos invalidos y JSON roto se ignoran`() {
        val segs = SkipSegments.parse(
            """{"intro":[{"start_ms":5000,"end_ms":3000},{"start_ms":null,"end_ms":null}],
               "recap":[{"start_ms":-200,"end_ms":40000}],"preview":[{"start_ms":3000000}],"otro":[1]}"""
        )
        // intro al revés y sin final: fuera; inicio negativo ⇒ 0; avance sin final ⇒ hasta el final
        assertEquals(listOf(Segment(SegKind.RECAP, 0, 40_000), Segment(SegKind.PREVIEW, 3_000_000, null)), segs)
        assertTrue(SkipSegments.parse("no es json").isEmpty())
        assertTrue(SkipSegments.parse("[]").isEmpty())
    }

    @Test fun `ordenados por inicio`() {
        val segs = SkipSegments.parse("""{"intro":[{"start_ms":60000,"end_ms":90000}],"recap":[{"start_ms":0,"end_ms":55000}]}""")
        assertEquals(listOf(SegKind.RECAP, SegKind.INTRO), segs.map { it.kind })
    }

    // ---------------------------------------------------------------- tramo activo y botón

    private val intro = Segment(SegKind.INTRO, 0, 91_000)
    private val credits = Segment(SegKind.CREDITS, 2_843_000, null)
    private val len = 2_900_000L

    @Test fun `intro activa hasta el ultimo segundo`() {
        assertEquals(intro, SkipSegments.active(listOf(intro), 0, len))
        assertEquals(intro, SkipSegments.active(listOf(intro), 89_999, len))
        assertNull(SkipSegments.active(listOf(intro), 90_000, len))
        assertNull(SkipSegments.active(listOf(intro), 95_000, len))
    }

    @Test fun `saltar intro va medio segundo despues del final`() {
        val a = SkipSegments.action(listOf(intro), 10_000, len, never)!!
        assertEquals("Saltar intro", a.label)
        assertEquals(91_500L, a.seekTo)
        assertFalse(a.next)
    }

    @Test fun `saltar resumen`() {
        val recap = Segment(SegKind.RECAP, 2_000, 60_000)
        assertNull(SkipSegments.action(listOf(recap), 1_000, len, never))
        assertEquals("Saltar resumen", SkipSegments.action(listOf(recap), 2_000, len, never)?.label)
    }

    @Test fun `creditos con siguiente episodio`() {
        val a = SkipSegments.action(listOf(intro, credits), 2_850_000, len, yes)!!
        assertEquals("Siguiente episodio", a.label)
        assertTrue(a.next)
        assertNull(a.seekTo)
    }

    @Test fun `creditos hasta el final sin siguiente no tienen boton`() {
        assertNull(SkipSegments.action(listOf(credits), 2_850_000, len, no))
    }

    @Test fun `creditos con escena despues y sin siguiente saltan los creditos`() {
        val mid = Segment(SegKind.CREDITS, 2_700_000, 2_800_000)
        val a = SkipSegments.action(listOf(mid), 2_750_000, len, no)!!
        assertEquals("Saltar créditos", a.label)
        assertEquals(2_800_500L, a.seekTo)
        // si tras los créditos solo quedan unos segundos de negro, no merece la pena
        assertNull(SkipSegments.action(listOf(Segment(SegKind.CREDITS, 2_700_000, 2_897_000)), 2_750_000, len, no))
    }

    @Test fun `sin duracion conocida los creditos sin final cuentan desde su inicio`() {
        assertEquals(credits, SkipSegments.active(listOf(credits), 2_850_000, 0))
        assertNull(SkipSegments.active(listOf(credits), 1_000, 0))
    }

    @Test fun `el salto nunca pasa del ultimo segundo del archivo`() {
        val long = Segment(SegKind.INTRO, 0, 200_000)
        assertEquals(149_000L, SkipSegments.skipTarget(long, 150_000))
        // y el tramo acaba con el archivo
        assertNull(SkipSegments.active(listOf(long), 149_500, 150_000))
    }

    @Test fun `archivo con dos episodios solo usa intro y resumen`() {
        val recap = Segment(SegKind.RECAP, 0, 30_000)
        val f = SkipSegments.forFile(listOf(recap, intro, credits), multiEpisode = true, lengthMs = 5_000_000)
        assertEquals(listOf(recap, intro), f)
        assertEquals(3, SkipSegments.forFile(listOf(recap, intro, credits), multiEpisode = false, lengthMs = 5_000_000).size)
    }

    @Test fun `tramos que empiezan despues del archivo se ignoran`() {
        assertEquals(listOf(intro), SkipSegments.forFile(listOf(intro, credits), false, lengthMs = 150_000))
    }

    // ---------------------------------------------------------------- caché

    @Test fun `caducidad de lo guardado`() {
        val now = 100 * SkipSegments.DAY
        assertTrue(SkipSegments.fresh(SegEntry(now - 29 * SkipSegments.DAY, true, listOf(intro)), now))
        assertFalse(SkipSegments.fresh(SegEntry(now - 31 * SkipSegments.DAY, true, listOf(intro)), now))
        assertTrue(SkipSegments.fresh(SegEntry(now - 6 * SkipSegments.DAY, false), now))
        assertFalse(SkipSegments.fresh(SegEntry(now - 8 * SkipSegments.DAY, false), now))
        // reloj cambiado hacia atrás: se vuelve a preguntar
        assertFalse(SkipSegments.fresh(SegEntry(now + SkipSegments.DAY, true), now))
    }

    @Test fun `limpieza conserva lo caducado reciente para verlo sin conexion`() {
        val now = 200 * SkipSegments.DAY
        val s = SegStore(mapOf(
            "a" to SegEntry(now - 40 * SkipSegments.DAY, true, listOf(intro)),
            "b" to SegEntry(now - 100 * SkipSegments.DAY, true, listOf(intro))
        ))
        assertEquals(setOf("a"), SkipSegments.prune(s, now).entries.keys)
    }

    @Test fun `claves de pelicula y episodio`() {
        assertEquals("tv:1920:1:2", SegRequest(1920, 1, 2).key)
        assertEquals("movie:603", SegRequest(603).key)
        assertFalse(SegRequest(603).isEpisode)
    }

    // ---------------------------------------------------------------- límite de peticiones

    @Test fun `limite de peticiones por ventana`() {
        val r = RateWindow(max = 3, windowMs = 10_000)
        repeat(3) { r.record(1_000L + it) }
        assertEquals(9_000L, r.waitMs(2_000))
        assertEquals(0L, r.waitMs(11_000))
    }

    @Test fun `tras un 429 se espera lo que diga Retry-After`() {
        val r = RateWindow()
        r.backoff(0, SkipSegments.retryAfterMs("30"))
        assertEquals(20_000L, r.waitMs(10_000))
        assertEquals(0L, r.waitMs(30_000))
        assertEquals(60_000L, SkipSegments.retryAfterMs("Wed, 21 Oct 2026 07:28:00 GMT"))
        assertEquals(24L * 3600 * 1000, SkipSegments.retryAfterMs("999999"))
    }
}
