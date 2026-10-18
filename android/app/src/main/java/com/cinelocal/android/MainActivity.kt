package com.cinelocal.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cinelocal.android.player.PlayerActivity
import com.cinelocal.android.ui.screens.BrowseKind
import com.cinelocal.android.ui.screens.BrowseScreen
import com.cinelocal.android.ui.screens.DetailScreen
import com.cinelocal.android.ui.screens.HomeScreen
import com.cinelocal.android.ui.screens.SearchScreen
import com.cinelocal.android.ui.screens.SettingsScreen
import com.cinelocal.android.ui.screens.WatchlistScreen
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.CineLocalTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(CL.bg2.toArgb())
        )
        // Al abrir: mostrar lo conocido y volver a escanear la carpeta de red
        if (savedInstanceState == null) { repo.scan(); repo.autoSyncLetterboxd() }
        setContent { CineLocalTheme { App() } }
    }

    override fun onStop() {
        super.onStop()
        repo.flushAll()
    }
}

/** Acciones de navegación compartidas por las pantallas */
class Nav(private val nav: NavHostController, private val ctx: android.content.Context) {
    fun detail(id: String) = nav.navigate("detail/$id")
    fun search() = nav.navigate("search")
    fun settings() = nav.navigate("settings")
    fun watchlist() = nav.navigate("watchlist")
    fun open(url: String) = ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
    fun tab(route: String) = nav.navigate(route) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
    fun back() = nav.popBackStack()
    fun play(itemId: String, episodeId: String? = null, fromStart: Boolean = false) =
        ctx.startActivity(PlayerActivity.intent(ctx, itemId, episodeId, fromStart))
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("home", "Inicio", Icons.Default.Home),
    Tab("movies", "Películas", Icons.Default.Movie),
    Tab("series", "Series", Icons.Default.Tv),
    Tab("list", "Mi lista", Icons.AutoMirrored.Filled.List)
)

@Composable
private fun App() {
    val navController = rememberNavController()
    val ctx = androidx.compose.ui.platform.LocalContext.current
    val nav = remember { Nav(navController, ctx) }
    val repo = ctx.repo
    val status by repo.status.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route

    LaunchedEffect(status.message) {
        status.message?.let {
            snackbar.showSnackbar(it)
            repo.clearMessage()
        }
    }

    Scaffold(
        containerColor = CL.bg,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (tabs.any { it.route == route }) {
                NavigationBar(containerColor = CL.bg2) {
                    for (t in tabs) {
                        NavigationBarItem(
                            selected = route == t.route,
                            onClick = { nav.tab(t.route) },
                            icon = { Icon(t.icon, null) },
                            label = { Text(t.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = CL.text, selectedTextColor = CL.text,
                                unselectedIconColor = CL.text3, unselectedTextColor = CL.text3,
                                indicatorColor = CL.accent.copy(alpha = .35f)
                            )
                        )
                    }
                }
            }
        }
    ) { pad ->
        NavHost(navController, startDestination = "home", modifier = Modifier.padding(bottom = pad.calculateBottomPadding())) {
            composable("home") { HomeScreen(nav) }
            composable("movies") { BrowseScreen(BrowseKind.MOVIES, nav) }
            composable("series") { BrowseScreen(BrowseKind.SERIES, nav) }
            composable("list") { BrowseScreen(BrowseKind.LIST, nav) }
            composable("search") { SearchScreen(nav) }
            composable("settings") { SettingsScreen(nav) }
            composable("watchlist") { WatchlistScreen(nav) }
            composable("detail/{id}") { entry -> DetailScreen(entry.arguments?.getString("id").orEmpty(), nav) }
        }
    }
}
