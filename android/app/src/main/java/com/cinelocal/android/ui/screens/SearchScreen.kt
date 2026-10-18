package com.cinelocal.android.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Title
import com.cinelocal.android.data.Tmdb
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.EmptyState

/** Búsqueda por título, título original, reparto, director o género (sin distinguir acentos) */
@Composable
fun SearchScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }

    val q = Tmdb.norm(query)
    val results = if (q.isEmpty()) emptyList() else titles.filter { matches(it, q) }

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Títulos, géneros, reparto…") },
            singleLine = true,
            leadingIcon = { IconButton(onClick = { nav.back() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver") } },
            trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Default.Close, "Borrar") } },
            modifier = Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(12.dp).focusRequester(focus)
        )
        when {
            q.isEmpty() -> {}
            results.isEmpty() -> EmptyState("Sin resultados", "No hay nada en tu biblioteca que coincida con «$query».")
            else -> TitleGrid(results, progress, nav)
        }
    }
}

private fun matches(t: Title, q: String): Boolean {
    val m = t.meta
    val fields = buildList {
        add(t.name); add(t.item.title); m?.originalTitle?.let(::add)
        m?.director?.let(::add); m?.creators?.let(::add)
        addAll(m?.genres.orEmpty()); addAll(m?.cast.orEmpty().map { it.name })
    }
    return fields.any { Tmdb.norm(it).contains(q) }
}
