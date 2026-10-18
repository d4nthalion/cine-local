package com.cinelocal.android.ui.screens

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.outlined.CheckCircleOutline
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title
import com.cinelocal.android.data.Tmdb
import com.cinelocal.android.repo
import com.cinelocal.android.ui.SeriesMode
import com.cinelocal.android.ui.SeriesState
import com.cinelocal.android.ui.epMeta
import com.cinelocal.android.ui.fmtDateShort
import com.cinelocal.android.ui.fmtLeft
import com.cinelocal.android.ui.fmtRuntime
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.seriesState
import com.cinelocal.android.ui.components.ActionIcon
import com.cinelocal.android.ui.components.AppMenu
import com.cinelocal.android.ui.components.AppMenuItem
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.LbDots
import com.cinelocal.android.ui.components.PlayRing
import com.cinelocal.android.ui.components.PrimaryButton
import com.cinelocal.android.ui.components.ProgressBar
import com.cinelocal.android.ui.components.SearchField
import com.cinelocal.android.ui.components.SecondaryButton
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.TextTabs
import com.cinelocal.android.ui.components.cardShape
import com.cinelocal.android.ui.components.posterHairline
import com.cinelocal.android.ui.components.tapFade
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.components.tapScale
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Display
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.TNUM
import com.cinelocal.android.ui.theme.TextFont
import com.cinelocal.android.ui.theme.rememberMotionEnabled
import kotlinx.coroutines.launch

private const val HEADER_RATIO = 16f / 12f

