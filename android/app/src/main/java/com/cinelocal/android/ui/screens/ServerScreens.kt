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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.Title
import com.cinelocal.android.data.CineServer
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.Artwork
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.MenuButton
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.TextTabs
import com.cinelocal.android.ui.components.tapRow
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Pantallas de lo que llegó al escritorio y a la web (las Colecciones, en Collections.kt): Directores (pestaña de Películas), la campana y, con
// CineLocal Server, Peticiones y el Registro de actividad (administradores)

private val ES = Locale.forLanguageTag("es-ES")

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días" */
fun ago(ts: Long): String {
    val m = ((System.currentTimeMillis() - ts) / 60000).coerceAtLeast(1)
    if (m < 60) return "hace $m min"
    val h = (m + 30) / 60
    if (h < 24) return "hace $h h"
    val d = (h + 12) / 24
    return if (d == 1L) "ayer" else "hace $d días"
}

// ---------------------------------------------------------------- Directores (pestaña de Películas)

/** Pestañas Películas · Directores, arriba de las dos pantallas */
@Composable
fun MovieTabs(selected: Int, nav: Nav) {
    TextTabs(listOf("Películas", "Directores"), selected, { i -> if (i != selected) { if (i == 1) nav.directors() else nav.back() } }, Modifier.padding(horizontal = 16.dp))
}

data class Director(val name: String, val photo: String?, val films: List<Title>)

fun directorsOf(titles: List<Title>): List<Director> {
    val map = LinkedHashMap<String, Triple<String, String?, MutableList<Title>>>()
    for (t in titles) {
        if (!t.isMovie) continue
        val m = t.meta ?: continue
        val people = m.directors.ifEmpty { m.director?.split(",")?.map { com.cinelocal.android.core.Person(name = it.trim()) }.orEmpty() }
        for (p in people) {
            if (p.name.isBlank()) continue
            val e = map.getOrPut(p.name.lowercase()) { Triple(p.name, p.photo, mutableListOf()) }
            if (e.second == null && p.photo != null) map[p.name.lowercase()] = Triple(e.first, p.photo, e.third)
            map.getValue(p.name.lowercase()).third += t
        }
    }
    return map.values.map { Director(it.first, it.second, it.third.sortedBy { t -> t.year ?: 0 }) }
        .sortedWith(compareByDescending<Director> { it.films.size }.thenBy { it.name })
}

@Composable
fun DirectorsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val list = remember(titles) { directorsOf(titles) }
    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle("Películas", null)
        MovieTabs(1, nav)
        if (list.isEmpty()) {
            EmptyState("Todavía no hay directores", "Se obtienen de las fichas de TMDB.")
            return
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(96.dp),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(list, key = { it.name }) { d ->
                Column(Modifier.tapRow { nav.director(d.name) }, horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(84.dp).clip(CircleShape)) { Artwork(d.photo, d.name, null, Modifier.fillMaxSize(), placeholderSize = 12) }
                    Text(d.name, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.bodySmall, color = CL.text, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(if (d.films.size == 1) "1 película" else "${d.films.size} películas", style = MaterialTheme.typography.labelMedium, color = CL.text3)
                }
            }
        }
    }
}

@Composable
fun DirectorScreen(name: String, nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val d = remember(titles, name) { directorsOf(titles).firstOrNull { it.name.equals(name, ignoreCase = true) } }
    Column(Modifier.fillMaxSize()) {
        BackTopBar(name, onBack = { nav.back() }, kicker = d?.let { "DIRECTOR · ${it.films.size} EN TU BIBLIOTECA" })
        if (d == null) EmptyState("Sin películas", "No hay películas de $name en la biblioteca.")
        else TitleGrid(d.films, progress, nav)
    }
}

// ---------------------------------------------------------------- Campana

