package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.core.ListEntry
import com.cinelocal.android.core.Lists
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch

/**
 * «Guardar en una lista»: la Watchlist y las listas propias, con una casilla cada una, y un campo para crear una nueva
 * con el título ya dentro. [itemId]: el título, si está en la biblioteca (para reconocerlo también si se guardó antes
 * de tener ficha). Las casillas cambian al momento (sin esperar al servidor).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ListSheet(entry: ListEntry, itemId: String?, onDismiss: () -> Unit) {
    val repo = LocalContext.current.repo
    val scope = rememberCoroutineScope()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    var newName by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun run(block: suspend () -> Unit) {
        if (busy) return
        busy = true; error = null
        scope.launch {
            try { block() } catch (e: Exception) { error = e.message ?: e.javaClass.simpleName }
            busy = false
        }
    }
    val create = { if (newName.isNotBlank()) run { repo.listOp("create", name = newName, entry = entry); newName = "" } }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = CL.bg2,
        scrimColor = CL.veil(0.6f),
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
        tonalElevation = 0.dp,
        dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 6.dp).size(32.dp, 3.dp).clip(RoundedCornerShape(2.dp)).background(CL.lineStrong)) }
    ) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 16.dp)) {
            Text("Guardar en una lista", Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.titleLarge, color = CL.text)
            Text(
                entry.title + (entry.year?.let { " ($it)" } ?: ""), Modifier.padding(start = 16.dp, end = 16.dp, top = 2.dp, bottom = 8.dp),
                style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 1, overflow = TextOverflow.Ellipsis
            )
            Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
                val title = itemId?.let(repo::title)
                val keys = title?.let(Lists::keysOf) ?: listOf(entry.key)
                for (l in user.lists) {
                    CheckRow(l.name, l.items.size, l.items.any { it.key in keys }) {
                        val e = title?.let { Lists.entryIn(l, it) } ?: entry
                        scope.launch {
                            error = try { repo.listOp("toggle", id = l.id, entry = e); null } catch (ex: Exception) { ex.message ?: ex.javaClass.simpleName }
                        }
                    }
                }
                if (user.lists.none { it.id != Lists.WATCHLIST }) Text(
                    "Para crear una lista, escribe un nombre abajo y pulsa Crear.", Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium, color = CL.text3
                )
            }
            Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NameField(newName, "Nueva lista…", Modifier.weight(1f), onDone = create) { newName = it }
                AccentButton("Crear", onClick = create)
            }
            error?.let { Text(it, Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp), style = MaterialTheme.typography.bodySmall, color = CL.error) }
        }
    }
}

@Composable
private fun CheckRow(name: String, count: Int, on: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 52.dp).tapRow(role = Role.Checkbox, onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(22.dp).clip(RoundedCornerShape(6.dp))
                .then(if (on) Modifier.background(CL.accent) else Modifier.border(2.dp, CL.text3, RoundedCornerShape(6.dp))),
            contentAlignment = Alignment.Center
        ) { if (on) Icon(Icons.Rounded.Check, null, Modifier.size(16.dp), tint = CL.text) }
        Text(name, Modifier.padding(start = 14.dp).weight(1f), style = MaterialTheme.typography.bodyLarge, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(count.toString(), style = MaterialTheme.typography.bodyMedium, color = CL.text3)
    }
}

/** Campo de texto de una línea con el estilo de la app (fondo oscuro, borde que se ilumina) */
@Composable
fun NameField(value: String, placeholder: String, modifier: Modifier = Modifier, onDone: () -> Unit = {}, onChange: (String) -> Unit) {
    Box(
        modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(6.dp)).background(CL.bg3).border(1.dp, CL.lineStrong, RoundedCornerShape(6.dp))
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        if (value.isEmpty()) Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = CL.text3, maxLines = 1)
        BasicTextField(
            value, { onChange(it.take(60)) }, Modifier.fillMaxWidth(), singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = CL.text), cursorBrush = SolidColor(CL.accent),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onDone() })
        )
    }
}

/** Pedir un nombre (lista nueva o renombrar); null al cancelar */
@Composable
fun ListNameDialog(title: String, initial: String = "", onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var name by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = CL.bg2,
        title = { Text(title, color = CL.text) },
        text = { NameField(name, "Nombre de la lista", Modifier.fillMaxWidth(), onDone = { if (name.isNotBlank()) onSave(name) }) { name = it } },
        confirmButton = { TextButton({ if (name.isNotBlank()) onSave(name) }) { Text("Guardar", color = CL.accentText) } },
        dismissButton = { TextButton(onDismiss) { Text("Cancelar", color = CL.text2) } }
    )
}
