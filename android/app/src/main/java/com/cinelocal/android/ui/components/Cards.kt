package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import coil.compose.AsyncImage
import coil.compose.AsyncImagePainter
import coil.request.ImageRequest
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Title
import com.cinelocal.android.ui.theme.CL
import com.cinelocal.android.ui.theme.Display
import com.cinelocal.android.ui.theme.TNUM
import com.cinelocal.android.ui.theme.TextFont

val cardShape = RoundedCornerShape(4.dp)

fun hue(s: String): Float {
    var h = 0L
    for (c in s) h = (h * 31 + c.code) and 0xFFFFFFFFL
    return (h % 360).toFloat()
}

private val INKS = listOf(Color(0xFF1E1B18), Color(0xFF1A1D1F), Color(0xFF201A1C), Color(0xFF1B1E1A), Color(0xFF1F1D17))

/** Portada provisional tipo cartel, para lo que aún no tiene imagen */
@Composable
fun Placeholder(title: String, sub: String?, modifier: Modifier = Modifier, titleSize: Int = 20) {
    Box(modifier.background(INKS[hue(title).toInt() % INKS.size]).padding(10.dp), contentAlignment = Alignment.BottomStart) {
        Column {
            Box(Modifier.padding(bottom = 8.dp).width(18.dp).height(1.dp).background(CL.lineStrong))
            Text(
                title.uppercase(), color = CL.text, maxLines = 4, overflow = TextOverflow.Ellipsis,
                style = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = titleSize.sp, lineHeight = (titleSize + 1).sp)
            )
            if (!sub.isNullOrEmpty()) Text(sub.uppercase(), Modifier.padding(top = 4.dp), style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.6.sp), color = CL.text3, maxLines = 2)
        }
    }
}

/** Imagen remota con fundido de 220 ms, esqueleto mientras carga y cartel provisional si falla */
@Composable
fun Artwork(
    url: String?, title: String, sub: String?, modifier: Modifier = Modifier,
    colorFilter: ColorFilter? = null, alpha: Float = 1f, placeholderSize: Int = 20
) {
    if (url == null) {
        Placeholder(title, sub, modifier, placeholderSize)
        return
    }
    val ctx = LocalContext.current
    var state by remember(url) { mutableStateOf<AsyncImagePainter.State>(AsyncImagePainter.State.Empty) }
    Box(modifier) {
        when (state) {
            is AsyncImagePainter.State.Error -> Placeholder(title, sub, Modifier.fillMaxSize(), placeholderSize)
            is AsyncImagePainter.State.Success -> {}
            else -> Box(Modifier.fillMaxSize().skeleton())
        }
        AsyncImage(
            model = remember(url) { ImageRequest.Builder(ctx).data(url).crossfade(220).build() },
            contentDescription = null,
            contentScale = ContentScale.Crop,
            colorFilter = colorFilter,
            alpha = alpha,
            onState = { state = it },
            modifier = Modifier.fillMaxSize()
        )
    }
}

/** Barra de progreso de 3 dp en ámbar */
@Composable
fun ProgressBar(fraction: Float, modifier: Modifier = Modifier) {
    Box(modifier.height(3.dp).background(Color(0x33FFFFFF))) {
        Box(Modifier.fillMaxWidth(fraction).height(3.dp).background(CL.accent))
    }
}

/** Los tres puntos del logotipo de Letterboxd */
@Composable
fun LbDots(size: Dp = 6.dp, gap: Dp = 2.dp, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(gap), verticalAlignment = Alignment.CenterVertically) {
        for (c in listOf(CL.lbOrange, CL.lbGreen, CL.lbBlue)) Box(Modifier.size(size).clip(CircleShape).background(c))
    }
}

private fun hasLb(lb: LbEntry?) = lb != null && (lb.film.rating != null || lb.film.liked)

private val lbVeil = Brush.verticalGradient(0.55f to Color.Transparent, 0.8f to Color(0xA60B0A09), 1f to Color(0xF20B0A09))

