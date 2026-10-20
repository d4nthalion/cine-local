package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.CL
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date
import java.util.Locale

/** Hoja de una película que no está en la biblioteca (de la watchlist o buscada en TMDB): pedir que la descarguen (ntfy) o verla en Letterboxd */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestSheet(e: LbEntry, nav: Nav, onDismiss: () -> Unit) {
    val repo = LocalContext.current.repo
    val scope = rememberCoroutineScope()
    val settings by repo.settings.flow.collectAsStateWithLifecycle()
    val state by repo.userState.flow.collectAsStateWithLifecycle()
    val requestedAt = state.requested[e.key]
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val title = e.localTitle ?: e.film.title

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = CL.bg2,
        scrimColor = CL.veil(0.6f),
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
        tonalElevation = 0.dp,
        dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 6.dp).size(32.dp, 3.dp).clip(RoundedCornerShape(2.dp)).background(CL.lineStrong)) }
    ) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 20.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(Modifier.width(72.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(4.dp)).posterHairline()) {
                    Artwork(e.poster, title, e.film.year?.toString(), Modifier.matchParentSize(), placeholderSize = 11)
                }
                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (e.film.watchlist) LbDots(5.dp, 2.dp, Modifier.padding(end = 6.dp))
                        Text(
                            if (e.film.watchlist) "EN TU WATCHLIST · NO LA TIENES" else "TMDB · NO LA TIENES",
                            style = MaterialTheme.typography.labelSmall, color = CL.text3
                        )
                    }
                    Text(
                        title, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.headlineSmall, color = CL.text,
                        maxLines = 3, overflow = TextOverflow.Ellipsis
                    )
                    val sub = listOfNotNull(e.film.year?.toString(), e.film.title.takeIf { it != title }).joinToString(" · ")
                    if (sub.isNotEmpty()) Text(sub, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 2)
                    LbBadge(e, Modifier.padding(top = 6.dp))
                }
            }

            Spacer(Modifier.height(20.dp))
            when {
                !settings.ntfyReady -> {
                    Text(
                        "Para pedir descargas, indica en Ajustes el tema de ntfy al que estás suscrito.",
                        style = MaterialTheme.typography.bodyMedium, color = CL.text2
                    )
                    Spacer(Modifier.height(12.dp))
                    SecondaryButton("Configurar ntfy", Modifier.fillMaxWidth()) { onDismiss(); nav.settings() }
                }
                sending -> Row(Modifier.fillMaxWidth().height(46.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = CL.accent, trackColor = Color.Transparent)
                    Text("Enviando…", Modifier.padding(start = 10.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2)
                }
                else -> {
                    if (requestedAt != null) {
                        Row(Modifier.padding(bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Check, null, Modifier.size(16.dp), tint = CL.accent)
                            Text(
                                "Pedida el " + DateFormat.getDateInstance(DateFormat.MEDIUM, Locale.forLanguageTag("es-ES")).format(Date(requestedAt)),
                                Modifier.padding(start = 6.dp), style = MaterialTheme.typography.bodyMedium, color = CL.text2
                            )
                        }
                    }
                    val send = {
                        error = null
                        sending = true
                        scope.launch {
                            error = try { repo.requestDownload(e); null } catch (ex: Exception) { ex.message ?: ex.javaClass.simpleName }
                            sending = false
                        }
                        Unit
                    }
                    if (requestedAt == null) AccentButton("Pedir descarga", Modifier.fillMaxWidth(), Icons.Rounded.Download, send)
                    else SecondaryButton("Volver a pedirla", Modifier.fillMaxWidth(), Icons.Rounded.Download, onClick = send)
                }
            }
            error?.let { Text(it, Modifier.padding(top = 10.dp), style = MaterialTheme.typography.bodySmall, color = CL.error) }

            e.film.url?.let { url ->
                Spacer(Modifier.height(8.dp))
                SecondaryButton("Ver en Letterboxd", Modifier.fillMaxWidth(), Icons.Rounded.OpenInNew) { nav.open(url) }
            }
        }
    }
}
