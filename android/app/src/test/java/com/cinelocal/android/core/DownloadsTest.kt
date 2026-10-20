package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DownloadsTest {

    private val GB = 1_000_000_000L
    private fun f(path: String, size: Long = 100, item: String = "m1", ep: String? = null) =
        DlFile(path = path, itemId = item, episodeId = ep, title = "T", size = size)

    // ---------------------------------------------------------------- espacio

    @Test fun spaceFitsWithRoomToSpare() {
        assertTrue(Space.check(2 * GB, 10 * GB) is Space.Verdict.Ok)
        // justo 1 GB libre después: todavía sin aviso
        assertTrue(Space.check(4 * GB, 5 * GB) is Space.Verdict.Ok)
    }

    @Test fun spaceWarnsWhenLessThanOneGbWouldBeLeft() {
        val v = Space.check(4 * GB + 1, 5 * GB)
        assertTrue(v is Space.Verdict.Low)
        assertTrue(Space.check(5 * GB, 5 * GB) is Space.Verdict.Low)   // cabe exacto: avisa
        assertEquals(4 * GB + 1, v.needed)
        assertEquals(5 * GB, v.free)
    }

    @Test fun spaceBlocksWhenItDoesNotFit() {
        val v = Space.check(5 * GB + 1, 5 * GB)
        assertTrue(v is Space.Verdict.NoRoom)
        assertTrue(Space.check(1, 0) is Space.Verdict.NoRoom)
        assertTrue(Space.check(0, 0) is Space.Verdict.Low)
    }

    @Test fun neededSkipsDoneAndCountsOnlyWhatIsLeftOfPartials() {
        val idx = DownloadIndex().enqueue(listOf(f("a", 1000), f("b", 500)), 1).complete("a")
        val files = listOf(f("a", 1000), f("b", 500), f("c", 300))
        assertEquals(500L - 200 + 300, Space.needed(files, idx) { if (it == "b") 200 else 0 })
        // un .part mayor que el archivo no da negativo
        assertEquals(0L, Space.needed(listOf(f("x", 10)), DownloadIndex()) { 50 })
    }

    @Test fun sizesInSpanish() {
        assertEquals("4,2 GB", Space.fmt(4_200_000_000))
        assertEquals("650 MB", Space.fmt(650_000_000))
        assertEquals("1,0 GB", Space.fmt(999_999_999 + 1))
        assertEquals("13 MB", Space.fmt(13_063_437))
        assertEquals("12 KB", Space.fmt(12_000))
        assertEquals("0 B", Space.fmt(-5))
    }

    // ---------------------------------------------------------------- índice

    @Test fun queueIsProcessedInOrderOneAtATime() {
        var idx = DownloadIndex().enqueue(listOf(f("a"), f("b")), 10)
        assertEquals("a", idx.next()?.path)
        idx = idx.start("a")
        assertEquals(DlState.DOWNLOADING, idx.get("a")?.state)
        assertEquals("b", idx.next()?.path)   // el que se descarga ya no está "en cola"
        idx = idx.progress("a", 40)
        assertEquals(40L, idx.get("a")?.done)
        idx = idx.complete("a")
        assertEquals(DlState.DONE, idx.get("a")?.state)
        assertEquals(100L, idx.get("a")?.done)
        assertEquals(10L, idx.get("a")?.addedAt)
    }

    @Test fun enqueueKeepsDoneAndQueuedAndRequeuesPausedOrFailed() {
        var idx = DownloadIndex().enqueue(listOf(f("a"), f("b"), f("c"), f("d")), 1)
            .complete("a").start("b").fail("b", "sin red").pause("c")
        idx = idx.enqueue(listOf(f("a"), f("b"), f("c"), f("d"), f("e")), 2)
        assertEquals(DlState.DONE, idx.get("a")?.state)
        assertEquals(DlState.QUEUED, idx.get("b")?.state)
        assertNull(idx.get("b")?.error)
        assertEquals(DlState.QUEUED, idx.get("c")?.state)
        assertEquals(DlState.QUEUED, idx.get("d")?.state)
        assertEquals(2L, idx.get("e")?.addedAt)
        assertEquals(5, idx.files.size)   // sin duplicados
    }

    @Test fun pauseAndCancelStopProgressUpdates() {
        var idx = DownloadIndex().enqueue(listOf(f("a")), 1).start("a").progress("a", 30)
        idx = idx.pause("a")
        assertEquals(DlState.PAUSED, idx.get("a")?.state)
        // el hilo de descarga puede mandar un último progreso después de pausar: no la reactiva
        idx = idx.progress("a", 60)
        assertEquals(30L, idx.get("a")?.done)
        assertEquals(DlState.PAUSED, idx.get("a")?.state)
        // un fallo tardío tampoco cambia una descarga pausada
        assertEquals(DlState.PAUSED, idx.fail("a", "x").get("a")?.state)
        idx = idx.resume("a")
        assertEquals(DlState.QUEUED, idx.get("a")?.state)
        assertEquals(30L, idx.get("a")?.done)   // se reanuda desde donde iba
        assertNull(idx.remove(listOf("a")).get("a"))
    }

    @Test fun pauseAllResumeAllAndRecover() {
        var idx = DownloadIndex().enqueue(listOf(f("a"), f("b"), f("c")), 1).complete("a").start("b")
        idx = idx.pauseAll()
        assertEquals(listOf(DlState.DONE, DlState.PAUSED, DlState.PAUSED), idx.files.map { it.state })
        assertNull(idx.next())
        idx = idx.resumeAll()
        assertEquals(listOf(DlState.DONE, DlState.QUEUED, DlState.QUEUED), idx.files.map { it.state })
        // la app se cerró a mitad: lo que estaba descargándose vuelve a la cola
        idx = idx.start("b").recover()
        assertEquals(DlState.QUEUED, idx.get("b")?.state)
        assertEquals(2, idx.pending.size)
        assertEquals(listOf("a"), idx.finished.map { it.path })
        assertEquals(listOf("b", "c"), idx.unfinished.map { it.path })
    }

    @Test fun failKeepsMessage() {
        val idx = DownloadIndex().enqueue(listOf(f("a")), 1).start("a").fail("a", "No queda espacio en el móvil.")
        assertEquals(DlState.ERROR, idx.get("a")?.state)
        assertEquals("No queda espacio en el móvil.", idx.get("a")?.error)
        assertNull(idx.next())
    }

    @Test fun indexSurvivesJsonRoundTrip() {
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true; encodeDefaults = false; explicitNulls = false }
        val idx = DownloadIndex(notifAsked = true).enqueue(listOf(f("a", 5, ep = "e1").copy(subs = listOf("a.srt"), label = "T1:E1")), 3).start("a").progress("a", 2)
        val back = json.decodeFromString(DownloadIndex.serializer(), json.encodeToString(DownloadIndex.serializer(), idx))
        assertEquals(idx, back)
    }

    // ---------------------------------------------------------------- rutas

    @Test fun localPathMirrorsTheLibrary() {
        assertEquals("Película (2020).mkv", DlPaths.local("Película (2020).mkv"))
        assertEquals("Serie/Temporada 1/Serie S01E01.mkv", DlPaths.local("Serie/Temporada 1/Serie S01E01.mkv"))
        assertEquals("Serie/T1/x.mkv", DlPaths.local("Serie\\T1\\x.mkv"))
        assertEquals("Serie/T1/x.mkv.part", DlPaths.part("Serie/T1/x.mkv"))
    }

    @Test fun localPathNeverLeavesTheFolder() {
        assertEquals("etc/passwd", DlPaths.local("../../etc/passwd"))
        assertEquals("a/b.mkv", DlPaths.local("/a/./b.mkv"))
        assertEquals("a/b.mkv", DlPaths.local("a//b.mkv"))
        assertFalse(DlPaths.local("..\\..\\x").contains(".."))
    }

    @Test fun localPathReplacesInvalidCharacters() {
        assertEquals("Qué_ (2020).mkv", DlPaths.local("Qué? (2020).mkv"))
        assertEquals("a_b_c.mkv", DlPaths.local("a:b*c.mkv"))
        assertEquals("Serie/x.mkv", DlPaths.local("Serie. /x.mkv"))
    }

    // ---------------------------------------------------------------- resúmenes

    @Test fun summaryOfASeries() {
        val paths = listOf("s/1", "s/2", "s/3")
        var idx = DownloadIndex()
        assertTrue(DlSummary.of(paths, idx).none)
        idx = idx.enqueue(listOf(f("s/1", 100), f("s/2", 100)), 1).complete("s/1").start("s/2").progress("s/2", 50)
        val s = DlSummary.of(paths, idx)
        assertEquals(3, s.total)
        assertEquals(1, s.done)
        assertEquals(1, s.active)
        assertTrue(s.downloading)
        assertFalse(s.complete)
        assertEquals(75, s.percent)   // 150 de 200 pedidos
        idx = idx.complete("s/2").enqueue(listOf(f("s/3", 100)), 2).complete("s/3")
        assertTrue(DlSummary.of(paths, idx).complete)
        assertTrue(DlSummary.of(emptyList(), idx).none)
    }

    @Test fun videoPathsOfMovieAndSeries() {
        val movie = LibraryItem("m", "movie", "Peli.mkv", "Peli")
        val series = LibraryItem(
            "s", "series", "Serie", "Serie",
            episodes = listOf(Episode("e1", "Serie/a.mkv", "a.mkv", season = 1, episode = 1), Episode("e2", "Serie/b.mkv", "b.mkv", season = 1, episode = 2))
        )
        assertEquals(listOf("Peli.mkv"), videoPaths(movie))
        assertEquals(listOf("Serie/a.mkv", "Serie/b.mkv"), videoPaths(series))
    }
}
