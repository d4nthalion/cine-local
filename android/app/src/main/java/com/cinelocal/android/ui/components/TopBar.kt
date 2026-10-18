package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.Nav
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.CL

/** Cabecera de las pantallas principales: logotipo, escanear, buscar y ajustes */
@Composable
fun MainTopBar(nav: Nav, title: String? = null, transparent: Boolean = false) {
    val repo = LocalContext.current.repo
    val status by repo.status.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxWidth()
            .background(if (transparent) Color.Transparent else CL.bg)
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(start = 16.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            if (title == null) BrandLogo() else Text(title, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.weight(1f))
            if (status.scanning) {
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = CL.text2)
                }
            } else {
                IconButton(onClick = { repo.scan() }) { Icon(Icons.Default.Refresh, "Volver a escanear") }
            }
            IconButton(onClick = nav::search) { Icon(Icons.Default.Search, "Buscar") }
            IconButton(onClick = nav::settings) { Icon(Icons.Default.Settings, "Ajustes") }
        }
        if (status.metaTotal > 0) {
            LinearProgressIndicator(
                progress = { status.metaDone.toFloat() / status.metaTotal },
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = CL.accent, trackColor = Color.Transparent
            )
        }
    }
}

@Composable
fun BackTopBar(title: String, onBack: () -> Unit, actions: @Composable () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().background(CL.bg).windowInsetsPadding(WindowInsets.statusBars).height(56.dp).padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver") }
        Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        actions()
    }
}

/** Mensaje a pantalla completa con una acción opcional */
@Composable
fun EmptyState(title: String, text: String, action: String? = null, onAction: () -> Unit = {}) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
            Text(text, style = MaterialTheme.typography.bodyLarge, color = CL.text2, textAlign = TextAlign.Center)
            if (action != null) GradientButton(action, onClick = onAction)
        }
    }
}

@Composable
fun GradientButton(text: String, modifier: Modifier = Modifier, icon: (@Composable () -> Unit)? = null, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.background(CL.grad, MaterialTheme.shapes.small),
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, contentColor = Color.White)
    ) {
        if (icon != null) { icon(); Spacer(Modifier.size(6.dp)) }
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun SecondaryButton(text: String, modifier: Modifier = Modifier, icon: (@Composable () -> Unit)? = null, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        colors = ButtonDefaults.buttonColors(containerColor = Color(0x26FFFFFF), contentColor = Color.White)
    ) {
        if (icon != null) { icon(); Spacer(Modifier.size(6.dp)) }
        Text(text, style = MaterialTheme.typography.labelLarge)
    }
}
