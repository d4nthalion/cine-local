package com.cinelocal.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Title
import com.cinelocal.android.repo
import com.cinelocal.android.ui.Sort
import com.cinelocal.android.ui.SeriesMode
import com.cinelocal.android.ui.allGenres
import com.cinelocal.android.ui.continueList
import com.cinelocal.android.ui.epMeta
import com.cinelocal.android.ui.fmtLeft
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.watchlistEntries
import com.cinelocal.android.ui.components.MissingCard
import com.cinelocal.android.ui.metaLine
import com.cinelocal.android.ui.seriesState
import com.cinelocal.android.ui.sortTitles
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.GradientButton
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.components.SecondaryButton
import com.cinelocal.android.ui.components.WideCard
import com.cinelocal.android.ui.components.section
import com.cinelocal.android.ui.theme.CL

private val CARD_W = 118.dp

@Composable
fun HomeScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val library by repo.library.flow.collectAsStateWithLifecycle()
    val status by repo.status.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
    val lbEntries by repo.lbEntries.collectAsStateWithLifecycle()

    if (!settings.configured) {
        Column {
            MainTopBar(nav)
            EmptyState(
                "Conecta tu biblioteca",
                "Escribe la ruta de la carpeta compartida del PC con tus películas y series, por ejemplo \\\\MI-PC\\Peliculas.",
                "Ir a Ajustes", nav::settings
            )
        }
        return
    }
    if (titles.isEmpty()) {
        Column {
            MainTopBar(nav)
            when {
                status.scanning -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        CircularProgressIndicator(color = CL.accent)
                        Text("Leyendo la biblioteca…", color = CL.text2)
                    }
                }
                library.error != null -> EmptyState("No se puede abrir la biblioteca", library.error!!, "Reintentar") { repo.scan() }
                else -> EmptyState(
                    "No hay vídeos",
                    "En ${settings.libraryPath} no se han encontrado películas ni series. Los vídeos sueltos son películas y cada carpeta, una serie.",
                    "Volver a escanear"
                ) { repo.scan() }
            }
        }
        return
    }

    val hero = remember(titles.size, titles.count { it.meta?.backdrop != null }) {
        sortTitles(titles.filter { it.meta?.backdrop != null }, Sort.ADDED).take(10).shuffled().firstOrNull()
    }
    val cont = continueList(titles, progress)
    val recent = sortTitles(titles, Sort.ADDED).take(24)
    val series = sortTitles(titles.filter { !it.isMovie }, Sort.ADDED).take(30)
    val movies = sortTitles(titles.filter { it.isMovie }, Sort.ADDED).take(30)
    val favs = user.favorites.mapNotNull { id -> titles.firstOrNull { it.id == id } }
    val topRated = titles.filter { (it.meta?.rating ?: 0.0) >= 7.5 }.sortedByDescending { it.meta?.rating }.take(24)
    val genres = allGenres(titles).filter { it.second >= 4 }.take(8)

    @Composable
    fun poster(t: Title) = PosterCard(
        t, isWatched(t, progress),
        if (t.isMovie) fraction(progress[t.item.path]?.takeIf { !it.watched }) else 0f,
        CARD_W, lbOf(t, lbById)
    ) { nav.detail(t.id) }
    // watchlist de Letterboxd: primero las que ya puedes ver
    val wl = watchlistEntries(lbEntries, titles).let { l -> (l.filter { it.second != null } + l.filter { it.second == null }).take(30) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
            if (hero != null) item(key = "hero") { Hero(hero, nav) }
            else item(key = "pad") { Spacer(Modifier.height(100.dp)) }

            if (cont.isNotEmpty()) section("Continuar viendo") {
                items(cont, key = { it.title.id }) { c ->
                    val t = c.title
                    if (c.ep != null) {
                        val em = epMeta(t, c.ep)
                        val st = seriesState(t, progress)
                        WideCard(
                            em?.still ?: t.meta?.backdrop, t.name,
                            (if (st.mode == SeriesMode.NEXT) "Siguiente: " else "") + c.ep.label + (em?.name?.let { " · $it" } ?: ""),
                            fraction(c.p)
                        ) { nav.play(t.id, c.ep.id) }
                    } else {
                        WideCard(t.meta?.backdrop, t.name, c.p?.let { fmtLeft(it.dur - it.pos) } ?: "", fraction(c.p)) { nav.play(t.id) }
                    }
                }
            }
            section("Añadido recientemente") { items(recent, key = { "rec-" + it.id }) { poster(it) } }
            if (favs.isNotEmpty()) section("Mi lista", { nav.tab("list") }) { items(favs, key = { "fav-" + it.id }) { poster(it) } }
            if (wl.isNotEmpty()) section("Tu watchlist de Letterboxd", nav::watchlist) {
                items(wl, key = { "wl-" + it.first.key }) { (e, t) ->
                    if (t != null) poster(t) else MissingCard(e, CARD_W) { e.film.url?.let(nav::open) }
                }
            }
            if (series.isNotEmpty()) section("Series", { nav.tab("series") }) { items(series, key = { "s-" + it.id }) { poster(it) } }
            if (movies.isNotEmpty()) section("Películas", { nav.tab("movies") }) { items(movies, key = { "m-" + it.id }) { poster(it) } }
            if (topRated.size >= 4) section("Las mejor valoradas") { items(topRated, key = { "top-" + it.id }) { poster(it) } }
            for ((g, _) in genres) {
                val list = sortTitles(titles.filter { g in it.meta?.genres.orEmpty() }, Sort.RATING)
                section(g) { items(list, key = { "g-$g-" + it.id }) { poster(it) } }
            }
        }
        // cabecera sobre el destacado, con degradado para que se lea
        Box(Modifier.background(Brush.verticalGradient(listOf(Color(0xCC08080C), Color.Transparent)))) {
            MainTopBar(nav, transparent = true)
        }
    }
}

@Composable
private fun Hero(t: Title, nav: Nav) {
    val m = t.meta
    Box(Modifier.fillMaxWidth().aspectRatio(0.78f)) {
        Artwork(m?.backdrop, t.name, null, Modifier.fillMaxSize())
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(0f to Color.Transparent, 0.45f to Color.Transparent, 1f to CL.bg)
            )
        )
        Column(
            Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(if (t.isMovie) "PELÍCULA" else "SERIE", style = MaterialTheme.typography.labelSmall, color = CL.text2)
            if (m?.logo != null) {
                AsyncImage(m.logo, t.name, Modifier.widthIn(max = 260.dp).height(90.dp), alignment = Alignment.BottomStart)
            } else {
                Text(t.name, style = MaterialTheme.typography.headlineLarge, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text(metaLine(t), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                GradientButton("Reproducir", icon = { Icon(Icons.Default.PlayArrow, null, Modifier.size(20.dp)) }) {
                    nav.play(t.id)
                }
                SecondaryButton("Más info", icon = { Icon(Icons.Default.Info, null, Modifier.size(18.dp)) }) { nav.detail(t.id) }
            }
        }
    }
}
