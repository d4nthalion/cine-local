package com.cinelocal.android.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Languages
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Settings
import com.cinelocal.android.core.Space
import com.cinelocal.android.data.CineServer
import com.cinelocal.android.data.Ntfy
import com.cinelocal.android.data.UpdatePhase
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.AppMenu
import com.cinelocal.android.ui.components.AppMenuItem
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.BarIcon
import com.cinelocal.android.ui.components.PrimaryButton
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.TNUM
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val META_LANGS = listOf("es-ES" to "Español (España)", "es-MX" to "Español (México)", "en-US" to "English", "ca-ES" to "Català", "fr-FR" to "Français", "de-DE" to "Deutsch", "it-IT" to "Italiano", "pt-PT" to "Português")
private val SUB_MODES = listOf(
    "always" to "Siempre",
    "foreign" to "Sólo si el audio está en otro idioma",
    "off" to "Nunca (activables durante la reproducción)"
)

@Composable
fun SettingsScreen(nav: Nav) {
    val ctx = LocalContext.current
    val repo = ctx.repo
    val scope = rememberCoroutineScope()
    val saved by repo.settings.flow.collectAsStateWithLifecycle()
    var s by remember { mutableStateOf(repo.settings.value) }
    var showPass by remember { mutableStateOf(false) }
    var libTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var tmdbTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var showToken by remember { mutableStateOf(false) }
    var ntfyTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var serverPass by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var needOtp by remember { mutableStateOf(false) }
    var serverTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    val dirty = s != saved
    val scroll = rememberScrollState()

    fun save() { repo.saveSettings(s); nav.back() }

    Column(Modifier.fillMaxSize().imePadding()) {
        BackTopBar("Ajustes", onBack = { nav.back() }, divider = scroll.value > 0)
        Column(Modifier.weight(1f).verticalScroll(scroll).padding(horizontal = 16.dp)) {
            Header("Biblioteca")
            Group {
                SwitchRow("Usar CineLocal Server", "La biblioteca de tu NAS por internet, sin VPN", s.serverMode) { s = s.copy(serverMode = it) }
            }
            if (s.serverMode) {
                Group(top = 12.dp) {
                    Field("Dirección del servidor", s.serverUrl, "https://nas.synology.me:5443") { s = s.copy(serverUrl = it.trim()) }
                    Sep()
                    Field("Usuario de DSM", s.serverUser, "") { s = s.copy(serverUser = it) }
                    Sep()
                    Field("Contraseña", serverPass, "", password = true, showPass = showPass, onTogglePass = { showPass = !showPass }) { serverPass = it }
                    if (needOtp) {
                        Sep()
                        Field("Código de verificación en dos pasos", otp, "123456") { otp = it.trim() }
                    }
                    Sep()
                    ActionRow(if (s.serverToken.isNotBlank()) "Volver a conectar" else "Conectar", enabled = serverPass.isNotEmpty(), result = serverTest) {
                        serverTest = null
                        scope.launch {
                            try {
                                val token = repo.serverLogin(s.serverUrl, s.serverUser, serverPass, otp)
                                s = s.copy(serverUrl = CineServer.normUrl(s.serverUrl), serverToken = token)
                                repo.saveSettings(s)
                                serverPass = ""; otp = ""; needOtp = false
                                serverTest = true to "Conectado"
                            } catch (e: CineServer.LoginException) {
                                needOtp = needOtp || e.otp
                                serverTest = false to (e.message ?: "No se pudo iniciar sesión")
                            } catch (e: Exception) {
                                serverTest = false to (e.message ?: e.javaClass.simpleName)
                            }
                        }
                    }
                    if (s.serverToken.isNotBlank()) {
                        Sep()
                        ActionRow("Cerrar sesión", color = CL.text2) {
                            scope.launch {
                                repo.serverLogout()
                                s = s.copy(serverToken = "")
                                repo.saveSettings(s)
                                serverTest = null
                            }
                        }
                    }
                }
                Help(
                    if (s.serverToken.isNotBlank()) "Conectado como ${s.serverUser}. La biblioteca, el progreso y Mi lista son los del servidor: lo que veas aquí sigue en el PC y en la web."
                    else "Entra con tu usuario de DSM. La contraseña no se guarda: sólo la sesión, durante 30 días."
                )
            } else Group(top = 12.dp) {
                SwitchRow("Modo NAS", "La biblioteca está en un NAS (Synology…) en vez de en el PC", s.nasMode) { s = s.copy(nasMode = it) }
                Sep()
                Field("Carpeta de red", s.libraryPath, if (s.nasMode) "\\\\NAS\\Multimedia" else "\\\\MI-PC\\Peliculas") { s = s.copy(libraryPath = it) }
                Sep()
                Field(
                    if (s.nasMode) "Usuario del NAS" else "Usuario de Windows del PC", s.smbUser,
                    if (s.nasMode) "Usuario de DSM con permiso de lectura" else "Vacío para entrar como invitado"
                ) { s = s.copy(smbUser = it) }
                Sep()
                Field(
                    "Contraseña", s.smbPassword, "", password = true, showPass = showPass, onTogglePass = { showPass = !showPass }
                ) { s = s.copy(smbPassword = it) }
                Sep()
                ActionRow("Probar conexión", result = libTest) {
                    libTest = null
                    scope.launch {
                        libTest = try { true to repo.testConnection(s) } catch (e: Exception) { false to (e.message ?: e.javaClass.simpleName) }
                    }
                }
            }
            if (s.serverMode) Unit
            else if (s.nasMode) {
                Help("Carpeta compartida del NAS donde están las películas y series. En el Synology: Panel de control → Carpeta compartida, y SMB activado en Servicios de archivos.")
                Help("Fuera de casa, conecta la VPN del NAS y escribe la carpeta con su IP dentro de la VPN, por ejemplo \\\\10.8.0.1\\Multimedia.", top = 6.dp)
            } else {
                Help("Carpeta compartida del PC donde están las películas y series. En el PC: clic derecho en la carpeta → Propiedades → Compartir.")
                Help("Si el PC usa una cuenta de Microsoft, el usuario es el correo de la cuenta y la contraseña la de Microsoft (no el PIN).", top = 6.dp)
            }

            Header("Metadatos · TMDB")
            Group {
                Field("API key de TMDB", s.tmdbKey, "") { s = s.copy(tmdbKey = it.trim()) }
                Sep()
                ActionRow("Probar clave", result = tmdbTest) {
                    tmdbTest = null
                    scope.launch {
                        tmdbTest = try { repo.testTmdb(s.tmdbKey); true to "Clave válida" } catch (e: Exception) { false to (e.message ?: "Error") }
                    }
                }
                Sep()
                Picker("Idioma de los metadatos", META_LANGS, s.metaLang) { s = s.copy(metaLang = it, region = it.substringAfter('-')) }
            }
            Help("Carátulas, sinopsis y reparto. La clave es gratuita: themoviedb.org → Ajustes → API. Sirve la clave v3 o el token de lectura v4.")

            Header("Reproducción")
            Group {
                val langs = Languages.ALL.map { it.code to it.label }
                Picker("Idioma de audio preferido", listOf("original" to "Original del archivo") + langs, s.audioLang) { s = s.copy(audioLang = it) }
                Sep()
                Picker("Idioma de subtítulos", listOf("none" to "Ninguno") + langs, s.subLang) { s = s.copy(subLang = it) }
                Sep()
                SwitchRow("Reproducir el siguiente episodio automáticamente", null, s.autoplayNext) { s = s.copy(autoplayNext = it) }
            }
            SubHeader("Mostrar subtítulos")
            Group {
                SUB_MODES.forEachIndexed { i, (value, label) ->
                    if (i > 0) Sep()
                    ChoiceRow(label, s.subMode == value) { s = s.copy(subMode = value) }
                }
            }

            DownloadsSection(s, onChange = { s = it }, open = nav::downloads)

            LetterboxdSection(s, onChange = { s = it }, saveFirst = { if (s != repo.settings.value) repo.saveSettings(s) })

            // con CineLocal Server, «Pedir descarga» va a Peticiones del servidor: ntfy sólo hace falta sin él
            if (s.serverMode) {
                Header("Peticiones de descarga")
                Help("Con CineLocal Server, “Pedir descarga” (en la watchlist y en la búsqueda de TMDB) llega a la pantalla de Peticiones del servidor y avisa a los administradores.")
            } else {
                Header("Peticiones de descarga · ntfy")
                Group {
                    Field("Servidor", s.ntfyServer, Ntfy.DEFAULT_SERVER) { s = s.copy(ntfyServer = it.trim()) }
                    Sep()
                    Field("Tema", s.ntfyTopic, "cinelocal-un-nombre-dificil") { s = s.copy(ntfyTopic = it.trim()) }
                    Sep()
                    Field(
                        "Token de acceso (opcional)", s.ntfyToken, "", password = true, showPass = showToken, onTogglePass = { showToken = !showToken }
                    ) { s = s.copy(ntfyToken = it.trim()) }
                    Sep()
                    ActionRow("Enviar aviso de prueba", enabled = s.ntfyReady, result = ntfyTest) {
                        ntfyTest = null
                        scope.launch {
                            ntfyTest = try { repo.testNtfy(s); true to "Enviado" } catch (e: Exception) { false to (e.message ?: e.javaClass.simpleName) }
                        }
                    }
                }
                Help("En la watchlist, las películas que no tienes llevan un botón “Pedir descarga” que te manda un aviso a este tema. Suscríbete a él en la app de ntfy. En ntfy.sh los temas son públicos: elige un nombre difícil de adivinar.")
            }

            Header("Mantenimiento")
            Group {
                ActionRow("Volver a escanear") { repo.scan() }
                Sep()
                ActionRow("Actualizar metadatos") { repo.fetchMissingMetadata(force = true) }
            }

            UpdatesSection(s, onChange = { s = it })

            Text(
                "CineLocal para Android " + runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull().orEmpty(),
                Modifier.fillMaxWidth().padding(vertical = 32.dp),
                style = MaterialTheme.typography.labelMedium, color = CL.text4, textAlign = TextAlign.Center
            )
        }
        // barra fija de "Guardar" mientras hay cambios
        AnimatedVisibility(
            dirty,
            enter = slideInVertically(tween(Dur.base)) { it } + fadeIn(tween(Dur.base)),
            exit = slideOutVertically(tween(Dur.base)) { it } + fadeOut(tween(Dur.fast))
        ) {
            Column(Modifier.fillMaxWidth().background(CL.bg2)) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(CL.line))
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Cambios sin guardar", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                    PrimaryButton("Guardar", onClick = ::save)
                }
            }
        }
    }
}

