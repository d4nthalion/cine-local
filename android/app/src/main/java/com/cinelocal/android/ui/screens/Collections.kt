package com.cinelocal.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.Title
import com.cinelocal.android.core.videoPaths
import com.cinelocal.android.data.CineServer
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.TextTabs
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.theme.BrandGradientH
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch

// Colecciones (como en el escritorio y la web): las que preparan los administradores en CineLocal Server y, en su
// pestaña, las sagas de TMDB. Las crean y cambian los administradores desde el escritorio o la web.

/**
 * Una colección: de los administradores (custom, con su id de texto) o una saga de TMDB (id numérico).
 * films, en el orden de la colección (las sagas, por año).
 */
data class Coll(
    val id: String, val name: String, val description: String, val poster: String?, val backdrop: String?,
    val films: List<Title>, val custom: Boolean, val createdBy: String? = null, val createdAt: Long = 0
)

/** Saga de TMDB con las películas que tienes de ella (2 o más), por año */
data class Saga(val id: Int, val name: String, val poster: String?, val films: List<Title>)

fun sagasOf(titles: List<Title>): List<Saga> =
    titles.filter { it.isMovie && it.meta?.collection != null }
        .groupBy { it.meta!!.collection!!.id }
        .filter { it.value.size >= 2 }
        .map { (id, films) ->
            val c = films.first().meta!!.collection!!
            Saga(id, sagaName(c.name), c.poster ?: films.firstNotNullOfOrNull { it.meta?.poster }, films.sortedBy { it.year ?: 0 })
        }
        .sortedWith(compareByDescending<Saga> { it.films.size }.thenBy { it.name })

/** "Terminator - Colección" -> "Terminator" (como sagaName() de app.js) */
private fun sagaName(n: String) = n.replace(Regex("\\s*[-–:]?\\s*(Colecci[oó]n|Collection|Saga)$", RegexOption.IGNORE_CASE), "")
    .replace(Regex("^(Colecci[oó]n|Saga)\\s*:?\\s*", RegexOption.IGNORE_CASE), "").ifBlank { n }

/** Las de los administradores, con los títulos que sigue habiendo en la biblioteca */
fun customCollectionsOf(colls: List<CineServer.Coll>, titles: List<Title>): List<Coll> {
    val byId = titles.associateBy { it.id }
    return colls.mapNotNull { c ->
        val films = c.items.mapNotNull { byId[it] }
        if (films.isEmpty()) null
        else Coll(
            c.id, c.name, c.description, c.poster ?: films.firstNotNullOfOrNull { it.meta?.poster }, c.backdrop ?: films.firstNotNullOfOrNull { it.meta?.backdrop },
            films, custom = true, createdBy = c.createdBy, createdAt = c.createdAt
        )
    }
}

private fun Saga.asColl() = Coll(id.toString(), name, "", poster, films.firstNotNullOfOrNull { it.meta?.backdrop }, films, custom = false)

private fun filmsLabel(films: List<Title>): String {
    val movies = films.count { it.isMovie }
    val series = films.size - movies
    return listOfNotNull(
        movies.takeIf { it > 0 }?.let { if (it == 1) "1 película" else "$it películas" },
        series.takeIf { it > 0 }?.let { if (it == 1) "1 serie" else "$it series" }
    ).joinToString(" · ")
}

/**
 * «Colecciones para ti» en Inicio (como recommendedCollections() de app.js): primero las empezadas y sin terminar; luego,
 * de las que no has empezado, las que más se parecen por géneros a lo último que has visto. Sin nada que encaje, ninguna.
 */
