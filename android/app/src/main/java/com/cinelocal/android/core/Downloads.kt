package com.cinelocal.android.core

import kotlinx.serialization.Serializable
import java.util.Locale

// Descargas para ver sin conexión con el PC. Aquí solo hay lógica pura (sin Android) para poder probarla:
// el índice y sus transiciones de estado, la comprobación de espacio, las rutas locales y los resúmenes por título.

@Serializable
enum class DlState { QUEUED, DOWNLOADING, PAUSED, DONE, ERROR }

/**
 * Un vídeo descargado o por descargar. [path] es su ruta en la biblioteca ("Serie/Temporada 1/x.mkv"),
 * que también es la ruta relativa dentro de la carpeta de descargas. Los subtítulos externos van junto al vídeo.
 */
@Serializable
data class DlFile(
    val path: String,
    val itemId: String,
    val episodeId: String? = null,
    val title: String,                 // nombre del título al pedirla (por si luego desaparece de la biblioteca)
    val label: String? = null,         // "T1:E2 · Piloto" en los episodios
    val size: Long,
    val subs: List<String> = emptyList(),
    val state: DlState = DlState.QUEUED,
    val done: Long = 0,                // bytes ya copiados
    val error: String? = null,
    val addedAt: Long = 0
)

@Serializable
data class DownloadIndex(val files: List<DlFile> = emptyList(), val notifAsked: Boolean = false) {

    fun get(path: String): DlFile? = files.firstOrNull { it.path == path }

    private fun map(path: String, fn: (DlFile) -> DlFile) = copy(files = files.map { if (it.path == path) fn(it) else it })

    /** Añade a la cola; lo que ya estaba descargado o en cola se deja como está y lo pausado o con error vuelve a la cola */
    fun enqueue(new: List<DlFile>, now: Long): DownloadIndex {
        var out = files
        for (f in new) {
            val prev = out.firstOrNull { it.path == f.path }
            out = when {
                prev == null -> out + f.copy(state = DlState.QUEUED, done = 0, error = null, addedAt = now)
                prev.state == DlState.PAUSED || prev.state == DlState.ERROR ->
                    out.map { if (it.path == f.path) it.copy(state = DlState.QUEUED, error = null, size = f.size, subs = f.subs) else it }
                else -> out
            }
        }
        return copy(files = out)
    }

    /** El siguiente de la cola (por orden de llegada) */
    fun next(): DlFile? = files.firstOrNull { it.state == DlState.QUEUED }

    fun start(path: String) = map(path) { it.copy(state = DlState.DOWNLOADING, error = null) }

    /** Progreso: solo cuenta mientras se está descargando (si se pausó o canceló entretanto, no se toca) */
    fun progress(path: String, done: Long) = map(path) { if (it.state == DlState.DOWNLOADING) it.copy(done = done) else it }

    fun complete(path: String) = map(path) { it.copy(state = DlState.DONE, done = it.size, error = null) }

    fun fail(path: String, message: String) = map(path) {
        if (it.state == DlState.DOWNLOADING || it.state == DlState.QUEUED) it.copy(state = DlState.ERROR, error = message) else it
    }

    fun pause(path: String) = map(path) {
        if (it.state == DlState.QUEUED || it.state == DlState.DOWNLOADING) it.copy(state = DlState.PAUSED) else it
    }

    fun resume(path: String) = map(path) {
        if (it.state == DlState.PAUSED || it.state == DlState.ERROR) it.copy(state = DlState.QUEUED, error = null) else it
    }

    fun pauseAll() = copy(files = files.map { if (it.state == DlState.QUEUED || it.state == DlState.DOWNLOADING) it.copy(state = DlState.PAUSED) else it })

    fun resumeAll() = copy(files = files.map {
        if (it.state == DlState.PAUSED || it.state == DlState.ERROR) it.copy(state = DlState.QUEUED, error = null) else it
    })

    fun remove(paths: Collection<String>) = copy(files = files.filter { it.path !in paths })

    /** Al abrir la app: lo que se estaba descargando cuando se cerró vuelve a la cola (se reanuda desde el .part) */
    fun recover() = copy(files = files.map { if (it.state == DlState.DOWNLOADING) it.copy(state = DlState.QUEUED) else it })

    val pending get() = files.filter { it.state == DlState.QUEUED || it.state == DlState.DOWNLOADING }
    val unfinished get() = files.filter { it.state != DlState.DONE }
    val finished get() = files.filter { it.state == DlState.DONE }
}

