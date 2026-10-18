package com.cinelocal.android.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Languages
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Settings
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.GradientButton
import com.cinelocal.android.ui.components.SecondaryButton
import com.cinelocal.android.ui.theme.CL
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
    var s by remember { mutableStateOf(repo.settings.value) }
    var showPass by remember { mutableStateOf(false) }
    var libTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var tmdbTest by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    val dirty = s != repo.settings.value

    fun save() { repo.saveSettings(s); nav.back() }

    Column(Modifier.fillMaxSize().imePadding()) {
        BackTopBar("Ajustes", onBack = { nav.back() }) {
            if (dirty) TextButton(onClick = ::save) { Text("Guardar") }
        }
        Column(
            Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Header("Biblioteca")
            Help("Carpeta compartida del PC donde están las películas y series. En el PC: clic derecho en la carpeta → Propiedades → Compartir.")
            Field("Carpeta de red", s.libraryPath, "\\\\MI-PC\\Peliculas") { s = s.copy(libraryPath = it) }
            Field("Usuario de Windows del PC", s.smbUser, "Vacío para entrar como invitado") { s = s.copy(smbUser = it) }
            OutlinedTextField(
                value = s.smbPassword, onValueChange = { s = s.copy(smbPassword = it) },
                label = { Text("Contraseña") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    IconButton(onClick = { showPass = !showPass }) {
                        Icon(if (showPass) Icons.Default.VisibilityOff else Icons.Default.Visibility, "Mostrar")
                    }
                }
            )
            Help("Si el PC usa una cuenta de Microsoft, el usuario es el correo de la cuenta y la contraseña la de Microsoft (no el PIN).")
            Row(verticalAlignment = Alignment.CenterVertically) {
                SecondaryButton("Probar conexión") {
                    libTest = null
                    scope.launch {
                        libTest = try { true to repo.testConnection(s) } catch (e: Exception) { false to (e.message ?: e.javaClass.simpleName) }
                    }
                }
                libTest?.let { Result(it) }
            }

            HorizontalDivider(color = CL.line)
            Header("Metadatos (TMDB)")
            Help("Carátulas, sinopsis y reparto. La clave es gratuita: themoviedb.org → Ajustes → API. Sirve la clave v3 o el token de lectura v4.")
            Field("API key de TMDB", s.tmdbKey, "") { s = s.copy(tmdbKey = it.trim()) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                SecondaryButton("Probar clave") {
                    tmdbTest = null
                    scope.launch {
                        tmdbTest = try { repo.testTmdb(s.tmdbKey); true to "Clave válida" } catch (e: Exception) { false to (e.message ?: "Error") }
                    }
                }
                tmdbTest?.let { Result(it) }
            }
            Picker("Idioma de los metadatos", META_LANGS, s.metaLang) { s = s.copy(metaLang = it, region = it.substringAfter('-')) }

            HorizontalDivider(color = CL.line)
            Header("Reproducción")
            val langs = Languages.ALL.map { it.code to it.label }
            Picker("Idioma de audio preferido", listOf("original" to "Original del archivo") + langs, s.audioLang) { s = s.copy(audioLang = it) }
            Picker("Idioma de subtítulos", listOf("none" to "Ninguno") + langs, s.subLang) { s = s.copy(subLang = it) }
            Text("Mostrar subtítulos", style = MaterialTheme.typography.titleMedium)
            for ((value, label) in SUB_MODES) {
                Row(Modifier.fillMaxWidth().clickable { s = s.copy(subMode = value) }, verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = s.subMode == value, onClick = { s = s.copy(subMode = value) })
                    Text(label)
                }
            }
            Row(Modifier.fillMaxWidth().clickable { s = s.copy(autoplayNext = !s.autoplayNext) }, verticalAlignment = Alignment.CenterVertically) {
                Text("Reproducir el siguiente episodio automáticamente", Modifier.weight(1f))
                Switch(checked = s.autoplayNext, onCheckedChange = { s = s.copy(autoplayNext = it) })
            }

            HorizontalDivider(color = CL.line)
            LetterboxdSection(s, onChange = { s = it }, saveFirst = { if (s != repo.settings.value) repo.saveSettings(s) })

            HorizontalDivider(color = CL.line)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SecondaryButton("Volver a escanear") { repo.scan() }
                SecondaryButton("Actualizar metadatos") { repo.fetchMissingMetadata(force = true) }
            }
            if (dirty) GradientButton("Guardar", Modifier.fillMaxWidth(), onClick = ::save)
            Help("CineLocal para Android " + runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull().orEmpty())
        }
    }
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
    Help("Se lee tu perfil público: películas vistas, tus notas, los “me gusta” y la watchlist. Al abrir CineLocal se añade lo último que hayas visto.")
    Field("Usuario de Letterboxd", s.lbUser, "tu_usuario") { onChange(s.copy(lbUser = it.trim())) }
    SecondaryButton("Sincronizar ahora", enabled = s.lbUser.isNotBlank() && !status.running) {
        val changed = Letterboxd.cleanUser(s.lbUser) != Letterboxd.cleanUser(repo.settings.value.lbUser)
        saveFirst()                       // un usuario nuevo ya lanza la sincronización completa al guardarse
        if (!changed) repo.lbSync(full = true)
    }

    Text("Estado", style = MaterialTheme.typography.titleMedium)
    when {
        status.running -> Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = CL.lbGreen)
            Text(status.text.ifEmpty { "Sincronizando…" }, Modifier.padding(start = 10.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
        }
        status.error != null -> Text(status.error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        data.syncedAt == 0L -> Help(if (s.lbUser.isNotBlank()) "Aún no se ha sincronizado." else "Sin conectar.")
        else -> {
            val n = { f: (com.cinelocal.android.core.LbEntry) -> Boolean -> entries.count(f) }
            val noId = n { it.tmdbId == null }
            val date = java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, java.util.Locale("es", "ES")).format(java.util.Date(data.syncedAt))
            Help("${n { it.film.watched }} vistas · ${n { it.film.rating != null }} con nota · ${n { it.film.watchlist }} en la watchlist · " +
                "${if (data.source == "export") "importado" else "sincronizado"} el $date" + (if (noId > 0) " · $noId sin identificar" else ""))
        }
    }
    if (data.syncedAt > 0) TextButton(onClick = { confirmClear = true }) { Text("Borrar datos de Letterboxd") }

    Text("Importar la exportación de Letterboxd", style = MaterialTheme.typography.titleMedium)
    Help("Alternativa si la lectura del perfil falla: en Letterboxd, Settings → Data → Export your data, y elige aquí el .zip descargado.")
    SecondaryButton("Elegir .zip", enabled = !status.running) {
        pickZip.launch(arrayOf("application/zip", "application/x-zip-compressed", "application/octet-stream"))
    }

    Row(Modifier.fillMaxWidth().clickable { onChange(s.copy(lbMarkWatched = !s.lbMarkWatched)) }, verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("Marcar como vistas las que ya has visto en Letterboxd")
            Help("Sólo películas de tu biblioteca que aún no hayas empezado en CineLocal.")
        }
        Switch(checked = s.lbMarkWatched, onCheckedChange = { onChange(s.copy(lbMarkWatched = it)) })
    }

    if (confirmClear) AlertDialog(
        onDismissRequest = { confirmClear = false },
        title = { Text("¿Borrar los datos de Letterboxd?") },
        text = { Text("Se quitan tus notas y la watchlist de CineLocal. Las películas ya marcadas como vistas siguen vistas. Puedes volver a sincronizar cuando quieras.") },
        confirmButton = { TextButton(onClick = { confirmClear = false; repo.letterboxd.reset() }) { Text("Borrar") } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancelar") } }
    )
}