/** Insignia de "vista": círculo oscuro con ✓, nada de verde */
@Composable
private fun WatchedBadge(modifier: Modifier) {
    Box(modifier.size(20.dp).clip(CircleShape).background(Color(0xB80B0A09)), contentAlignment = Alignment.Center) {
        Icon(Icons.Rounded.Check, null, Modifier.size(13.dp), tint = CL.text)
    }
}

/** Tarjeta vertical (póster) */
@Composable
fun PosterCard(t: Title, watched: Boolean, progress: Float, width: Dp?, lb: LbEntry? = null, onClick: () -> Unit) {
    val w = if (width != null) Modifier.width(width) else Modifier.fillMaxWidth()
    val desc = listOfNotNull(t.name, t.year?.toString(), if (watched) "vista" else null).joinToString(", ")
    Box(
        w.aspectRatio(2f / 3f)
            .tapScale(0.96f, onClick = onClick)
            .clip(cardShape)
            .semantics(mergeDescendants = true) { contentDescription = desc }
            .posterHairline()
    ) {
        Artwork(t.meta?.poster, t.name, listOfNotNull(t.year?.toString(), if (t.isMovie) "Película" else "Serie").joinToString(" · "), Modifier.fillMaxSize())
        if (hasLb(lb)) Box(Modifier.fillMaxSize().background(lbVeil))
        if (watched) WatchedBadge(Modifier.align(Alignment.TopEnd).padding(6.dp))
        LbBadge(lb, Modifier.align(Alignment.BottomStart).padding(start = 6.dp, bottom = if (progress > 0f) 11.dp else 6.dp))
        if (progress > 0f) ProgressBar(progress, Modifier.align(Alignment.BottomStart).fillMaxWidth())
    }
}

/** Tu nota de Letterboxd en estrellas verdes y el ♥ si te gustó (sin caja: la lectura la da el velo del póster) */
@Composable
fun LbBadge(lb: LbEntry?, modifier: Modifier = Modifier) {
    val f = lb?.film ?: return
    if (f.rating == null && !f.liked) return
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        val st = TextStyle(fontFamily = TextFont, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 0.5.sp)
        if (f.rating != null) Text(Letterboxd.stars(f.rating), color = CL.lbGreen, style = st)
        if (f.liked) Text((if (f.rating != null) " " else "") + "♥\uFE0E", color = CL.lbOrange, style = st)
    }
}

private val desaturate = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0.15f) })

/** Película de la watchlist que no está en la biblioteca: póster apagado y franja "NO LA TIENES" (o "PEDIDA" si ya se pidió por ntfy) */
@Composable
fun MissingCard(e: LbEntry, width: Dp?, requested: Boolean = false, onClick: () -> Unit) {
    val w = if (width != null) Modifier.width(width) else Modifier.fillMaxWidth()
    val title = e.localTitle ?: e.film.title
    Box(
        w.aspectRatio(2f / 3f)
            .tapScale(0.96f, onClick = onClick)
            .clip(cardShape)
            .semantics(mergeDescendants = true) { contentDescription = "$title, " + if (requested) "pedida" else "no la tienes" }
            .posterHairline()
    ) {
        Artwork(e.poster, title, e.film.year?.toString(), Modifier.fillMaxSize(), colorFilter = desaturate, alpha = 0.6f)
        LbDots(5.dp, 2.dp, Modifier.align(Alignment.TopStart).padding(7.dp))
        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth()) {
            LbBadge(e, Modifier.padding(start = 6.dp, bottom = 5.dp))
            Box(Modifier.fillMaxWidth().height(22.dp).background(Color(0xE60B0A09)), contentAlignment = Alignment.Center) {
                Text(if (requested) "PEDIDA" else "NO LA TIENES", style = MaterialTheme.typography.labelSmall, color = if (requested) CL.accent else CL.text2)
            }
        }
    }
}

