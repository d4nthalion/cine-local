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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cinelocal.android.player.PlayerActivity
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material3.Snackbar
import androidx.navigation.NavBackStackEntry
import com.cinelocal.android.ui.components.BottomNav
import com.cinelocal.android.ui.components.NavTab
import com.cinelocal.android.ui.components.TextAction
import com.cinelocal.android.ui.components.UpdateDialog
import com.cinelocal.android.ui.theme.Dur
import com.cinelocal.android.ui.theme.EaseEmphasized
import com.cinelocal.android.ui.theme.EaseExit
import com.cinelocal.android.ui.screens.BrowseKind
import com.cinelocal.android.ui.screens.BrowseScreen
import com.cinelocal.android.ui.screens.DetailScreen
import com.cinelocal.android.ui.screens.DownloadsScreen
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
            navigationBarStyle = SystemBarStyle.dark(CL.bg.toArgb())
        )
        // Al abrir: mostrar lo conocido y volver a escanear la carpeta de red
        if (savedInstanceState == null) {
            repo.scan()
            repo.autoSyncLetterboxd()
            repo.downloads.resumeOnLaunch()   // descargas que quedaron a medias al cerrarse la app
            route(intent)
        }
        repo.updater.autoCheck()   // actualizaciones en GitHub: una vez por proceso, como mucho cada 6 h
        setContent { CineLocalTheme { App() } }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        route(intent)
    }

    /** La notificación de descargas abre la pantalla de Descargas */
    private fun route(intent: android.content.Intent?) {
        intent?.getStringExtra(EXTRA_ROUTE)?.let { pendingRoute.value = it }
        intent?.removeExtra(EXTRA_ROUTE)
    }

    companion object {
        const val EXTRA_ROUTE = "route"
        val pendingRoute = kotlinx.coroutines.flow.MutableStateFlow<String?>(null)
    }

    override fun onResume() {
        super.onResume()
        // vuelta de "Instalar aplicaciones desconocidas": si ya hay permiso, sigue la instalación
        repo.updater.onResume()
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
    fun downloads() = nav.navigate("downloads") { launchSingleTop = true }
    fun open(url: String) = ctx.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
    fun tab(route: String) = nav.navigate(route) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
    fun back() = nav.popBackStack()
    /** [explicit]: se tocó ese episodio en concreto (ver [PlayerActivity.intent]) */
    fun play(itemId: String, episodeId: String? = null, fromStart: Boolean = false, explicit: Boolean = false) =
        ctx.startActivity(PlayerActivity.intent(ctx, itemId, episodeId, fromStart, explicit))
}

private val tabs = listOf(
    NavTab("home", "Inicio", Icons.Outlined.Home, Icons.Filled.Home),
    NavTab("movies", "Películas", Icons.Outlined.Movie, Icons.Filled.Movie),
    NavTab("series", "Series", Icons.Outlined.Tv, Icons.Filled.Tv),
    NavTab("list", "Mi lista", Icons.Outlined.BookmarkBorder, Icons.Filled.Bookmark)
)
private val tabRoutes = tabs.map { it.route }.toSet()
private fun isTab(e: NavBackStackEntry) = e.destination.route in tabRoutes

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

    // abrir una pantalla pedida desde fuera (notificación de descargas)
    val pending by MainActivity.pendingRoute.collectAsStateWithLifecycle()
    LaunchedEffect(pending) {
        if (pending == "downloads") nav.downloads()
        MainActivity.pendingRoute.value = null
    }

    LaunchedEffect(status.message) {
        status.message?.let {
            snackbar.showSnackbar(it)
            repo.clearMessage()
        }
    }

    // Letterboxd: comprobación de Cloudflare que no pasa sola en segundo plano
    val challenge by repo.letterboxd.challenge.collectAsStateWithLifecycle()
    challenge?.let { CloudflareDialog(it) { repo.letterboxd.cancel() } }

    // Actualización: diálogo y ventana de confirmación del instalador de Android
    val updater = repo.updater
    val showUpdate by updater.dialog.collectAsStateWithLifecycle()
    val updatePhase by updater.phase.collectAsStateWithLifecycle()
    if (showUpdate) UpdateDialog(updatePhase, updater)
    val confirmInstall by updater.confirm.collectAsStateWithLifecycle()
    LaunchedEffect(confirmInstall) {
        confirmInstall?.let { runCatching { ctx.startActivity(it) }; updater.consumeConfirm() }
    }

    Scaffold(
        containerColor = CL.bg,
        snackbarHost = {
            SnackbarHost(snackbar) { data ->
                Snackbar(
                    data, shape = RoundedCornerShape(4.dp), containerColor = CL.bg4, contentColor = CL.text,
                    actionColor = CL.accentText, dismissActionContentColor = CL.text2
                )
            }
        },
        bottomBar = {
            if (route in tabRoutes) BottomNav(tabs, route) { nav.tab(it.route) }
        }
    ) { pad ->
        NavHost(
            navController, startDestination = "home",
            modifier = Modifier.padding(bottom = pad.calculateBottomPadding()),
            // entre pestañas sólo fundido; hacia ficha, buscar, ajustes y watchlist, entrada lateral corta
            enterTransition = {
                if (isTab(initialState) && isTab(targetState)) fadeIn(tween(180, easing = LinearEasing))
                else fadeIn(tween(Dur.base)) + slideInHorizontally(tween(Dur.slow, easing = EaseEmphasized)) { it / 10 }
            },
            exitTransition = {
                if (isTab(initialState) && isTab(targetState)) fadeOut(tween(120))
                else fadeOut(tween(Dur.fast)) + scaleOut(tween(Dur.base), targetScale = 0.97f)
            },
            popEnterTransition = {
                if (isTab(initialState) && isTab(targetState)) fadeIn(tween(180, easing = LinearEasing))
                else fadeIn(tween(Dur.base)) + scaleIn(tween(Dur.base), initialScale = .97f)
            },
            popExitTransition = {
                if (isTab(initialState) && isTab(targetState)) fadeOut(tween(120))
                else fadeOut(tween(Dur.fast)) + slideOutHorizontally(tween(Dur.base, easing = EaseExit)) { it / 10 }
            }
        ) {
            composable("home") { HomeScreen(nav) }
            composable("movies") { BrowseScreen(BrowseKind.MOVIES, nav) }
            composable("series") { BrowseScreen(BrowseKind.SERIES, nav) }
            composable("list") { BrowseScreen(BrowseKind.LIST, nav) }
            composable("search") { SearchScreen(nav) }
            composable("settings") { SettingsScreen(nav) }
            composable("watchlist") { WatchlistScreen(nav) }
            composable("downloads") { DownloadsScreen(nav) }
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
            Modifier.fillMaxWidth(0.94f).clip(RoundedCornerShape(8.dp)).background(CL.bg2).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Comprobando la conexión con Letterboxd", style = MaterialTheme.typography.headlineSmall, color = CL.text)
            Text("Letterboxd verifica que la conexión viene de un navegador. Suele pasar sola en unos segundos; si aparece una casilla, márcala.",
                style = MaterialTheme.typography.bodyMedium, color = CL.text2)
            AndroidView(
                factory = { web.also { (it.parent as? ViewGroup)?.removeView(it) } },
                onRelease = { (it.parent as? ViewGroup)?.removeView(it) },
                modifier = Modifier.fillMaxWidth().height(560.dp).clip(RoundedCornerShape(8.dp))
            )
            TextAction("Cancelar", modifier = Modifier.align(Alignment.End), onClick = onCancel)
        }
    }
}