/** Peticiones propias resueltas, novedades y lo que llega de tu watchlist; al abrirla queda todo visto */
@Composable
fun NotificationsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val notifs by repo.notifs.collectAsStateWithLifecycle()
    val me by repo.me.collectAsStateWithLifecycle()
    // lo que no había visto se marca mientras está abierta (aunque ya cuente como visto)
    val shownSeen = remember { mutableLongStateOf(notifs?.seenAt ?: 0L) }
    LaunchedEffect(Unit) {
        repo.refreshServerExtras()
        shownSeen.longValue = minOf(shownSeen.longValue, repo.notifs.value?.seenAt ?: shownSeen.longValue)
        repo.notifsSeen()
    }
    val titles by repo.titles.collectAsStateWithLifecycle()
    val rawColls by repo.collections.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    // un mensaje de un administrador (o un aviso cuyo título ya no está) se abre en el cuadro de novedades
    var showing by remember { mutableStateOf<NewsCard?>(null) }
    showing?.let { c -> NewsDialog(listOf(c), nav) { showing = null } }
    Column(Modifier.fillMaxSize()) {
        BackTopBar("Notificaciones", onBack = { nav.back() }, divider = true, actions = {
            if (!notifs?.items.isNullOrEmpty()) TextAction("Borrar todas", CL.text2) { scope.launch { repo.notifsDismiss(null) } }
            TextAction("Peticiones", CL.accentText, Modifier.padding(end = 8.dp)) { nav.requests() }
        })
        val items = notifs?.items.orEmpty()
        if (items.isEmpty()) {
            EmptyState("Nada nuevo", "Aquí aparecen tus peticiones resueltas, lo que llega a la biblioteca y lo que estaba en tu watchlist, de los últimos 30 días.")
            return
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 8.dp)) {
            items(items, key = { it.kind + it.id + it.at }) { n ->
                val new = n.at > shownSeen.longValue
                Row(
                    Modifier.fillMaxWidth().tapRow {
                        when (n.kind) {
                            "request" -> nav.requests()
                            "collection" -> nav.collection(n.id)
                            "admin" -> {
                                val colls = allCollectionsOf(rawColls, titles)
                                when {
                                    n.sub == "title" && titles.any { it.id == n.target } -> nav.detail(n.target!!)
                                    n.sub == "collection" && colls.any { it.id == n.target } -> nav.collection(n.target!!)
                                    else -> showing = newsCardOf(n, titles, colls)
                                }
                            }
                            else -> nav.detail(n.id)
                        }
                    }.padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.width(44.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(4.dp))) { Artwork(n.poster, n.title, null, Modifier.fillMaxSize(), placeholderSize = 9) }
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(notifText(n), style = MaterialTheme.typography.bodyMedium, color = if (new) CL.text else CL.text2)
                        Row(Modifier.padding(top = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                            if (new) Box(Modifier.padding(end = 6.dp).size(7.dp).background(CL.accent, CircleShape))
                            Text(ago(n.at), style = MaterialTheme.typography.labelMedium, color = CL.text3)
                        }
                    }
                    Box(Modifier.size(44.dp).clip(CircleShape).tapRow { scope.launch { repo.notifsDismiss(n) } }, contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Close, "Borrar", Modifier.size(18.dp), tint = CL.text3)
                    }
                }
            }
        }
    }
}

private fun notifText(n: CineServer.Notif): String {
    val name = "«${n.title}»" + (n.year?.let { " ($it)" } ?: "")
    return when (n.kind) {
        "request" -> if (n.status == "done") "Ya puedes ver $name, que pediste" else "Tu petición de $name se ha rechazado" + (n.reply?.let { ": $it" } ?: "")
        "watchlist" -> "De tu watchlist: $name ya está en la biblioteca"
        "collection" -> "Nueva colección: «${n.title}»"
        "admin" -> when (n.sub) {
            "title" -> (n.by?.let { "$it te recomienda" } ?: "Recomendación:") + " $name" + n.text.takeIf { it.isNotBlank() }?.let { ": $it" }.orEmpty()
            "collection" -> (n.by?.let { "$it te recomienda la colección" } ?: "Colección recomendada:") + " «${n.title}»" + n.text.takeIf { it.isNotBlank() }?.let { ": $it" }.orEmpty()
            else -> n.title + n.text.takeIf { it.isNotBlank() }?.let { ": $it" }.orEmpty()
        }
        else -> (if (n.type == "series") "Novedades en la biblioteca: " else "Nueva en la biblioteca: ") + name
    }
}

