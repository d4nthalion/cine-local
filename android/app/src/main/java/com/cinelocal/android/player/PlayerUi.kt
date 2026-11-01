package com.cinelocal.android.player

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AspectRatio
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.FastForward
import androidx.compose.material.icons.rounded.Forward10
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Replay10
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.Subtitles
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.cinelocal.android.ui.components.BarIcon
import com.cinelocal.android.ui.components.PrimaryButton
import com.cinelocal.android.ui.components.tapFade
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.fmtClock
import com.cinelocal.android.ui.theme.BrandGradientH
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Display
import com.cinelocal.android.ui.theme.TNUM
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
    onSkip: () -> Unit,
    onToggleFill: () -> Unit
) {
    var controls by remember { mutableStateOf(true) }
    var lastTouch by remember { mutableLongStateOf(0L) }
    var dragging by remember { mutableStateOf<Float?>(null) }
    var dialog by remember { mutableStateOf<String?>(null) }
    // aviso de doble toque: lado (-1 izquierda, 1 derecha), segundos acumulados y momento del último toque
    var hintSide by remember { mutableIntStateOf(0) }
    var hintSecs by remember { mutableIntStateOf(0) }
    var hintAt by remember { mutableLongStateOf(0L) }
    fun touch() { controls = true; lastTouch = System.currentTimeMillis() }

    // se ocultan solos a los ~3 s, salvo en pausa o con un panel abierto
    LaunchedEffect(controls, lastTouch, state.playing, dialog, dragging) {
        if (controls && state.playing && dialog == null && dragging == null) {
            delay(3000)
            controls = false
        }
    }
    LaunchedEffect(hintAt) {
        if (hintAt != 0L) { delay(450); hintSide = 0; hintSecs = 0 }
    }
    BackHandler(enabled = dialog != null) { dialog = null }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(factory = { videoLayout }, modifier = Modifier.fillMaxSize())

        // toque: mostrar/ocultar · doble toque en un lado: ±10 s (se acumula)
        Box(
            Modifier.fillMaxSize().pointerInput(Unit) {
                detectTapGestures(
                    onTap = { if (controls) controls = false else touch() },
                    onDoubleTap = { o ->
                        val side = if (o.x < size.width / 2) -1 else 1
                        onSeekBy(side * 10_000L)
                        hintSecs = if (hintSide == side) hintSecs + 10 else 10
                        hintSide = side
                        hintAt = System.currentTimeMillis()
                        touch()
                    }
                )
            }
        )

        // aviso del doble toque, en el lado tocado
        SeekHint(hintSide, hintSecs)

        if (state.buffering && state.error == null) {
            CircularProgressIndicator(
                Modifier.align(Alignment.Center).size(40.dp), strokeWidth = 3.dp,
                color = CL.text, trackColor = Color(0x26FFFFFF)
            )
        }

        AnimatedVisibility(controls && state.error == null, enter = fadeIn(), exit = fadeOut()) {
            Box(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to CL.veil(0.7f), 0.22f to Color.Transparent)))
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.6f to Color.Transparent, 1f to CL.veil(0.85f))))
                Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 16.dp, vertical = 8.dp)) {
                    // arriba: volver · el episodio (o la película) centrado · ajustar/llenar la pantalla
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        BarIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver", Modifier.align(Alignment.CenterStart), onClick = onBack)
                        Text(
                            state.subtitle?.replace(" · ", " ") ?: state.title, Modifier.padding(horizontal = 64.dp),
                            color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
                            style = TextStyle(fontFamily = Display, fontWeight = FontWeight.Medium, fontSize = 20.sp, lineHeight = 24.sp)
                        )
                        BarIcon(Icons.Rounded.AspectRatio, if (state.fill) "Ajustar a la pantalla" else "Llenar la pantalla", Modifier.align(Alignment.CenterEnd)) { onToggleFill(); touch() }
                    }
                    Spacer(Modifier.weight(1f))
                    SeekBar(
                        time = state.time, length = state.length, dragging = dragging,
                        onDrag = { dragging = it; touch() },
                        onSeek = { f -> onSeekTo((f * state.length.coerceAtLeast(1)).toLong()); dragging = null; touch() }
                    )
                    // abajo, centrados: audio y subtítulos · siguiente episodio
                    Row(Modifier.fillMaxWidth().padding(top = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(40.dp, Alignment.CenterHorizontally)) {
                        ControlButton(Icons.Rounded.Subtitles, "Audio y subtítulos") { dialog = "tracks"; touch() }
                        if (hasNext()) ControlButton(Icons.Rounded.SkipNext, "Siguiente episodio") { onNext(); touch() }
                    }
                }
                // controles centrales, centrados en la pantalla
                Row(Modifier.align(Alignment.Center), verticalAlignment = Alignment.CenterVertically) {
                    CenterButton("Atrás 10 s", 48) { onSeekBy(-10_000); touch() }
                    Spacer(Modifier.width(56.dp))
                    PlayPause(state.playing) { onTogglePlay(); touch() }
                    Spacer(Modifier.width(56.dp))
                    CenterButton("Adelante 10 s", 48, forward = true) { onSeekBy(10_000); touch() }
                }
            }
        }

        state.error?.let { msg ->
            Column(
                Modifier.align(Alignment.Center).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Text(msg, color = CL.text, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyLarge)
                PrimaryButton("Volver", onClick = onBack)
            }
        }

        // «Saltar intro» / «Saltar resumen» / «Siguiente episodio»: abajo a la derecha, también con los controles
        // ocultos; con ellos visibles sube por encima de la barra de tiempo
        AnimatedVisibility(
            state.skip != null && state.error == null && dialog == null,
            modifier = Modifier.align(Alignment.BottomEnd),
            enter = fadeIn(tween(200)) + slideInHorizontally(tween(240)) { it / 4 },
            exit = fadeOut(tween(160))
        ) {
            // conserva el último texto mientras se desvanece
            val last = remember { mutableStateOf(state.skip) }
            state.skip?.let { last.value = it }
            val bottom by animateDpAsState(if (controls) 112.dp else 28.dp, tween(220), label = "skipY")
            last.value?.let { a ->
                SkipPill(
                    a.label, a.next,
                    Modifier.windowInsetsPadding(WindowInsets.safeDrawing).padding(end = 24.dp, bottom = bottom)
                ) { onSkip() }
            }
        }

        // audio y subtítulos: pantalla completa con las dos columnas
        AnimatedVisibility(dialog != null, enter = fadeIn(tween(200)), exit = fadeOut(tween(180))) {
            TracksScreen(
                audio = remember(dialog) { audioTracks() }, subs = remember(dialog) { subTracks() },
                currentAudio = remember(dialog) { currentAudio() }, currentSub = remember(dialog) { currentSub() },
                onAudio = { onAudio(it); dialog = null }, onSub = { onSub(it); dialog = null }, onClose = { dialog = null }
            )
        }
    }
}

