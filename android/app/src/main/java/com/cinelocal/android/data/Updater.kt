package com.cinelocal.android.data

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.IntentCompat
import com.cinelocal.android.core.AppVersion
import com.cinelocal.android.core.UpdateRelease
import com.cinelocal.android.core.Updates
import com.cinelocal.android.repo
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.coroutineContext

/** En qué punto está la actualización */
sealed interface UpdatePhase {
    data object Idle : UpdatePhase
    data object Checking : UpdatePhase
    data object UpToDate : UpdatePhase
    data class Available(val release: UpdateRelease) : UpdatePhase
    data class Downloading(val release: UpdateRelease, val done: Long, val total: Long) : UpdatePhase
    /** Descargada, pero falta el permiso "Instalar aplicaciones desconocidas" */
    data class NeedsPermission(val release: UpdateRelease) : UpdatePhase
    /** Enviada al instalador de Android, que pide confirmación */
    data class Installing(val release: UpdateRelease) : UpdatePhase
    data class Failed(val message: String, val release: UpdateRelease?) : UpdatePhase
}

/** Lo que se recuerda entre aperturas */
@Serializable
data class UpdateMemory(
    val lastCheck: Long = 0,                // última comprobación correcta
    val skipped: String = "",               // versión omitida ("Omitir esta versión")
    val pending: UpdateRelease? = null      // descargada y a la espera del permiso de instalar
)

/**
 * Actualización desde las releases de GitHub (etiquetas android-vX.Y.Z con su .apk).
 *
 * Se instala con la API de sesiones de PackageInstaller: el APK se copia a la sesión desde la caché privada
 * (sin FileProvider ni exponer el archivo a otras apps) y el resultado llega a [InstallReceiver] con un código
 * de estado, así que errores como "firmada con otra clave" se pueden explicar en español. Android siempre
 * pide confirmar la instalación.
 */
class Updater(private val context: Context, private val scope: CoroutineScope, dir: File, private val autoEnabled: () -> Boolean) {

    val memory = JsonStore(File(dir, "updates.json"), UpdateMemory.serializer(), UpdateMemory(), scope)

    private val _phase = MutableStateFlow<UpdatePhase>(UpdatePhase.Idle)
    val phase: StateFlow<UpdatePhase> = _phase.asStateFlow()

    /** Si se muestra el diálogo de la actualización */
    private val _dialog = MutableStateFlow(false)
    val dialog: StateFlow<Boolean> = _dialog.asStateFlow()

    /** Pantalla de confirmación del instalador de Android, para abrirla desde la actividad */
    private val _confirm = MutableStateFlow<Intent?>(null)
    val confirm: StateFlow<Intent?> = _confirm.asStateFlow()

    val installed: String = runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: "0.0.0"

    private val downloads = File(context.cacheDir, "updates")
    private val userAgent = "CineLocal-Android/$installed (+https://github.com/${Updates.REPO})"
    private var job: Job? = null
    private var autoChecked = false

    private val http: OkHttpClient by lazy {
        Tmdb.defaultClient.newBuilder().readTimeout(60, TimeUnit.SECONDS).build()
    }

    init {
        // Una descarga pendiente del permiso sobrevive a que Android cierre la app mientras el usuario está en Ajustes
        val pending = memory.value.pending
        val pendingVersion = AppVersion.parse(pending?.version)
        val current = AppVersion.parse(installed)
        if (pending != null && pendingVersion != null && current != null && pendingVersion > current && fileFor(pending).length() == pending.apkSize) {
            _phase.value = UpdatePhase.NeedsPermission(pending)
            _dialog.value = true
        } else {
            if (pending != null) memory.update { it.copy(pending = null) }
            scope.launch(Dispatchers.IO) { downloads.listFiles()?.forEach { it.delete() } }   // las de versiones ya instaladas
        }
    }

    /** Al abrir la app: una vez por proceso y como mucho cada 6 horas */
    fun autoCheck() {
        if (autoChecked) return
        autoChecked = true
        if (!autoEnabled() || _phase.value != UpdatePhase.Idle) return
        if (System.currentTimeMillis() - memory.value.lastCheck < CHECK_EVERY) return
        scope.launch {
            delay(3_000)   // que la biblioteca arranque antes
            check(manual = false)
        }
    }

