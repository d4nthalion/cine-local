package com.cinelocal.android.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.cinelocal.android.ui.theme.BrandGradientH
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.EaseEmphasized
import com.cinelocal.android.ui.theme.TNUM

/** Pestañas de texto con una barra de 2 dp con el degradado de la marca que se desliza bajo la elegida */
@Composable
fun TextTabs(options: List<String>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier, counts: List<Int>? = null) {
    val density = LocalDensity.current
    // posición y ancho del texto de cada pestaña, en dp, relativos a la fila
    val pos = remember { mutableStateMapOf<Int, Pair<Dp, Dp>>() }
    val target = pos[selected]
    val x by animateDpAsState(target?.first ?: 0.dp, tween(Dur.base, easing = EaseEmphasized), label = "tabX")
    val w by animateDpAsState(target?.second ?: 0.dp, tween(Dur.base, easing = EaseEmphasized), label = "tabW")
    Box(modifier) {
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            options.forEachIndexed { i, label ->
                val sel = i == selected
                Row(
                    Modifier
                        .heightIn(min = 48.dp)
                        .selectable(sel, interactionSource = null, indication = null, role = Role.Tab) { onSelect(i) }
                        .onGloballyPositioned { c ->
                            with(density) { pos[i] = c.positionInParent().x.toDp() to c.size.width.toDp() }
                        },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(label, style = MaterialTheme.typography.labelLarge, color = if (sel) CL.text else CL.text3, maxLines = 1)
                    counts?.getOrNull(i)?.let {
                        Text(
                            " $it", style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = TNUM),
                            color = CL.text3, modifier = Modifier.padding(start = 2.dp)
                        )
                    }
                }
            }
        }
        if (target != null) Box(
            Modifier.align(Alignment.BottomStart).padding(bottom = 6.dp).offset(x = x).width(w).height(2.dp).background(BrandGradientH)
        )
    }
}

private val menuShape = RoundedCornerShape(8.dp)

/** Menú desplegable con el estilo de la app (bg4, radio 8) */
@Composable
fun AppMenu(expanded: Boolean, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    DropdownMenu(
        expanded = expanded, onDismissRequest = onDismiss,
        shape = menuShape, containerColor = CL.bg4, tonalElevation = 0.dp, shadowElevation = 0.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, CL.line),
    ) {
        // ancho del elemento más largo (los elementos rellenan ese ancho)
        androidx.compose.foundation.layout.Column(Modifier.width(androidx.compose.foundation.layout.IntrinsicSize.Max).widthIn(min = 200.dp), content = content)
    }
}

/** Opción de menú: texto en bodyMedium y ✓ violeta en la elegida */
@Composable
fun AppMenuItem(text: String, selected: Boolean? = null, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp).tapRow(onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text, style = MaterialTheme.typography.bodyMedium, color = if (selected == false) CL.text2 else CL.text, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(16.dp))
        if (selected == true) Icon(Icons.Rounded.Check, null, Modifier.size(18.dp), tint = CL.accent)
    }
}

/** Botón rectangular "Orden: Añadido ▾" que abre un menú */
@Composable
fun MenuButton(label: String, value: String, options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    var open by rememberSaveable { mutableStateOf(false) }
    Box {
        Row(
            Modifier.height(36.dp)
                .border(1.dp, CL.lineStrong, RoundedCornerShape(4.dp))
                .tapFade { open = true }
                .padding(start = 12.dp, end = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = CL.text3)
            Spacer(Modifier.width(6.dp))
            Text(value, style = MaterialTheme.typography.labelMedium, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Icon(Icons.Rounded.ArrowDropDown, null, Modifier.size(18.dp), tint = CL.text2)
        }
        AppMenu(open, { open = false }) {
            options.forEachIndexed { i, o -> AppMenuItem(o, i == selected) { open = false; onSelect(i) } }
        }
    }
}