// ---------------------------------------------------------------- Peticiones

/** Las suyas (cancelarlas) o, si es administrador, las de todos: conseguida, rechazada (con respuesta) o borrarla */
@Composable
fun RequestsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val me by repo.me.collectAsStateWithLifecycle()
    val admin = me?.admin == true
    val scope = rememberCoroutineScope()
    var data by remember { mutableStateOf<CineServer.Reqs?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var reject by remember { mutableStateOf<CineServer.Req?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    LaunchedEffect(reload) {
        data = try { repo.requestsView().also { error = null } } catch (e: Exception) { error = e.message; data }
    }
    fun op(op: String, r: CineServer.Req, status: String? = null, reply: String? = null) = scope.launch {
        try { repo.requestOp(op, r.id, status, reply); reload++ } catch (e: Exception) { error = e.message }
    }

    Column(Modifier.fillMaxSize()) {
        BackTopBar("Peticiones", onBack = { nav.back() }, kicker = if (admin) "DE TODOS LOS USUARIOS" else "LO QUE HAS PEDIDO")
        val all = data?.items.orEmpty()
        val pending = all.filter { it.status == "pending" }
        TextTabs(listOf("Pendientes", "Resueltas"), tab, { tab = it }, Modifier.padding(horizontal = 16.dp), counts = listOf(pending.size, all.size - pending.size))
        error?.let { Text(it, Modifier.padding(16.dp), style = MaterialTheme.typography.bodySmall, color = CL.error) }
        val list = if (tab == 0) pending else all.filter { it.status != "pending" }
        when {
            data == null && error == null -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
            }
            list.isEmpty() -> EmptyState(
                if (tab == 0) "Nada pendiente" else "Nada resuelto",
                if (tab == 0) "Pide películas o series desde la búsqueda (cuando no las tienes) o desde la watchlist." else "Aquí quedan las peticiones conseguidas o rechazadas de los últimos 60 días."
            )
            else -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(list, key = { it.id }) { r -> RequestRow(r, admin, ::op) { reject = r } }
            }
        }
    }
    reject?.let { r -> RejectDialog(r, onDismiss = { reject = null }) { reply -> reject = null; op("resolve", r, "rejected", reply) } }
}

@Composable
private fun RequestRow(r: CineServer.Req, admin: Boolean, op: (String, CineServer.Req, String?, String?) -> Unit, onReject: () -> Unit) {
    val day = SimpleDateFormat("d MMM yyyy", ES)
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp)) {
        Box(Modifier.width(56.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(4.dp))) { Artwork(r.poster, r.title, null, Modifier.fillMaxSize(), placeholderSize = 10) }
        Column(Modifier.weight(1f).padding(start = 12.dp)) {
            Text(r.title + (r.year?.let { " ($it)" } ?: ""), style = MaterialTheme.typography.titleSmall, color = CL.text)
            Text(
                (if (r.type == "series") "Serie" else "Película") + " · " + r.users.joinToString(", ") { it.user } + " · " + day.format(Date(r.at)),
                style = MaterialTheme.typography.labelMedium, color = CL.text3
            )
            r.users.mapNotNull { u -> u.note?.takeIf { it.isNotBlank() }?.let { "«$it»" + if (r.users.size > 1) " (${u.user})" else "" } }.forEach {
                Text(it, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text2)
            }
            if (r.status != "pending") Text(
                (if (r.status == "done") "Conseguida" else "Rechazada") + (r.resolvedAt?.let { " el " + day.format(Date(it)) } ?: "") +
                    (r.resolvedBy?.let { " por $it" } ?: if (r.status == "done") " (al llegar a la biblioteca)" else "") + (r.reply?.let { " · «$it»" } ?: ""),
                Modifier.padding(top = 4.dp), style = MaterialTheme.typography.bodySmall, color = if (r.status == "done") CL.ok else CL.text2
            )
            Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (admin && r.status == "pending") {
                    TextAction("Conseguida", CL.accentText) { op("resolve", r, "done", null) }
                    TextAction("Rechazar") { onReject() }
                }
                if (admin && r.status != "pending") TextAction("Volver a pendiente") { op("resolve", r, "pending", null) }
                if (admin) TextAction("Borrar", CL.error) { op("remove", r, null, null) }
                else if (r.mine && r.status == "pending") TextAction("Cancelar", CL.error) { op("cancel", r, null, null) }
            }
        }
    }
}

