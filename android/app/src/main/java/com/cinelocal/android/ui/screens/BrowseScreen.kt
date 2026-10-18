package com.cinelocal.android.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title
import com.cinelocal.android.repo
import com.cinelocal.android.ui.Sort
import com.cinelocal.android.ui.allGenres
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.sortTitles
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.theme.CL

enum class BrowseKind(val title: String) { MOVIES("Películas"), SERIES("Series"), LIST("Mi lista") }

private enum class Seen(val label: String) { ALL("Todas"), UNSEEN("Sin ver"), SEEN("Vistas") }

@Composable
fun BrowseScreen(kind: BrowseKind, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()

    // En Mi lista, "Añadido recientemente" respeta el orden en que se añadieron a la lista
    var sort by rememberSaveable { mutableStateOf(Sort.ADDED) }
    var seen by rememberSaveable { mutableStateOf(Seen.ALL) }
    var genre by rememberSaveable { mutableStateOf<String?>(null) }

    val base = when (kind) {
        BrowseKind.MOVIES -> titles.filter { it.isMovie }
        BrowseKind.SERIES -> titles.filter { !it.isMovie }
        BrowseKind.LIST -> user.favorites.mapNotNull { id -> titles.firstOrNull { it.id == id } }
    }
    val genres = allGenres(base).map { it.first }
    val shown = base
        .filter { genre == null || genre in it.meta?.genres.orEmpty() }
        .filter {
            when (seen) {
                Seen.ALL -> true
                Seen.SEEN -> isWatched(it, progress)
                Seen.UNSEEN -> !isWatched(it, progress)
            }
        }
        .let { if (kind == BrowseKind.LIST && sort == Sort.ADDED) it else sortTitles(it, sort) }

    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, kind.title)
        if (base.isEmpty()) {
            if (kind == BrowseKind.LIST) EmptyState("Mi lista está vacía", "Añade películas y series desde su ficha con el botón «Mi lista».")
            else EmptyState("Nada por aquí", "No hay ${kind.title.lowercase()} en la biblioteca.")
            return
        }
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ChipMenu(sort.label, Icons.AutoMirrored.Filled.Sort, Sort.entries.map { it.label }, sort.label) { i -> sort = Sort.entries[i] }
            for (s in Seen.entries) {
                FilterChip(
                    selected = seen == s, onClick = { seen = s }, label = { Text(s.label) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = CL.accent.copy(alpha = .35f))
                )
            }
            if (genres.isNotEmpty()) {
                ChipMenu(genre ?: "Géneros", Icons.Default.FilterList, listOf("Todos los géneros") + genres, genre ?: "Todos los géneros") { i ->
                    genre = if (i == 0) null else genres[i - 1]
                }
            }
        }
        TitleGrid(shown, progress, nav)
    }
}

@Composable
fun TitleGrid(list: List<Title>, progress: Map<String, Progress>, nav: Nav) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(108.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(list, key = { it.id }) { t ->
            PosterCard(
                t, isWatched(t, progress),
                if (t.isMovie) fraction(progress[t.item.path]?.takeIf { !it.watched }) else 0f,
                null
            ) { nav.detail(t.id) }
        }
    }
}

/** Chip que abre un menú de opciones */
@Composable
fun ChipMenu(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, options: List<String>, selected: String, onSelect: (Int) -> Unit) {
    var open by rememberSaveable { mutableStateOf(false) }
    Box {
        FilterChip(
            selected = false, onClick = { open = true }, label = { Text(label) },
            leadingIcon = { Icon(icon, null, Modifier.size(18.dp)) }
        )
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEachIndexed { i, o ->
                DropdownMenuItem(
                    text = { Text(o) },
                    trailingIcon = { if (o == selected) Icon(Icons.Default.Check, null) },
                    onClick = { open = false; onSelect(i) }
                )
            }
        }
    }
}