    /** Busca una versión más nueva. Manual ("Comprobar ahora"): abre el diálogo aunque esa versión estuviera omitida */
    fun check(manual: Boolean) {
        if (job?.isActive == true) return
        job = scope.launch(Dispatchers.IO) {
            _phase.value = UpdatePhase.Checking
            try {
                val release = Updates.newer(fetchReleases(), installed)
                memory.update { it.copy(lastCheck = System.currentTimeMillis()) }
                if (release == null) { _phase.value = UpdatePhase.UpToDate; return@launch }
                _phase.value = UpdatePhase.Available(release)
                if (manual || release.version != memory.value.skipped) _dialog.value = true
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _phase.value = UpdatePhase.Failed(e.message ?: e.javaClass.simpleName, null)
            }
        }
    }

    private fun fetchReleases(): String {
        val req = Request.Builder().url(Updates.RELEASES_URL)
            .header("User-Agent", userAgent)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .build()
        val res = try { http.newCall(req).execute() } catch (e: IOException) { throw IOException("No se pudo conectar con GitHub", e) }
        res.use {
            if (it.isSuccessful) return it.body?.string().orEmpty()
            throw IOException(
                when (it.code) {
                    403, 429 -> "GitHub limita las consultas seguidas; prueba en un rato"
                    404 -> "No se encuentra el repositorio en GitHub"
                    else -> "GitHub respondió ${it.code}"
                }
            )
        }
    }

    private val UpdatePhase.release: UpdateRelease?
        get() = when (this) {
            is UpdatePhase.Available -> release
            is UpdatePhase.Downloading -> release
            is UpdatePhase.NeedsPermission -> release
            is UpdatePhase.Installing -> release
            is UpdatePhase.Failed -> release
            else -> null
        }

    fun showDialog() { if (_phase.value.release != null) _dialog.value = true }

    /** "Más tarde" */
    fun later() { _dialog.value = false }

    /** "Omitir esta versión": no vuelve a avisar de ella al abrir (sí de las siguientes) */
    fun skip() {
        _phase.value.release?.let { r -> memory.update { it.copy(skipped = r.version, pending = null) } }
        _dialog.value = false
    }

    /** "Actualizar" (o "Reintentar"): descarga, pide el permiso si hace falta e instala */
    fun update() {
        val release = _phase.value.release ?: return
        if (job?.isActive == true) return
        _dialog.value = true
        job = scope.launch(Dispatchers.IO) {
            try {
                val file = download(release)
                proceed(release, file)
            } catch (e: CancellationException) {
                _phase.value = UpdatePhase.Available(release)
                throw e
            } catch (e: Exception) {
                _phase.value = UpdatePhase.Failed(e.message ?: e.javaClass.simpleName, release)
            }
        }
    }

    /** Cancela la descarga */
    fun cancel() { job?.cancel() }

    private fun fileFor(r: UpdateRelease) = File(downloads, r.apkName.substringAfterLast('/').ifBlank { "CineLocal-android-${r.version}.apk" })

    private suspend fun download(r: UpdateRelease): File {
        downloads.mkdirs()
        val target = fileFor(r)
        val part = File(downloads, target.name + ".part")
        // sólo se guarda la última descarga
        downloads.listFiles()?.forEach { if (it != target && it != part) it.delete() }
        if (target.length() == r.apkSize) return target
        target.delete()
        _phase.value = UpdatePhase.Downloading(r, 0, r.apkSize)
        var ok = false
        try {
            val req = Request.Builder().url(r.apkUrl).header("User-Agent", userAgent).build()
            http.newCall(req).execute().use { res ->
                if (!res.isSuccessful) throw UpdateError("La descarga falló (GitHub respondió ${res.code})")
                val body = res.body ?: throw UpdateError("La descarga llegó vacía")
                body.byteStream().use { input ->
                    part.outputStream().use { out ->
                        val buf = ByteArray(64 * 1024)
                        var done = 0L
                        var shown = 0L
                        while (true) {
                            coroutineContext.ensureActive()
                            val n = input.read(buf)
                            if (n < 0) break
                            out.write(buf, 0, n)
                            done += n
                            if (done - shown >= 256 * 1024) { shown = done; _phase.value = UpdatePhase.Downloading(r, done, r.apkSize) }
                        }
                    }
                }
            }
            if (part.length() != r.apkSize) {
                throw UpdateError("La descarga no está completa (${part.length()} de ${r.apkSize} bytes). Vuelve a intentarlo.")
            }
            if (!part.renameTo(target)) throw UpdateError("No se pudo guardar la descarga")
            ok = true
            return target
        } catch (e: UpdateError) {
            throw e
        } catch (e: IOException) {
            throw UpdateError("Se cortó la descarga. Comprueba la conexión y vuelve a intentarlo.", e)
        } finally {
            if (!ok) part.delete()
        }
    }

