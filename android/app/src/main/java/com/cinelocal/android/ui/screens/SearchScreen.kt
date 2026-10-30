package com.cinelocal.android.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.cinelocal.android.ui.allGenres
import com.cinelocal.android.ui.components.BarIcon
import com.cinelocal.android.ui.components.SearchField
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Display
import com.cinelocal.android.ui.theme.TNUM
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
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.OnlineSearch
import com.cinelocal.android.core.Progress
import com.cinelocal.android.ui.components.GridSkeleton
import com.cinelocal.android.ui.components.MissingCard
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.components.RequestSheet
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.ui.text.style.TextOverflow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.compose.runtime.produceState
import kotlinx.coroutines.delay
import kotlinx.coroutines.runInterruptible

/**
 * Búsqueda por título, título original, reparto, director o género (sin distinguir acentos).
 * Si la biblioteca no tiene nada, busca la película en TMDB para poder pedir la descarga.
 */
@Composable
fun SearchScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }

    // El texto de búsqueda de cada título (título, original, dirección, géneros, reparto), normalizado una sola vez y
    // en segundo plano: antes se normalizaba todo con cada tecla, y con miles de títulos la pantalla se atascaba
    val index by produceState<List<Pair<Title, String>>?>(null, titles) {
        value = withContext(Dispatchers.Default) { titles.map { it to searchText(it) } }
    }
    val genres = remember(titles) { allGenres(titles) }
    val q = Tmdb.norm(query)
    val results = remember(index, q) { if (q.isEmpty()) emptyList() else index.orEmpty().filter { it.second.contains(q) }.map { it.first } }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(start = 4.dp, end = 16.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BarIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver") { nav.back() }
            SearchField(query, { query = it }, Modifier.weight(1f).padding(start = 4.dp), textModifier = Modifier.focusRequester(focus))
        }
        when {
            q.isEmpty() -> GenreList(genres) { query = it }
            index == null -> GridSkeleton()
            results.isEmpty() -> OnlineResults(query, titles, progress, nav)
            else -> {
                Kicker(if (results.size == 1) "1 RESULTADO" else "${results.size} RESULTADOS")
                TitleGrid(results, progress, nav, top = 4.dp)
            }
        }
    }
}

@Composable
private fun Kicker(text: String) = Text(
    text, Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 8.dp),
    style = MaterialTheme.typography.labelSmall, color = CL.text3
)

/** Con la consulta vacía: explorar por género (matches ya busca por género) */
@Composable
private fun GenreList(genres: List<Pair<String, Int>>, onPick: (String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { Kicker("EXPLORAR POR GÉNERO") }
        items(genres, key = { it.first }) { (g, n) ->
            val interaction = remember { MutableInteractionSource() }
            val pressed by interaction.collectIsPressedAsState()
            Row(
                Modifier.fillMaxWidth().height(52.dp)
                    .background(if (pressed) CL.bg3 else Color.Transparent)
                    .clickable(interaction, indication = null) { onPick(g) }
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    g, Modifier.weight(1f), color = if (pressed) CL.text else CL.text2, maxLines = 1,
                    style = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 26.sp, lineHeight = 30.sp)
                )
                Text("$n", style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = TNUM), color = CL.text4)
            }
        }
    }
}

/**
 * Todo lo que se puede buscar de un título, normalizado, un campo por línea: como la consulta normalizada no lleva
 * saltos de línea, nunca coincide a caballo entre dos campos
 */
private fun searchText(t: Title): String {
    val m = t.meta
    val fields = buildList {
        add(t.name); add(t.item.title); m?.originalTitle?.let(::add)
        m?.director?.let(::add); m?.creators?.let(::add)
        addAll(m?.genres.orEmpty()); addAll(m?.cast.orEmpty().map { it.name })
    }
    return fields.joinToString("\n") { Tmdb.norm(it) }
}

// ---------------------------------------------------------------- TMDB, cuando la biblioteca no tiene nada

/** Búsqueda en TMDB, siempre con la consulta a la que corresponde (para no pintar la respuesta de una anterior) */
private sealed interface Online {
    val q: OnlineSearch.Query
    data class Loading(override val q: OnlineSearch.Query) : Online
    data class Done(override val q: OnlineSearch.Query, val results: List<Tmdb.SearchResult>) : Online
    data class Failed(override val q: OnlineSearch.Query, val message: String) : Online
}

/** Pausa tras la última tecla antes de preguntar a TMDB */
private const val DEBOUNCE_MS = 450L

