package com.cinelocal.android.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Uri
import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.LibraryData
import com.cinelocal.android.core.LibraryItem
import com.cinelocal.android.core.LibraryScanner
import com.cinelocal.android.core.MetaEntry
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.SegRequest
import com.cinelocal.android.core.Settings
import com.cinelocal.android.core.Title
import com.cinelocal.android.core.UserState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import java.io.File
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket

data class Status(
    val scanning: Boolean = false,
    val metaDone: Int = 0,
    val metaTotal: Int = 0,
    val message: String? = null
)

/** Estado de la app: biblioteca, metadatos, progreso y ajustes (equivalente a main.js en escritorio) */
class Repository(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val dir: File = context.filesDir

    private fun <T> store(name: String, ser: kotlinx.serialization.KSerializer<T>, def: T) = JsonStore(File(dir, name), ser, def, scope)

    val settings = store("settings.json", Settings.serializer(), Settings())
    val library = store("library.json", LibraryData.serializer(), LibraryData())
    val metadata = store("metadata.json", MapSerializer(String.serializer(), MetaEntry.serializer()), emptyMap())
    val progress = store("progress.json", MapSerializer(String.serializer(), Progress.serializer()), emptyMap())
    val userState = store("state.json", UserState.serializer(), UserState())

    /** Actualizaciones desde las releases de GitHub */
    val updater = Updater(context, scope, dir) { settings.value.autoUpdate }

    private val _status = MutableStateFlow(Status())
    val status: StateFlow<Status> = _status.asStateFlow()

    /** Biblioteca con sus metadatos */
    val titles: StateFlow<List<Title>> = combine(library.flow, metadata.flow) { lib, meta ->
        lib.items.map { Title(it, meta[it.id]?.meta) }
    }.stateIn(scope, SharingStarted.Eagerly, emptyList())

    fun title(id: String): Title? = titles.value.firstOrNull { it.id == id }

    // ---------------------------------------------------------------- descargas y modo sin conexión

    /** Descargas para ver sin el PC (cola, servicio y archivos locales), desde la carpeta de red o desde CineLocal Server */
    val downloads = DownloadManager(context, scope, dir, { settings.value }) {
        if (settings.value.server) FileSource { path, dest, offset, onChunk ->
            val url = library.value.links[path] ?: throw IOException("Vuelve a cargar la biblioteca para descargar este archivo")
            server().download(url, dest, offset, onChunk)
        } else SmbLibrary(location(), credentials())
    }

    /** El último escaneo no pudo leer la carpeta compartida: solo se puede ver lo descargado */
    val offline: StateFlow<Boolean> = library.flow.map { it.error != null && it.items.isNotEmpty() }
        .stateIn(scope, SharingStarted.Eagerly, false)

    /** Filtro rápido "solo lo descargado" de Inicio, Películas, Series y Mi lista */
    val onlyDownloaded = MutableStateFlow(false)

    // ---------------------------------------------------------------- saltar intro (TheIntroDB)

    /** Tramos de intro, resumen y créditos, con caché en skip.json */
    val introDb = IntroDb(dir, scope, version = { updater.installed })

    /** Qué preguntar a TheIntroDB por una película ([e] null) o un episodio; null si el título no está identificado en TMDB */
    fun segRequest(t: Title, e: Episode?): SegRequest? {
        val id = t.meta?.tmdbId ?: return null
        return if (t.isMovie || e == null) SegRequest(id) else SegRequest(id, e.season, e.episode)
    }

    init {
        // Lo descargado (o en cola) guarda sus tramos al pedirlo, para tener el botón sin conexión
        @OptIn(kotlinx.coroutines.FlowPreview::class)
        scope.launch {
            combine(downloads.index.flow, titles) { idx, ts ->
                val byId = ts.associateBy { it.id }
                idx.files.mapNotNull { f ->
                    val t = byId[f.itemId] ?: return@mapNotNull null
                    segRequest(t, f.episodeId?.let { id -> t.item.episodes.firstOrNull { it.id == id } })
                }
            }.distinctUntilChanged().debounce(2000).collect { introDb.prefetch(it) }
        }
    }

    // ---------------------------------------------------------------- Letterboxd

    val letterboxd = LetterboxdService(
        context, dir, scope,
        tmdb = { settings.value.let { Tmdb(it.tmdbKey, it.metaLang, it.region) } },
        libraryIndex = ::libraryIndex,
        onUpdated = ::markLetterboxdWatched
    )

    /** Películas de Letterboxd con su id de TMDB */
    val lbEntries: StateFlow<List<LbEntry>> = letterboxd.store.flow
        .map { letterboxd.entries(it) }
        .stateIn(scope, SharingStarted.Eagerly, emptyList())

    /** Por id de TMDB, para cruzarlas con la biblioteca */
    val lbById: StateFlow<Map<Int, LbEntry>> = lbEntries
        .map { list -> list.filter { it.tmdbId != null }.associateBy { it.tmdbId!! } }
        .stateIn(scope, SharingStarted.Eagerly, emptyMap())

    /** Título y año de cada película de la biblioteca -> su id de TMDB */
    private fun libraryIndex(): Map<String, Int> {
        val out = HashMap<String, Int>()
        for (t in titles.value) {
            val id = t.meta?.tmdbId ?: continue
            if (!t.isMovie) continue
            val year = t.meta.year ?: t.item.year
            for (name in listOf(t.meta.title, t.meta.originalTitle, t.item.title)) if (!name.isNullOrBlank()) out[Letterboxd.keyOf(name, year)] = id
        }
        return out
    }

    /** Marca como vistas las películas de la biblioteca vistas en Letterboxd, si no tienen progreso en CineLocal */
    fun markLetterboxdWatched() {
        if (!settings.value.lbMarkWatched || settings.value.server) return
        // de lo guardado, no de lbEntries: justo después de sincronizar aún puede tener la lista anterior
        val seen = letterboxd.entries().filter { it.film.watched }.mapNotNull { it.tmdbId }.toSet()
        val now = System.currentTimeMillis()
        val add = titles.value.filter { it.isMovie && it.meta?.tmdbId in seen && progress.value[it.item.path] == null }
            .associate { it.item.path to Progress(watched = true, at = now, lb = true) }
        if (add.isNotEmpty()) progress.update { it + add }
    }

    fun lbSync(full: Boolean = true) = letterboxd.sync(settings.value.lbUser, full)

    fun lbImport(bytes: ByteArray) = letterboxd.importExport(bytes, settings.value.lbUser)

    /** Al abrir: sincronización completa si cambió el usuario o hace más de 3 días; si no, sólo lo último (RSS) */
    fun autoSyncLetterboxd() = scope.launch {
        delay(15_000)   // después del escaneo y los metadatos, como en escritorio
        val user = settings.value.lbUser
        if (user.isBlank()) return@launch
        val d = letterboxd.store.value
        val full = d.user != Letterboxd.cleanUser(user) || System.currentTimeMillis() - d.fullAt > 3L * 24 * 3600 * 1000
        letterboxd.sync(user, full)
    }

    fun clearMessage() = _status.update { it.copy(message = null) }

    // ---------------------------------------------------------------- ajustes

    fun saveSettings(new: Settings) {
        val old = settings.value
        settings.set(new)
        if (old.server != new.server) swapLibrary(toServer = new.server)
        val libraryChanged = old.libraryPath != new.libraryPath || old.smbUser != new.smbUser || old.smbPassword != new.smbPassword ||
            old.server != new.server || old.serverUrl != new.serverUrl || old.serverToken != new.serverToken
        if (old.libraryPath != new.libraryPath && !new.server) library.set(LibraryData())
        if (libraryChanged) scan()
        else if (old.tmdbKey != new.tmdbKey || old.metaLang != new.metaLang) fetchMissingMetadata()
        if (Letterboxd.cleanUser(old.lbUser) != Letterboxd.cleanUser(new.lbUser)) {
            if (letterboxd.store.value.user.isNotEmpty()) letterboxd.reset()
            if (new.lbUser.isNotBlank()) letterboxd.sync(new.lbUser, full = true)
        }
        if (!old.lbMarkWatched && new.lbMarkWatched) markLetterboxdWatched()
    }

    // ---------------------------------------------------------------- CineLocal Server

    private fun server(s: Settings = settings.value) = CineServer(s.serverUrl, s.serverToken)

    /** Inicia sesión en el servidor con el usuario de DSM; devuelve el token (lanza CineServer.LoginException) */
    suspend fun serverLogin(url: String, user: String, password: String, otp: String?): String = withContext(Dispatchers.IO) {
        CineServer(url).login(user, password, otp)
    }

    suspend fun serverLogout() = withContext(Dispatchers.IO) { server().logout() }

    // La biblioteca, los metadatos, el progreso y Mi lista de la carpeta de red se guardan aparte mientras se usa
    // el servidor (y al revés), para que cambiar de origen no mezcle ni pierda nada
    private val stash = mapOf(
        true to Stash(store("library.server.json", LibraryData.serializer(), LibraryData()), store("metadata.server.json", MapSerializer(String.serializer(), MetaEntry.serializer()), emptyMap()),
            store("progress.server.json", MapSerializer(String.serializer(), Progress.serializer()), emptyMap()), store("favorites.server.json", ListSerializer(String.serializer()), emptyList())),
        false to Stash(store("library.local.json", LibraryData.serializer(), LibraryData()), store("metadata.local.json", MapSerializer(String.serializer(), MetaEntry.serializer()), emptyMap()),
            store("progress.local.json", MapSerializer(String.serializer(), Progress.serializer()), emptyMap()), store("favorites.local.json", ListSerializer(String.serializer()), emptyList()))
    )

    private class Stash(
        val library: JsonStore<LibraryData>, val metadata: JsonStore<Map<String, MetaEntry>>,
        val progress: JsonStore<Map<String, Progress>>, val favorites: JsonStore<List<String>>
    )

    private fun swapLibrary(toServer: Boolean) {
        stash.getValue(!toServer).apply {
            library.set(this@Repository.library.value); metadata.set(this@Repository.metadata.value)
            progress.set(this@Repository.progress.value); favorites.set(userState.value.favorites)
        }
        stash.getValue(toServer).apply {
            this@Repository.library.set(library.value); this@Repository.metadata.set(metadata.value)
            this@Repository.progress.set(progress.value); userState.update { it.copy(favorites = favorites.value) }
        }
        onlyDownloaded.value = false
    }

    /** Ruta del archivo → id del vídeo en el servidor (película o episodio) */
    private fun serverId(path: String): String? {
        for (it in library.value.items) {
            if (it.isMovie) { if (it.path == path) return it.id } else it.episodes.firstOrNull { e -> e.path == path }?.let { e -> return e.id }
        }
        return null
    }

    private val progressSent = HashMap<String, Long>()

    /** Envía el progreso al servidor como mucho cada 10 s por archivo (siempre si se ha terminado) */
    private fun syncProgress(path: String, p: Progress, force: Boolean) {
        if (!settings.value.server) return
        val now = System.currentTimeMillis()
        if (!force && now - (progressSent[path] ?: 0) < 10_000) return
        progressSent[path] = now
        val id = serverId(path) ?: return
        scope.launch(Dispatchers.IO) {
            runCatching { if (p.watched) server().mark(listOf(path), true) else server().reportProgress(id, p.pos, p.dur) }
        }
    }

    /** Biblioteca del servidor. El progreso se junta con el del móvil: lo más reciente de cada archivo gana */
    private fun scanServer() {
        val r = server().library()
        val now = System.currentTimeMillis()
        val lang = settings.value.metaLang
        library.set(LibraryData(r.items, now, r.error, r.links))
        metadata.set(r.items.associate { it.id to MetaEntry(r.meta[it.id]?.tmdbId, r.meta[it.id], lang, now, seasons = it.seasons) })
        val local = progress.value
        val newer = local.filter { (k, v) -> v.at > (r.progress[k]?.at ?: 0) }
        progress.set(r.progress + newer)
        // lo visto sin conexión (descargado) sube ahora
        for ((k, v) in newer) syncProgress(k, v, force = true)
        userState.update { it.copy(favorites = r.favorites) }
    }

    private fun location(s: Settings = settings.value): SmbLocation =
        SmbLocation.parse(s.libraryPath) ?: throw IOException("Ruta de red no válida. Escríbela como \\\\EQUIPO\\Carpeta")

    private fun credentials(s: Settings = settings.value) = SmbCredentials(s.smbUser, s.smbPassword)

    /** Prueba la conexión con la carpeta de red; devuelve un resumen de lo que hay */
    suspend fun testConnection(s: Settings): String = withContext(Dispatchers.IO) {
        SmbLibrary(location(s), credentials(s)).use { fs ->
            val entries = fs.list("")
            val dirs = entries.count { it.isDir }
            val files = entries.count { !it.isDir }
            "Conectado: $dirs carpetas y $files archivos"
        }
    }

    suspend fun testTmdb(key: String) = withContext(Dispatchers.IO) { Tmdb(key).test() }

    /**
     * Si ahora mismo se llega al PC de la carpeta compartida (no depende del último escaneo, que puede ser
     * de antes de quitar el Wi-Fi): sin red no hay nada que probar; con red, se intenta abrir una conexión
     * al puerto SMB. Hace red: nunca desde el hilo principal.
     */
    fun pcReachable(timeoutMs: Int = 2000): Boolean {
        val s = settings.value
        val (host, port) = if (s.server) server(s).hostPort() ?: return false
            else SmbLocation.parse(s.libraryPath)?.let { it.host to (it.port ?: 445) } ?: return false
        val cm = context.getSystemService(ConnectivityManager::class.java)
        if (cm != null && cm.activeNetwork == null) return false
        return try {
            Socket().use { it.connect(InetSocketAddress(host, port), timeoutMs) }
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Dirección por SMB para LibVLC. Lanza IOException si la ruta de red de Ajustes no es válida. */
    fun playbackUri(relPath: String): Uri {
        if (settings.value.server) {
            val url = library.value.links[relPath] ?: throw IOException("Vuelve a cargar la biblioteca: falta el enlace a este vídeo en el servidor.")
            return Uri.parse(url)
        }
        return SmbLibrary.playbackUri(location(), credentials(), relPath)
    }

    // ---------------------------------------------------------------- escaneo

    private var scanJob: Job? = null

    fun scan() {
        if (!settings.value.configured || scanJob?.isActive == true) return
        scanJob = scope.launch {
            _status.update { it.copy(scanning = true) }
            try {
                if (settings.value.server) {
                    withContext(Dispatchers.IO) { scanServer() }
                } else {
                    val items = withContext(Dispatchers.IO) {
                        SmbLibrary(location(), credentials()).use { LibraryScanner.scan(it) }
                    }
                    library.set(LibraryData(items, System.currentTimeMillis(), null))
                }
                onlyDownloaded.value = false
            } catch (e: Exception) {
                // Si el equipo no está encendido, se conserva la biblioteca conocida
                // errores de red en español ("failed to connect … ENETUNREACH" no le dice nada a nadie)
                val msg = DownloadManager.friendly(e)
                library.update { it.copy(error = msg) }
                _status.update { it.copy(message = msg) }
            } finally {
                _status.update { it.copy(scanning = false) }
            }
            fetchMissingMetadata()
        }
    }

    // ---------------------------------------------------------------- metadatos

    private var metaJob: Job? = null

    private fun needsFetch(it: LibraryItem, lang: String, force: Boolean): Boolean {
        val m = metadata.value[it.id] ?: return true
        if (m.lang != lang) return true
        if (m.tmdbId == null) return force || System.currentTimeMillis() - m.at > 7L * 24 * 3600 * 1000
        if (force && !m.manual) return true
        return !it.isMovie && !m.seasons.containsAll(it.seasons)
    }

    fun fetchMissingMetadata(force: Boolean = false) {
        val s = settings.value
        if (s.server) return   // los metadatos los descarga el servidor
        val api = Tmdb(s.tmdbKey, s.metaLang, s.region)
        if (!api.enabled || metaJob?.isActive == true) return
        metaJob = scope.launch(Dispatchers.IO) {
            val todo = library.value.items.filter { needsFetch(it, s.metaLang, force) }
            if (todo.isEmpty()) return@launch
            _status.update { it.copy(metaDone = 0, metaTotal = todo.size) }
            for ((i, it) in todo.withIndex()) {
                try { fetchItem(api, it, s.metaLang) } catch (e: IOException) {
                    if (e.message?.contains(Regex("no válida|conectar")) == true) {
                        _status.update { st -> st.copy(message = e.message) }
                        break
                    }
                }
                _status.update { st -> st.copy(metaDone = i + 1) }
            }
            _status.update { it.copy(metaDone = 0, metaTotal = 0) }
            markLetterboxdWatched()   // películas recién identificadas que ya viste en Letterboxd
        }
    }

    private fun fetchItem(api: Tmdb, it: LibraryItem, lang: String, forcedId: Int? = null) {
        val prev = metadata.value[it.id]
        val type = if (it.isMovie) "movie" else "series"
        // Un título ya identificado conserva su id (también al cambiar de idioma); solo se busca si no lo hay
        val id = forcedId ?: prev?.tmdbId ?: api.findBest(type, it.title, it.year)
        val meta = id?.let { tid -> if (it.isMovie) api.movie(tid) else api.tv(tid, it.seasons) }
        metadata.update { m ->
            m + (it.id to MetaEntry(id, meta, lang, System.currentTimeMillis(), forcedId != null || prev?.manual == true, it.seasons))
        }
    }

    /** Corregir coincidencia: búsqueda manual en TMDB */
    suspend fun searchTmdb(type: String, query: String, year: Int?) = withContext(Dispatchers.IO) {
        val s = settings.value
        Tmdb(s.tmdbKey, s.metaLang, s.region).search(type, query, year)
    }

    suspend fun identify(itemId: String, tmdbId: Int) = withContext(Dispatchers.IO) {
        val s = settings.value
        if (s.server) { server(s).identify(itemId, tmdbId); scanServer(); return@withContext }
        val item = library.value.items.first { it.id == itemId }
        fetchItem(Tmdb(s.tmdbKey, s.metaLang, s.region), item, s.metaLang, tmdbId)
    }

    // ---------------------------------------------------------------- progreso y Mi lista

    fun progressOf(path: String): Progress? = progress.value[path]

    /** Posición de inicio en segundos (como startOf() en main.js) */
    fun startOf(path: String, fromStart: Boolean): Double {
        val pr = progress.value[path]
        if (fromStart || pr == null || pr.watched) return 0.0
        return if (pr.pos > 10 && pr.dur - pr.pos > 30) pr.pos else 0.0
    }

    fun saveProgress(path: String, pos: Double, dur: Double) {
        if (dur <= 0) return
        progress.update { all ->
            val prev = all[path]
            val watched = pos / dur >= 0.92 || (dur - pos < 120 && dur > 600)
            all + (path to Progress(
                pos = if (watched) 0.0 else pos, dur = dur,
                watched = watched || (prev?.watched == true && pos < 30),
                at = System.currentTimeMillis()
            ))
        }
        progress.value[path]?.let { syncProgress(path, it, force = it.watched) }
    }

    fun markWatched(paths: List<String>, watched: Boolean) {
        progress.update { all ->
            if (watched) all + paths.associateWith { Progress(0.0, all[it]?.dur ?: 0.0, true, System.currentTimeMillis()) }
            else all - paths.toSet()
        }
        if (settings.value.server) scope.launch(Dispatchers.IO) { runCatching { server().mark(paths, watched) } }
    }

    fun isFavorite(id: String) = id in userState.value.favorites

    fun toggleFavorite(id: String) {
        userState.update { st ->
            st.copy(favorites = if (id in st.favorites) st.favorites - id else listOf(id) + st.favorites)
        }
        if (settings.value.server) scope.launch(Dispatchers.IO) { runCatching { server().toggleFavorite(id) } }
    }

    // ---------------------------------------------------------------- peticiones de descarga (ntfy)

    /** Avisa por ntfy de que quieres una película que no está en la biblioteca (de la watchlist o buscada en TMDB) */
    suspend fun requestDownload(e: LbEntry) = withContext(Dispatchers.IO) {
        val s = settings.value
        val f = e.film
        val name = e.localTitle ?: f.title
        val year = f.year?.let { " ($it)" }.orEmpty()
        val tmdb = e.tmdbId?.let { "https://www.themoviedb.org/movie/$it" }
        val links = listOfNotNull(f.url?.let { Ntfy.Link("Letterboxd", it) }, tmdb?.let { Ntfy.Link("TMDB", it) })
        Ntfy(s.ntfyServer, s.ntfyTopic, s.ntfyToken).send(
            title = "Descargar: $name$year",
            message = listOfNotNull(
                if (name != f.title) "${f.title}$year" else null,
                if (f.watchlist) "Pedida desde CineLocal: está en tu watchlist de Letterboxd y no en la biblioteca."
                else "Pedida desde CineLocal: la buscaste en TMDB y no está en la biblioteca."
            ).joinToString("\n"),
            tags = listOf("movie_camera"),
            click = f.url ?: tmdb,
            links = links
        )
        userState.update { it.copy(requested = it.requested + (e.key to System.currentTimeMillis())) }
    }

    suspend fun testNtfy(s: Settings) = withContext(Dispatchers.IO) {
        Ntfy(s.ntfyServer, s.ntfyTopic, s.ntfyToken).send("CineLocal", "Aviso de prueba: las peticiones de descarga llegarán aquí.", listOf("white_check_mark"))
    }

    fun flushAll() {
        for (s in listOf(settings, library, metadata, progress, userState, letterboxd.store, updater.memory, downloads.index, introDb.store)) s.flush()
    }
}
