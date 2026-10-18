package com.cinelocal.android.ui.screens

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.cinelocal.android.Nav
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Title
import com.cinelocal.android.repo
import com.cinelocal.android.ui.Sort
import com.cinelocal.android.ui.SeriesMode
import com.cinelocal.android.ui.allGenres
import com.cinelocal.android.ui.continueList
import com.cinelocal.android.ui.epMeta
import com.cinelocal.android.ui.fmtLeft
import com.cinelocal.android.ui.fmtRuntime
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.watchlistEntries
import com.cinelocal.android.ui.seriesState
import com.cinelocal.android.ui.sortTitles
import com.cinelocal.android.ui.components.ActionIcon
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.HomeSkeleton
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.MissingCard
import com.cinelocal.android.ui.components.RequestSheet
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.components.PrimaryButton
import com.cinelocal.android.ui.components.RankedPosterCard
import com.cinelocal.android.ui.components.ScanRefreshBox
import com.cinelocal.android.ui.components.WideCard
import com.cinelocal.android.ui.components.section
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.rememberMotionEnabled

private val CARD_W = 112.dp
private const val HERO_RATIO = 0.72f

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
    var sheet by remember { mutableStateOf<LbEntry?>(null) }

    if (!settings.configured) {
        Column {
            MainTopBar(nav)
            EmptyState(
                "Conecta tu biblioteca",
                "Escribe la ruta de la carpeta compartida del PC con tus películas y series, por ejemplo \\\\MI-PC\\Peliculas.",
                "Ir a Ajustes", onAction = nav::settings
            )
        }
        return
    }
    if (titles.isEmpty()) {
        if (status.scanning) {
            Box(Modifier.fillMaxSize()) {
                HomeSkeleton()
                MainTopBar(nav, bgAlpha = 0f)
                Text(
                    "Leyendo la biblioteca…", style = MaterialTheme.typography.labelMedium, color = CL.text3,
                    modifier = Modifier.align(Alignment.BottomStart).padding(16.dp)
                )
            }
            return
        }
        Column {
            MainTopBar(nav)
            if (library.error != null) EmptyState(
                "No se puede abrir la biblioteca", "No se ha podido leer la carpeta compartida.", "Reintentar",
                error = true, detail = library.error
            ) { repo.scan() } else EmptyState(
                "No hay vídeos",
                "En ${settings.libraryPath} no se han encontrado películas ni series. Los vídeos sueltos son películas y cada carpeta, una serie.",
                "Volver a escanear"
            ) { repo.scan() }
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

    fun movieProgress(t: Title) = if (t.isMovie) fraction(progress[t.item.path]?.takeIf { !it.watched }) else 0f

    @Composable
    fun poster(t: Title) = PosterCard(t, isWatched(t, progress), movieProgress(t), CARD_W, lbOf(t, lbById)) { nav.detail(t.id) }
    // watchlist de Letterboxd: primero las que ya puedes ver
    val wl = watchlistEntries(lbEntries, titles).let { l -> (l.filter { it.second != null } + l.filter { it.second == null }).take(30) }

    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val heroPx = with(density) {
        if (hero != null) (LocalConfiguration.current.screenWidthDp.dp / HERO_RATIO).toPx() else 100.dp.toPx()
    }
    // la cabecera se rellena cuando el destacado ha salido en buena parte (antes: los pósteres pasaban por debajo)
    val barTarget by remember(heroPx) {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) 1f
            else (listState.firstVisibleItemScrollOffset / heroPx * 1.6f - 0.6f).coerceIn(0f, 1f)
        }
    }
    val barAlpha by animateFloatAsState(barTarget, tween(Dur.fast), label = "bar")

    // deslizar hacia abajo vuelve a escanear (igual que el icono de la cabecera)
    ScanRefreshBox(indicatorTop = with(density) { WindowInsets.statusBars.getTop(density).toDp() } + 56.dp) {
        LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 28.dp)) {
            if (hero != null) item(key = "hero") { Hero(hero, hero.id in user.favorites, listState, nav) { repo.toggleFavorite(hero.id) } }
            else item(key = "pad") { Spacer(Modifier.height(100.dp)) }

            var first = true
            fun isFirst() = first.also { first = false }

            if (cont.isNotEmpty()) section("Continuar viendo", first = isFirst()) {
                items(cont, key = { it.title.id }) { c ->
                    val t = c.title
                    if (c.ep != null) {
                        val em = epMeta(t, c.ep)
                        val st = seriesState(t, progress)
                        WideCard(
                            em?.still ?: t.meta?.backdrop, t.name,
                            (if (st.mode == SeriesMode.NEXT) "Siguiente: " else "") + c.ep.label + (em?.name?.let { " · $it" } ?: ""),
                            c.p?.let { fmtLeft(it.dur - it.pos) } ?: c.ep.label,
                            fraction(c.p)
                        ) { nav.play(t.id, c.ep.id) }
                    } else {
                        WideCard(
                            t.meta?.backdrop, t.name,
                            listOfNotNull(t.year?.toString(), fmtRuntime(t.meta?.runtime).ifEmpty { null }).joinToString(" · "),
                            c.p?.let { fmtLeft(it.dur - it.pos) }, fraction(c.p)
                        ) { nav.play(t.id) }
                    }
                }
            }
            section("Añadido recientemente", first = isFirst()) { items(recent, key = { "rec-" + it.id }) { poster(it) } }
            if (favs.isNotEmpty()) section("Mi lista", { nav.tab("list") }) { items(favs, key = { "fav-" + it.id }) { poster(it) } }
            if (wl.isNotEmpty()) section("Tu watchlist de Letterboxd", nav::watchlist) {
                items(wl, key = { "wl-" + it.first.key }) { (e, t) ->
                    if (t != null) poster(t) else MissingCard(e, CARD_W, e.key in user.requested) { sheet = e }
                }
            }
            if (series.isNotEmpty()) section("Series", { nav.tab("series") }) { items(series, key = { "s-" + it.id }) { poster(it) } }
            if (movies.isNotEmpty()) section("Películas", { nav.tab("movies") }) { items(movies, key = { "m-" + it.id }) { poster(it) } }
            if (topRated.size >= 4) section(if (topRated.size >= 10) "Las 10 mejor valoradas" else "Las mejor valoradas") {
                itemsIndexed(topRated, key = { _, t -> "top-" + t.id }) { i, t ->
                    if (i < 10) RankedPosterCard(i + 1, t, isWatched(t, progress), movieProgress(t), lbOf(t, lbById)) { nav.detail(t.id) }
                    else poster(t)
                }
            }
            for ((g, _) in genres) {
                val list = sortTitles(titles.filter { g in it.meta?.genres.orEmpty() }, Sort.RATING)
                section(g) { items(list, key = { "g-$g-" + it.id }) { poster(it) } }
            }
        }
        MainTopBar(nav, bgAlpha = barAlpha)
    }
    sheet?.let { RequestSheet(it, nav) { sheet = null } }
}

