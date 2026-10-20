package com.cinelocal.android.data

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Environment
import android.os.StatFs
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import coil.imageLoader
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.cinelocal.android.core.DlFile
import com.cinelocal.android.core.DlPaths
import com.cinelocal.android.core.DlState
import com.cinelocal.android.core.DlSummary
import com.cinelocal.android.core.DownloadIndex
import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.Settings
import com.cinelocal.android.core.Space
import com.cinelocal.android.core.Title
import com.cinelocal.android.core.videoPaths
import com.hierynomus.mssmb2.SMBApiException
import com.hierynomus.smbj.common.SMBRuntimeException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.job
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeoutException

/**
 * Descargas para ver sin conexión con el PC.
 *
 * - Los vídeos se copian por SMB a la carpeta de la app en el almacenamiento externo
 *   (Android/data/com.cinelocal.android/files/Movies), con la misma estructura de carpetas que la biblioteca.
 *   No hace falta ningún permiso de almacenamiento y se borran al desinstalar la app.
 * - Se copian a "<archivo>.part" y se renombran al terminar; si se corta, se reanuda desde el tamaño del .part.
 * - downloads.json guarda la cola y el estado de cada vídeo. El trabajo lo hace [DownloadService] (servicio en primer plano).
 */
class DownloadManager(
    private val context: Context,
    scope: CoroutineScope,
    dir: File,
    private val settings: () -> Settings,
    private val smb: () -> SmbLibrary
) {
    val index = JsonStore(File(dir, "downloads.json"), DownloadIndex.serializer(), DownloadIndex(), scope)

    /** Carpeta de las descargas; si el almacenamiento externo no está disponible, la interna de la app */
    val root: File
        get() = context.getExternalFilesDir(Environment.DIRECTORY_MOVIES) ?: File(context.filesDir, "Movies")

    fun localFile(relPath: String) = File(root, DlPaths.local(relPath))
    private fun partFile(relPath: String) = File(root, DlPaths.part(relPath))

    /** El vídeo descargado, si lo está y el archivo sigue ahí */
    fun localIfDone(relPath: String): File? =
        index.value.get(relPath)?.takeIf { it.state == DlState.DONE }?.let { localFile(relPath).takeIf(File::isFile) }

    fun summary(t: Title, index: DownloadIndex = this.index.value) = DlSummary.of(videoPaths(t.item), index)

    fun freeBytes(): Long = runCatching { root.mkdirs(); StatFs(root.path).availableBytes }.getOrDefault(0L)

    fun totalBytes(): Long = runCatching { root.mkdirs(); StatFs(root.path).totalBytes }.getOrDefault(0L)

    /** Lo que ocupan las descargas (terminadas y a medias) */
    fun usedBytes(): Long = runCatching { root.walkBottomUp().filter { it.isFile }.sumOf { it.length() } }.getOrDefault(0L)

    // ---------------------------------------------------------------- pedir descargas

    /** Lo que se va a descargar, con el tamaño y la comprobación de espacio */
    data class Plan(val title: Title, val what: String, val files: List<DlFile>, val verdict: Space.Verdict, val queued: Long = 0) {
        val nothingToDo get() = files.isEmpty()
        /** Lo que ocupa esta descarga (sin lo que ya está en cola) */
        val size get() = verdict.needed - queued
    }

    /** Plan para una película (episodes == null) o para los episodios indicados de una serie */
    fun plan(t: Title, episodes: List<Episode>?, what: String): Plan {
        val idx = index.value
        val all = if (t.isMovie || episodes == null) listOf(
            DlFile(t.item.path, t.id, null, t.name, null, t.item.size, t.item.subs.map { it.path })
        ) else episodes.map { e ->
            val name = t.meta?.seasons?.get(e.season)?.episodes?.get(e.episode)?.name
            DlFile(e.path, t.id, e.id, t.name, e.label + (name?.let { " · $it" } ?: ""), e.size, e.subs.map { it.path })
        }
        // lo ya descargado o en cola no se vuelve a pedir
        val todo = all.filter { f ->
            when (idx.get(f.path)?.state) {
                DlState.DONE -> localFile(f.path).isFile.not()
                DlState.QUEUED, DlState.DOWNLOADING -> false
                else -> true
            }
        }
        val needed = Space.needed(todo, DownloadIndex()) { p -> partFile(p).takeIf(File::isFile)?.length() ?: 0L }
        // lo que ya está en cola también ocupará sitio
        val queued = idx.pending.sumOf { (it.size - it.done).coerceAtLeast(0) }
        return Plan(t, what, todo, Space.check(needed + queued, freeBytes()), queued)
    }

    fun enqueue(plan: Plan) {
        if (plan.files.isEmpty()) return
        // lo que figuraba como descargado pero ya no está en el disco vuelve a la cola
        index.update { idx -> idx.remove(plan.files.filter { idx.get(it.path)?.state == DlState.DONE }.map { it.path }).enqueue(plan.files, System.currentTimeMillis()) }
        index.flush()
        prefetchArtwork(plan.title, plan.files.mapNotNull { it.episodeId }.toSet())
        startService()
    }

    /** Carátula, fondo, logotipo e imágenes de los episodios en la caché de Coil, para verlas sin conexión */
    private fun prefetchArtwork(t: Title, episodeIds: Set<String>) {
        val m = t.meta ?: return
        val stills = t.item.episodes.filter { it.id in episodeIds }
            .mapNotNull { e -> m.seasons[e.season]?.episodes?.get(e.episode)?.still }
        val seasonPosters = t.item.episodes.filter { it.id in episodeIds }.map { it.season }.distinct().mapNotNull { m.seasons[it]?.poster }
        val loader = context.imageLoader
        for (url in (listOfNotNull(m.poster, m.backdrop, m.logo) + stills + seasonPosters).distinct()) {
            loader.enqueue(
                ImageRequest.Builder(context).data(url)
                    .memoryCachePolicy(CachePolicy.DISABLED)
                    .diskCachePolicy(CachePolicy.ENABLED)
                    .build()
            )
        }
    }

    // ---------------------------------------------------------------- acciones

    fun pause(path: String) = index.update { it.pause(path) }

    fun resume(path: String) {
        index.update { it.resume(path) }
        startService()
    }

    fun pauseAll() = index.update { it.pauseAll() }

    fun resumeAll() {
        index.update { it.resumeAll() }
        startService()
    }

    /** Quita de la cola lo que no ha terminado y borra lo que llevaba copiado */
    fun cancel(paths: Collection<String>) {
        val drop = index.value.files.filter { it.path in paths && it.state != DlState.DONE }
        index.update { it.remove(drop.map(DlFile::path)) }
        for (f in drop) partFile(f.path).delete()
        cleanDirs()
    }

    fun cancelAll() = cancel(index.value.unfinished.map { it.path })

    /** Borra descargas (terminadas o no): vídeo, .part y subtítulos */
    fun delete(paths: Collection<String>) {
        val files = index.value.files.filter { it.path in paths }
        index.update { it.remove(files.map(DlFile::path)) }
        for (f in files) {
            localFile(f.path).delete()
            partFile(f.path).delete()
            for (s in f.subs) { localFile(s).delete(); partFile(s).delete() }
        }
        index.flush()
        cleanDirs()
    }

    /** Quita las carpetas vacías que quedan al borrar */
    private fun cleanDirs() {
        val r = root
        r.walkBottomUp().filter { it.isDirectory && it != r && (it.list()?.isEmpty() == true) }.forEach { it.delete() }
    }

    /** Al abrir la app: lo que se estaba descargando cuando se cerró sigue donde se quedó */
    fun resumeOnLaunch() {
        index.update { it.recover() }
        if (index.value.next() != null) startService()
    }

    fun startService() {
        if (index.value.next() == null) return
        runCatching { ContextCompat.startForegroundService(context, Intent(context, DownloadService::class.java)) }
            .onFailure { Log.w(TAG, "No se pudo iniciar el servicio de descargas", it) }
    }

    /** El móvil está ahora en una red en la que se puede descargar (Wi-Fi si así está en Ajustes) */
    fun canDownloadNow() = networkProblem() == null

    fun markNotifAsked() = index.update { it.copy(notifAsked = true) }

    // ---------------------------------------------------------------- trabajo (lo llama DownloadService)

    /** Qué hace ahora la cola: el archivo y si está esperando red */
    data class Activity(val file: DlFile? = null, val waiting: String? = null, val bytesPerSec: Long = 0)

    private val _activity = MutableStateFlow(Activity())
    val activity: StateFlow<Activity> = _activity.asStateFlow()

    /** Descarga la cola de uno en uno hasta que no queda nada en cola. [onTick] actualiza la notificación. */
    suspend fun process(onTick: () -> Unit) = withContext(Dispatchers.IO) {
        try {
            while (currentCoroutineContext().isActive) {
                val f = index.value.next() ?: break
                val net = networkProblem()
                if (net != null) {
                    _activity.value = Activity(f, net)
                    onTick()
                    delay(3000)
                    continue
                }
                index.update { it.start(f.path) }
                _activity.value = Activity(index.value.get(f.path) ?: f)
                onTick()
                var attempt = 0
                while (true) {
                    try {
                        if (downloadOne(f, onTick)) index.update { it.complete(f.path) }
                        break
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        Log.w(TAG, "Fallo al descargar ${f.path}", e)
                        val stillWanted = index.value.get(f.path)?.state == DlState.DOWNLOADING
                        if (stillWanted && isTransient(e) && attempt < 3) {
                            attempt++
                            _activity.value = Activity(index.value.get(f.path), "Sin conexión con el PC · reintento $attempt de 3")
                            onTick()
                            delay(5000L * attempt)
                            continue
                        }
                        if (stillWanted) index.update { it.fail(f.path, friendly(e)) }
                        break
                    }
                }
                index.flush()
            }
        } finally {
            _activity.value = Activity()
            index.flush()
        }
    }

    private suspend fun downloadOne(f: DlFile, onTick: () -> Unit): Boolean {
        val job = currentCoroutineContext().job
        val r = root.apply { mkdirs() }
        if (!r.isDirectory) throw IOException("No se puede escribir en el almacenamiento del móvil")
        val dest = localFile(f.path)
        dest.parentFile?.mkdirs()

        // subtítulos primero (son pequeños); si alguno falla, el vídeo se descarga igualmente
        for (s in f.subs) {
            val sd = localFile(s)
            if (sd.isFile) continue
            val tmp = partFile(s)
            try {
                tmp.delete()
                if (smb().download(s, tmp, 0) { job.isActive } != null) tmp.renameTo(sd)
            } catch (e: IOException) {
                if (!isTransient(e)) Log.w(TAG, "Subtítulo no descargado: $s", e) else throw e
            }
        }

        val part = partFile(f.path)
        var offset = if (part.isFile) part.length() else 0L
        if (f.size in 1 until offset) { part.delete(); offset = 0 }   // más grande que el original: no vale
        if (dest.isFile && f.size > 0 && dest.length() == f.size) return true

        var lastTick = 0L
        var lastBytes = offset
        var lastAt = SystemClock.elapsedRealtime()
        val remoteSize = smb().download(f.path, part, offset) { total ->
            val now = SystemClock.elapsedRealtime()
            if (now - lastTick >= 700) {
                lastTick = now
                val dt = (now - lastAt).coerceAtLeast(1)
                val speed = (total - lastBytes) * 1000 / dt
                lastBytes = total; lastAt = now
                index.update { it.progress(f.path, total) }
                _activity.value = Activity(index.value.get(f.path), null, speed)
                onTick()
            }
            // se para si se pausa o cancela (el estado deja de ser DOWNLOADING) o si se detiene el servicio
            job.isActive && index.value.get(f.path)?.state == DlState.DOWNLOADING
        }
        if (remoteSize == null) {
            index.update { it.progress(f.path, part.length()) }
            return false
        }
        if (part.length() != remoteSize) {
            part.delete()   // no cuadra: mejor empezar de cero la próxima vez
            throw IOException("La copia no está completa (${Space.fmt(part.length())} de ${Space.fmt(remoteSize)}). Vuelve a intentarlo.")
        }
        dest.delete()
        if (!part.renameTo(dest)) throw IOException("No se pudo guardar el archivo descargado")
        return true
    }

    /** null si se puede descargar ahora; si no, el motivo para mostrarlo */
    private fun networkProblem(): String? {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return null
        val caps = cm.activeNetwork?.let { cm.getNetworkCapabilities(it) } ?: return "Esperando conexión"
        val wifi = caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ||
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
        if (settings().downloadWifiOnly && !wifi) return "Esperando Wi-Fi"
        return null
    }

    companion object {
        private const val TAG = "CineLocalDl"

        private fun chain(e: Throwable): Sequence<Throwable> = generateSequence(e) { it.cause?.takeIf { c -> c !== it } }

        private fun diskFull(e: Throwable) = chain(e).any { c -> c.message?.let { "ENOSPC" in it || "No space left" in it } == true }

        /** Errores de red que merece la pena reintentar solos */
        fun isTransient(e: Throwable): Boolean = !diskFull(e) && chain(e).none { it is SMBApiException } && chain(e).any {
            it is SocketException || it is SocketTimeoutException || it is ConnectException || it is NoRouteToHostException ||
                it is TimeoutException || it is SMBRuntimeException || it is java.io.EOFException ||
                it.javaClass.simpleName.contains("Transport")
        }

        /** Mensaje en español para la pantalla de Descargas */
        fun friendly(e: Throwable): String = when {
            diskFull(e) -> "No queda espacio en el móvil. Libera espacio y vuelve a intentarlo."
            isTransient(e) -> "No se puede conectar con el PC. Comprueba que está encendido y en la misma red."
            else -> e.message ?: e.javaClass.simpleName
        }
    }
}