// ---------------------------------------------------------------- espacio

object Space {
    /** Por debajo de esto libre después de descargar, se avisa y se pide confirmación */
    const val MIN_LEFT = 1_000_000_000L

    sealed interface Verdict {
        val needed: Long
        val free: Long
        /** Cabe y quedará al menos 1 GB libre */
        data class Ok(override val needed: Long, override val free: Long) : Verdict
        /** Cabe, pero quedará menos de 1 GB libre */
        data class Low(override val needed: Long, override val free: Long) : Verdict
        /** No cabe */
        data class NoRoom(override val needed: Long, override val free: Long) : Verdict
    }

    fun check(needed: Long, free: Long): Verdict = when {
        needed > free -> Verdict.NoRoom(needed, free)
        free - needed < MIN_LEFT -> Verdict.Low(needed, free)
        else -> Verdict.Ok(needed, free)
    }

    /** Bytes que faltan por bajar: lo ya descargado no cuenta y lo empezado solo cuenta lo que queda */
    fun needed(files: List<DlFile>, index: DownloadIndex, partial: (String) -> Long = { 0L }): Long =
        files.sumOf { f ->
            val prev = index.get(f.path)
            if (prev?.state == DlState.DONE) 0L else (f.size - partial(f.path)).coerceAtLeast(0L)
        }

    private val ES = Locale.forLanguageTag("es-ES")

    /** 4,2 GB · 650 MB · 12 KB, con coma decimal */
    fun fmt(bytes: Long): String {
        val b = bytes.coerceAtLeast(0).toDouble()
        return when {
            b >= 1e9 -> String.format(ES, "%.1f GB", b / 1e9)
            b >= 1e6 -> String.format(ES, "%.0f MB", b / 1e6)
            b >= 1e3 -> String.format(ES, "%.0f KB", b / 1e3)
            else -> "${b.toLong()} B"
        }
    }
}

// ---------------------------------------------------------------- rutas

object DlPaths {
    private val BAD = Regex("[<>:\"|?*\\\\\\x00-\\x1F]")

    /**
     * Ruta de la biblioteca → ruta relativa segura dentro de la carpeta de descargas:
     * se mantiene la estructura de carpetas, se quitan "." y ".." (nunca sale de la carpeta) y los caracteres no válidos.
     */
    fun local(relPath: String): String =
        relPath.replace('\\', '/').split('/')
            .map { it.trim() }
            .filter { it.isNotEmpty() && it != "." && it != ".." }
            .joinToString("/") { BAD.replace(it, "_").trimEnd('.', ' ').ifEmpty { "_" } }

    fun part(relPath: String) = local(relPath) + ".part"
}

// ---------------------------------------------------------------- resumen por título

/** Estado de descarga de un título (o de una temporada): para las insignias, botones y la pantalla de Descargas */
data class DlSummary(
    val total: Int,          // vídeos del título/temporada
    val done: Int,
    val active: Int,         // en cola o descargándose
    val paused: Int,
    val failed: Int,
    val bytesDone: Long,
    val bytesTotal: Long     // de los que están en el índice
) {
    val none get() = done + active + paused + failed == 0
    val complete get() = total > 0 && done == total
    val downloading get() = active > 0
    val fraction get() = if (bytesTotal > 0) (bytesDone.toDouble() / bytesTotal).toFloat().coerceIn(0f, 1f) else 0f
    val percent get() = (fraction * 100).toInt()

    companion object {
        val EMPTY = DlSummary(0, 0, 0, 0, 0, 0, 0)

        fun of(paths: List<String>, index: DownloadIndex): DlSummary {
            if (paths.isEmpty()) return EMPTY
            val set = paths.toSet()
            val mine = index.files.filter { it.path in set }
            return DlSummary(
                total = paths.size,
                done = mine.count { it.state == DlState.DONE },
                active = mine.count { it.state == DlState.QUEUED || it.state == DlState.DOWNLOADING },
                paused = mine.count { it.state == DlState.PAUSED },
                failed = mine.count { it.state == DlState.ERROR },
                bytesDone = mine.sumOf { if (it.state == DlState.DONE) it.size else it.done },
                bytesTotal = mine.sumOf { it.size }
            )
        }
    }
}

/** Vídeos de un título: la película o todos los episodios */
fun videoPaths(item: LibraryItem): List<String> = if (item.isMovie) listOf(item.path) else item.episodes.map { it.path }