@Composable
fun DetailScreen(id: String, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
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
    val canPlayFromStart = t.isMovie || t.item.episodes.isNotEmpty()
    val playFromStart = { nav.play(t.id, st?.ep?.id, fromStart = true) }

    val listState = rememberLazyListState()
    val density = LocalDensity.current
    val headerPx = with(density) { (LocalConfiguration.current.screenWidthDp.dp / HEADER_RATIO).toPx() }
    // la barra se rellena justo cuando el logotipo de la cabecera llega a ella (sin superponerse)
    val barPx = with(density) { WindowInsets.statusBars.getTop(density) + 56.dp.toPx() }
    val rampPx = with(density) { 96.dp.toPx() }
    val barTarget by remember(headerPx, barPx) {
        derivedStateOf {
            if (listState.firstVisibleItemIndex > 0) 1f
            else ((listState.firstVisibleItemScrollOffset - (headerPx - barPx - rampPx)) / rampPx).coerceIn(0f, 1f)
        }
    }
    val bar by animateFloatAsState(barTarget, tween(Dur.fast), label = "bar")

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 32.dp)) {
            item(key = "header") { Header(t, listState, bar) }
            item(key = "info") {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    MetaRow(t, Modifier.padding(top = 12.dp))
                    if (m?.genres?.isNotEmpty() == true) Text(
                        m.genres.joinToString("  /  ") { it.uppercase() }, Modifier.padding(top = 8.dp),
                        style = MaterialTheme.typography.labelSmall, color = CL.text3
                    )
                    lbOf(t, lbById)?.let { LbLine(it, nav, Modifier.padding(top = 16.dp)) }

                    Spacer(Modifier.height(16.dp))
                    PlayButtons(t, progress, st, nav)

                    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ActionIcon(if (fav) Icons.Rounded.Check else Icons.Rounded.Add, "Mi lista") { repo.toggleFavorite(id) }
                        val paths = if (t.isMovie) listOf(t.item.path) else t.item.episodes.map { it.path }
                        ActionIcon(if (watched) Icons.Rounded.CheckCircle else Icons.Outlined.CheckCircleOutline, "Vista") {
                            repo.markWatched(paths, !watched)
                        }
                        if (canPlayFromStart) ActionIcon(Icons.Rounded.Replay, "Desde el principio", Modifier.width(112.dp)) { playFromStart() }
                    }

                    m?.tagline?.takeIf { it.isNotBlank() }?.let {
                        Text(it, Modifier.padding(top = 20.dp), style = MaterialTheme.typography.titleSmall, color = CL.text)
                    }
                    Overview(m?.overview ?: "Sin sinopsis.", Modifier.padding(top = if (m?.tagline.isNullOrBlank()) 20.dp else 10.dp))
                    if (m?.director != null || m?.creators != null) {
                        Column(Modifier.padding(top = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            m.director?.let { Credit("DIRECCIÓN", it) }
                            m.creators?.let { Credit("CREADA POR", it) }
                        }
                    }
                    if (m == null) Text(
                        if (repo.settings.value.tmdbKey.isBlank()) "Pon una API key de TMDB en Ajustes para ver carátulas y sinopsis."
                        else "Sin datos de TMDB para «${t.item.title}». Usa ··· → Corregir coincidencia.",
                        Modifier.padding(top = 12.dp), color = CL.text3, style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
            if (m?.cast?.isNotEmpty() == true) {
                item(key = "castH") { BlockTitle("Reparto") }
                item(key = "cast") {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(m.cast) { c -> CastCard(c.name, c.character, c.photo) }
                    }
                }
            }
            if (!t.isMovie) {
                item(key = "epsH") {
                    BlockTitle("Episodios")
                    SeasonPicker(t, season) { season = it }
                }
                val eps = t.item.episodes.filter { it.season == season }
                itemsIndexed(eps, key = { _, e -> e.id }) { i, e ->
                    if (i > 0) Box(Modifier.padding(start = 16.dp).fillMaxWidth().height(1.dp).background(CL.line))
                    EpisodeRow(t, e, progress[e.path], onPlay = { nav.play(t.id, e.id) }) {
                        repo.markWatched(listOf(e.path), progress[e.path]?.watched != true)
                    }
                }
            }
        }

        // barra superior flotante: se rellena al pasar la cabecera y muestra el título
        Box(Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(top = 56.dp).height(1.dp).background(CL.line.copy(alpha = CL.line.alpha * bar)))
        Row(
            Modifier.fillMaxWidth().background(CL.bg.copy(alpha = .96f * bar))
                .windowInsetsPadding(WindowInsets.statusBars).height(56.dp).padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FloatingIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver", bar) { nav.back() }
            Text(
                t.name, Modifier.weight(1f).padding(horizontal = 12.dp)
                    .graphicsLayer { alpha = bar; translationY = (1 - bar) * 8.dp.toPx() },
                style = MaterialTheme.typography.titleMedium, color = CL.text, maxLines = 1,
                overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center
            )
            var menu by remember { mutableStateOf(false) }
            Box {
                FloatingIcon(Icons.Rounded.MoreVert, "Más", bar) { menu = true }
                AppMenu(menu, { menu = false }) {
                    AppMenuItem("Corregir coincidencia") { menu = false; identifying = true }
                    if (canPlayFromStart) AppMenuItem("Reproducir desde el principio") { menu = false; playFromStart() }
                }
            }
        }
    }

    if (identifying) IdentifyDialog(t) { identifying = false }
}

/** Botón redondo de 40 dp sobre la imagen; su fondo desaparece cuando la barra ya es opaca */
@Composable
private fun FloatingIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, desc: String, bar: Float, onClick: () -> Unit) {
    Box(
        Modifier.size(48.dp).tapFade(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(Color(0x730B0A09).copy(alpha = 0.45f * (1 - bar))), contentAlignment = Alignment.Center) {
            Icon(icon, desc, Modifier.size(24.dp), tint = CL.text)
        }
    }
}