fun recommendedCollections(colls: List<Coll>, titles: List<Title>, progress: Map<String, Progress>): List<Pair<Coll, String?>> {
    val recent = titles.mapNotNull { t ->
        val at = videoPaths(t.item).mapNotNull { p -> progress[p]?.takeIf { it.watched || it.pos > 600 }?.at }.maxOrNull()
        at?.let { t to it }
    }.sortedByDescending { it.second }.take(20).map { it.first }
    if (recent.isEmpty()) return emptyList()
    val recentIds = recent.map { it.id }.toSet()
    val taste = HashMap<String, Int>()
    for (t in recent) for (g in t.meta?.genres.orEmpty()) taste[g] = (taste[g] ?: 0) + 1
    val top = (taste.values.maxOrNull() ?: 1).toDouble()
    val out = mutableListOf<Triple<Coll, Double, String?>>()
    for (c in colls) {
        val seen = c.films.count { isWatched(it, progress) }
        if (seen == c.films.size) continue
        if (seen > 0 || c.films.any { it.id in recentIds }) {
            val left = c.films.size - seen
            out += Triple(c, 2.0 + seen.toDouble() / c.films.size, if (left == 1) "Te falta 1" else "Te faltan $left")
            continue
        }
        val genres = c.films.flatMap { it.meta?.genres.orEmpty() }
        if (genres.isEmpty()) continue
        val score = genres.sumOf { taste[it] ?: 0 } / genres.size.toDouble() / top + if (c.custom) 0.15 else 0.0
        if (score >= 0.45) out += Triple(c, score, null)
    }
    return out.sortedByDescending { it.second }.take(10).map { it.first to it.third }
}

/** Pestañas Colecciones · Sagas, arriba de las dos pantallas (como Películas · Directores) */
@Composable
private fun CollTabs(selected: Int, nav: Nav) {
    TextTabs(listOf("Colecciones", "Sagas"), selected, { i -> if (i != selected) { if (i == 1) nav.sagas() else nav.back() } }, Modifier.padding(horizontal = 16.dp))
}

/** Carátula de una colección; las de los administradores llevan la etiqueta «Colección» */
@Composable
fun CollCard(c: Coll, progress: Map<String, Progress>, width: Dp?, note: String? = null, onClick: () -> Unit) {
    val seen = c.films.count { isWatched(it, progress) }
    Column((if (width != null) Modifier.width(width) else Modifier).tapRow(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(RoundedCornerShape(4.dp))) {
            Artwork(c.poster, c.name, null, Modifier.fillMaxSize())
            if (c.custom) Text(
                "COLECCIÓN", Modifier.padding(6.dp).background(BrandGradientH, RoundedCornerShape(50)).padding(horizontal = 7.dp, vertical = 2.dp),
                color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.6.sp
            )
            if (seen == c.films.size) Box(
                Modifier.align(Alignment.TopEnd).padding(6.dp).size(22.dp).background(CL.accent, CircleShape),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Rounded.Check, "Todo visto", Modifier.size(14.dp), tint = CL.onAccent) }
        }
        Text(c.name, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.bodySmall, color = CL.text, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Text(
            note ?: (filmsLabel(c.films) + if (seen in 1 until c.films.size) " · $seen ${if (seen == 1) "vista" else "vistas"}" else ""),
            style = MaterialTheme.typography.labelMedium, color = CL.text3, maxLines = 1, overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun CollGrid(list: List<Coll>, progress: Map<String, Progress>, onOpen: (Coll) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(104.dp),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(list, key = { it.id }) { c -> CollCard(c, progress, null) { onOpen(c) } }
    }
}

@Composable
fun CollectionsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val raw by repo.collections.collectAsStateWithLifecycle()
    val list = remember(raw, titles) { customCollectionsOf(raw, titles) }
    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle("Colecciones", list.size.takeIf { it > 0 })
        CollTabs(0, nav)
        if (list.isEmpty()) EmptyState(
            "Sin colecciones", "Las preparan los administradores desde el escritorio o la web. Mientras tanto, mira las Sagas."
        ) else CollGrid(list, progress) { nav.collection(it.id) }
    }
}

@Composable
fun SagasScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val sagas = remember(titles) { sagasOf(titles).map { it.asColl() } }
    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle("Colecciones", null)
        CollTabs(1, nav)
        if (sagas.isEmpty()) EmptyState("Sin sagas", "Aquí aparecen las sagas de las que tienes dos películas o más (salen de las fichas de TMDB).")
        else CollGrid(sagas, progress) { nav.saga(it.id.toInt()) }
    }
}