/** Descargas para ver sin conexión: solo con Wi-Fi y acceso a la pantalla de Descargas con lo que ocupan */
@Composable
private fun DownloadsSection(s: Settings, onChange: (Settings) -> Unit, open: () -> Unit) {
    val dl = LocalContext.current.repo.downloads
    val index by dl.index.flow.collectAsStateWithLifecycle()
    val space by produceState("", index.files.size, index.finished.size) {
        value = withContext(Dispatchers.IO) { "${Space.fmt(dl.usedBytes())} usados · ${Space.fmt(dl.freeBytes())} libres" }
    }
    Header("Descargas")
    Group {
        SwitchRow("Descargar solo con Wi-Fi", "Con datos móviles, las descargas esperan a que haya Wi-Fi.", s.downloadWifiOnly) {
            onChange(s.copy(downloadWifiOnly = it))
        }
        Sep()
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).tapRow(onClick = open).padding(start = 16.dp, end = 12.dp, top = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text("Ver descargas", style = MaterialTheme.typography.bodyLarge, color = CL.text)
                val n = index.finished.size
                val pending = index.unfinished.size
                Text(
                    listOfNotNull(
                        if (n == 0) "Nada descargado" else if (n == 1) "1 vídeo" else "$n vídeos",
                        if (pending > 0) "$pending en curso" else null,
                        space.ifEmpty { null }
                    ).joinToString(" · "),
                    Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM), color = CL.text3
                )
            }
            Icon(Icons.Rounded.ChevronRight, null, Modifier.padding(start = 4.dp).size(18.dp), tint = CL.text3)
        }
    }
    Help("Desde la ficha de una película o serie puedes descargarla al móvil para verla aunque no haya conexión con el PC.")
}