@Composable
private fun RejectDialog(r: CineServer.Req, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var reply by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = CL.bg4, shape = RoundedCornerShape(8.dp), tonalElevation = 0.dp,
        title = { Text("Rechazar «${r.title}»", style = MaterialTheme.typography.headlineSmall, color = CL.text) },
        text = {
            OutlinedTextField(
                reply, { reply = it.take(300) }, Modifier.fillMaxWidth(), placeholder = { Text("Motivo (opcional): no hay buena copia…") },
                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = CL.text, unfocusedTextColor = CL.text, focusedBorderColor = CL.accent, cursorColor = CL.accent)
            )
        },
        confirmButton = { TextAction("Rechazar", CL.error) { onConfirm(reply.trim()) } },
        dismissButton = { TextAction("Cancelar") { onDismiss() } }
    )
}

// ---------------------------------------------------------------- Registro (administradores)

private val ACCESS_KIND = mapOf(
    "play" to "Reproducción", "remux" to "Reproducción (reempaquetado)", "transcode" to "Reproducción (convertido)", "download" to "Descarga",
    "login" to "Inicio de sesión", "login-failed" to "Intento fallido", "logout" to "Cierre de sesión",
    "open" to "Abrir reproductor", "watched" to "Marcado como visto", "unwatched" to "Marcado como no visto",
    "fav-add" to "Añadido a la Watchlist", "fav-remove" to "Quitado de la Watchlist",
    "collection-create" to "Colección creada", "collection-update" to "Colección cambiada", "collection-delete" to "Colección borrada",
    "list-create" to "Lista creada", "list-rename" to "Lista renombrada", "list-delete" to "Lista borrada", "list-add" to "Añadido a una lista", "list-remove" to "Quitado de una lista",
    "request-create" to "Petición", "request-cancel" to "Petición cancelada", "request-resolve" to "Petición resuelta", "request-remove" to "Petición borrada",
    "settings" to "Ajustes", "scan" to "Escaneo", "meta-refresh" to "Buscar fichas", "identify" to "Ficha corregida", "poster" to "Carátula cambiada",
    "error" to "Error", "client-error" to "Error en la app"
)
private val ACCESS_TYPES = listOf("" to "Todo", "video" to "Vídeo", "action" to "Acciones", "session" to "Sesiones", "error" to "Errores")
private val ACCESS_DAYS = listOf(1 to "Hoy y ayer", 7 to "7 días", 30 to "30 días", 90 to "90 días", 365 to "Último año")

