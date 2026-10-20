package com.cinelocal.android.player

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.cinelocal.android.core.Languages
import com.cinelocal.android.core.PlayQueue
import com.cinelocal.android.core.SubFile
import com.cinelocal.android.repo
import com.cinelocal.android.ui.epMeta
import com.cinelocal.android.ui.seriesState
import com.cinelocal.android.ui.theme.CineLocalTheme
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.interfaces.IMedia
import org.videolan.libvlc.util.VLCVideoLayout
import java.io.IOException
import java.util.concurrent.Executors
import com.cinelocal.android.ui.title

/** Un elemento de la lista de reproducción (película o episodio) */
data class PlayItem(val path: String, val title: String, val subtitle: String?, val start: Double, val subs: List<SubFile>)

/** De dónde se reproduce: el archivo descargado (y sus subtítulos descargados) o la carpeta compartida por SMB */
private class Source(val video: Uri, val subs: List<Uri>, val local: Boolean)

data class Track(val id: Int, val name: String)

class PlayerActivity : ComponentActivity() {

    private lateinit var libVlc: LibVLC
    private lateinit var player: MediaPlayer
    private lateinit var videoLayout: VLCVideoLayout
    private val handler = Handler(Looper.getMainLooper())

    private var playlist: List<PlayItem> = emptyList()
    private var index = 0
    private var tracksApplied = false
    private var pendingStartMs = 0L
    private var currentLocal = false

    /** Rutas de [playlist], para [PlayQueue] */
    private var paths: List<String> = emptyList()
    private var isMovie = false
    private var autoplay = false
    /** Ya se sabe por dónde empezar */
    private var ready = false
    /** Entre onStart y onStop */
    private var started = false
    /** Último resultado de la comprobación de conexión con el PC (null: aún no se ha comprobado) */
    @Volatile private var lastReachable: Boolean? = null
    /** Comprobaciones de red y de archivos descargados, fuera del hilo principal */
    private val io = Executors.newSingleThreadExecutor()

    // estado que pinta la interfaz
    val state = PlayerUiState()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        val fromStart = intent.getBooleanExtra(EXTRA_FROM_START, false)
        val requested = buildPlaylist(intent.getStringExtra(EXTRA_ITEM).orEmpty(), intent.getStringExtra(EXTRA_EPISODE))
        if (playlist.isEmpty() || requested < 0) { finish(); return }

        libVlc = LibVLC(this, arrayListOf(
            "--network-caching=3000",     // por Wi-Fi conviene más margen que en local
            "--audio-time-stretch",
            "--no-sub-autodetect-file"    // los subtítulos externos los añade la app (ya los conoce del escaneo)
        ))
        player = MediaPlayer(libVlc)
        videoLayout = VLCVideoLayout(this)
        player.setEventListener(::onEvent)

        setContent {
            CineLocalTheme {
                PlayerScreen(
                    state = state,
                    videoLayout = videoLayout,
                    hasNext = { ready && autoplay && PlayQueue.next(paths, index, ::isLocal) { lastReachable ?: true } != null },
                    onBack = { finish() },
                    onTogglePlay = { if (player.isPlaying) player.pause() else player.play() },
                    onSeekTo = { ms -> player.time = ms.coerceIn(0, maxOf(0, player.length - 1000)); state.time = player.time },
                    onSeekBy = { d -> player.time = (player.time + d).coerceIn(0, maxOf(0, player.length - 1000)); state.time = player.time },
                    onNext = { saveProgress(); advance() },
                    audioTracks = { player.audioTracks?.map { Track(it.id, it.name) }.orEmpty() },
                    subTracks = { player.spuTracks?.map { Track(it.id, it.name) }.orEmpty() },
                    currentAudio = { player.audioTrack },
                    currentSub = { player.spuTrack },
                    onAudio = { player.setAudioTrack(it) },
                    onSub = { player.setSpuTrack(it) },
                    onToggleFill = {
                        state.fill = !state.fill
                        player.videoScale = if (state.fill) MediaPlayer.ScaleType.SURFACE_FILL else MediaPlayer.ScaleType.SURFACE_BEST_FIT
                    }
                )
            }
        }

