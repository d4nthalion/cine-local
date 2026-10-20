package com.cinelocal.android.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.cinelocal.android.ui.theme.CL

/** Campo de búsqueda propio: bg3, lupa, ✕ para borrar y línea violeta de foco que crece en 200 ms */
@Composable
fun SearchField(
    value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier,
    placeholder: String = "Títulos, géneros, reparto…", onSearch: (() -> Unit)? = null,
    textModifier: Modifier = Modifier
) {
    var focused by remember { mutableStateOf(false) }
    val line by animateFloatAsState(if (focused) 1f else 0f, tween(200), label = "focus")
    Box(modifier.height(46.dp).clip(RoundedCornerShape(4.dp)).background(CL.bg3)) {
        Row(Modifier.fillMaxWidth().height(46.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Search, null, Modifier.padding(start = 12.dp, end = 10.dp).size(20.dp), tint = CL.text3)
            Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (value.isEmpty()) Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = CL.text3, maxLines = 1)
                BasicTextField(
                    value, onChange, singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = CL.text),
                    cursorBrush = SolidColor(CL.accent),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { onSearch?.invoke() }),
                    modifier = textModifier.fillMaxWidth().onFocusChanged { focused = it.isFocused }
                )
            }
            if (value.isNotEmpty()) BarIcon(Icons.Rounded.Close, "Borrar", tint = CL.text2) { onChange("") }
            else Box(Modifier.size(12.dp))
        }
        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth(line).height(2.dp).background(CL.accent))
    }
}
