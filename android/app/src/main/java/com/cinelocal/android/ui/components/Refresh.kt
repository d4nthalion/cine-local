package com.cinelocal.android.ui.components

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cinelocal.android.repo
import com.cinelocal.android.ui.theme.CL

/**
 * Deslizar hacia abajo para volver a escanear la biblioteca (la misma acción que el icono de la cabecera).
 * El indicador sólo gira si el escaneo lo ha pedido este gesto; el escaneo automático ya se ve en la cabecera.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanRefreshBox(modifier: Modifier = Modifier, indicatorTop: Dp = 0.dp, content: @Composable BoxScope.() -> Unit) {
    val repo = LocalContext.current.repo
    val status by repo.status.collectAsStateWithLifecycle()
    var pulled by remember { mutableStateOf(false) }
    LaunchedEffect(status.scanning) { if (!status.scanning) pulled = false }
    val state = rememberPullToRefreshState()
    val refreshing = pulled && status.scanning
    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = { pulled = true; repo.scan() },
        state = state,
        modifier = modifier.fillMaxSize(),
        indicator = {
            PullToRefreshDefaults.Indicator(
                state = state, isRefreshing = refreshing, containerColor = CL.bg3, color = CL.accent,
                modifier = Modifier.align(Alignment.TopCenter).padding(top = indicatorTop)
            )
        },
        content = content
    )
}
