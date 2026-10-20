package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.DownloadDone
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.BrandGradientH
import com.cinelocal.android.ui.theme.CL

/**
 * Cabecera de las pantallas principales: logotipo, escanear, buscar, descargas (si hay alguna) y ajustes.
 * Debajo, el aviso de "sin conexión con el PC" cuando no se pudo leer la carpeta compartida.
 * bgAlpha: 0 = transparente sobre el destacado, 1 = fondo bg al 94 %.
 */
@Composable
fun MainTopBar(nav: Nav, bgAlpha: Float = 1f, compactLogo: Boolean = false) {
    val repo = LocalContext.current.repo
    val status by repo.status.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxWidth()
            .background(CL.bg.copy(alpha = bgAlpha))
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(start = 16.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            BrandLogo(small = compactLogo)
            Spacer(Modifier.weight(1f))
            if (status.scanning) {
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = CL.text2, trackColor = Color.Transparent)
                }
            } else {
                BarIcon(Icons.Rounded.Refresh, "Volver a escanear") { repo.scan() }
            }
            BarIcon(Icons.Rounded.Search, "Buscar", onClick = nav::search)
            DownloadsIcon(nav)
            BarIcon(Icons.Rounded.Settings, "Ajustes", onClick = nav::settings)
        }
        OfflineBanner()
        if (status.metaTotal > 0) {
            LinearProgressIndicator(
                progress = { status.metaDone.toFloat() / status.metaTotal },
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = CL.accent, trackColor = Color.Transparent, gapSize = 0.dp, drawStopIndicator = {}
            )
        }
    }
}

/** Acceso a Descargas: solo si hay alguna; con un anillo de progreso mientras se descarga */
@Composable
private fun DownloadsIcon(nav: Nav) {
    val index by rememberDlIndex()
    if (index.files.isEmpty()) return
    val pending = index.pending
    if (pending.isEmpty()) {
        BarIcon(Icons.Rounded.DownloadDone, "Descargas", onClick = nav::downloads)
        return
    }
    val total = pending.sumOf { it.size }
    val frac = if (total > 0) (pending.sumOf { it.done }.toFloat() / total) else 0f
    Box(Modifier.size(48.dp).tapFade(onClick = nav::downloads).semantics { contentDescription = "Descargas en curso" }, contentAlignment = Alignment.Center) {
        DownloadRing(frac, 26.dp)
        Icon(Icons.Rounded.ArrowDownward, null, Modifier.size(14.dp), tint = CL.text)
    }
}

/** Barra de "Volver": flecha, antetítulo opcional y título; con divider, línea inferior de 1 dp */
@Composable
fun BackTopBar(
    title: String, onBack: () -> Unit, kicker: String? = null, kickerDots: Boolean = false,
    divider: Boolean = false, actions: @Composable () -> Unit = {}
) {
    Column(Modifier.fillMaxWidth().background(CL.bg).windowInsetsPadding(WindowInsets.statusBars)) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(start = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            BarIcon(Icons.AutoMirrored.Rounded.ArrowBack, "Volver", onClick = onBack)
            Column(Modifier.weight(1f).padding(start = 4.dp)) {
                if (kicker != null) Row(verticalAlignment = Alignment.CenterVertically) {
                    if (kickerDots) LbDots(5.dp, 2.dp, Modifier.padding(end = 6.dp))
                    Text(kicker, style = MaterialTheme.typography.labelSmall, color = CL.text3)
                }
                Text(title, style = MaterialTheme.typography.titleLarge, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            actions()
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(if (divider) CL.line else Color.Transparent))
    }
}

/** Mensaje a pantalla completa: alineado a la izquierda, a un 38 % del alto, con filete y titular en serif */
@Composable
fun EmptyState(
    title: String, text: String, action: String? = null,
    error: Boolean = false, detail: String? = null, onAction: () -> Unit = {}
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
        Spacer(Modifier.weight(0.38f))
        Box(Modifier.width(24.dp).height(2.dp).then(if (error) Modifier.background(CL.error) else Modifier.background(BrandGradientH)))
        Spacer(Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.headlineMedium, color = CL.text)
        if (text.isNotEmpty()) Text(
            text, Modifier.padding(top = 10.dp).widthIn(max = 340.dp),
            style = MaterialTheme.typography.bodyLarge, color = CL.text2
        )
        if (detail != null) Text(
            detail,
            Modifier.padding(top = 14.dp).fillMaxWidth().background(CL.bg2, RoundedCornerShape(4.dp)).padding(12.dp),
            style = MaterialTheme.typography.bodySmall, color = CL.text3
        )
        if (action != null) {
            Spacer(Modifier.height(24.dp))
            PrimaryButton(action, onClick = onAction)
        }
        Spacer(Modifier.weight(0.62f))
    }
}