@Composable
private fun Header(t: Title, listState: LazyListState, bar: Float) {
    val m = t.meta
    val motion = rememberMotionEnabled()
    var h by remember { mutableFloatStateOf(1f) }
    fun off() = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset.toFloat() else h
    Box(Modifier.fillMaxWidth().aspectRatio(HEADER_RATIO).clipToBounds().onSizeChanged { h = it.height.toFloat().coerceAtLeast(1f) }) {
        Box(Modifier.fillMaxSize().graphicsLayer {
            val o = off()
            if (motion) translationY = o * 0.45f
            alpha = 1f - (o / h).coerceIn(0f, 1f) * 0.6f
        }) { Artwork(m?.backdrop ?: m?.poster, t.name, null, Modifier.fillMaxSize(), placeholderSize = 28) }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x8C0B0A09), 0.25f to Color.Transparent)))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.45f to Color.Transparent, 1f to CL.bg)))
        Box(Modifier.align(Alignment.BottomStart).padding(horizontal = 16.dp).graphicsLayer { alpha = 1f - bar }) {
            if (m?.logo != null) AsyncImage(
                m.logo, t.name, Modifier.widthIn(max = 260.dp).heightIn(max = 96.dp),
                contentScale = ContentScale.Fit, alignment = Alignment.BottomStart
            )
            else Text(t.name.uppercase(), style = MaterialTheme.typography.displayMedium, color = CL.text, maxLines = 3, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** "2001  2 h 27 min  [18]  ★ 7.8" con la edad en caja y la estrella en ámbar (mismas partes que metaLine) */
@Composable
private fun MetaRow(t: Title, modifier: Modifier = Modifier) {
    val m = t.meta
    val parts = mutableListOf<String>()
    t.year?.let { y -> parts += if (m?.endYear != null && m.endYear != y) "$y–${m.endYear}" else "$y" }
    if (t.isMovie) fmtRuntime(m?.runtime).takeIf { it.isNotEmpty() }?.let { parts += it }
    else {
        val n = t.item.seasons.size
        parts += if (n == 1) "1 temporada" else "$n temporadas"
    }
    val body = MaterialTheme.typography.bodyMedium.copy(fontFeatureSettings = TNUM)
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        for (p in parts) Text(p, style = body, color = CL.text2)
        m?.certification?.takeIf { it.isNotBlank() }?.let {
            Text(
                it, Modifier.border(1.dp, CL.lineStrong, RoundedCornerShape(2.dp)).padding(horizontal = 4.dp, vertical = 1.dp),
                style = MaterialTheme.typography.labelMedium, color = CL.text2
            )
        }
        m?.rating?.let {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("★ ", style = body, color = CL.accent)
                Text("$it", style = body, color = CL.text2)
            }
        }
    }
}

@Composable
private fun PlayButtons(t: Title, progress: Map<String, Progress>, st: SeriesState?, nav: Nav) {
    if (t.isMovie) {
        val p = progress[t.item.path]
        val resume = p != null && !p.watched && p.pos > 30
        PrimaryButton(if (resume) "Continuar" else "Reproducir", Modifier.fillMaxWidth(), Icons.Rounded.PlayArrow) { nav.play(t.id) }
        if (resume) ResumeBar(fraction(p), fmtLeft(p.dur - p.pos))
    } else if (st != null) {
        val label = when (st.mode) {
            SeriesMode.START -> "Reproducir ${st.ep.label}"
            SeriesMode.RESUME -> "Continuar ${st.ep.label}"
            SeriesMode.NEXT -> "Siguiente: ${st.ep.label}"
            SeriesMode.DONE -> "Volver a ver ${st.ep.label}"
        }
        PrimaryButton(label, Modifier.fillMaxWidth(), if (st.mode == SeriesMode.DONE) Icons.Rounded.Replay else Icons.Rounded.PlayArrow) {
            nav.play(t.id, st.ep.id, fromStart = st.mode == SeriesMode.DONE)
        }
        if (st.mode == SeriesMode.RESUME && st.p != null) ResumeBar(fraction(st.p), fmtLeft(st.p.dur - st.p.pos))
    }
}

@Composable
private fun ResumeBar(f: Float, left: String) {
    Row(Modifier.fillMaxWidth().padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        ProgressBar(f, Modifier.weight(1f).clip(RoundedCornerShape(2.dp)))
        Text(left, Modifier.padding(start = 12.dp), style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = TNUM), color = CL.text3)
    }
}