/** Sin resultados en la biblioteca: películas de TMDB que coinciden, con "Pedir descarga" (la misma hoja que en la watchlist) */
@Composable
private fun OnlineResults(query: String, titles: List<Title>, progress: Map<String, Progress>, nav: Nav) {
    val repo = LocalContext.current.repo
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
    var sheet by remember { mutableStateOf<LbEntry?>(null) }

    val key = settings.tmdbKey.trim()
    val q = OnlineSearch.parse(query) ?: return
    var state by remember { mutableStateOf<Online?>(null) }
    // Cada tecla relanza el efecto, que cancela la búsqueda anterior y espera a que se deje de escribir
    LaunchedEffect(q, key, settings.metaLang, settings.region) {
        if (key.isEmpty()) return@LaunchedEffect
        state = Online.Loading(q)
        delay(DEBOUNCE_MS)
        state = try {
            val found = runInterruptible(Dispatchers.IO) { Tmdb(key, settings.metaLang, settings.region).search("movie", q.text, q.year) }
            Online.Done(q, found.distinctBy { it.id }.take(OnlineSearch.LIMIT))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Online.Failed(q, e.message ?: e.javaClass.simpleName)
        }
    }

    if (key.isEmpty()) {
        EmptyState(
            "Sin resultados",
            "No hay nada en tu biblioteca que coincida con «$query». Con una API key de TMDB en Ajustes también se buscaría en TMDB para pedir la descarga."
        )
        return
    }
    // hasta que llega la respuesta de esta consulta se sigue "buscando" (nunca se pinta la de una consulta anterior)
    when (val current = state?.takeIf { it.q == q } ?: Online.Loading(q)) {
        is Online.Loading -> Column(Modifier.fillMaxSize()) {
            Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
                Text("No está en tu biblioteca · Buscando en TMDB…", Modifier.padding(start = 10.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
            }
            GridSkeleton()
        }
        is Online.Failed -> EmptyState(
            "No se pudo buscar en TMDB",
            "No hay nada en tu biblioteca que coincida con «$query» y la búsqueda en TMDB ha fallado.",
            error = true, detail = current.message
        )
        is Online.Done -> if (current.results.isEmpty()) EmptyState(
            "Sin resultados",
            "Ni en tu biblioteca ni en TMDB hay películas que coincidan con «$query». Prueba con otro título, un actor o un género."
        ) else {
            val owned = titles.filter { it.isMovie && it.meta?.tmdbId != null }.associateBy { it.meta!!.tmdbId }
            LazyVerticalGrid(
                columns = GridCells.Adaptive(104.dp),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item(key = "head", span = { GridItemSpan(maxLineSpan) }) {
                    Column(Modifier.padding(top = 16.dp)) {
                        val n = current.results.size
                        val someOwned = current.results.any { it.id in owned }
                        Text(
                            (if (someOwned) "" else "NO ESTÁ EN TU BIBLIOTECA · ") + if (n == 1) "1 PELÍCULA EN TMDB" else "$n PELÍCULAS EN TMDB",
                            style = MaterialTheme.typography.labelSmall, color = CL.text3
                        )
                        Text(
                            if (someOwned) "Las que ya tienes abren su ficha; toca otra para pedir que la descarguen." else "Toca una para pedir que la descarguen.",
                            Modifier.padding(top = 4.dp),
                            style = MaterialTheme.typography.bodyMedium, color = CL.text2
                        )
                    }
                }
                gridItems(current.results, key = { it.id }) { r ->
                    Column(Modifier.animateItem(fadeInSpec = tween(180), placementSpec = spring(stiffness = Spring.StiffnessMediumLow), fadeOutSpec = tween(120))) {
                        // puede estar en la biblioteca aunque la búsqueda no coincida ("dune 2021" y "Dune"): entonces se abre su ficha
                        val t = owned[r.id]
                        if (t != null) PosterCard(t, isWatched(t, progress), fraction(progress[t.item.path]?.takeIf { !it.watched }), null, lbOf(t, lbById)) { nav.detail(t.id) }
                        else {
                            val e = OnlineSearch.entryFor(r.id, r.title, r.originalTitle, r.year, r.poster, lbById[r.id])
                            MissingCard(e, null, e.key in user.requested) { sheet = e }
                        }
                        Text(
                            t?.name ?: r.title, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.bodySmall,
                            color = CL.text, maxLines = 2, overflow = TextOverflow.Ellipsis
                        )
                        (t?.year ?: r.year)?.let {
                            Text("$it", style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = TNUM), color = CL.text3)
                        }
                    }
                }
            }
        }
    }
    sheet?.let { RequestSheet(it, nav) { sheet = null } }
}
