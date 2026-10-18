package com.cinelocal.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Mismos colores que src/renderer/styles.css de escritorio
object CL {
    val bg = Color(0xFF08080C)
    val bg2 = Color(0xFF101018)
    val bg3 = Color(0xFF191924)
    val line = Color(0x17FFFFFF)
    val text = Color(0xFFF4F4F7)
    val text2 = Color(0xFFB4B4C3)
    val text3 = Color(0xFF7A7A8C)
    val accent = Color(0xFFA855F7)
    val accent2 = Color(0xFFEC4899)
    val ok = Color(0xFF22C55E)
    val star = Color(0xFFFACC15)
    // Letterboxd
    val lbGreen = Color(0xFF00E054)
    val lbOrange = Color(0xFFFF8000)
    val lbBlue = Color(0xFF40BCF4)
    val grad = Brush.linearGradient(listOf(Color(0xFF8B5CF6), Color(0xFFEC4899)))
}

private val scheme = darkColorScheme(
    primary = CL.accent,
    onPrimary = Color.White,
    secondary = CL.accent2,
    onSecondary = Color.White,
    background = CL.bg,
    onBackground = CL.text,
    surface = CL.bg2,
    onSurface = CL.text,
    surfaceVariant = CL.bg3,
    onSurfaceVariant = CL.text2,
    surfaceContainer = CL.bg2,
    surfaceContainerHigh = CL.bg3,
    surfaceContainerHighest = CL.bg3,
    outline = CL.text3,
    outlineVariant = CL.line,
    error = Color(0xFFF87171)
)

private val type = Typography(
    headlineLarge = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp),
    headlineSmall = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold),
    titleLarge = TextStyle(fontSize = 19.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium)
)

@Composable
fun CineLocalTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, typography = type, content = content)
}