@Composable
fun SagaScreen(id: Int, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val saga = remember(titles, id) { sagasOf(titles).firstOrNull { it.id == id } }
    Column(Modifier.fillMaxSize()) {
        BackTopBar(saga?.name ?: "Saga", onBack = { nav.back() }, kicker = saga?.let {
            val seen = it.films.count { t -> isWatched(t, progress) }
            "${it.films.size} PELÍCULAS · $seen VISTAS · EN ORDEN DE ESTRENO"
        })
        if (saga == null) EmptyState("No encontrada", "Esta saga ya no tiene dos películas en la biblioteca.")
        else TitleGrid(saga.films, progress, nav)
    }
}

/** Una colección de los administradores: su descripción y sus títulos, en su orden */
@Composable
fun CollectionScreen(id: String, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val raw by repo.collections.collectAsStateWithLifecycle()
    val c = remember(raw, titles, id) { customCollectionsOf(raw, titles).firstOrNull { it.id == id } }
    Column(Modifier.fillMaxSize()) {
        BackTopBar(c?.name ?: "Colección", onBack = { nav.back() }, kicker = c?.let {
            val seen = it.films.count { t -> isWatched(t, progress) }
            (filmsLabel(it.films) + " · $seen de ${it.films.size} vistos" + (it.createdBy?.let { b -> " · por $b" } ?: "")).uppercase()
        })
        if (c == null) EmptyState("No encontrada", "Esta colección se ha borrado o ya no tiene títulos en la biblioteca.")
        else {
            if (c.description.isNotBlank()) Text(
                c.description, Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                style = MaterialTheme.typography.bodyMedium, color = CL.text2
            )
            TitleGrid(c.films, progress, nav)
        }
    }
}

/**
 * Aviso de colecciones nuevas (de otros) desde la última vez, al estilo de las novedades de Steam: la imagen, el nombre,
 * la descripción y sus carátulas, con «Ver colección» o «Ahora no». Una vez cerrado no vuelve a salir.
 */
/** Una novedad del cuadro emergente: una colección nueva o un aviso de un administrador */
data class NewsCard(
    val key: String, val at: Long, val tag: String, val title: String, val meta: String, val desc: String,
    val backdrop: String?, val films: List<Title>, val openLabel: String? = null, val open: ((Nav) -> Unit)? = null
)

/** Todas las colecciones (las de los administradores y las sagas), para abrir la de un aviso */
fun allCollectionsOf(raw: List<CineServer.Coll>, titles: List<Title>) = customCollectionsOf(raw, titles) + sagasOf(titles).map { it.asColl() }

/** El aviso de un administrador (de la campana o de los emergentes) listo para el cuadro; null si ya no hay qué enseñar */
fun newsCardOf(n: CineServer.Notif, titles: List<Title>, colls: List<Coll>): NewsCard? {
    val by = n.by?.let { " · de $it" } ?: ""
    return when (n.sub) {
        "title" -> {
            val t = titles.firstOrNull { it.id == n.target } ?: return null
            NewsCard(
                "admin:${n.id}", n.at, "RECOMENDACIÓN", t.name, listOfNotNull(t.year?.toString(), if (t.isMovie) "Película" else "Serie").joinToString(" · ") + by,
                n.text.ifBlank { t.meta?.overview.orEmpty() }, n.backdrop ?: t.meta?.backdrop, listOf(t), "Ver ficha"
            ) { it.detail(t.id) }
        }
        "collection" -> {
            val c = colls.firstOrNull { it.id == n.target }
            val byId = titles.associateBy { it.id }
            val films = c?.films ?: n.items.mapNotNull { byId[it] }
            NewsCard(
                "admin:${n.id}", n.at, "COLECCIÓN RECOMENDADA", n.title, filmsLabel(films) + by, n.text.ifBlank { c?.description.orEmpty() },
                n.backdrop ?: c?.backdrop, films, c?.let { "Ver colección" }, c?.let { cc -> { nav: Nav -> nav.collection(cc.id) } }
            )
        }
        else -> NewsCard("admin:${n.id}", n.at, "AVISO", n.title, n.by?.let { "De $it" } ?: "", n.text, null, emptyList())
    }
}

