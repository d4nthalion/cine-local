package com.cinelocal.android.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.rememberMotionEnabled

/** Escala al pulsar con muelle (sustituye al ripple) */
fun Modifier.pressScale(interaction: MutableInteractionSource, scale: Float = 0.96f): Modifier = composed {
    val motion = rememberMotionEnabled()
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(
        if (pressed && motion) scale else 1f,
        spring(dampingRatio = 0.7f, stiffness = Spring.StiffnessMedium), label = "press"
    )
    graphicsLayer { scaleX = s; scaleY = s }
}

/** Pulsable sin ripple, con escala al pulsar */
fun Modifier.tapScale(scale: Float = 0.96f, role: Role = Role.Button, onClick: () -> Unit): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    pressScale(interaction, scale).clickable(interaction, indication = null, role = role, onClick = onClick)
}

/** Pulsable sin ripple que baja el alfa mientras se pulsa (iconos, pestañas) */
fun Modifier.tapFade(role: Role = Role.Button, enabled: Boolean = true, onClick: () -> Unit): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val a by animateFloatAsState(if (pressed) 0.6f else 1f, tween(90), label = "fade")
    graphicsLayer { alpha = a }.clickable(interaction, indication = null, enabled = enabled, role = role, onClick = onClick)
}

/** Fila pulsable: fondo bg3 mientras se pulsa */
fun Modifier.tapRow(enabled: Boolean = true, role: Role = Role.Button, onClick: () -> Unit): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val c by animateColorAsState(if (pressed) CL.bg3 else Color.Transparent, tween(90), label = "row")
    background(c).clickable(interaction, indication = null, enabled = enabled, role = role, onClick = onClick)
}

/** Borde interior de 1 dp encima de la imagen, para que los pósteres oscuros no se fundan con el fondo */
fun Modifier.posterHairline(radius: Dp = 4.dp): Modifier = drawWithContent {
    drawContent()
    val w = 1.dp.toPx()
    drawRoundRect(
        CL.line, topLeft = androidx.compose.ui.geometry.Offset(w / 2, w / 2),
        size = androidx.compose.ui.geometry.Size(size.width - w, size.height - w),
        cornerRadius = CornerRadius(radius.toPx()), style = Stroke(w)
    )
}

/** Esqueleto de carga: bg3 con un pulso de alfa, sin brillo diagonal */
fun Modifier.skeleton(): Modifier = composed {
    val t = rememberInfiniteTransition(label = "skeleton")
    val a by t.animateFloat(0.55f, 1f, infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Reverse), label = "a")
    graphicsLayer { alpha = a }.background(CL.bg3)
}