/** Usuario, sincronización, estado, importación del ZIP y "marcar como vistas" (como Ajustes → Letterboxd en escritorio) */
@Composable
private fun LetterboxdSection(s: Settings, onChange: (Settings) -> Unit, saveFirst: () -> Unit) {
    val ctx = LocalContext.current
    val repo = ctx.repo
    val scope = rememberCoroutineScope()
    val status by repo.letterboxd.status.collectAsStateWithLifecycle()
    val data by repo.letterboxd.store.flow.collectAsStateWithLifecycle()
    val entries by repo.lbEntries.collectAsStateWithLifecycle()
    var confirmClear by remember { mutableStateOf(false) }
    val pickZip = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            val bytes = withContext(Dispatchers.IO) { runCatching { ctx.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull() }
            if (bytes != null) { saveFirst(); repo.lbImport(bytes) }
        }
    }

    Header("Letterboxd")
    Group {
        Field("Usuario de Letterboxd", s.lbUser, "tu_usuario") { onChange(s.copy(lbUser = it.trim())) }
        Sep()
        ActionRow("Sincronizar ahora", enabled = s.lbUser.isNotBlank() && !status.running) {
            val changed = Letterboxd.cleanUser(s.lbUser) != Letterboxd.cleanUser(repo.settings.value.lbUser)
            saveFirst()                       // un usuario nuevo ya lanza la sincronización completa al guardarse
            if (!changed) repo.lbSync(full = true)
        }
        Sep()
        Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            val body = MaterialTheme.typography.bodyMedium.copy(fontFeatureSettings = TNUM)
            when {
                status.running -> {
                    CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = CL.lbGreen, trackColor = Color.Transparent)
                    Text(status.text.ifEmpty { "Sincronizando…" }, Modifier.padding(start = 10.dp), style = body, color = CL.text2)
                }
                status.error != null -> Text(status.error!!, style = body, color = CL.error)
                data.syncedAt == 0L -> Text(if (s.lbUser.isNotBlank()) "Aún no se ha sincronizado." else "Sin conectar.", style = body, color = CL.text3)
                else -> {
                    val n = { f: (com.cinelocal.android.core.LbEntry) -> Boolean -> entries.count(f) }
                    val noId = n { it.tmdbId == null }
                    val date = java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, java.util.Locale("es", "ES")).format(java.util.Date(data.syncedAt))
                    Text(
                        "${n { it.film.watched }} vistas · ${n { it.film.rating != null }} con nota · ${n { it.film.watchlist }} en la watchlist · " +
                            "${if (data.source == "export") "importado" else "sincronizado"} el $date" + (if (noId > 0) " · $noId sin identificar" else ""),
                        style = body, color = CL.text2
                    )
                }
            }
        }
    }
    Help("Se lee tu perfil público: películas vistas, tus notas, los “me gusta” y la watchlist. Al abrir CineLocal se añade lo último que hayas visto.")

    SubHeader("Importar la exportación de Letterboxd")
    Group {
        ActionRow("Elegir .zip", enabled = !status.running) {
            pickZip.launch(arrayOf("application/zip", "application/x-zip-compressed", "application/octet-stream"))
        }
    }
    Help("Alternativa si la lectura del perfil falla: en Letterboxd, Settings → Data → Export your data, y elige aquí el .zip descargado.")

    Spacer(Modifier.height(16.dp))
    Group {
        SwitchRow(
            "Marcar como vistas las que ya has visto en Letterboxd",
            "Sólo películas de tu biblioteca que aún no hayas empezado en CineLocal.", s.lbMarkWatched
        ) { onChange(s.copy(lbMarkWatched = it)) }
    }

    if (data.syncedAt > 0) {
        Spacer(Modifier.height(16.dp))
        Group { ActionRow("Borrar datos de Letterboxd", color = CL.error) { confirmClear = true } }
    }

    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
        title = { Text("¿Borrar los datos de Letterboxd?", style = MaterialTheme.typography.headlineSmall, color = CL.text) },
        text = {
            Text(
                "Se quitan tus notas y la watchlist de CineLocal. Las películas ya marcadas como vistas siguen vistas. Puedes volver a sincronizar cuando quieras.",
                style = MaterialTheme.typography.bodyMedium, color = CL.text2
            )
        },
        confirmButton = { TextAction("Borrar", CL.error) { confirmClear = false; repo.letterboxd.reset() } },
        dismissButton = { TextAction("Cancelar") { confirmClear = false } }
    )
}