/** Franja de Letterboxd: "Tu nota ★★★★ ♥" y debajo "Vista el 28 ene 2024 · En tu watchlist"; al tocarla abre Letterboxd */
@Composable
private fun LbLine(lb: LbEntry, nav: Nav, modifier: Modifier = Modifier) {
    val f = lb.film
    val line2 = listOfNotNull(
        if (f.watched) (if (f.date != null) "Vista el ${fmtDateShort(f.date)}" else "Vista") else null,
        if (f.watchlist) "En tu watchlist" else null
    ).joinToString(" · ")
    if (f.rating == null && !f.liked && line2.isEmpty()) return
    Column(modifier.fillMaxWidth()) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(CL.line))
        Row(
            Modifier.fillMaxWidth().then(if (f.url != null) Modifier.tapRow { nav.open(f.url!!) } else Modifier).padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LbDots(6.dp, 2.dp, Modifier.padding(end = 10.dp))
                    val label = when {
                        f.rating != null -> "Tu nota"
                        f.liked -> "Te gustó"
                        else -> "Letterboxd"
                    }
                    Text(label, style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                    val st = TextStyle(fontFamily = TextFont, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, letterSpacing = 0.5.sp)
                    if (f.rating != null) Text(Letterboxd.stars(f.rating), Modifier.padding(start = 8.dp), style = st, color = CL.lbGreen)
                    if (f.liked) Text("♥\uFE0E", Modifier.padding(start = 8.dp), style = st, color = CL.lbOrange)
                }
                if (line2.isNotEmpty()) Text(line2, Modifier.padding(top = 4.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3)
            }
            if (f.url != null) Icon(Icons.AutoMirrored.Rounded.OpenInNew, "Abrir en Letterboxd", Modifier.size(16.dp), tint = CL.text3)
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(CL.line))
    }
}

/** Sinopsis: hasta 5 líneas con "Más" para desplegar */
@Composable
private fun Overview(text: String, modifier: Modifier = Modifier) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    var overflows by remember { mutableStateOf(false) }
    Column(modifier.animateContentSize()) {
        Text(
            text, style = MaterialTheme.typography.bodyLarge, color = CL.text2,
            maxLines = if (expanded) Int.MAX_VALUE else 5, overflow = TextOverflow.Ellipsis,
            onTextLayout = { if (!expanded) overflows = it.hasVisualOverflow }
        )
        if (overflows && !expanded) Text(
            "Más", Modifier.padding(top = 2.dp).heightIn(min = 32.dp).tapFade { expanded = true }.padding(top = 6.dp),
            style = MaterialTheme.typography.labelMedium, color = CL.text
        )
    }
}

@Composable
private fun Credit(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = CL.text3)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = CL.text)
    }
}

@Composable
private fun BlockTitle(text: String) = Text(
    text, Modifier.padding(start = 16.dp, end = 16.dp, top = 28.dp, bottom = 12.dp),
    style = MaterialTheme.typography.titleLarge, color = CL.text
)

/** Retrato 2:3 de reparto; sin foto, las iniciales */
@Composable
private fun CastCard(name: String, character: String?, photo: String?) {
    Column(Modifier.width(76.dp)) {
        val box = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(cardShape).posterHairline()
        if (photo != null) Artwork(photo, name, null, box, placeholderSize = 14)
        else Box(box.background(CL.bg3), contentAlignment = Alignment.Center) {
            Text(
                name.split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.uppercase(),
                style = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 22.sp), color = CL.text3
            )
        }
        Text(name, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.labelMedium, color = CL.text, maxLines = 2, overflow = TextOverflow.Ellipsis)
        character?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = CL.text3, maxLines = 1, overflow = TextOverflow.Ellipsis) }
    }
}