@Composable
private fun Hero(t: Title, fav: Boolean, listState: LazyListState, nav: Nav, onToggleFav: () -> Unit) {
    val m = t.meta
    val motion = rememberMotionEnabled()
    // Ken Burns muy lento sobre la imagen
    val kb = if (motion) {
        val tr = rememberInfiniteTransition(label = "kb")
        tr.animateFloat(1f, 1.06f, infiniteRepeatable(tween(18_000, easing = LinearEasing), RepeatMode.Reverse), label = "kbScale").value
    } else 1f
    fun off(h: Float) = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else h

    var heroH by remember { mutableFloatStateOf(1f) }
    Box(Modifier.fillMaxWidth().aspectRatio(HERO_RATIO).clipToBounds().onSizeChanged { heroH = it.height.toFloat().coerceAtLeast(1f) }) {
        Box(
            Modifier.fillMaxSize().graphicsLayer {
                val o = off(size.height)
                if (motion) translationY = o * 0.45f
                alpha = 1f - (o / size.height).coerceIn(0f, 1f) * 0.6f
                scaleX = kb; scaleY = kb
            }
        ) { Artwork(m?.backdrop, t.name, null, Modifier.fillMaxSize()) }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x990B0A09), 0.22f to Color.Transparent)))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.42f to Color.Transparent, 0.78f to Color(0xB30B0A09), 1f to CL.bg)))
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0f to Color(0x400B0A09), 0.5f to Color.Transparent, 1f to Color(0x400B0A09))))

        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(start = 24.dp, end = 24.dp, bottom = 24.dp)
                .graphicsLayer { alpha = 1f - (off(heroH) / (heroH * .5f)).coerceIn(0f, 1f) },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.width(2.dp).height(10.dp).background(CL.accent))
                val kind = if (t.isMovie) listOfNotNull("PELÍCULA", t.year?.toString())
                else listOf("SERIE", t.item.seasons.size.let { if (it == 1) "1 TEMPORADA" else "$it TEMPORADAS" })
                Text(kind.joinToString(" · "), Modifier.padding(start = 8.dp), style = MaterialTheme.typography.labelSmall, color = CL.text2)
            }
            if (m?.logo != null) {
                AsyncImage(
                    m.logo, t.name, Modifier.widthIn(max = 280.dp).heightIn(max = 110.dp),
                    contentScale = ContentScale.Fit, alignment = Alignment.Center
                )
            } else {
                Text(
                    t.name.uppercase(), style = MaterialTheme.typography.displayLarge, color = CL.text,
                    textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis
                )
            }
            val g = m?.genres.orEmpty().take(3)
            if (g.isNotEmpty()) Text(
                buildAnnotatedString {
                    g.forEachIndexed { i, s ->
                        if (i > 0) withStyle(SpanStyle(color = CL.text3)) { append("  •  ") }
                        append(s)
                    }
                },
                style = MaterialTheme.typography.bodyMedium, color = CL.text, textAlign = TextAlign.Center
            )
            Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                ActionIcon(if (fav) Icons.Rounded.Check else Icons.Rounded.Add, "Mi lista", onClick = onToggleFav)
                PrimaryButton("Reproducir", Modifier.widthIn(min = 132.dp), Icons.Rounded.PlayArrow) { nav.play(t.id) }
                ActionIcon(Icons.Outlined.Info, "Info") { nav.detail(t.id) }
            }
        }
    }
}
