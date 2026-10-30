package com.cinelocal.android.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.material3.MaterialTheme
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.ui.unit.Dp
import com.cinelocal.android.ui.components.MenuButton
import com.cinelocal.android.ui.components.ScanRefreshBox
import com.cinelocal.android.ui.components.TextTabs
import com.cinelocal.android.ui.theme.TNUM
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
import com.cinelocal.android.core.DlSummary
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.videoPaths
import com.cinelocal.android.core.Title
import com.cinelocal.android.repo
import com.cinelocal.android.ui.Sort
import com.cinelocal.android.ui.allGenres
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.sortTitles
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.rememberDlIndex
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.theme.CL

enum class BrowseKind(val title: String) { MOVIES("Películas"), SERIES("Series") }

private enum class Seen(val label: String) { ALL("Todas"), UNSEEN("Sin ver"), SEEN("Vistas"), DOWNLOADED("Descargadas") }

@Composable
fun BrowseScreen(kind: BrowseKind, nav: Nav, header: (@Composable () -> Unit)? = null) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
    val onlyDownloaded by repo.onlyDownloaded.collectAsStateWithLifecycle()
    val dlIndex by rememberDlIndex()
    fun downloaded(t: Title) = DlSummary.of(videoPaths(t.item), dlIndex).done > 0

    var sort by rememberSaveable { mutableStateOf(Sort.ADDED) }
    var seen by rememberSaveable { mutableStateOf(Seen.ALL) }
    var genre by rememberSaveable { mutableStateOf<String?>(null) }

    val base = when (kind) {
        BrowseKind.MOVIES -> titles.filter { it.isMovie }
        BrowseKind.SERIES -> titles.filter { !it.isMovie }
    }.let { l -> if (onlyDownloaded) l.filter(::downloaded) else l }
    // "Descargadas" solo aparece si hay algo descargado (o si ya está elegida)
    val seenTabs = Seen.entries.filter { it != Seen.DOWNLOADED || seen == it || base.any(::downloaded) }
    val genres = allGenres(base).map { it.first }
    val shown = base
        .filter { genre == null || genre in it.meta?.genres.orEmpty() }
        .filter {
            when (seen) {
                Seen.ALL -> true
                Seen.SEEN -> isWatched(it, progress)
                Seen.UNSEEN -> !isWatched(it, progress)
                Seen.DOWNLOADED -> downloaded(it)
            }
        }
        .let { sortTitles(it, sort, lbById) }
    // "Mi nota" sólo en Películas y con datos de Letterboxd
    val sorts = Sort.entries.filter { it != Sort.MINE || (kind == BrowseKind.MOVIES && lbById.isNotEmpty()) }

    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle(kind.title, if (header != null) null else base.size)
        header?.invoke()
        if (base.isEmpty()) {
            if (onlyDownloaded) EmptyState("Nada descargado", "No tienes ${kind.title.lowercase()} descargadas para ver sin conexión.", "Ver todo") {
                repo.onlyDownloaded.value = false
            } else EmptyState("Nada por aquí", "No hay ${kind.title.lowercase()} en la biblioteca.")
            return
        }
        TextTabs(
            seenTabs.map { it.label }, seenTabs.indexOf(seen).coerceAtLeast(0), { seen = seenTabs[it] },
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp)
        )
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            MenuButton("Orden", sort.short, sorts.map { it.label }, sorts.indexOf(sort)) { i -> sort = sorts[i] }
            if (genres.isNotEmpty()) {
                MenuButton("Género", genre ?: "Todos", listOf("Todos los géneros") + genres, genre?.let { genres.indexOf(it) + 1 } ?: 0) { i ->
                    genre = if (i == 0) null else genres[i - 1]
                }
            }
        }
        ScanRefreshBox { TitleGrid(shown, progress, nav) }
    }
}

/** Título de pantalla editorial: "Películas 128" */
@Composable
fun ScreenTitle(title: String, count: Int?) {
    Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.Bottom) {
        Text(title, style = MaterialTheme.typography.headlineLarge, color = CL.text)
        if (count != null && count > 0) Text(
            " $count", style = MaterialTheme.typography.headlineLarge.copy(fontFeatureSettings = TNUM), color = CL.text4
        )
    }
}

/** Etiqueta corta del orden para el botón */
private val Sort.short get() = when (this) {
    Sort.ADDED -> "Añadido"
    Sort.TITLE -> "Título"
    Sort.YEAR -> "Año"
    Sort.RATING -> "Valoración"
    Sort.MINE -> "Mi nota"
}

@Composable
fun TitleGrid(list: List<Title>, progress: Map<String, Progress>, nav: Nav, top: Dp = 8.dp) {
    val lbById by LocalContext.current.repo.lbById.collectAsStateWithLifecycle()
    LazyVerticalGrid(
        columns = GridCells.Adaptive(104.dp),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = top, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(list, key = { it.id }) { t ->
            Box(Modifier.animateItem(fadeInSpec = tween(180), placementSpec = spring(stiffness = Spring.StiffnessMediumLow), fadeOutSpec = tween(120))) {
                PosterCard(
                    t, isWatched(t, progress),
                    if (t.isMovie) fraction(progress[t.item.path]?.takeIf { !it.watched }) else 0f,
                    null, lbOf(t, lbById)
                ) { nav.detail(t.id) }
            }
        }
    }
}
