package com.cinelocal.android.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Lists
import com.cinelocal.android.core.UserList
import com.cinelocal.android.repo
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.ListNameDialog
import com.cinelocal.android.ui.components.MainTopBar
import com.cinelocal.android.ui.components.MissingCard
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.components.RequestSheet
import com.cinelocal.android.ui.components.SecondaryButton
import com.cinelocal.android.ui.components.TextTabs
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch

/** Pestaña de la watchlist de Letterboxd dentro de Listas */
private const val LB_TAB = "lb"

/**
 * Listas: la Watchlist, las propias y, con Letterboxd, su watchlist; una pestaña cada una, y «+ Nueva» para crear otra
 */
@Composable
fun ListsScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val scope = rememberCoroutineScope()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val lbEntries by repo.lbEntries.collectAsStateWithLifecycle()
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<UserList?>(null) }
    var deleting by remember { mutableStateOf<UserList?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    // la Watchlist primero (aunque un servidor antiguo aún no la tenga)
    val lists = (Lists.watchlist(user.lists) ?: UserList(Lists.WATCHLIST, "Watchlist")).let { wl -> listOf(wl) + user.lists.filter { it.id != Lists.WATCHLIST } }
    val lbCount = lbEntries.count { it.film.watchlist }
    val lbOn = settings.lbUser.isNotBlank() || lbCount > 0
    val onLb = selected == LB_TAB && lbOn
    val current = if (onLb) null else lists.firstOrNull { it.id == selected } ?: lists.first()

    fun op(block: suspend () -> Unit) = scope.launch {
        error = try { block(); null } catch (e: Exception) { e.message ?: e.javaClass.simpleName }
    }

    val tabs: @Composable () -> Unit = {
        val names = lists.map { it.name } + (if (lbOn) listOf("Watchlist de Letterboxd") else emptyList()) + "+ Nueva"
        // «+ Nueva» sin número (TextTabs no lo pone si no hay valor para esa pestaña)
        val counts = lists.map { it.items.size } + (if (lbOn) listOf(lbCount) else emptyList())
        TextTabs(
            names, if (onLb) lists.size else lists.indexOf(current),
            { i ->
                when {
                    i == names.lastIndex -> creating = true
                    i == lists.size -> selected = LB_TAB
                    else -> selected = lists[i].id
                }
            },
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), counts
        )
        error?.let { Text(it, Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.bodySmall, color = CL.error) }
    }

    if (current == null) Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle("Listas", null)
        tabs()
        WatchlistBody(nav)
    }
    else UserListContent(
        current, nav, tabs,
        onRename = { renaming = current }.takeIf { current.id != Lists.WATCHLIST },
        onDelete = { deleting = current }.takeIf { current.id != Lists.WATCHLIST }
    )

    if (creating) ListNameDialog("Nueva lista", onDismiss = { creating = false }) { name ->
        creating = false
        op { repo.listOp("create", name = name); selected = repo.userState.value.lists.lastOrNull()?.id }
    }
    renaming?.let { l ->
        ListNameDialog("Renombrar lista", l.name, onDismiss = { renaming = null }) { name ->
            renaming = null
            op { repo.listOp("rename", id = l.id, name = name) }
        }
    }
    deleting?.let { l ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            containerColor = CL.bg2,
            title = { Text("¿Eliminar «${l.name}»?", color = CL.text) },
            text = { Text("Se borra la lista y sus ${l.items.size} títulos guardados en ella. Las películas y series de tu biblioteca no se tocan.", color = CL.text2) },
            confirmButton = { TextButton({ deleting = null; selected = null; op { repo.listOp("delete", id = l.id) } }) { Text("Eliminar", color = CL.error) } },
            dismissButton = { TextButton({ deleting = null }) { Text("Cancelar", color = CL.text2) } }
        )
    }
}

/**
 * Una lista (la Watchlist o una propia): lo que tienes, con su póster; lo que no, apagado y con «NO LA TIENES».
 * Sin [onRename] / [onDelete] (la Watchlist) no hay botones para renombrar ni eliminar.
 */
@Composable
private fun UserListContent(l: UserList, nav: Nav, tabs: @Composable () -> Unit, onRename: (() -> Unit)?, onDelete: (() -> Unit)?) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
    var sheet by remember { mutableStateOf<LbEntry?>(null) }
    val entries = l.items.map { it to Lists.owned(it, titles) }.filter { (e, t) -> t != null || e.tmdb != null }
    val owned = entries.count { it.second != null }

    Column(Modifier.fillMaxSize()) {
        MainTopBar(nav, compactLogo = true)
        ScreenTitle("Listas", null)
        tabs()
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${l.items.size} ${if (l.items.size == 1) "título" else "títulos"}" + if (l.items.isNotEmpty()) " · $owned en tu biblioteca" else "",
                Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = CL.text3
            )
            if (onRename != null && onDelete != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SecondaryButton("Renombrar", onClick = onRename)
                SecondaryButton("Eliminar", onClick = onDelete)
            }
        }
        if (entries.isEmpty()) {
            if (l.id == Lists.WATCHLIST) EmptyState("Tu Watchlist está vacía", "Pulsa «Watchlist» en la ficha de una película o serie para apuntarla aquí.")
            else EmptyState("Lista vacía", "Pulsa «Listas» en la ficha de una película o serie, o «Guardar en lista» en una que no tengas, y elige esta lista.")
            return
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(104.dp),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(entries, key = { it.first.key }) { (e, t) ->
                Box {
                    if (t != null) PosterCard(t, isWatched(t, progress), if (t.isMovie) fraction(progress[t.item.path]?.takeIf { !it.watched }) else 0f, null, lbOf(t, lbById)) { nav.detail(t.id) }
                    else Lists.asLbEntry(e).let { lb -> MissingCard(lb, null, lb.key in user.requested) { sheet = lb } }
                }
            }
        }
    }
    sheet?.let { RequestSheet(it, nav) { sheet = null } }
}