    private val canInstall get() = context.packageManager.canRequestPackageInstalls()

    private fun proceed(r: UpdateRelease, file: File) {
        if (!canInstall) {
            memory.update { it.copy(pending = r) }
            _phase.value = UpdatePhase.NeedsPermission(r)
            _dialog.value = true
            return
        }
        memory.update { it.copy(pending = null) }
        install(r, file)
    }

    /** Ajustes de Android → "Instalar aplicaciones desconocidas" de CineLocal */
    fun permissionIntent() = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))

    /** Al volver a la app: si ya se dio el permiso, se sigue con la instalación */
    fun onResume() {
        val p = _phase.value as? UpdatePhase.NeedsPermission ?: return
        if (!canInstall || job?.isActive == true) return
        val file = fileFor(p.release)
        if (file.length() != p.release.apkSize) { update(); return }
        job = scope.launch(Dispatchers.IO) { proceed(p.release, file) }
    }

    private fun install(r: UpdateRelease, file: File) {
        _phase.value = UpdatePhase.Installing(r)
        try {
            val installer = context.packageManager.packageInstaller
            // sesiones abandonadas de intentos anteriores
            for (s in installer.mySessions) runCatching { installer.abandonSession(s.sessionId) }
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                setAppPackageName(context.packageName)
                setSize(file.length())
            }
            val id = installer.createSession(params)
            installer.openSession(id).use { session ->
                session.openWrite("CineLocal.apk", 0, file.length()).use { out ->
                    file.inputStream().use { it.copyTo(out, 256 * 1024) }
                    session.fsync(out)
                }
                val intent = Intent(context, InstallReceiver::class.java).setPackage(context.packageName)
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
                session.commit(PendingIntent.getBroadcast(context, id, intent, flags).intentSender)
            }
        } catch (e: Exception) {
            _phase.value = UpdatePhase.Failed("No se pudo preparar la instalación: ${e.message ?: e.javaClass.simpleName}", r)
        }
    }

    /** Resultado del instalador de Android (desde [InstallReceiver]) */
    internal fun onInstallStatus(status: Int, message: String?, confirmIntent: Intent?) {
        val r = _phase.value.release
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> _confirm.value = confirmIntent
            PackageInstaller.STATUS_SUCCESS -> {
                // normalmente Android ya ha cerrado la app para sustituirla
                _phase.value = UpdatePhase.Idle
                _dialog.value = false
                downloads.listFiles()?.forEach { it.delete() }
            }
            else -> {
                if (status == PackageInstaller.STATUS_FAILURE_INVALID && r != null) fileFor(r).delete()
                _phase.value = UpdatePhase.Failed(installError(status, message), r)
                _dialog.value = true
            }
        }
    }

    fun consumeConfirm() { _confirm.value = null }

    private fun installError(status: Int, message: String?): String {
        val m = message.orEmpty()
        return when {
            "UPDATE_INCOMPATIBLE" in m || "signatures" in m.lowercase() ->
                "Android no deja instalarla encima: la app instalada va firmada con otra clave. Desinstala CineLocal e instala la nueva desde GitHub (se pierden los ajustes del móvil)."
            "VERSION_DOWNGRADE" in m -> "La versión descargada es más antigua que la instalada."
            status == PackageInstaller.STATUS_FAILURE_ABORTED -> "Instalación cancelada."
            status == PackageInstaller.STATUS_FAILURE_CONFLICT ->
                "Android no deja instalarla encima de la que tienes (conflicto con la app instalada, normalmente porque va firmada con otra clave)."
            status == PackageInstaller.STATUS_FAILURE_STORAGE -> "No hay espacio suficiente para instalarla."
            status == PackageInstaller.STATUS_FAILURE_INVALID -> "El archivo descargado no es un APK válido. Vuelve a intentarlo."
            status == PackageInstaller.STATUS_FAILURE_INCOMPATIBLE -> "Esta versión no es compatible con este móvil."
            status == PackageInstaller.STATUS_FAILURE_BLOCKED -> "Android ha bloqueado la instalación."
            else -> "No se pudo instalar" + (if (m.isNotBlank()) " ($m)" else ".")
        }
    }

    companion object {
        const val CHECK_EVERY = 6L * 3600 * 1000
    }
}

/** Error con un mensaje ya pensado para el usuario */
private class UpdateError(message: String, cause: Throwable? = null) : IOException(message, cause)

/** Recibe el estado de la sesión de PackageInstaller */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        val confirm = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_INTENT, Intent::class.java)
        context.repo.updater.onInstallStatus(status, message, confirm)
    }
}