/** Qué ha visto o descargado cada usuario, desde dónde, lo que ha hecho y sus errores (como Registro del escritorio) */
@Composable
fun AccessScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    var type by rememberSaveable { mutableIntStateOf(0) }
    var days by rememberSaveable { mutableIntStateOf(1) }
    var user by rememberSaveable { mutableStateOf("") }
    var page by remember { mutableStateOf<CineServer.AccessPage?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(type, days, user) {
        page = null
        page = try { repo.access(ACCESS_DAYS[days].first, user, ACCESS_TYPES[type].first).also { error = null } } catch (e: Exception) { error = e.message; null }
    }
    Column(Modifier.fillMaxSize()) {
        BackTopBar("Registro de actividad", onBack = { nav.back() })
        TextTabs(ACCESS_TYPES.map { it.second }, type, { type = it }, Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp))
        Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MenuButton("Periodo", ACCESS_DAYS[days].second, ACCESS_DAYS.map { it.second }, days) { days = it }
            val users = listOf("") + (page?.users.orEmpty() + user).filter { it.isNotBlank() }.distinct()
            MenuButton("Usuario", user.ifBlank { "Todos" }, users.map { it.ifBlank { "Todos los usuarios" } }, users.indexOf(user).coerceAtLeast(0)) { user = users[it] }
        }
        error?.let { EmptyState("No se pudo cargar", "", error = true, detail = it); return }
        val p = page ?: run {
            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
            }
            return
        }
        if (p.items.isEmpty()) { EmptyState("Nada en este periodo", "Prueba con más días o quita los filtros."); return }
        val dayFmt = SimpleDateFormat("EEEE d 'de' MMMM", ES)
        val timeFmt = SimpleDateFormat("HH:mm", ES)
        val byDay = p.items.groupBy { dayFmt.format(Date(it.at)) }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
            if (p.total > p.items.size) item { Text("Se muestran los ${p.items.size} más recientes de ${p.total}.", Modifier.padding(16.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3) }
            byDay.forEach { (d, rows) ->
                item(key = "d$d") {
                    Text(d.replaceFirstChar { it.uppercase() }, Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp), style = MaterialTheme.typography.labelSmall, color = CL.text3)
                }
                items(rows, key = { "${it.at}-${it.kind}-${it.user}-${it.file}" }) { e -> AccessRow(e, timeFmt.format(Date(e.at))) }
            }
        }
    }
}

@Composable
private fun AccessRow(e: CineServer.Access, time: String) {
    val video = e.kind in setOf("play", "remux", "transcode", "download")
    val bad = e.kind in setOf("login-failed", "error", "client-error")
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp, vertical = 6.dp)) {
        Text(time, Modifier.width(48.dp), style = MaterialTheme.typography.labelMedium, color = CL.text3)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(e.user ?: "—", style = MaterialTheme.typography.labelLarge, color = CL.text)
                Spacer(Modifier.width(8.dp))
                Text(
                    (ACCESS_KIND[e.kind] ?: e.kind) + if (e.live) " · en curso" else "",
                    style = MaterialTheme.typography.labelMedium, color = if (bad) CL.error else if (video) CL.accentText else CL.text2
                )
            }
            listOfNotNull(e.title, if (video) e.file?.substringAfterLast('/') else null, e.detail?.lineSequence()?.firstOrNull()).forEach {
                Text(it, style = MaterialTheme.typography.bodySmall, color = if (bad && it == e.detail?.lineSequence()?.firstOrNull()) CL.error else CL.text2, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            val span = if (video && e.end != null) ((e.end - e.at) / 60000).let { if (it < 1) null else if (it < 60) "$it min" else "${it / 60} h ${it % 60} min" } else null
            val size = if (video && (e.bytes ?: 0) > 0) e.bytes!!.let { if (it >= 1e9) String.format(ES, "%.1f GB", it / 1e9) else "${(it / 1e6).toLong().coerceAtLeast(1)} MB" } else null
            listOfNotNull(e.client, e.ip, span, size).takeIf { it.isNotEmpty() }?.let {
                Text(it.joinToString(" · "), style = MaterialTheme.typography.labelSmall, color = CL.text4)
            }
        }
    }
}

