package com.cinelocal.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title
import com.cinelocal.android.data.Tmdb
import com.cinelocal.android.repo
import com.cinelocal.android.ui.SeriesMode
import com.cinelocal.android.ui.epMeta
import com.cinelocal.android.ui.fmtLeft
import com.cinelocal.android.ui.fmtRuntime
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.metaLine
import com.cinelocal.android.ui.seriesState
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.GradientButton
import com.cinelocal.android.ui.components.ProgressBar
import com.cinelocal.android.ui.components.SecondaryButton
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch

@Composable
fun DetailScreen(id: String, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val t = titles.firstOrNull { it.id == id }
    if (t == null) {
        EmptyState("No encontrado", "Este título ya no está en la biblioteca.", "Volver") { nav.back() }
        return
    }
    val m = t.meta
    val fav = id in user.favorites
    val watched = isWatched(t, progress)
    var identifying by remember { mutableStateOf(false) }

    val st = if (t.isMovie) null else seriesState(t, progress)
    var season by rememberSaveable(id) { mutableStateOf(st?.ep?.season ?: t.item.seasons.firstOrNull() ?: 1) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
            item {
                Box(Modifier.fillMaxWidth().aspectRatio(16f / 11f)) {
                    Artwork(m?.backdrop ?: m?.poster, t.name, null, Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x6608080C), 0.35f to Color.Transparent, 1f to CL.bg)))
                    Box(Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp)) {
                        if (m?.logo != null) AsyncImage(m.logo, t.name, Modifier.widthIn(max = 260.dp).heightIn(max = 90.dp), alignment = Alignment.BottomStart)
                        else Text(t.name, style = MaterialTheme.typography.headlineLarge, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            item {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(metaLine(t), color = CL.text2, style = MaterialTheme.typography.bodyMedium)
                    if (m?.genres?.isNotEmpty() == true) Text(m.genres.joinToString(" · "), color = CL.text3, style = MaterialTheme.typography.bodyMedium)

                    PlayButtons(t, progress, st, nav)

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SecondaryButton(if (fav) "En mi lista" else "Mi lista",
                            icon = { Icon(if (fav) Icons.Default.Check else Icons.Default.Add, null, Modifier.size(18.dp)) }
                        ) { repo.toggleFavorite(id) }
                        val paths = if (t.isMovie) listOf(t.item.path) else t.item.episodes.map { it.path }
                        SecondaryButton(if (watched) "Vista" else "Marcar vista",
                            icon = { Icon(if (watched) Icons.Default.CheckCircle else Icons.Outlined.CheckCircle, null, Modifier.size(18.dp)) }
                        ) { repo.markWatched(paths, !watched) }
                    }

                    m?.tagline?.let { Text(it, style = MaterialTheme.typography.titleMedium, color = CL.text2) }
                    Text(m?.overview ?: "Sin sinopsis.", style = MaterialTheme.typography.bodyLarge)
                    m?.director?.let { Credit("Dirección", it) }
                    m?.creators?.let { Credit("Creada por", it) }
                    if (m == null) Text(
                        if (repo.settings.value.tmdbKey.isBlank()) "Pon una API key de TMDB en Ajustes para ver carátulas y sinopsis."
                        else "Sin datos de TMDB para «${t.item.title}». Usa ··· → Corregir coincidencia.",
                        color = CL.text3, style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
            if (m?.cast?.isNotEmpty() == true) {
                item { Text("Reparto", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 10.dp)) }
                item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(m.cast) { c ->
                            Column(Modifier.width(84.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Artwork(c.photo, c.name, null, Modifier.size(72.dp).clip(CircleShape))
                                Text(c.name, style = MaterialTheme.typography.labelSmall, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                                c.character?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = CL.text3, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                            }
                        }
                    }
                }
            }
            if (!t.isMovie) {
                item {
                    Text("Episodios", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(start = 16.dp, top = 24.dp, bottom = 6.dp))
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(t.item.seasons) { s ->
                            FilterChip(
                                selected = s == season, onClick = { season = s },
                                label = { Text(m?.seasons?.get(s)?.name ?: if (s == 0) "Especiales" else "Temporada $s") },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = CL.accent.copy(alpha = .35f))
                            )
                        }
                    }
                }
                items(t.item.episodes.filter { it.season == season }, key = { it.id }) { e ->
                    EpisodeRow(t, e, progress[e.path], onPlay = { nav.play(t.id, e.id) }) {
                        repo.markWatched(listOf(e.path), progress[e.path]?.watched != true)
                    }
                }
            }
        }

        // barra superior flotante: volver y menú
        Row(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(4.dp)) {
            val btn = IconButtonDefaults.iconButtonColors(containerColor = Color(0x66000000))
            IconButton(onClick = { nav.back() }, colors = btn) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver") }
            Spacer(Modifier.weight(1f))
            var menu by remember { mutableStateOf(false) }
            Box {
                IconButton(onClick = { menu = true }, colors = btn) { Icon(Icons.Default.MoreVert, "Más") }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Corregir coincidencia") }, onClick = { menu = false; identifying = true })
                    if (t.isMovie || t.item.episodes.isNotEmpty()) {
                        DropdownMenuItem(text = { Text("Reproducir desde el principio") }, onClick = {
                            menu = false
                            nav.play(t.id, st?.ep?.id, fromStart = true)
                        })
                    }
                }
            }
        }
    }

    if (identifying) IdentifyDialog(t) { identifying = false }
}