        // Por dónde empezar: lo descargado se reproduce siempre desde el móvil; si lo pedido no lo está,
        // se comprueba si se llega al PC (puede tardar un par de segundos, por eso fuera del hilo principal)
        val explicit = intent.getBooleanExtra(EXTRA_EXPLICIT, false)
        state.buffering = true
        io.execute {
            val pick = PlayQueue.start(paths, requested, explicit, isMovie, ::isLocal, ::probe)
            // empezando por algo descargado, se mira ya si hay conexión para saber si hay "siguiente"
            if (pick.index != null && autoplay && lastReachable == null && pick.index < paths.size - 1) probe()
            handler.post {
                if (isDestroyed) return@post
                val i = pick.index
                if (i == null) {
                    state.buffering = false
                    state.error = pick.message ?: "No se pudo reproducir el archivo."
                    return@post
                }
                // el pedido conserva "desde el principio"; si se cambió por otro descargado, se sigue donde se quedó
                val start = repo.startOf(paths[i], fromStart && !pick.switched(requested))
                playlist = playlist.toMutableList().also { it[i] = it[i].copy(start = start) }
                index = i
                ready = true
                if (started) playIndex(i)
            }
        }
    }

    override fun onStart() {
        super.onStart()
        started = true
        player.attachViews(videoLayout, null, true, false)
        if (player.media == null) { if (ready) playIndex(index) } else player.play()
        handler.post(ticker)
    }

    override fun onStop() {
        super.onStop()
        started = false
        handler.removeCallbacks(ticker)
        saveProgress()
        player.pause()
        player.detachViews()
        repo.flushAll()
    }

    override fun onDestroy() {
        super.onDestroy()
        io.shutdownNow()
        handler.removeCallbacksAndMessages(null)
        if (::player.isInitialized) {
            player.setEventListener(null)
            player.stop()
            player.release()
            libVlc.release()
        }
    }

    // ---------------------------------------------------------------- lista de reproducción

    /**
     * Como buildPlaylist() en main.js, pero con todos los episodios de la serie (o la película) en [playlist];
     * devuelve el índice del pedido. Qué se reproduce de verdad (y qué sigue) lo decide [PlayQueue] según
     * lo descargado y si se llega al PC.
     */
    private fun buildPlaylist(itemId: String, episodeId: String?): Int {
        val t = repo.title(itemId) ?: return -1
        autoplay = repo.settings.value.autoplayNext
        if (t.isMovie) {
            isMovie = true
            autoplay = false
            playlist = listOf(PlayItem(t.item.path, t.name, null, 0.0, t.item.subs))
            paths = playlist.map { it.path }
            return 0
        }
        val eps = t.item.episodes
        if (eps.isEmpty()) return -1
        playlist = eps.map { e ->
            val em = epMeta(t, e)
            PlayItem(e.path, t.name, e.label + (em.title?.let { " · $it" } ?: ""), 0.0, e.subs)
        }
        paths = playlist.map { it.path }
        return episodeId?.let { id -> eps.indexOfFirst { it.id == id } }?.takeIf { it >= 0 }
            ?: eps.indexOf(seriesState(t, repo.progress.value).ep)
    }

    /** Descargado y en el móvil */
    private fun isLocal(path: String) = repo.downloads.localIfDone(path) != null

    /** ¿Se llega ahora al PC? Hace red: solo desde [io] */
    private fun probe(): Boolean = repo.pcReachable().also { lastReachable = it }

    /** Al terminar un episodio o con "Siguiente": el siguiente que se pueda reproducir (sin conexión, el siguiente descargado) */
    private fun advance() {
        if (!autoplay) { finish(); return }
        val cur = index
        state.buffering = true
        io.execute {
            val n = PlayQueue.next(paths, cur, ::isLocal, ::probe)
            handler.post {
                if (isDestroyed) return@post
                if (n == null) finish() else playIndex(n)
            }
        }
    }

    private fun playIndex(i: Int) {
        if (i !in playlist.indices) { finish(); return }
        index = i
        val item = playlist[i]
        tracksApplied = false
        state.title = item.title
        state.subtitle = item.subtitle
        state.error = null
        state.time = 0
        state.length = 0
        state.buffering = true
        pendingStartMs = (item.start * 1000).toLong()

        val src = try {
            source(item)
        } catch (e: IOException) {
            // p. ej. la ruta de red de Ajustes no es válida: se explica aquí en vez de cerrar la app
            state.buffering = false
            state.error = "No se puede abrir el archivo.\n" + (e.message ?: "Revisa la carpeta de red en Ajustes.")
            player.stop()
            return
        }
        currentLocal = src.local
        val s = repo.settings.value
        val media = Media(libVlc, src.video).apply {
            setHWDecoderEnabled(true, false)
            Languages.vlcList(s.audioLang).takeIf { it.isNotEmpty() }?.let { addOption(":audio-language=$it") }
            if (pendingStartMs > 0) addOption(":start-time=${pendingStartMs / 1000.0}")
        }
        player.media = media
        media.release()
        for (sub in src.subs) player.addSlave(IMedia.Slave.Type.Subtitle, sub, false)
        player.play()
    }

    /** El archivo descargado si lo está (sin tocar la red); si no, por SMB */
    private fun source(item: PlayItem): Source {
        val dl = repo.downloads
        val local = dl.localIfDone(item.path)
        if (local != null) {
            val subs = item.subs.mapNotNull { s -> dl.localFile(s.path).takeIf { it.isFile }?.let(Uri::fromFile) }
            return Source(Uri.fromFile(local), subs, true)
        }
        return Source(repo.playbackUri(item.path), item.subs.map { repo.playbackUri(it.path) }, false)
    }

    // ---------------------------------------------------------------- eventos de VLC

    private fun onEvent(e: MediaPlayer.Event) {
        when (e.type) {
            MediaPlayer.Event.Playing -> { state.playing = true; state.buffering = false }
            MediaPlayer.Event.Paused, MediaPlayer.Event.Stopped -> state.playing = false
            MediaPlayer.Event.Buffering -> state.buffering = e.buffering < 100f
            MediaPlayer.Event.TimeChanged -> { state.time = e.timeChanged; state.buffering = false }
            MediaPlayer.Event.LengthChanged -> state.length = e.lengthChanged
            MediaPlayer.Event.Vout, MediaPlayer.Event.ESAdded -> if (!tracksApplied) {
                handler.removeCallbacks(applyTracks)
                handler.postDelayed(applyTracks, 1200)
            }
            MediaPlayer.Event.EndReached -> {
                val item = playlist[index]
                val dur = player.length / 1000.0
                if (dur > 0) repo.saveProgress(item.path, dur, dur)
                advance()
            }
            MediaPlayer.Event.EncounteredError -> {
                state.buffering = false
                if (currentLocal) {
                    state.error = "No se pudo reproducir el archivo descargado.\nPrueba a borrar la descarga y a descargarlo otra vez."
                    return
                }
                val generic = "No se pudo reproducir el archivo.\nComprueba que el PC está encendido y la carpeta compartida accesible."
                state.error = generic
                // si es que se ha perdido la conexión, se dice así
                io.execute {
                    if (!probe()) handler.post {
                        if (!isDestroyed && state.error == generic) state.error =
                            (if (isMovie) PlayQueue.MOVIE_NOT_DOWNLOADED else PlayQueue.EPISODE_NOT_DOWNLOADED) +
                                "\nSolo puedes ver lo descargado."
                    }
                }
            }
        }
    }

    /**
     * Subtítulos según Ajustes (como mpv en escritorio con --slang y --subs-with-matching-audio):
     * - "off": ninguno.
     * - "foreign": si el audio ya está en el idioma de los subtítulos, solo los forzados.
     * - "always": los completos del idioma elegido.
     */
    private val applyTracks = Runnable {
        if (tracksApplied || !::player.isInitialized) return@Runnable
        val subs = player.spuTracks?.filter { it.id != -1 }.orEmpty()
        val s = repo.settings.value
        tracksApplied = true

        val mediaTracks = player.media?.let { m -> (0 until m.trackCount).mapNotNull { m.getTrack(it) } }.orEmpty()
        fun langOf(id: Int, type: Int, name: String?): String =
            listOfNotNull(mediaTracks.firstOrNull { it.type == type && it.id == id }?.let { "${it.language} ${it.description}" }, name).joinToString(" ")

        val audioId = player.audioTrack
        val audioName = player.audioTracks?.firstOrNull { it.id == audioId }?.name
        val audioIsPref = Languages.matches(langOf(audioId, IMedia.Track.Type.Audio, audioName), s.subLang)

        val external = playlist[index].subs
        data class Cand(val id: Int, val pref: Boolean, val forced: Boolean)
        // los externos aparecen con su nombre de archivo (en local) o como "Track N" (por SMB);
        // los que no se reconocen por el nombre son las últimas pistas, en el orden en que se añadieron
        fun byName(d: MediaPlayer.TrackDescription) =
            external.firstOrNull { d.name?.contains(it.path.substringAfterLast('/').substringBeforeLast('.'), true) == true }
        val named = subs.mapNotNull(::byName).toSet()
        val restExt = external.filter { it !in named }
        val restTracks = subs.filter { byName(it) == null }.takeLast(restExt.size)
        val cands = subs.map { d ->
            val text = langOf(d.id, IMedia.Track.Type.Text, d.name)
            val ext = byName(d) ?: restTracks.indexOf(d).takeIf { it >= 0 }?.let { restExt.getOrNull(it + restExt.size - restTracks.size) }
            val pref = if (ext != null) ext.lang == s.subLang else Languages.matches(text, s.subLang)
            Cand(d.id, pref, ext?.forced ?: Languages.isForced(d.name))
        }

        val pick = when {
            s.subMode == "off" || s.subLang == "none" -> null
            s.subMode == "foreign" && audioIsPref -> cands.firstOrNull { it.pref && it.forced }
            else -> cands.firstOrNull { it.pref && !it.forced } ?: cands.firstOrNull { it.pref }
        }
        player.setSpuTrack(pick?.id ?: -1)
    }

    // ---------------------------------------------------------------- progreso

    private val ticker = object : Runnable {
        var n = 0
        override fun run() {
            if (++n % 5 == 0 && player.isPlaying) saveProgress()
            handler.postDelayed(this, 1000)
        }
    }

    private fun saveProgress() {
        if (!::player.isInitialized || playlist.isEmpty()) return
        val pos = player.time / 1000.0
        val dur = player.length / 1000.0
        if (dur > 0 && pos > 0) repo.saveProgress(playlist[index].path, pos, dur)
    }

    companion object {
        private const val EXTRA_ITEM = "item"
        private const val EXTRA_EPISODE = "episode"
        private const val EXTRA_FROM_START = "fromStart"
        private const val EXTRA_EXPLICIT = "explicit"

        /**
         * [explicit]: se tocó ese episodio en concreto (sin conexión y sin descargar, se avisa); si no
         * (Reproducir, Continuar…), sin conexión se reproduce el siguiente episodio descargado.
         */
        fun intent(ctx: Context, itemId: String, episodeId: String?, fromStart: Boolean, explicit: Boolean = false) =
            Intent(ctx, PlayerActivity::class.java)
                .putExtra(EXTRA_ITEM, itemId)
                .putExtra(EXTRA_EPISODE, episodeId)
                .putExtra(EXTRA_FROM_START, fromStart)
                .putExtra(EXTRA_EXPLICIT, explicit)
    }
}

class PlayerUiState {
    var title by mutableStateOf("")
    var subtitle by mutableStateOf<String?>(null)
    var playing by mutableStateOf(false)
    var buffering by mutableStateOf(true)
    var time by mutableLongStateOf(0L)
    var length by mutableLongStateOf(0L)
    var error by mutableStateOf<String?>(null)
    var fill by mutableStateOf(false)
}
