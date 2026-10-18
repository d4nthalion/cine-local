package com.cinelocal.android.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cinelocal.android.R

/** "Sala oscura": negro cálido, un único acento ámbar de tungsteno y el botón principal "papel" */
object CL {
    // capas (negro cálido, nada azulado)
    val bg = Color(0xFF0B0A09)
    val bg2 = Color(0xFF141312)
    val bg3 = Color(0xFF1D1B19)
    val bg4 = Color(0xFF282523)
    val scrim = Color(0xFF0B0A09)
    // líneas
    val line = Color(0x14FFFFFF)
    val lineStrong = Color(0x29FFFFFF)
    // texto
    val text = Color(0xFFF3EFE8)
    val text2 = Color(0xFFB9B2A8)
    val text3 = Color(0xFF857E75)
    val text4 = Color(0xFF55504A)
    // el acento
    val accent = Color(0xFFE8A13A)
    val accentDim = Color(0x33E8A13A)
    val onAccent = Color(0xFF1A1206)
    // botón principal
    val paper = Color(0xFFF3EFE8)
    val onPaper = Color(0xFF0B0A09)
    // estados
    val error = Color(0xFFE5584F)
    val ok = Color(0xFF8FBF8A)
    // Letterboxd (colores de marca)
    val lbGreen = Color(0xFF00E054)
    val lbOrange = Color(0xFFFF8000)
    val lbBlue = Color(0xFF40BCF4)
}

// Archivo es una fuente variable (ejes wght y wdth): cada familia fija la anchura
// ExtraCondensed = 62, SemiCondensed = 87.5, normal = 100
@OptIn(ExperimentalTextApi::class)
private fun archivo(weight: Int, width: Float) = Font(
    R.font.archivo_vf, FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight), FontVariation.width(width))
)

/** Cartel: títulos, cabeceras, logotipo, números del Top */
val Display = FontFamily(archivo(600, 62f), archivo(700, 62f), archivo(800, 62f))
/** Subtítulos: cabeceras de fila, nombres en tarjetas */
val Semi = FontFamily(archivo(500, 87.5f), archivo(600, 87.5f), archivo(700, 87.5f))
/** Texto corrido */
val TextFont = FontFamily(archivo(400, 100f), archivo(500, 100f), archivo(600, 100f))
/** Voz editorial */
val Serif = FontFamily(
    Font(R.font.instrument_serif_regular),
    Font(R.font.instrument_serif_italic, style = FontStyle.Italic)
)

private fun style(
    family: FontFamily, weight: FontWeight, size: TextUnit, line: TextUnit, tracking: TextUnit = 0.sp,
    italic: Boolean = false
) = TextStyle(
    fontFamily = family, fontWeight = weight, fontSize = size, lineHeight = line, letterSpacing = tracking,
    fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
    platformStyle = PlatformTextStyle(includeFontPadding = false),
    lineHeightStyle = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None)
)

private val type = Typography(
    displayLarge = style(Display, FontWeight.ExtraBold, 44.sp, 44.sp, (-0.5).sp),
    displayMedium = style(Display, FontWeight.ExtraBold, 36.sp, 38.sp, (-0.25).sp),
    displaySmall = style(Display, FontWeight.Bold, 96.sp, 96.sp, (-2).sp),
    headlineLarge = style(Display, FontWeight.Bold, 32.sp, 34.sp),
    headlineMedium = style(Serif, FontWeight.Normal, 28.sp, 32.sp, italic = true),
    headlineSmall = style(Display, FontWeight.SemiBold, 24.sp, 28.sp, 0.2.sp),
    titleLarge = style(Semi, FontWeight.Bold, 19.sp, 24.sp, (-0.1).sp),
    titleMedium = style(Semi, FontWeight.SemiBold, 16.sp, 21.sp),
    titleSmall = style(Serif, FontWeight.Normal, 20.sp, 26.sp, italic = true),
    bodyLarge = style(TextFont, FontWeight.Normal, 15.sp, 23.sp, 0.1.sp),
    bodyMedium = style(TextFont, FontWeight.Normal, 14.sp, 20.sp, 0.1.sp),
    bodySmall = style(TextFont, FontWeight.Normal, 12.5.sp, 17.sp, 0.15.sp),
    labelLarge = style(TextFont, FontWeight.SemiBold, 15.sp, 18.sp, 0.2.sp),
    labelMedium = style(TextFont, FontWeight.Medium, 12.sp, 16.sp, 0.3.sp),
    labelSmall = style(TextFont, FontWeight.SemiBold, 11.sp, 14.sp, 1.4.sp)
)

/** Cifras tabulares: tiempos, contadores y notas que no bailan */
val TNUM = "tnum"

private val scheme = darkColorScheme(
    primary = CL.accent,
    onPrimary = CL.onAccent,
    secondary = CL.paper,
    onSecondary = CL.onPaper,
    background = CL.bg,
    onBackground = CL.text,
    surface = CL.bg,
    onSurface = CL.text,
    surfaceVariant = CL.bg3,
    onSurfaceVariant = CL.text2,
    surfaceContainerLowest = CL.bg,
    surfaceContainerLow = CL.bg2,
    surfaceContainer = CL.bg2,
    surfaceContainerHigh = CL.bg3,
    surfaceContainerHighest = CL.bg4,
    outline = CL.lineStrong,
    outlineVariant = CL.line,
    error = CL.error,
    surfaceTint = Color.Transparent
)

private val shapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(8.dp),
    large = RoundedCornerShape(12.dp),
    extraLarge = RoundedCornerShape(12.dp)
)

@Composable
fun CineLocalTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, typography = type, shapes = shapes, content = content)
}