/** ±10 s de 40 dp, sin fondo */
@Composable
private fun CenterButton(desc: String, box: Int, forward: Boolean = false, onClick: () -> Unit) {
    Box(Modifier.size(box.dp).tapFade(onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(if (forward) Icons.Rounded.Forward10 else Icons.Rounded.Replay10, desc, Modifier.size(40.dp), tint = CL.text)
    }
}

/** Play/Pausa de 64 dp sin fondo: escala 0,9 con muelle al pulsar y cambio de icono con fundido */
@Composable
private fun PlayPause(playing: Boolean, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.9f else 1f, spring(dampingRatio = 0.5f, stiffness = Spring.StiffnessMedium), label = "pp")
    Box(
        Modifier.size(72.dp).graphicsLayer { scaleX = s; scaleY = s }
            .clickable(interaction, indication = null, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        AnimatedContent(
            playing,
            transitionSpec = { (fadeIn(tween(90)) + scaleIn(initialScale = .8f)) togetherWith fadeOut(tween(90)) },
            label = "ppIcon"
        ) { p ->
            Icon(if (p) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, if (p) "Pausar" else "Reproducir", Modifier.size(64.dp), tint = CL.text)
        }
    }
}

/**
 * Barra de tiempo propia: pista de 4 dp, avance con el degradado de la marca y pulgar violeta que crece al arrastrar;
 * a la derecha, el tiempo (al tocarlo, lo que queda)
 */
@Composable
private fun SeekBar(time: Long, length: Long, dragging: Float?, onDrag: (Float) -> Unit, onSeek: (Float) -> Unit) {
    val len = length.coerceAtLeast(1)
    val frac = dragging ?: (time.toFloat() / len).coerceIn(0f, 1f)
    val thumb by animateDpAsState(if (dragging != null) 24.dp else 18.dp, tween(120), label = "thumb")
    var showLeft by remember { mutableStateOf(false) }
    var widthPx by remember { mutableFloatStateOf(1f) }
    val tnum = MaterialTheme.typography.labelLarge.copy(fontFeatureSettings = TNUM)
    Row(verticalAlignment = Alignment.CenterVertically) {
        BoxWithConstraints(
            Modifier.weight(1f).padding(start = 6.dp, end = 18.dp).height(44.dp)
                .onSizeChanged { widthPx = it.width.toFloat().coerceAtLeast(1f) }
                .pointerInput(Unit) {
                    detectTapGestures { o -> onSeek((o.x / widthPx).coerceIn(0f, 1f)) }
                }
                .pointerInput(Unit) {
                    var f = 0f
                    detectHorizontalDragGestures(
                        onDragStart = { o -> f = (o.x / widthPx).coerceIn(0f, 1f); onDrag(f) },
                        onDragEnd = { onSeek(f) },
                        onDragCancel = { onSeek(f) },
                        onHorizontalDrag = { change, _ -> f = (change.position.x / widthPx).coerceIn(0f, 1f); onDrag(f) }
                    )
                },
            contentAlignment = Alignment.CenterStart
        ) {
            val w = maxWidth
            Box(Modifier.fillMaxWidth().height(4.dp).background(Color(0x59FFFFFF), CircleShape))
            Box(Modifier.fillMaxWidth(frac).height(4.dp).background(BrandGradientH, CircleShape))
            Box(Modifier.offset(x = w * frac - thumb / 2).size(thumb).background(CL.accent, CircleShape))
            if (dragging != null) {
                val label = fmtClock((dragging * len).toLong())
                Text(
                    label,
                    Modifier.offset(x = (w * frac - 32.dp).coerceIn(0.dp, w - 64.dp), y = (-34).dp).width(64.dp)
                        .background(CL.bg4, RoundedCornerShape(4.dp)).padding(vertical = 4.dp),
                    style = MaterialTheme.typography.labelLarge.copy(fontFeatureSettings = TNUM), color = CL.text, textAlign = TextAlign.Center
                )
            }
        }
        val at = dragging?.let { (it * len).toLong() } ?: time
        Text(
            if (showLeft) "−" + fmtClock(len - at) else fmtClock(at),
            Modifier.tapFade { showLeft = !showLeft }, style = tnum, color = CL.text
        )
    }
}

/** Icono y texto en mayúsculas («AUDIO Y SUBTÍTULOS», «SIGUIENTE EPISODIO») */
@Composable
private fun ControlButton(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier.heightIn(min = 48.dp).tapFade(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, Modifier.size(24.dp), tint = CL.text)
        Text(
            label.uppercase(), color = CL.text, modifier = Modifier.padding(start = 10.dp),
            style = TextStyle(fontFamily = Display, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, letterSpacing = 0.4.sp)
        )
    }
}

