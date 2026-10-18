package com.cinelocal.android.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.EaseEmphasized

data class NavTab(val route: String, val label: String, val icon: ImageVector, val iconSelected: ImageVector)

/** Barra inferior propia: iconos contorneados/rellenos y una barra ámbar de 16×2 dp que se desliza */
@Composable
fun BottomNav(tabs: List<NavTab>, selected: String?, onSelect: (NavTab) -> Unit) {
    Column(Modifier.fillMaxWidth().background(CL.bg.copy(alpha = .96f)).windowInsetsPadding(WindowInsets.navigationBars)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(CL.line))
        BoxWithConstraints(Modifier.fillMaxWidth().height(60.dp)) {
            val idx = tabs.indexOfFirst { it.route == selected }.coerceAtLeast(0)
            val cell = maxWidth / tabs.size
            val x by animateDpAsState(cell * idx + (cell - 16.dp) / 2, tween(Dur.base, easing = EaseEmphasized), label = "navX")
            Row(Modifier.fillMaxWidth().fillMaxHeight().selectableGroup()) {
                for (t in tabs) {
                    val sel = t.route == selected
                    Column(
                        Modifier.weight(1f).fillMaxHeight()
                            .selectable(sel, interactionSource = null, indication = null, role = Role.Tab) { onSelect(t) },
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        val c = if (sel) CL.text else CL.text3
                        Icon(if (sel) t.iconSelected else t.icon, null, Modifier.size(24.dp), tint = c)
                        Spacer(Modifier.height(4.dp))
                        Text(t.label, style = MaterialTheme.typography.labelMedium, color = c, maxLines = 1)
                    }
                }
            }
            Box(Modifier.offset(x = x).width(16.dp).height(2.dp).background(CL.accent))
        }
    }
}