/** Actualizaciones desde GitHub: búsqueda al abrir, versión instalada, estado y "Comprobar ahora" */
@Composable
private fun UpdatesSection(s: Settings, onChange: (Settings) -> Unit) {
    val updater = LocalContext.current.repo.updater
    val phase by updater.phase.collectAsStateWithLifecycle()
    val memory by updater.memory.flow.collectAsStateWithLifecycle()
    val body = MaterialTheme.typography.bodyMedium.copy(fontFeatureSettings = TNUM)

    Header("Actualizaciones")
    Group {
        SwitchRow("Buscar actualizaciones al abrir", "Como mucho una vez cada 6 horas.", s.autoUpdate) { onChange(s.copy(autoUpdate = it)) }
        Sep()
        Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Versión instalada", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, color = CL.text)
            Text(updater.installed, style = body, color = CL.text2)
        }
        Sep()
        // estado; con una versión nueva, la fila abre su diálogo
        val release = when (val p = phase) {
            is UpdatePhase.Available -> p.release
            is UpdatePhase.Downloading -> p.release
            is UpdatePhase.NeedsPermission -> p.release
            is UpdatePhase.Installing -> p.release
            is UpdatePhase.Failed -> p.release
            else -> null
        }
        Row(
            Modifier.fillMaxWidth().heightIn(min = 52.dp).tapRow(enabled = release != null) { updater.showDialog() }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val checked = if (memory.lastCheck > 0) "Comprobado el " + java.text.DateFormat.getDateTimeInstance(
                java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, java.util.Locale("es", "ES")
            ).format(java.util.Date(memory.lastCheck)) else "Aún no se ha comprobado."
            when (val p = phase) {
                UpdatePhase.Checking -> {
                    CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
                    Text("Buscando en GitHub…", Modifier.padding(start = 10.dp), style = body, color = CL.text2)
                }
                UpdatePhase.UpToDate -> Text("Tienes la última versión. $checked", style = body, color = CL.text2)
                UpdatePhase.Idle -> Text(checked, style = body, color = CL.text3)
                is UpdatePhase.Failed -> Text(p.message, Modifier.weight(1f), style = body, color = CL.error)
                is UpdatePhase.Downloading -> Text(
                    "Descargando la ${p.release.version}… ${if (p.total > 0) (p.done * 100 / p.total) else 0} %", Modifier.weight(1f), style = body, color = CL.text2
                )
                else -> {
                    val r = release!!
                    Text(
                        "Disponible la ${r.version}" + (if (memory.skipped == r.version) " (omitida)" else ""),
                        Modifier.weight(1f), style = body, color = CL.accentText
                    )
                    Icon(Icons.Rounded.ChevronRight, null, Modifier.size(18.dp), tint = CL.text3)
                }
            }
        }
        Sep()
        ActionRow("Comprobar ahora", enabled = phase != UpdatePhase.Checking && phase !is UpdatePhase.Downloading) { updater.check(manual = true) }
    }
    Help("Las versiones nuevas se descargan de las releases de GitHub. Android pide confirmar la instalación.")
}

