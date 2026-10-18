package com.cinelocal.android

import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
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

    // Letterboxd: comprobación de Cloudflare que no pasa sola en segundo plano
    val challenge by repo.letterboxd.challenge.collectAsStateWithLifecycle()
    challenge?.let { CloudflareDialog(it) { repo.letterboxd.cancel() } }

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

/** Muestra la página de Letterboxd mientras Cloudflare la comprueba; se cierra sola al pasar */
@Composable
private fun CloudflareDialog(web: WebView, onCancel: () -> Unit) {
    // sólo se cancela con el botón: un toque fuera sin querer no debe cortar la sincronización
    Dialog(onDismissRequest = {}, properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = false, dismissOnBackPress = false)) {
        Column(
            Modifier.fillMaxWidth(0.94f).clip(RoundedCornerShape(14.dp)).background(CL.bg2).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Comprobando la conexión con Letterboxd", style = MaterialTheme.typography.titleLarge, color = CL.text)
            Text("Letterboxd verifica que la conexión viene de un navegador. Suele pasar sola en unos segundos; si aparece una casilla, márcala.",
                style = MaterialTheme.typography.bodyMedium, color = CL.text2)
            AndroidView(
                factory = { web.also { (it.parent as? ViewGroup)?.removeView(it) } },
                onRelease = { (it.parent as? ViewGroup)?.removeView(it) },
                modifier = Modifier.fillMaxWidth().height(560.dp).clip(RoundedCornerShape(8.dp))
            )
            TextButton(onClick = onCancel, modifier = Modifier.align(Alignment.End)) { Text("Cancelar") }
        }
    }
}