@Composable private fun Header(text: String) = Text(text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp))
@Composable private fun Help(text: String) = Text(text, style = MaterialTheme.typography.bodyMedium, color = CL.text3)

@Composable
private fun Result(r: Pair<Boolean, String>) = Text(
    r.second, color = if (r.first) CL.ok else MaterialTheme.colorScheme.error,
    style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 12.dp)
)

@Composable
private fun Field(label: String, value: String, placeholder: String, onChange: (String) -> Unit) = OutlinedTextField(
    value = value, onValueChange = onChange, label = { Text(label) },
    placeholder = { if (placeholder.isNotEmpty()) Text(placeholder) },
    singleLine = true, modifier = Modifier.fillMaxWidth()
)

@Composable
private fun Picker(label: String, options: List<Pair<String, String>>, value: String, onPick: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        OutlinedTextField(
            value = options.firstOrNull { it.first == value }?.second ?: value,
            onValueChange = {}, readOnly = true, label = { Text(label) },
            trailingIcon = { Icon(Icons.Default.ArrowDropDown, null) },
            modifier = Modifier.fillMaxWidth()
        )
        // capa transparente encima para abrir el menú al tocar el campo
        Box(Modifier.matchParentSize().clickable { open = true })
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            for ((v, l) in options) DropdownMenuItem(text = { Text(l) }, onClick = { open = false; onPick(v) })
        }
    }
}