@Composable
private fun Header(text: String) = Text(
    text.uppercase(), Modifier.padding(start = 16.dp, top = 32.dp, bottom = 8.dp),
    style = MaterialTheme.typography.labelSmall, color = CL.text3
)

@Composable
private fun SubHeader(text: String) = Text(
    text.uppercase(), Modifier.padding(start = 16.dp, top = 20.dp, bottom = 8.dp),
    style = MaterialTheme.typography.labelSmall, color = CL.text3
)

@Composable
private fun Help(text: String, top: androidx.compose.ui.unit.Dp = 8.dp) = Text(
    text, Modifier.padding(start = 16.dp, end = 16.dp, top = top),
    style = MaterialTheme.typography.bodySmall, color = CL.text3
)

/** Grupo de ajustes: fondo bg2 con radio 8 */
@Composable
private fun Group(top: androidx.compose.ui.unit.Dp = 0.dp, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.padding(top = top).fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CL.bg2), content = content)
}

/** Separador interno con sangría de 16 dp */
@Composable
private fun Sep() = Box(Modifier.padding(start = 16.dp).fillMaxWidth().height(1.dp).background(CL.line))

/** Campo propio: etiqueta arriba, valor con BasicTextField y línea violeta con foco */
@Composable
private fun Field(
    label: String, value: String, placeholder: String,
    password: Boolean = false, showPass: Boolean = false, onTogglePass: () -> Unit = {},
    onChange: (String) -> Unit
) {
    var focused by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth().heightIn(min = 64.dp)) {
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = if (password) 4.dp else 16.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = CL.text3)
                Box(Modifier.padding(top = 4.dp)) {
                    if (value.isEmpty() && placeholder.isNotEmpty()) Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = CL.text4, maxLines = 1)
                    BasicTextField(
                        value, onChange, singleLine = true,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(color = CL.text),
                        cursorBrush = SolidColor(CL.accent),
                        visualTransformation = if (password && !showPass) PasswordVisualTransformation() else VisualTransformation.None,
                        keyboardOptions = if (password) KeyboardOptions(keyboardType = KeyboardType.Password) else KeyboardOptions.Default,
                        modifier = Modifier.fillMaxWidth().onFocusChanged { focused = it.isFocused }
                    )
                }
            }
            if (password) BarIcon(if (showPass) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, "Mostrar", tint = CL.text2, onClick = onTogglePass)
        }
        if (focused) Box(Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp).fillMaxWidth().height(1.dp).background(CL.accent))
    }
}

