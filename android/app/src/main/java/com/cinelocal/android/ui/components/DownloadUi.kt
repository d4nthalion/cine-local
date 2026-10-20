package com.cinelocal.android.ui.components

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.DownloadDone
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.core.DlSummary
import com.cinelocal.android.core.DownloadIndex
import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.Space
import com.cinelocal.android.core.Title
import com.cinelocal.android.core.videoPaths
import com.cinelocal.android.data.DownloadManager
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.BrandGradient
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.TNUM

// ---------------------------------------------------------------- piezas visuales

/** Anillo de progreso con el degradado de la marca (descargas en curso); [dim] para las pausadas */
@Composable
fun DownloadRing(fraction: Float, size: Dp, modifier: Modifier = Modifier, stroke: Dp = 2.dp, dim: Boolean = false) {
    Canvas(modifier.size(size)) {
        val w = stroke.toPx()
        val d = this.size.minDimension - w
        val tl = Offset(w / 2, w / 2)
        drawArc(CL.lineStrong, 0f, 360f, false, tl, Size(d, d), style = Stroke(w))
        if (fraction > 0f) drawArc(
            BrandGradient, -90f, 360f * fraction.coerceIn(0f, 1f), false, tl, Size(d, d),
            alpha = if (dim) .5f else 1f, style = Stroke(w, cap = StrokeCap.Round)
        )
    }
}

/** El índice de descargas como estado de Compose */
@Composable
fun rememberDlIndex(): State<DownloadIndex> = LocalContext.current.repo.downloads.index.flow.collectAsStateWithLifecycle()

/** Resumen de descarga de un título que solo recompone cuando cambia (no con cada byte de otros títulos) */
@Composable
fun rememberDlSummary(t: Title): DlSummary {
    val index = rememberDlIndex()
    val paths = remember(t.item) { videoPaths(t.item) }
    val s by remember(paths) { derivedStateOf { DlSummary.of(paths, index.value) } }
    return s
}

/** Insignia del póster: "Descargada" (o "3 ep." en series a medias) y anillo mientras se descarga */
@Composable
fun PosterDownloadBadge(t: Title, modifier: Modifier = Modifier) {
    val s = rememberDlSummary(t)
    when {
        s.downloading || s.paused > 0 -> Box(
            modifier.size(24.dp).clip(CircleShape).background(CL.veil(0.72f)),
            contentAlignment = Alignment.Center
        ) {
            DownloadRing(s.fraction, 16.dp, dim = !s.downloading)
            if (!s.downloading) Icon(Icons.Rounded.Pause, null, Modifier.size(9.dp), tint = CL.text2)
        }
        s.done > 0 -> Row(
            modifier.height(20.dp).clip(RoundedCornerShape(10.dp)).background(CL.veil(0.78f)).padding(start = 5.dp, end = 7.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Rounded.DownloadDone, null, Modifier.size(12.dp), tint = CL.accentText)
            Text(
                if (s.complete || t.isMovie) "Descargada" else "${s.done} ep.",
                Modifier.padding(start = 3.dp),
                style = MaterialTheme.typography.labelMedium.copy(fontSize = 10.sp, fontFeatureSettings = TNUM),
                color = CL.text, maxLines = 1
            )
        }
    }
}

/** Aviso discreto bajo la cabecera cuando no se puede leer la carpeta del PC, con el filtro "solo lo descargado" */
@Composable
fun OfflineBanner(modifier: Modifier = Modifier) {
    val repo = LocalContext.current.repo
    val offline by repo.offline.collectAsStateWithLifecycle()
    val only by repo.onlyDownloaded.collectAsStateWithLifecycle()
    if (!offline) return
    Row(
        modifier.fillMaxWidth().heightIn(min = 40.dp).background(CL.bg2).padding(start = 16.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Outlined.CloudOff, null, Modifier.size(16.dp), tint = CL.text3)
        Text(
            "Sin conexión con el PC · solo puedes ver lo descargado", Modifier.weight(1f).padding(start = 10.dp, end = 4.dp),
            style = MaterialTheme.typography.bodySmall, color = CL.text2, maxLines = 2, overflow = TextOverflow.Ellipsis
        )
        TextAction(if (only) "Ver todo" else "Descargadas", CL.accentText) { repo.onlyDownloaded.value = !only }
    }
}

// ---------------------------------------------------------------- pedir una descarga

/**
 * Diálogo de confirmación con el tamaño y el espacio libre, y la primera vez el permiso de notificaciones (Android 13+).
 * Devuelve la función que abre el diálogo para un plan.
 */
