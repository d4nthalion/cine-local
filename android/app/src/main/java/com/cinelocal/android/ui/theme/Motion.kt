package com.cinelocal.android.ui.theme

import android.provider.Settings
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/** Curva de entrada */
val EaseEmphasized = CubicBezierEasing(0.2f, 0f, 0f, 1f)
/** Curva de salida */
val EaseExit = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)

/** Duraciones en ms */
object Dur {
    const val fast = 120
    const val base = 220
    const val slow = 360
}

/** false si el sistema tiene las animaciones desactivadas: sin paralaje ni escala al pulsar */
@Composable
fun rememberMotionEnabled(): Boolean {
    val ctx = LocalContext.current
    return remember {
        Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    }
}
