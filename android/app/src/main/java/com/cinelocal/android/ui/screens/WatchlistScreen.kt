package com.cinelocal.android.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
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
import com.cinelocal.android.ui.components.PosterCard
import com.cinelocal.android.ui.theme.CL

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
    var mode by rememberSaveable { mutableStateOf(WlFilter.ALL) }

    val all = watchlistEntries(entries, titles)
    val have = all.count { it.second != null }
    val shown = when (mode) {
        WlFilter.ALL -> all
        WlFilter.OWNED -> all.filter { it.second != null }
        WlFilter.MISSING -> all.filter { it.second == null }
    }

    Column(Modifier.fillMaxSize()) {
        BackTopBar("Watchlist de Letterboxd", onBack = { nav.back() })
        if (all.isEmpty()) {
            EmptyState(
                "Tu watchlist está vacía",
                if (settings.lbUser.isNotBlank()) "Sincroniza tu perfil desde Ajustes." else "Conecta tu perfil de Letterboxd en Ajustes.",
                "Ajustes", nav::settings
            )
            return
        }
        Row(
            Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            for ((m, label) in listOf(WlFilter.ALL to "Todas · ${all.size}", WlFilter.OWNED to "En tu biblioteca · $have", WlFilter.MISSING to "No las tienes · ${all.size - have}")) {
                FilterChip(
                    selected = mode == m, onClick = { mode = m }, label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = CL.accent.copy(alpha = .35f))
                )
            }
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(108.dp),
            contentPadding = PaddingValues(16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(shown, key = { it.first.key }) { (e, t) ->
                if (t != null) PosterCard(t, isWatched(t, progress), fraction(progress[t.item.path]?.takeIf { !it.watched }), null, lbOf(t, lbById)) { nav.detail(t.id) }
                else MissingCard(e, null) { e.film.url?.let(nav::open) }
            }
        }
    }
}