/** Póster con número grande de contorno detrás (fila "Las 10 mejor valoradas") */
@Composable
fun RankedPosterCard(rank: Int, t: Title, watched: Boolean, progress: Float, lb: LbEntry?, onClick: () -> Unit) {
    val stroke = with(LocalDensity.current) { 2.dp.toPx() }
    Box(Modifier.width(168.dp)) {
        // el número queda un poco por debajo del póster (las cifras traen margen propio)
        Box(Modifier.align(Alignment.BottomStart).width(168.dp - 104.dp + 6.dp), contentAlignment = Alignment.BottomEnd) {
            Text(
                "$rank",
                style = MaterialTheme.typography.displaySmall.copy(drawStyle = Stroke(width = stroke)),
                color = CL.text3, maxLines = 1, softWrap = false
            )
        }
        Box(Modifier.align(Alignment.BottomEnd).zIndex(1f)) { PosterCard(t, watched, progress, 104.dp, lb, onClick) }
    }
}

/** Tarjeta horizontal de "Continuar viendo" */
@Composable
fun WideCard(image: String?, title: String, subtitle: String, badge: String?, progress: Float, onClick: () -> Unit) {
    Column(Modifier.width(248.dp).tapScale(0.96f, onClick = onClick).semantics(mergeDescendants = true) {}) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(cardShape).posterHairline()) {
            Artwork(image, title, null, Modifier.fillMaxSize(), placeholderSize = 18)
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.55f to Color.Transparent, 1f to Color(0xCC0B0A09))))
            Row(
                Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(start = 10.dp, end = 10.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PlayRing(34.dp, 18.dp)
                Spacer(Modifier.weight(1f))
                if (badge != null) Text(
                    badge, style = MaterialTheme.typography.labelMedium.copy(fontFeatureSettings = TNUM),
                    color = CL.text, maxLines = 1
                )
            }
            ProgressBar(progress, Modifier.align(Alignment.BottomStart).fillMaxWidth())
        }
        Text(title, Modifier.padding(top = 8.dp), style = MaterialTheme.typography.titleMedium, color = CL.text, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (subtitle.isNotEmpty()) Text(subtitle, Modifier.padding(top = 2.dp), style = MaterialTheme.typography.bodySmall, color = CL.text3, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** ▶ dentro de un círculo con contorno */
@Composable
fun PlayRing(size: Dp, icon: Dp, modifier: Modifier = Modifier) {
    Box(
        modifier.size(size).clip(CircleShape).background(Color(0x660B0A09)).border(1.5.dp, Color(0xE6F3EFE8), CircleShape),
        contentAlignment = Alignment.Center
    ) { Icon(Icons.Rounded.PlayArrow, null, Modifier.size(icon), tint = CL.text) }
}

/** Cabecera de fila con "Ver todo" opcional */
@Composable
fun SectionHeader(title: String, onMore: (() -> Unit)? = null, first: Boolean = false) {
    Row(
        Modifier.fillMaxWidth()
            .then(if (onMore != null) Modifier.tapFade(onClick = onMore) else Modifier)
            .heightIn(min = 48.dp)
            .padding(start = 16.dp, end = 12.dp, top = if (first) 8.dp else 28.dp, bottom = 12.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = CL.text, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (onMore != null) {
            Text("Ver todo", style = MaterialTheme.typography.labelMedium, color = CL.text2, modifier = Modifier.padding(start = 12.dp, bottom = 2.dp))
            Icon(Icons.Rounded.ChevronRight, null, Modifier.size(16.dp).padding(bottom = 1.dp), tint = CL.text2)
        }
    }
}

/** Fila con título y carrusel horizontal */
fun LazyListScope.section(
    title: String, onMore: (() -> Unit)? = null, first: Boolean = false, gap: Dp = 8.dp,
    content: LazyListScope.() -> Unit
) {
    item(key = "h-$title") { SectionHeader(title, onMore, first) }
    item(key = "r-$title") {
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(gap), content = content)
    }
}

/** Logotipo "CINELOCAL": CINE en hueso y LOCAL en ámbar */
@Composable
fun BrandLogo(modifier: Modifier = Modifier, small: Boolean = false) {
    Row(modifier.semantics(mergeDescendants = true) { contentDescription = "CineLocal" }) {
        val st = if (small) MaterialTheme.typography.labelSmall else MaterialTheme.typography.headlineSmall
        Text("CINE", style = st, color = if (small) CL.text3 else CL.text)
        Text("LOCAL", style = st, color = if (small) CL.text3 else CL.accent)
    }
}
