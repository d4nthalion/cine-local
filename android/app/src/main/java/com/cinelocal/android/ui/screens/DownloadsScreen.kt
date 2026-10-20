package com.cinelocal.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.DlFile
import com.cinelocal.android.core.DlState
import com.cinelocal.android.core.Space
import com.cinelocal.android.core.Title
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.BarIcon
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.ProgressBar
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.cardShape
import com.cinelocal.android.ui.components.posterHairline
import com.cinelocal.android.ui.components.rememberDlActions
import com.cinelocal.android.ui.components.rememberDlIndex
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.theme.BrandGradientH
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.TNUM
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Espacio: lo que ocupan las descargas, lo libre y el total del almacenamiento */
private data class Storage(val used: Long = 0, val free: Long = 0, val total: Long = 0)

/** Descargas: en curso (pausar, reanudar, cancelar) y descargado por título (borrar), con el espacio usado y libre */
@Composable
fun DownloadsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val dl = repo.downloads
    val index by rememberDlIndex()
    val titles by repo.titles.collectAsStateWithLifecycle()
    val activity by dl.activity.collectAsStateWithLifecycle()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val actions = rememberDlActions()
    val listState = rememberLazyListState()

    // se recalcula al cambiar la lista y cada ~20 MB descargados
    val storage by produceState(Storage(), index.files.size, index.finished.size, index.files.sumOf { it.done } / 20_000_000) {
        value = withContext(Dispatchers.IO) { Storage(dl.usedBytes(), dl.freeBytes(), dl.totalBytes()) }
    }

    val unfinished = index.unfinished
    val groups = index.finished.groupBy { it.itemId }.map { (id, files) -> Triple(id, titles.firstOrNull { it.id == id }, files) }
    val anyActive = unfinished.any { it.state == DlState.QUEUED || it.state == DlState.DOWNLOADING }

    Column(Modifier.fillMaxSize()) {
        BackTopBar("Descargas", onBack = { nav.back() }, divider = listState.canScrollBackward) {
            if (unfinished.isNotEmpty()) {
                if (anyActive) TextAction("Pausar todo", CL.accentText) { dl.pauseAll() }
                else TextAction("Reanudar todo", CL.accentText) { dl.resumeAll() }
            }
        }
        if (index.files.isEmpty()) {
            StorageSummary(storage, settings.downloadWifiOnly, Modifier.padding(16.dp))
            EmptyState(
                "No hay descargas",
                "Descarga películas, temporadas o episodios desde su ficha para verlos aunque no haya conexión con el PC."
            )
            return
        }
        LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 32.dp)) {
            item(key = "storage") { StorageSummary(storage, settings.downloadWifiOnly, Modifier.padding(16.dp)) }
            if (unfinished.isNotEmpty()) {
                item(key = "h-q") { Header("En curso", unfinished.size) }
                items(unfinished, key = { "q-" + it.path }) { f ->
                    QueueRow(
                        f, titles.firstOrNull { it.id == f.itemId },
                        waiting = activity.waiting.takeIf { activity.file?.path == f.path },
                        speed = activity.bytesPerSec.takeIf { activity.file?.path == f.path } ?: 0,
                        onToggle = { if (f.state == DlState.PAUSED || f.state == DlState.ERROR) dl.resume(f.path) else dl.pause(f.path) },
                        onCancel = { dl.cancel(listOf(f.path)) }
                    )
                }
            }
            if (groups.isNotEmpty()) {
                item(key = "h-d") { Header("Descargado", groups.size) }
                items(groups, key = { "d-" + it.first }) { (id, t, files) ->
                    DoneRow(t, files, onOpen = { if (t != null) nav.detail(id) }) {
                        val name = t?.name ?: files.first().title
                        val what = if (files.size == 1 && files.first().episodeId == null) "«$name»"
                        else if (files.size == 1) "${files.first().label?.substringBefore(" · ")} de «$name»"
                        else "${files.size} episodios de «$name»"
                        actions.delete(what, files.map { it.path })
                    }
                }
            }
        }
    }
}

@Composable
private fun Header(text: String, count: Int) = Row(
    Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 6.dp), verticalAlignment = Alignment.Bottom
) {
    Text(text.uppercase(), style = MaterialTheme.typography.labelSmall, color = CL.text3)
    Text("  $count", style = MaterialTheme.typography.labelSmall.copy(fontFeatureSettings = TNUM), color = CL.text4)
}