/**
 * Píldora de saltar (como en las plataformas de streaming): blanca con texto tinta, como el botón principal.
 * Se puede usar con mando o teclado: con ellos toma el foco al aparecer y lo marca con un borde violeta.
 */
@Composable
private fun SkipPill(label: String, next: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.96f else 1f, spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMedium), label = "skipScale")
    val focus = remember { FocusRequester() }
    var focused by remember { mutableStateOf(false) }
    val keyboard = LocalInputModeManager.current.inputMode == InputMode.Keyboard
    LaunchedEffect(label) { if (keyboard) runCatching { focus.requestFocus() } }
    Row(
        modifier
            .graphicsLayer { scaleX = s; scaleY = s }
            .height(46.dp)
            .background(if (pressed) CL.paperPressed else CL.paper, CircleShape)
            .then(if (focused && keyboard) Modifier.border(2.dp, CL.accent, CircleShape) else Modifier)
            .focusRequester(focus)
            .onFocusChanged { focused = it.isFocused }
            .clickable(interaction, indication = null, role = Role.Button, onClick = onClick)
            .padding(start = 20.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = CL.onPaper, style = MaterialTheme.typography.labelLarge, maxLines = 1)
        Icon(if (next) Icons.Rounded.SkipNext else Icons.Rounded.FastForward, null, Modifier.padding(start = 8.dp).size(20.dp), tint = CL.onPaper)
    }
}