/** Selector: etiqueta a la izquierda, valor y › a la derecha; abre un menú */
@Composable
private fun Picker(label: String, options: List<Pair<String, String>>, value: String, onPick: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 56.dp).tapRow { open = true }.padding(start = 16.dp, end = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, color = CL.text)
            Text(
                options.firstOrNull { it.first == value }?.second ?: value, Modifier.padding(start = 12.dp).widthIn(max = 160.dp),
                style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 1, textAlign = TextAlign.End,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
            Icon(Icons.Rounded.ChevronRight, null, Modifier.padding(start = 4.dp).size(18.dp), tint = CL.text3)
        }
        Box(Modifier.align(Alignment.TopEnd)) {
            AppMenu(open, { open = false }) {
                for ((v, l) in options) AppMenuItem(l, v == value) { open = false; onPick(v) }
            }
        }
    }
}

/** Opción única con ✓ violeta en la elegida */
@Composable
private fun ChoiceRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 52.dp).tapRow(role = Role.RadioButton, onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge, color = CL.text)
        if (selected) Icon(Icons.Rounded.Check, "Elegido", Modifier.padding(start = 12.dp).size(20.dp), tint = CL.accent)
    }
}

@Composable
private fun SwitchRow(title: String, desc: String?, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).tapRow(role = Role.Switch) { onChange(!checked) }.padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, color = CL.text)
            if (desc != null) Text(desc, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3)
        }
        Switch(
            checked = checked, onCheckedChange = onChange,
            colors = SwitchDefaults.colors(
                checkedTrackColor = CL.accent, checkedThumbColor = CL.onAccent, checkedBorderColor = Color.Transparent,
                uncheckedTrackColor = CL.bg4, uncheckedThumbColor = CL.text3, uncheckedBorderColor = Color.Transparent
            )
        )
    }
}

/** Fila de acción con aspecto de enlace violeta; el resultado aparece a la derecha */
@Composable
private fun ActionRow(
    text: String, enabled: Boolean = true, color: Color = CL.accentText,
    result: Pair<Boolean, String>? = null, onClick: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 52.dp).tapRow(enabled = enabled, onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text, style = MaterialTheme.typography.bodyLarge, color = if (enabled) color else CL.text4)
        if (result != null) {
            Spacer(Modifier.width(16.dp).weight(1f))
            Icon(
                if (result.first) Icons.Rounded.Check else Icons.Rounded.Close, null, Modifier.size(16.dp),
                tint = if (result.first) CL.ok else CL.error
            )
            Text(
                result.second, Modifier.padding(start = 6.dp).weight(2f, fill = false),
                style = MaterialTheme.typography.bodySmall, color = if (result.first) CL.ok else CL.error,
                textAlign = TextAlign.End, maxLines = 3
            )
        }
    }
}