/** Temporadas: pestañas de texto o, con más de 6, un botón con menú */
@Composable
private fun SeasonPicker(t: Title, season: Int, onPick: (Int) -> Unit) {
    val seasons = t.item.seasons
    fun name(s: Int) = t.meta?.seasons?.get(s)?.name ?: if (s == 0) "Especiales" else "Temporada $s"
    if (seasons.size <= 6) {
        TextTabs(
            seasons.map(::name), seasons.indexOf(season).coerceAtLeast(0), { onPick(seasons[it]) },
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp)
        )
    } else {
        var open by remember { mutableStateOf(false) }
        Box(Modifier.padding(horizontal = 16.dp)) {
            SecondaryButton(name(season), icon = Icons.Rounded.ArrowDropDown) { open = true }
            AppMenu(open, { open = false }) {
                for (s in seasons) AppMenuItem(name(s), s == season) { open = false; onPick(s) }
            }
        }
    }
}

@Composable
private fun EpisodeRow(t: Title, e: Episode, p: Progress?, onPlay: () -> Unit, onToggleWatched: () -> Unit) {
    val em = epMeta(t, e)
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(128.dp).aspectRatio(16f / 9f).tapScale(0.96f, onClick = onPlay).clip(cardShape).posterHairline()) {
                Artwork(em?.still ?: t.meta?.backdrop, e.label, null, Modifier.fillMaxSize(), placeholderSize = 14)
                PlayRing(28.dp, 16.dp, Modifier.align(Alignment.Center))
                if (p != null && !p.watched && p.pos > 0) ProgressBar(fraction(p), Modifier.align(Alignment.BottomStart).fillMaxWidth())
            }
            Column(Modifier.weight(1f).padding(start = 12.dp).tapFade(onClick = onPlay)) {
                Text(
                    "${e.episode}. " + (em?.name ?: e.fileName),
                    style = MaterialTheme.typography.titleMedium, color = CL.text, maxLines = 2, overflow = TextOverflow.Ellipsis
                )
                Text(
                    listOfNotNull(e.label, fmtRuntime(em?.runtime).ifEmpty { null }).joinToString(" · "),
                    Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3
                )
            }
            val w = p?.watched == true
            Box(
                Modifier.size(48.dp).tapFade(role = Role.Checkbox, onClick = onToggleWatched),
                contentAlignment = Alignment.Center
            ) {
                if (w) Icon(Icons.Rounded.CheckCircle, "Vista", Modifier.size(24.dp), tint = CL.text)
                else Icon(Icons.Outlined.CheckCircleOutline, "Marcar como vista", Modifier.size(24.dp), tint = CL.text3)
            }
        }
        em?.overview?.takeIf { it.isNotBlank() }?.let {
            Text(it, Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodySmall, color = CL.text2, maxLines = 3, overflow = TextOverflow.Ellipsis)
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
        containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
        confirmButton = { TextAction("Cerrar", onClick = onClose) },
        title = { Text("Corregir coincidencia", style = MaterialTheme.typography.headlineSmall, color = CL.text) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SearchField(query, { query = it }, Modifier.weight(1f), placeholder = "Título", onSearch = { search() })
                    TextAction("Buscar", CL.accent) { search() }
                }
                if (busy) LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().height(2.dp), color = CL.accent, trackColor = Color.Transparent, gapSize = 0.dp
                ) else Spacer(Modifier.height(2.dp))
                error?.let { Text(it, color = CL.error, style = MaterialTheme.typography.bodyMedium) }
                androidx.compose.foundation.lazy.LazyColumn(Modifier.height(320.dp)) {
                    items(results.orEmpty()) { r ->
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).tapRow {
                                scope.launch {
                                    busy = true
                                    try { repo.identify(t.id, r.id); onClose() } catch (e: Exception) { error = e.message }
                                    busy = false
                                }
                            }.padding(vertical = 6.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Artwork(r.poster, r.title, null, Modifier.width(46.dp).aspectRatio(2f / 3f).clip(cardShape), placeholderSize = 10)
                            Column(Modifier.padding(start = 10.dp)) {
                                Text(r.title + (r.year?.let { " ($it)" } ?: ""), style = MaterialTheme.typography.titleMedium, color = CL.text)
                                if (r.originalTitle != null && r.originalTitle != r.title) Text(r.originalTitle, style = MaterialTheme.typography.bodySmall, color = CL.text3)
                            }
                        }
                    }
                }
            }
        }
    )
}
