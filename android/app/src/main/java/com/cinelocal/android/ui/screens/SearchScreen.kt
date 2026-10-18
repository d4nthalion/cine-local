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

/** Búsqueda por título, título original, reparto, director o género (sin distinguir acentos) */
@Composable
fun SearchScreen(nav: Nav) {
    val repo = LocalContext.current.repo
    val titles by repo.titles.collectAsStateWithLifecycle()
    val progress by repo.progress.flow.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }

    val q = Tmdb.norm(query)
    val results = if (q.isEmpty()) emptyList() else titles.filter { matches(it, q) }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().windowInsetsPadding(WindowInsets.statusBars).padding(start = 4.dp, end = 16.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BarIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver") { nav.back() }
            SearchField(query, { query = it }, Modifier.weight(1f).padding(start = 4.dp), textModifier = Modifier.focusRequester(focus))
        }
        when {
            q.isEmpty() -> GenreList(allGenres(titles)) { query = it }
            results.isEmpty() -> EmptyState("Sin resultados", "No hay nada en tu biblioteca que coincida con «$query».")
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

private fun matches(t: Title, q: String): Boolean {
    val m = t.meta
    val fields = buildList {
        add(t.name); add(t.item.title); m?.originalTitle?.let(::add)
        m?.director?.let(::add); m?.creators?.let(::add)
        addAll(m?.genres.orEmpty()); addAll(m?.cast.orEmpty().map { it.name })
    }
    return fields.any { Tmdb.norm(it).contains(q) }
}