@Composable
private fun PlayButtons(t: Title, progress: Map<String, Progress>, st: com.cinelocal.android.ui.SeriesState?, nav: Nav) {
    val playIcon: @Composable () -> Unit = { Icon(Icons.Default.PlayArrow, null, Modifier.size(20.dp)) }
    if (t.isMovie) {
        val p = progress[t.item.path]
        val resume = p != null && !p.watched && p.pos > 30
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            GradientButton(if (resume) "Continuar" else "Reproducir", Modifier.fillMaxWidth(), playIcon) { nav.play(t.id) }
            if (resume) {
                ProgressBar(fraction(p), Modifier.fillMaxWidth().clip(RoundedCornerShape(2.dp)))
                Text(fmtLeft(p.dur - p.pos), style = MaterialTheme.typography.labelSmall, color = CL.text2)
            }
        }
    } else if (st != null) {
        val label = when (st.mode) {
            SeriesMode.START -> "Reproducir ${st.ep.label}"
            SeriesMode.RESUME -> "Continuar ${st.ep.label}"
            SeriesMode.NEXT -> "Siguiente: ${st.ep.label}"
            SeriesMode.DONE -> "Volver a ver ${st.ep.label}"
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            GradientButton(label, Modifier.fillMaxWidth(), if (st.mode == SeriesMode.DONE) ({ Icon(Icons.Default.Replay, null, Modifier.size(20.dp)) }) else playIcon) {
                nav.play(t.id, st.ep.id, fromStart = st.mode == SeriesMode.DONE)
            }
            if (st.mode == SeriesMode.RESUME && st.p != null) ProgressBar(fraction(st.p), Modifier.fillMaxWidth().clip(RoundedCornerShape(2.dp)))
        }
    }
}

@Composable
private fun Credit(label: String, value: String) {
    Row {
        Text("$label: ", color = CL.text3, style = MaterialTheme.typography.bodyMedium)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun EpisodeRow(t: Title, e: Episode, p: Progress?, onPlay: () -> Unit, onToggleWatched: () -> Unit) {
    val em = epMeta(t, e)
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onPlay).padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.width(132.dp).aspectRatio(16f / 9f).clip(RoundedCornerShape(6.dp))) {
            Artwork(em?.still ?: t.meta?.backdrop, e.label, null, Modifier.fillMaxSize())
            Box(Modifier.align(Alignment.Center).size(32.dp).clip(CircleShape).background(Color(0x99000000)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.PlayArrow, null, Modifier.size(20.dp))
            }
            if (p != null && !p.watched && p.pos > 0) ProgressBar(fraction(p), Modifier.align(Alignment.BottomStart).fillMaxWidth())
        }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(
                "${e.episode}. " + (em?.name ?: e.fileName),
                style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis
            )
            Text(
                listOfNotNull(e.label, fmtRuntime(em?.runtime).ifEmpty { null }).joinToString(" · "),
                style = MaterialTheme.typography.labelSmall, color = CL.text3
            )
            em?.overview?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 2, overflow = TextOverflow.Ellipsis) }
        }
        IconButton(onClick = onToggleWatched) {
            if (p?.watched == true) Icon(Icons.Default.CheckCircle, "Vista", tint = CL.ok)
            else Icon(Icons.Outlined.CheckCircle, "Marcar como vista", tint = CL.text3)
        }
    }
}

/** Corregir coincidencia: buscar en TMDB y elegir el resultado correcto (se recuerda al reescanear) */
@Composable
private fun IdentifyDialog(t: Title, onClose: () -> Unit) {
    val repo = LocalContext.current.repo
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf(t.item.title) }
    var results by remember { mutableStateOf<List<Tmdb.SearchResult>?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val type = if (t.isMovie) "movie" else "series"

    fun search() = scope.launch {
        busy = true; error = null
        try { results = repo.searchTmdb(type, query, null) } catch (e: Exception) { error = e.message }
        busy = false
    }
    LaunchedEffect(Unit) { search() }

    AlertDialog(
        onDismissRequest = onClose,
        confirmButton = { TextButton(onClick = onClose) { Text("Cerrar") } },
        title = { Text("Corregir coincidencia") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(query, { query = it }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    trailingIcon = { TextButton(onClick = { search() }) { Text("Buscar") } })
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                if (busy) CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                LazyColumn(Modifier.height(320.dp)) {
                    items(results.orEmpty()) { r ->
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                scope.launch {
                                    busy = true
                                    try { repo.identify(t.id, r.id); onClose() } catch (e: Exception) { error = e.message }
                                    busy = false
                                }
                            }.padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Artwork(r.poster, r.title, null, Modifier.width(46.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(4.dp)))
                            Column(Modifier.padding(start = 10.dp)) {
                                Text(r.title + (r.year?.let { " ($it)" } ?: ""), style = MaterialTheme.typography.titleMedium)
                                if (r.originalTitle != null && r.originalTitle != r.title) Text(r.originalTitle, style = MaterialTheme.typography.labelSmall, color = CL.text3)
                            }
                        }
                    }
                }
            }
        }
    )
}