/** Barra del almacenamiento: descargas de CineLocal (degradado), resto ocupado y libre */
@Composable
private fun StorageSummary(s: Storage, wifiOnly: Boolean, modifier: Modifier = Modifier) {
    val body = MaterialTheme.typography.bodyMedium.copy(fontFeatureSettings = TNUM)
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(CL.bg2).padding(16.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(Space.fmt(s.used), style = MaterialTheme.typography.headlineSmall.copy(fontFeatureSettings = TNUM), color = CL.text)
            Text("  usados por las descargas", Modifier.padding(bottom = 3.dp), style = body, color = CL.text2)
        }
        if (s.total > 0) {
            val usedF = (s.used.toFloat() / s.total).coerceIn(0f, 1f)
            val otherF = ((s.total - s.free - s.used).toFloat() / s.total).coerceIn(0f, 1f - usedF)
            Row(Modifier.padding(top = 12.dp).fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)).background(CL.bg4)) {
                if (usedF > 0f) Box(Modifier.fillMaxHeight().weight(usedF.coerceAtLeast(0.005f)).background(BrandGradientH))
                if (otherF > 0f) Box(Modifier.fillMaxHeight().weight(otherF).background(CL.text4))
                val freeF = 1f - usedF - otherF
                if (freeF > 0f) Box(Modifier.fillMaxHeight().weight(freeF))
            }
        }
        Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Legend(null, "CineLocal")
            Legend(CL.text4, "Otros")
            Text("${Space.fmt(s.free)} libres", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM), color = CL.text2, textAlign = TextAlign.End)
        }
        Text(
            if (wifiOnly) "Se descarga solo con Wi-Fi. Puedes cambiarlo en Ajustes → Descargas." else "Se descarga con cualquier conexión que llegue al PC.",
            Modifier.padding(top = 10.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3
        )
    }
}

@Composable
private fun Legend(color: androidx.compose.ui.graphics.Color?, label: String) = Row(verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(8.dp).clip(CircleShape).then(if (color == null) Modifier.background(BrandGradientH) else Modifier.background(color)))
    Text(label, Modifier.padding(start = 6.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3)
}

@Composable
private fun Thumb(t: Title?, name: String) = Box(Modifier.width(44.dp).aspectRatio(2f / 3f).clip(cardShape).posterHairline()) {
    Artwork(t?.meta?.poster, name, null, Modifier.fillMaxSize(), placeholderSize = 8)
}

@Composable
private fun QueueRow(f: DlFile, t: Title?, waiting: String?, speed: Long, onToggle: () -> Unit, onCancel: () -> Unit) {
    val small = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM)
    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Thumb(t, f.title)
        Column(Modifier.weight(1f).padding(start = 12.dp, end = 4.dp)) {
            Text(t?.name ?: f.title, style = MaterialTheme.typography.titleMedium, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            f.label?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = CL.text3, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            val frac = if (f.size > 0) (f.done.toFloat() / f.size).coerceIn(0f, 1f) else 0f
            ProgressBar(frac, Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(2.dp)))
            val (text, color) = when (f.state) {
                DlState.ERROR -> (f.error ?: "Error al descargar") to CL.error
                DlState.PAUSED -> "En pausa · ${Space.fmt(f.done)} de ${Space.fmt(f.size)}" to CL.text3
                DlState.QUEUED -> (waiting ?: if (f.done > 0) "En cola · ${Space.fmt(f.done)} de ${Space.fmt(f.size)}" else "En cola · ${Space.fmt(f.size)}") to CL.text3
                else -> (waiting ?: buildString {
                    append("${Space.fmt(f.done)} de ${Space.fmt(f.size)} · ${(frac * 100).toInt()} %")
                    if (speed > 0) append(" · ${Space.fmt(speed)}/s")
                }) to CL.text2
            }
            Text(text, Modifier.padding(top = 6.dp), style = small, color = color, maxLines = 3)
        }
        when (f.state) {
            DlState.PAUSED -> BarIcon(Icons.Rounded.PlayArrow, "Reanudar", onClick = onToggle)
            DlState.ERROR -> BarIcon(Icons.Rounded.Refresh, "Reintentar", onClick = onToggle)
            else -> BarIcon(Icons.Rounded.Pause, "Pausar", onClick = onToggle)
        }
        BarIcon(Icons.Rounded.Close, "Cancelar", tint = CL.text2, onClick = onCancel)
    }
}

@Composable
private fun DoneRow(t: Title?, files: List<DlFile>, onOpen: () -> Unit, onDelete: () -> Unit) {
    val name = t?.name ?: files.first().title
    val size = files.sumOf { it.size }
    val movie = files.size == 1 && files.first().episodeId == null
    val detail = if (movie) "Película · ${Space.fmt(size)}"
    else (if (files.size == 1) "1 episodio" else "${files.size} episodios") + " · " + Space.fmt(size)
    val eps = if (movie) null else files.mapNotNull { it.label?.substringBefore(" · ") }.joinToString(", ")
    Row(
        Modifier.fillMaxWidth().tapRow(onClick = onOpen).padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Thumb(t, name)
        Column(Modifier.weight(1f).padding(start = 12.dp, end = 4.dp)) {
            Text(name, style = MaterialTheme.typography.titleMedium, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM), color = CL.text2)
            if (!eps.isNullOrEmpty()) Text(eps, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (t == null) Text("Ya no está en la biblioteca", Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3)
        }
        BarIcon(Icons.Outlined.DeleteOutline, "Eliminar descarga", tint = CL.text2, onClick = onDelete)
    }
}
