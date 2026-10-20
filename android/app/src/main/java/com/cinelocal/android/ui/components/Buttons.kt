package com.cinelocal.android.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.cinelocal.android.ui.theme.BrandGradientStrong
import com.cinelocal.android.ui.theme.CL

private val btnShape = RoundedCornerShape(4.dp)

/** Botón principal: blanco con texto tinta (el .btn-primary del escritorio), 46 dp, sin ripple */
@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, icon: ImageVector? = null, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val bg by animateColorAsState(if (pressed) CL.paperPressed else CL.paper, tween(90), label = "bg")
    Row(
        modifier
            .pressScale(interaction, 0.97f)
            .height(46.dp)
            .background(bg, btnShape)
            .clickable(interaction, indication = null, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, null, Modifier.size(22.dp), tint = CL.onPaper)
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = CL.onPaper, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/**
 * Botón de acción con el degradado de la marca y texto blanco (el .btn-accent del escritorio):
 * Pedir descarga, Actualizar. Mismo tamaño y gesto que PrimaryButton.
 */
@Composable
fun AccentButton(text: String, modifier: Modifier = Modifier, icon: ImageVector? = null, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val dim by animateFloatAsState(if (pressed) .82f else 1f, tween(90), label = "dim")
    Row(
        modifier
            .pressScale(interaction, 0.97f)
            .height(46.dp)
            .graphicsLayer { alpha = dim }
            .background(BrandGradientStrong, btnShape)
            .clickable(interaction, indication = null, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, null, Modifier.size(22.dp), tint = CL.onAccent)
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = CL.onAccent, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Botón secundario: bg3 con borde de 1 dp; overImage para usarlo encima de una imagen */
@Composable
fun SecondaryButton(
    text: String, modifier: Modifier = Modifier, icon: ImageVector? = null, enabled: Boolean = true,
    overImage: Boolean = false, onClick: () -> Unit
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val base = if (overImage) CL.bg3.copy(alpha = .55f) else CL.bg3.copy(alpha = .92f)
    val bg by animateColorAsState(if (pressed) CL.bg4 else base, tween(90), label = "bg")
    val fg = if (enabled) CL.text else CL.text4
    Row(
        modifier
            .pressScale(interaction, 0.97f)
            .height(46.dp)
            .background(bg, btnShape)
            .border(1.dp, if (enabled) CL.lineStrong else CL.line, btnShape)
            .clickable(interaction, indication = null, enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, null, Modifier.size(20.dp), tint = fg)
            Spacer(Modifier.width(8.dp))
        }
        Text(text, style = MaterialTheme.typography.labelLarge, color = fg, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Acción de texto (diálogos: "Cancelar", "Borrar") */
@Composable
fun TextAction(text: String, color: Color = CL.text2, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier.heightIn(min = 48.dp).tapFade(onClick = onClick).padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center
    ) { Text(text, style = MaterialTheme.typography.labelLarge, color = color) }
}

/** Icono con etiqueta debajo (patrón "Mi lista / Vista") */
@Composable
fun ActionIcon(icon: ImageVector, label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(
        modifier.width(64.dp).heightIn(min = 52.dp).tapFade(onClick = onClick).padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, Modifier.size(24.dp), tint = CL.text)
        Spacer(Modifier.height(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, color = CL.text2, maxLines = 1, textAlign = TextAlign.Center, overflow = TextOverflow.Ellipsis)
    }
}

/** Icono suelto de 24 dp con zona táctil de 48 dp, sin ripple */
@Composable
fun BarIcon(icon: ImageVector, desc: String, modifier: Modifier = Modifier, tint: Color = CL.text, onClick: () -> Unit) {
    Box(modifier.size(48.dp).tapFade(onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(icon, desc, Modifier.size(24.dp), tint = tint)
    }
}
