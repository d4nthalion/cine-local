package com.cinelocal.android.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.cinelocal.android.ui.components.GradientButton
import com.cinelocal.android.ui.fmtClock
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.delay
import org.videolan.libvlc.util.VLCVideoLayout

@Composable
fun PlayerScreen(
    state: PlayerUiState,
    videoLayout: VLCVideoLayout,
    hasNext: () -> Boolean,
    onBack: () -> Unit,
    onTogglePlay: () -> Unit,
    onSeekTo: (Long) -> Unit,
    onSeekBy: (Long) -> Unit,
    onNext: () -> Unit,
    audioTracks: () -> List<Track>,
    subTracks: () -> List<Track>,
    currentAudio: () -> Int,
    currentSub: () -> Int,
    onAudio: (Int) -> Unit,
    onSub: (Int) -> Unit,
    onToggleFill: () -> Unit
) {
    var controls by remember { mutableStateOf(true) }
    var lastTouch by remember { mutableStateOf(0L) }
    var dragging by remember { mutableStateOf<Float?>(null) }
    var dialog by remember { mutableStateOf<String?>(null) }
    fun touch() { controls = true; lastTouch = System.currentTimeMillis() }

    // se ocultan solos a los ~3 s, salvo en pausa o con un menú abierto
    LaunchedEffect(controls, lastTouch, state.playing, dialog, dragging) {
        if (controls && state.playing && dialog == null && dragging == null) {
            delay(3000)
            controls = false
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(factory = { videoLayout }, modifier = Modifier.fillMaxSize())

        // toque: mostrar/ocultar · doble toque en un lado: ±10 s
        Box(
            Modifier.fillMaxSize().pointerInput(Unit) {
                detectTapGestures(
                    onTap = { if (controls) controls = false else touch() },
                    onDoubleTap = { o ->
                        onSeekBy(if (o.x < size.width / 2) -10_000 else 10_000)
                        touch()
                    }
                )
            }
        )

        if (state.buffering && state.error == null) {
            CircularProgressIndicator(Modifier.align(Alignment.Center).size(56.dp), color = Color.White)
        }

        AnimatedVisibility(controls && state.error == null, enter = fadeIn(), exit = fadeOut()) {
            Box(Modifier.fillMaxSize()) {
                // sombreados arriba y abajo
                Box(Modifier.fillMaxSize().background(
                    Brush.verticalGradient(0f to Color(0xB3000000), 0.25f to Color.Transparent, 0.65f to Color.Transparent, 1f to Color(0xCC000000))
                ))
                Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 12.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Color.White) }
                        Column(Modifier.padding(start = 4.dp)) {
                            Text(state.title, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            state.subtitle?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        BigButton(Icons.Default.Replay10, "Atrás 10 s", 48) { onSeekBy(-10_000); touch() }
                        Spacer(Modifier.width(40.dp))
                        BigButton(if (state.playing) Icons.Default.Pause else Icons.Default.PlayArrow, "Reproducir o pausar", 72) { onTogglePlay(); touch() }
                        Spacer(Modifier.width(40.dp))
                        BigButton(Icons.Default.Forward10, "Adelante 10 s", 48) { onSeekBy(10_000); touch() }
                    }
                    Spacer(Modifier.weight(1f))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val len = state.length.coerceAtLeast(1)
                        val shownTime = dragging?.let { (it * len).toLong() } ?: state.time
                        Text(fmtClock(shownTime), color = Color.White, style = MaterialTheme.typography.labelLarge)
                        Slider(
                            value = dragging ?: (state.time.toFloat() / len).coerceIn(0f, 1f),
                            onValueChange = { dragging = it; touch() },
                            onValueChangeFinished = { dragging?.let { onSeekTo((it * len).toLong()) }; dragging = null },
                            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                            colors = SliderDefaults.colors(thumbColor = CL.accent2, activeTrackColor = CL.accent2, inactiveTrackColor = Color(0x55FFFFFF))
                        )
                        Text(fmtClock(state.length), color = Color.White, style = MaterialTheme.typography.labelLarge)
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        ControlButton(Icons.Default.Audiotrack, "Audio") { dialog = "audio"; touch() }
                        ControlButton(Icons.Default.Subtitles, "Subtítulos") { dialog = "subs"; touch() }
                        ControlButton(Icons.Default.AspectRatio, if (state.fill) "Ajustar" else "Llenar") { onToggleFill(); touch() }
                        if (hasNext()) ControlButton(Icons.Default.SkipNext, "Siguiente episodio") { onNext(); touch() }
                    }
                }
            }
        }

        state.error?.let { msg ->
            Column(
                Modifier.align(Alignment.Center).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(msg, color = Color.White, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge)
                GradientButton("Volver", onClick = onBack)
            }
        }
    }

    when (dialog) {
        "audio" -> TrackDialog("Audio", audioTracks(), currentAudio(), { onAudio(it); dialog = null }) { dialog = null }
        "subs" -> TrackDialog("Subtítulos", subTracks(), currentSub(), { onSub(it); dialog = null }) { dialog = null }
    }
}

@Composable
private fun BigButton(icon: ImageVector, desc: String, sizeDp: Int, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size((sizeDp + 16).dp)) {
        Icon(icon, desc, Modifier.size(sizeDp.dp), tint = Color.White)
    }
}

@Composable
private fun ControlButton(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier.clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, Modifier.size(22.dp), tint = Color.White)
        Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
private fun TrackDialog(title: String, tracks: List<Track>, current: Int, onPick: (Int) -> Unit, onClose: () -> Unit) {
    AlertDialog(
        onDismissRequest = onClose,
        confirmButton = { TextButton(onClick = onClose) { Text("Cerrar") } },
        title = { Text(title) },
        text = {
            if (tracks.isEmpty()) Text("No hay pistas disponibles.")
            else LazyColumn(Modifier.heightIn(max = 320.dp)) {
                items(tracks) { t ->
                    Row(Modifier.fillMaxWidth().clickable { onPick(t.id) }, verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = t.id == current, onClick = { onPick(t.id) })
                        Text(if (t.id == -1) "Desactivados" else t.name)
                    }
                }
            }
        }
    )
}
