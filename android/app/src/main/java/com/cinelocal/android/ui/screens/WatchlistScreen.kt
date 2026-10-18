package com.cinelocal.android.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.remember
import com.cinelocal.android.ui.components.TextTabs
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.repo
import com.cinelocal.android.ui.fraction
import com.cinelocal.android.ui.isWatched
import com.cinelocal.android.ui.lbOf
import com.cinelocal.android.ui.watchlistEntries
import com.cinelocal.android.ui.components.BackTopBar
import com.cinelocal.android.ui.components.EmptyState
import com.cinelocal.android.ui.components.MissingCard
import com.cinelocal.android.ui.components.RequestSheet
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.ui.components.PosterCard

private enum class WlFilter { ALL, OWNED, MISSING }

/** Watchlist de Letterboxd: las que tienes en la biblioteca y las que no */
@Composable
fun WatchlistScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    val entries by repo.lbEntries.collectAsStateWithLifecycle()
    val lbById by repo.lbById.collectAsStateWithLifecycle()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val user by repo.userState.flow.collectAsStateWithLifecycle()
    var mode by rememberSaveable { mutableStateOf(WlFilter.ALL) }
    var sheet by remember { mutableStateOf<LbEntry?>(null) }

    val all = watchlistEntries(entries, titles)
    val have = all.count { it.second != null }
    val shown = when (mode) {
        WlFilter.ALL -> all
        WlFilter.OWNED -> all.filter { it.second != null }
        WlFilter.MISSING -> all.filter { it.second == null }
    }

    val grid = rememberLazyGridState()
    val scrolled by remember { derivedStateOf { grid.firstVisibleItemIndex > 0 || grid.firstVisibleItemScrollOffset > 0 } }
    Column(Modifier.fillMaxSize()) {
        BackTopBar("Watchlist", onBack = { nav.back() }, kicker = "LETTERBOXD", kickerDots = true, divider = scrolled)
        if (all.isEmpty()) {
            EmptyState(
                "Tu watchlist está vacía",
                if (settings.lbUser.isNotBlank()) "Sincroniza tu perfil desde Ajustes." else "Conecta tu perfil de Letterboxd en Ajustes.",
                "Ajustes", onAction = nav::settings
            )
            return
        }
        val modes = listOf(WlFilter.ALL, WlFilter.OWNED, WlFilter.MISSING)
        TextTabs(
            listOf("Todas", "En tu biblioteca", "No las tienes"), modes.indexOf(mode), { mode = modes[it] },
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp),
            counts = listOf(all.size, have, all.size - have)
        )
        LazyVerticalGrid(
            columns = GridCells.Adaptive(104.dp),
            state = grid,
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(shown, key = { it.first.key }) { (e, t) ->
                Box(Modifier.animateItem(fadeInSpec = tween(180), placementSpec = spring(stiffness = Spring.StiffnessMediumLow), fadeOutSpec = tween(120))) {
                    if (t != null) PosterCard(t, isWatched(t, progress), fraction(progress[t.item.path]?.takeIf { !it.watched }), null, lbOf(t, lbById)) { nav.detail(t.id) }
                    else MissingCard(e, null, e.key in user.requested) { sheet = e }
                }
            }
        }
    }
    sheet?.let { RequestSheet(it, nav) { sheet = null } }
}