@Composable
fun rememberDownloadStarter(): (DownloadManager.Plan) -> Unit {
    val ctx = LocalContext.current
    val dl = ctx.repo.downloads
    var plan by remember { mutableStateOf<DownloadManager.Plan?>(null) }
    var askNotif by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    fun needsNotif() = Build.VERSION.SDK_INT >= 33 && !dl.index.value.notifAsked &&
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED

    plan?.let { p ->
        DownloadConfirmDialog(p, onDismiss = { plan = null }) {
            plan = null
            dl.enqueue(p)
            if (needsNotif()) askNotif = true
        }
    }
    if (askNotif) AlertDialog(
        onDismissRequest = { askNotif = false; dl.markNotifAsked() },
        containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
        title = { Text("Ver el progreso", style = MaterialTheme.typography.headlineSmall, color = CL.text) },
        text = {
            Text(
                "La descarga ya ha empezado. Si permites las notificaciones, verás su progreso y podrás pausarla aunque cierres CineLocal.",
                style = MaterialTheme.typography.bodyMedium, color = CL.text2
            )
        },
        confirmButton = {
            TextAction("Permitir", CL.accentText) {
                askNotif = false
                dl.markNotifAsked()
                launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        },
        dismissButton = { TextAction("Ahora no") { askNotif = false; dl.markNotifAsked() } }
    )
    return { p -> if (!p.nothingToDo) plan = p }
}

@Composable
private fun DownloadConfirmDialog(p: DownloadManager.Plan, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    val repo = LocalContext.current.repo
    val dl = repo.downloads
    val wifiOnly = repo.settings.value.downloadWifiOnly
    val v = p.verdict
    val n = p.files.size
    val count = if (p.title.isMovie) null else if (n == 1) "1 episodio" else "$n episodios"
    val wifiWait = remember { !dl.canDownloadNow() }
    val body = MaterialTheme.typography.bodyMedium.copy(fontFeatureSettings = TNUM)
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
        title = {
            Text(
                if (v is Space.Verdict.NoRoom) "No hay espacio suficiente" else "Descargar ${p.what}",
                style = MaterialTheme.typography.headlineSmall, color = CL.text
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // tamaño siempre visible
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(CL.bg3).padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(listOfNotNull(count, "Ocupa").joinToString(" · "), Modifier.weight(1f), style = body, color = CL.text2)
                    Text(Space.fmt(p.size), style = MaterialTheme.typography.titleMedium.copy(fontFeatureSettings = TNUM), color = CL.text)
                }
                val queued = if (p.queued > 0) " (contando ${Space.fmt(p.queued)} que ya están en cola)" else ""
                when (v) {
                    is Space.Verdict.NoRoom -> Text(
                        "Necesitas ${Space.fmt(v.needed)}, hay ${Space.fmt(v.free)} libres$queued. Borra otras descargas o libera espacio en el móvil.",
                        style = body, color = CL.error
                    )
                    is Space.Verdict.Low -> Text(
                        "Cabe, pero solo quedarán ${Space.fmt(v.free - v.needed)} libres en el móvil$queued. Con menos de 1 GB libre Android puede ir lento.",
                        style = body, color = CL.error
                    )
                    is Space.Verdict.Ok -> Text(
                        "Quedarán ${Space.fmt(v.free - v.needed)} libres en el móvil$queued.", style = body, color = CL.text2
                    )
                }
                if (v !is Space.Verdict.NoRoom && wifiWait) Text(
                    if (wifiOnly) "Empezará cuando el móvil se conecte a una red Wi-Fi (Ajustes → Descargas)."
                    else "Empezará cuando haya conexión con el PC.",
                    style = body, color = CL.text3
                )
            }
        },
        confirmButton = {
            when (v) {
                is Space.Verdict.NoRoom -> TextAction("Cerrar", onClick = onDismiss)
                is Space.Verdict.Low -> TextAction("Descargar igualmente", CL.accentText, onClick = onConfirm)
                is Space.Verdict.Ok -> TextAction("Descargar", CL.accentText, onClick = onConfirm)
            }
        },
        dismissButton = { if (v !is Space.Verdict.NoRoom) TextAction("Cancelar", onClick = onDismiss) }
    )
}

// ---------------------------------------------------------------- acciones sobre lo descargado

/** Película, episodio, temporada o serie sobre la que se actúa */
class DlTarget(val title: Title, val episodes: List<Episode>?, val what: String) {
    val paths: List<String> = episodes?.map { it.path } ?: listOf(title.item.path)
}