/** Semicírculo con "+10 s" / "−10 s" en el lado del doble toque */
@Composable
private fun SeekHint(side: Int, secs: Int) {
    AnimatedVisibility(side != 0, enter = fadeIn(tween(120)), exit = fadeOut(tween(330))) {
        val s = remember { mutableIntStateOf(1) }
        val n = remember { mutableIntStateOf(10) }
        if (side != 0) { s.intValue = side; n.intValue = secs }
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val w = maxWidth * 0.36f
            val left = s.intValue < 0
            Box(
                Modifier.align(if (left) Alignment.CenterStart else Alignment.CenterEnd)
                    .width(w).fillMaxHeight()
                    .background(
                        Brush.horizontalGradient(
                            if (left) listOf(Color(0x33FFFFFF), CL.veil(0f))
                            else listOf(CL.veil(0f), Color(0x33FFFFFF))
                        ),
                        if (left) RoundedCornerShape(topEndPercent = 50, bottomEndPercent = 50)
                        else RoundedCornerShape(topStartPercent = 50, bottomStartPercent = 50)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text((if (left) "−" else "+") + "${n.intValue} s", style = MaterialTheme.typography.labelLarge, color = CL.text)
            }
        }
    }
}

/** Audio y subtítulos a pantalla completa: volver arriba y dos columnas; la pista activa con ✓ violeta a la izquierda */
@Composable
private fun TracksScreen(
    audio: List<Track>, subs: List<Track>, currentAudio: Int, currentSub: Int,
    onAudio: (Int) -> Unit, onSub: (Int) -> Unit, onClose: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().background(CL.bg)
            .clickable(remember { MutableInteractionSource() }, indication = null) {}
            .windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        BarIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver", onClick = onClose)
        Row(Modifier.fillMaxSize().padding(top = 4.dp)) {
            TrackColumn("Audio", audio, currentAudio, Modifier.weight(1f), onAudio)
            // sin subtítulos LibVLC no da la pista «desactivados»: se añade para poder quitarlos
            TrackColumn("Subtítulos", if (subs.any { it.id == -1 }) subs else listOf(Track(-1, "")) + subs, currentSub, Modifier.weight(1f), onSub)
        }
    }
}

@Composable
private fun TrackColumn(title: String, tracks: List<Track>, current: Int, modifier: Modifier, onPick: (Int) -> Unit) {
    Column(modifier.padding(end = 16.dp)) {
        Text(
            title, Modifier.padding(start = 48.dp, top = 8.dp, bottom = 12.dp), color = CL.text,
            style = TextStyle(fontFamily = Display, fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, lineHeight = 30.sp)
        )
        if (tracks.isEmpty()) Text(
            "No hay pistas disponibles.", Modifier.padding(start = 48.dp, top = 8.dp),
            style = MaterialTheme.typography.bodyLarge, color = CL.text2
        )
        else LazyColumn {
            items(tracks) { t ->
                val sel = t.id == current
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 52.dp).tapRow(role = Role.RadioButton) { onPick(t.id) },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.width(48.dp), contentAlignment = Alignment.Center) {
                        if (sel) Icon(Icons.Rounded.Check, "Activa", Modifier.size(26.dp), tint = CL.accent)
                    }
                    Text(
                        if (t.id == -1) "Desactivados" else t.name, Modifier.weight(1f),
                        style = MaterialTheme.typography.titleMedium, color = if (sel) CL.text else CL.text2,
                        maxLines = 2, overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
