package com.cinelocal.android.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.cinelocal.android.core.UpdateRelease
import com.cinelocal.android.core.Updates
import com.cinelocal.android.core.Updates.NoteLine
import com.cinelocal.android.data.UpdatePhase
import com.cinelocal.android.data.Updater
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.TNUM
import java.util.Locale

private val ES = Locale.forLanguageTag("es-ES")

/** Tamaño en MB con coma decimal: 64,4 MB */
fun megas(bytes: Long): String = String.format(ES, "%.1f MB", bytes / 1_000_000.0)

/** Aviso de versión nueva: notas de la release, descarga con progreso, permiso de instalar e instalación */
@Composable
fun UpdateDialog(phase: UpdatePhase, updater: Updater) {
    val release = when (phase) {
        is UpdatePhase.Available -> phase.release
        is UpdatePhase.Downloading -> phase.release
        is UpdatePhase.NeedsPermission -> phase.release
        is UpdatePhase.Installing -> phase.release
        is UpdatePhase.Failed -> phase.release
        else -> null
    } ?: return
    val busy = phase is UpdatePhase.Downloading
    val shape = RoundedCornerShape(8.dp)

    Dialog(
        onDismissRequest = { if (!busy) updater.later() },
        properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = !busy, dismissOnBackPress = !busy)
    ) {
        Column(
            Modifier.fillMaxWidth(0.9f).widthIn(max = 480.dp).clip(shape).background(CL.bg2).border(1.dp, CL.line, shape)
                .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 8.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(CL.accent))
                Text("ACTUALIZACIÓN", Modifier.padding(start = 8.dp), style = MaterialTheme.typography.labelSmall, color = CL.text3)
            }
            Text("Nueva versión ${release.version}", Modifier.padding(top = 8.dp), style = MaterialTheme.typography.headlineSmall, color = CL.text)
            Text(
                "Tienes la ${updater.installed} · ${megas(release.apkSize)}", Modifier.padding(top = 4.dp),
                style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM), color = CL.text3
            )
            ReleaseNotes(release, Modifier.padding(top = 16.dp))
            Spacer(Modifier.height(20.dp))

            AnimatedContent(
                phase, label = "fase",
                contentKey = { it::class },
                transitionSpec = { fadeIn(tween(Dur.base)) togetherWith fadeOut(tween(Dur.fast)) }
            ) { p ->
                Column(Modifier.fillMaxWidth()) {
                    when (p) {
                        is UpdatePhase.Downloading -> Downloading(p) { updater.cancel() }
                        is UpdatePhase.NeedsPermission -> NeedsPermission(updater)
                        is UpdatePhase.Installing -> Installing { updater.later() }
                        is UpdatePhase.Failed -> {
                            Text(p.message, Modifier.padding(bottom = 14.dp), style = MaterialTheme.typography.bodyMedium, color = CL.error)
                            PrimaryButton("Reintentar", Modifier.fillMaxWidth(), Icons.Rounded.Refresh) { updater.update() }
                            Actions(onSkip = { updater.skip() }, onLater = { updater.later() })
                        }
                        else -> {
                            PrimaryButton("Actualizar", Modifier.fillMaxWidth(), Icons.Rounded.Download) { updater.update() }
                            Actions(onSkip = { updater.skip() }, onLater = { updater.later() })
                        }
                    }
                }
            }
        }
    }
}

/** "Omitir esta versión" a la izquierda y "Más tarde" a la derecha */
@Composable
private fun Actions(onSkip: () -> Unit, onLater: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        // el texto alineado con el borde del botón (TextAction lleva 12 dp de margen interior)
        TextAction("Omitir esta versión", CL.text3, Modifier.offset(x = (-12).dp), onClick = onSkip)
        TextAction("Más tarde", modifier = Modifier.offset(x = 12.dp), onClick = onLater)
    }
}

@Composable
private fun androidx.compose.foundation.layout.ColumnScope.Downloading(p: UpdatePhase.Downloading, onCancel: () -> Unit) {
    val fraction = if (p.total > 0) (p.done.toFloat() / p.total).coerceIn(0f, 1f) else 0f
    val shown by animateFloatAsState(fraction, tween(Dur.base), label = "progreso")
    Box(Modifier.fillMaxWidth().height(3.dp).clip(RoundedCornerShape(2.dp)).background(CL.bg4)) {
        Box(Modifier.fillMaxWidth(shown).fillMaxHeight().background(CL.accent))
    }
    Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("Descargando…", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
        Text(
            "${megas(p.done)} de ${megas(p.total)} · ${(fraction * 100).toInt()} %",
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = TNUM), color = CL.text3
        )
    }
    TextAction("Cancelar", modifier = Modifier.align(Alignment.End).offset(x = 12.dp).padding(top = 6.dp), onClick = onCancel)
}

@Composable
private fun androidx.compose.foundation.layout.ColumnScope.NeedsPermission(updater: Updater) {
    val ctx = LocalContext.current
    Text("Falta un permiso", style = MaterialTheme.typography.titleMedium, color = CL.text)
    Text(
        "Android tiene que dejar que CineLocal instale aplicaciones. En la pantalla que se abre, activa «Permitir de esta fuente» y vuelve atrás: la instalación sigue sola.",
        Modifier.padding(top = 6.dp, bottom = 16.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2
    )
    PrimaryButton("Abrir ajustes de Android", Modifier.fillMaxWidth(), Icons.Rounded.OpenInNew) {
        runCatching { ctx.startActivity(updater.permissionIntent()) }
    }
    TextAction("Más tarde", modifier = Modifier.align(Alignment.End).offset(x = 12.dp).padding(top = 4.dp)) { updater.later() }
}

@Composable
private fun androidx.compose.foundation.layout.ColumnScope.Installing(onClose: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
        Text(
            "Confirma la instalación en la ventana de Android. CineLocal se cerrará para actualizarse.",
            Modifier.padding(start = 12.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2
        )
    }
    TextAction("Cerrar", modifier = Modifier.align(Alignment.End).offset(x = 12.dp).padding(top = 6.dp), onClick = onClose)
}

/** Notas de la release, sin markdown: títulos en versalitas, viñetas ámbar */
@Composable
private fun ReleaseNotes(release: UpdateRelease, modifier: Modifier = Modifier) {
    val lines = remember(release.notes) { Updates.parseNotes(release.notes) }
    if (lines.isEmpty()) return
    Box(modifier.fillMaxWidth().heightIn(max = 260.dp).clip(RoundedCornerShape(4.dp)).background(CL.bg3)) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 12.dp)) {
            lines.forEachIndexed { i, l ->
                when (l.kind) {
                    NoteLine.Kind.BLANK -> Spacer(Modifier.height(8.dp))
                    NoteLine.Kind.HEADING -> Text(
                        l.text.uppercase(ES), Modifier.padding(top = if (i == 0) 0.dp else 6.dp, bottom = 6.dp),
                        style = MaterialTheme.typography.labelSmall, color = CL.text3
                    )
                    NoteLine.Kind.BULLET -> Row(Modifier.padding(start = (l.level * 14).dp, bottom = 4.dp)) {
                        Text(
                            l.marker, Modifier.width(if (l.marker == "•") 14.dp else 22.dp),
                            style = MaterialTheme.typography.bodyMedium, color = if (l.level == 0) CL.accent else CL.text3
                        )
                        Text(l.text, style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                    }
                    NoteLine.Kind.TEXT -> Text(l.text, Modifier.padding(bottom = 4.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                }
            }
        }
    }
}