/** Botón de descarga: si no hay nada, pide la descarga; si no, abre un menú con lo que se puede hacer */
@Composable
fun rememberDlActions(): DlActions {
    val ctx = LocalContext.current
    val starter = rememberDownloadStarter()
    var deleting by remember { mutableStateOf<Triple<String, List<String>, Long>?>(null) }
    val actions = remember(starter) { DlActions(ctx.repo.downloads, starter) { what, paths, bytes -> deleting = Triple(what, paths, bytes) } }
    deleting?.let { (what, paths, bytes) ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
            title = { Text("¿Eliminar la descarga?", style = MaterialTheme.typography.headlineSmall, color = CL.text) },
            text = {
                Text(
                    "Se borra del móvil $what (${Space.fmt(bytes)}). Podrás volver a descargarlo cuando estés conectado al PC.",
                    style = MaterialTheme.typography.bodyMedium, color = CL.text2
                )
            },
            confirmButton = { TextAction("Eliminar", CL.error) { deleting = null; ctx.repo.downloads.delete(paths) } },
            dismissButton = { TextAction("Cancelar") { deleting = null } }
        )
    }
    return actions
}

class DlActions(
    private val dl: DownloadManager,
    private val starter: (DownloadManager.Plan) -> Unit,
    private val askDelete: (String, List<String>, Long) -> Unit
) {
    fun start(t: DlTarget) = starter(dl.plan(t.title, t.episodes, t.what))
    fun pause(t: DlTarget) = t.paths.forEach(dl::pause)
    fun resume(t: DlTarget) = t.paths.forEach(dl::resume)
    fun cancel(t: DlTarget) = dl.cancel(t.paths)
    fun delete(t: DlTarget) = delete(t.what, t.paths)

    /** Pide confirmación y borra; vale también para títulos que ya no están en la biblioteca */
    fun delete(what: String, paths: List<String>) {
        val idx = dl.index.value
        askDelete(what, paths, paths.mapNotNull { idx.get(it) }.sumOf { it.size })
    }
}

/** Opciones del menú de descarga según el estado */
@Composable
fun DlMenuItems(t: DlTarget, s: DlSummary, a: DlActions, close: () -> Unit) {
    val missing = s.total - s.done - s.active - s.paused - s.failed
    if (s.active > 0) AppMenuItem("Pausar") { close(); a.pause(t) }
    if (s.paused + s.failed > 0) AppMenuItem(if (s.failed > 0) "Reintentar" else "Reanudar") { close(); a.resume(t) }
    if (missing > 0 && s.active == 0 && s.paused + s.failed == 0) AppMenuItem(if (s.done > 0) "Descargar lo que falta" else "Descargar") { close(); a.start(t) }
    if (s.active + s.paused + s.failed > 0) AppMenuItem("Cancelar descarga") { close(); a.cancel(t) }
    if (s.done > 0) AppMenuItem(if (s.total > 1 && s.done > 1) "Eliminar descargas (${s.done})" else "Eliminar descarga") { close(); a.delete(t) }
}

/** Icono de 48 dp por episodio: descargar, anillo de progreso, pausado, error o descargado (con menú) */
@Composable
fun EpisodeDownloadIcon(t: DlTarget, s: DlSummary, a: DlActions) {
    var menu by remember { mutableStateOf(false) }
    Box {
        Box(
            Modifier.size(48.dp).tapFade { if (s.none) a.start(t) else menu = true },
            contentAlignment = Alignment.Center
        ) {
            when {
                s.complete -> Icon(Icons.Rounded.DownloadDone, "Descargado", Modifier.size(24.dp), tint = CL.accentText)
                s.failed > 0 -> Icon(Icons.Rounded.ErrorOutline, "Error al descargar", Modifier.size(22.dp), tint = CL.error)
                s.downloading || s.paused > 0 -> Box(contentAlignment = Alignment.Center) {
                    DownloadRing(s.fraction, 22.dp, dim = !s.downloading)
                    if (!s.downloading) Icon(Icons.Rounded.Pause, "En pausa", Modifier.size(12.dp), tint = CL.text2)
                }
                else -> Icon(Icons.Rounded.Download, "Descargar", Modifier.size(24.dp), tint = CL.text3)
            }
        }
        AppMenu(menu, { menu = false }) { DlMenuItems(t, s, a) { menu = false } }
    }
}

/** Texto del estado para botones y filas: "Descargando 42 %", "En pausa · 42 %", "Descargada"… */
fun dlStatusText(s: DlSummary, doneLabel: String = "Descargada"): String = when {
    s.failed > 0 && s.active == 0 -> "Error al descargar"
    s.downloading -> if (s.bytesDone == 0L) "En cola" else "Descargando ${s.percent} %"
    s.paused > 0 -> "En pausa · ${s.percent} %"
    s.complete -> doneLabel
    else -> ""
}

/** Hueco para el anillo dentro de un botón */
@Composable
fun RingSlot(s: DlSummary) = Box(Modifier.size(20.dp), contentAlignment = Alignment.Center) {
    DownloadRing(s.fraction, 18.dp, dim = !s.downloading)
}