/** Colecciones nuevas de otros y avisos emergentes de los administradores desde la última vez, una sola vez */
@Composable
fun CollectionNews(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val raw by repo.collections.collectAsStateWithLifecycle()
    val news by repo.news.collectAsStateWithLifecycle()
    val seenAt by repo.collectionsSeenAt.collectAsStateWithLifecycle()
    val me by repo.me.collectAsStateWithLifecycle()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    var closed by rememberSaveable { mutableStateOf(false) }
    if (closed || !settings.server || seenAt == 0L || me == null) return
    val fresh = remember(raw, news, titles, seenAt, me) {
        val custom = customCollectionsOf(raw, titles)
        val all = custom + sagasOf(titles).map { it.asColl() }
        val colls = custom.filter { it.createdAt > seenAt && !it.createdBy.equals(me?.user, ignoreCase = true) }.map { c ->
            NewsCard(
                "collection:${c.id}", c.createdAt, "NUEVA COLECCIÓN", c.name, filmsLabel(c.films) + (c.createdBy?.let { " · creada por $it" } ?: ""),
                c.description, c.backdrop, c.films, "Ver colección"
            ) { it.collection(c.id) }
        }
        (colls + news.filter { it.at > seenAt && !it.by.equals(me?.user, ignoreCase = true) }.mapNotNull { newsCardOf(it, titles, all) })
            .sortedByDescending { it.at }
    }
    if (fresh.isEmpty()) return
    val scope = rememberCoroutineScope()
    NewsDialog(fresh, nav) { closed = true; scope.launch { repo.collectionsSeen() } }
}

/** El cuadro de novedades, al estilo de las de Steam: una o varias, con «Anterior / Siguiente» */
@Composable
fun NewsDialog(fresh: List<NewsCard>, nav: Nav, onClose: () -> Unit) {
    var i by remember { mutableIntStateOf(0) }
    val c = fresh[i.coerceIn(0, fresh.size - 1)]
    fun close(open: Boolean) {
        onClose()
        if (open) c.open?.invoke(nav)
    }
    Dialog(onDismissRequest = { close(false) }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier.padding(20.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(CL.bg2)
        ) {
            Box(Modifier.fillMaxWidth().height(170.dp)) {
                if (c.backdrop != null) Artwork(c.backdrop, c.title, null, Modifier.fillMaxSize())
                else Box(Modifier.fillMaxSize().background(Brush.linearGradient(listOf(CL.gradStart.copy(alpha = .55f), CL.gradEnd.copy(alpha = .35f)))))
                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.35f to Color.Transparent, 1f to CL.bg2)))
                Text(
                    c.tag, Modifier.padding(14.dp).background(BrandGradientH, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 4.dp),
                    color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp
                )
                if (fresh.size > 1) Text(
                    "${i + 1} de ${fresh.size}", Modifier.align(Alignment.TopEnd).padding(14.dp).background(Color(0x99000000), RoundedCornerShape(50)).padding(horizontal = 9.dp, vertical = 3.dp),
                    color = Color.White, style = MaterialTheme.typography.labelMedium
                )
            }
            Column(Modifier.padding(horizontal = 20.dp).verticalScroll(rememberScrollState()).weight(1f, fill = false)) {
                Text(c.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, color = CL.text)
                if (c.meta.isNotBlank()) Text(c.meta, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.labelMedium, color = CL.text3)
                if (c.desc.isNotBlank()) Text(c.desc, Modifier.padding(top = 10.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                if (c.films.isEmpty()) Spacer(Modifier.height(16.dp))
                else Row(Modifier.padding(vertical = 14.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (f in c.films.take(8)) Box(Modifier.width(56.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(3.dp))) {
                        Artwork(f.meta?.poster, f.name, null, Modifier.fillMaxSize(), placeholderSize = 9)
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                if (fresh.size > 1) {
                    TextAction("Anterior", if (i > 0) CL.text2 else CL.text3) { if (i > 0) i-- }
                    TextAction("Siguiente", if (i < fresh.size - 1) CL.text2 else CL.text3) { if (i < fresh.size - 1) i++ }
                }
                Spacer(Modifier.weight(1f))
                if (c.open != null) {
                    TextAction("Ahora no") { close(false) }
                    TextAction(c.openLabel ?: "Ver", CL.accentText) { close(true) }
                } else TextAction("Entendido", CL.accentText) { close(false) }
            }
        }
    }
}
