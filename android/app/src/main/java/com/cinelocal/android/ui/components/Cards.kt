package com.cinelocal.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.cinelocal.android.core.LbEntry
import com.cinelocal.android.core.Letterboxd
import com.cinelocal.android.core.Title
import com.cinelocal.android.ui.theme.CL

private val cardShape = RoundedCornerShape(8.dp)

fun hue(s: String): Float {
    var h = 0L
    for (c in s) h = (h * 31 + c.code) and 0xFFFFFFFFL
    return (h % 360).toFloat()
}

/** Portada provisional con el título, para lo que aún no tiene imagen (como placeholder() en escritorio) */
@Composable
fun Placeholder(title: String, sub: String?, modifier: Modifier = Modifier) {
    val h = hue(title)
    Box(
        modifier.background(
            Brush.linearGradient(listOf(Color.hsl(h, .45f, .28f), Color.hsl((h + 50) % 360, .5f, .12f)))
        ).padding(10.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, maxLines = 4, overflow = TextOverflow.Ellipsis)
            if (!sub.isNullOrEmpty()) Text(sub, style = MaterialTheme.typography.labelSmall, color = CL.text2)
        }
    }
}

@Composable
fun Artwork(url: String?, title: String, sub: String?, modifier: Modifier = Modifier) {
    if (url == null) {
        Placeholder(title, sub, modifier)
        return
    }
    SubcomposeAsyncImage(
        model = url,
        contentDescription = title,
        contentScale = ContentScale.Crop,
        modifier = modifier,
        loading = { Box(Modifier.fillMaxSize().background(CL.bg3)) },
        error = { Placeholder(title, sub, Modifier.fillMaxSize()) }
    )
}

@Composable
fun ProgressBar(fraction: Float, modifier: Modifier = Modifier) {
    Box(modifier.height(3.dp).background(Color(0x55FFFFFF))) {
        Box(Modifier.fillMaxWidth(fraction).height(3.dp).background(CL.accent2))
    }
}

/** Tarjeta vertical (póster) */
@Composable
fun PosterCard(t: Title, watched: Boolean, progress: Float, width: Dp?, lb: LbEntry? = null, onClick: () -> Unit) {
    val w = if (width != null) Modifier.width(width) else Modifier.fillMaxWidth()
    Box(w.aspectRatio(2f / 3f).clip(cardShape).clickable(onClick = onClick)) {
        Artwork(t.meta?.poster, t.name, listOfNotNull(t.year?.toString(), if (t.isMovie) "Película" else "Serie").joinToString(" · "), Modifier.fillMaxSize())
        if (watched) {
            Box(
                Modifier.align(Alignment.TopEnd).padding(6.dp).size(22.dp).clip(CircleShape).background(CL.ok),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Default.Check, "Vista", Modifier.size(15.dp), tint = Color.White) }
        }
        LbBadge(lb, Modifier.align(Alignment.BottomStart).padding(start = 6.dp, bottom = if (progress > 0f) 9.dp else 6.dp))
        if (progress > 0f) ProgressBar(progress, Modifier.align(Alignment.BottomStart).fillMaxWidth())
    }
}

/** Tu nota de Letterboxd en estrellas verdes y el ♥ si te gustó */
@Composable
fun LbBadge(lb: LbEntry?, modifier: Modifier = Modifier) {
    val f = lb?.film ?: return
    if (f.rating == null && !f.liked) return
    Row(
        modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xCC000000)).padding(horizontal = 5.dp, vertical = 1.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (f.rating != null) Text(Letterboxd.stars(f.rating), color = CL.lbGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        if (f.liked) Text((if (f.rating != null) " " else "") + "♥", color = CL.lbOrange, fontSize = 11.sp)
    }
}

/** Película de la watchlist que no está en la biblioteca: abre su ficha en Letterboxd */
@Composable
fun MissingCard(e: LbEntry, width: Dp?, onClick: () -> Unit) {
    val w = if (width != null) Modifier.width(width) else Modifier.fillMaxWidth()
    val title = e.localTitle ?: e.film.title
    Box(w.aspectRatio(2f / 3f).clip(cardShape).clickable(onClick = onClick)) {
        Artwork(e.poster, title, e.film.year?.toString(), Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Color(0x59000000)))
        Text(
            "No la tienes", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.TopStart).padding(6.dp).clip(RoundedCornerShape(4.dp))
                .background(Color(0xCC000000)).padding(horizontal = 5.dp, vertical = 2.dp)
        )
        LbBadge(e, Modifier.align(Alignment.BottomStart).padding(6.dp))
    }
}

/** Tarjeta horizontal de "Continuar viendo" */
@Composable
fun WideCard(image: String?, title: String, subtitle: String, progress: Float, onClick: () -> Unit) {
    Column(Modifier.width(260.dp).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(cardShape)) {
            Artwork(image, title, null, Modifier.fillMaxSize())
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xAA000000)))))
            Box(
                Modifier.align(Alignment.Center).size(44.dp).clip(CircleShape).background(Color(0x99000000)),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(28.dp)) }
            ProgressBar(progress, Modifier.align(Alignment.BottomStart).fillMaxWidth())
        }
        Text(title, Modifier.padding(top = 6.dp), style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = CL.text2, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** Fila con título y carrusel horizontal */
fun LazyListScope.section(title: String, onMore: (() -> Unit)? = null, content: LazyListScope.() -> Unit) {
    item(key = "h-$title") {
        Row(
            Modifier.fillMaxWidth()
                .then(if (onMore != null) Modifier.clickable(onClick = onMore) else Modifier)
                .padding(start = 16.dp, end = 8.dp, top = 22.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            if (onMore != null) Icon(Icons.Default.ChevronRight, "Ver todo", tint = CL.text2)
        }
    }
    item(key = "r-$title") {
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), content = content)
    }
}

@Composable
fun BrandLogo(modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(28.dp).clip(RoundedCornerShape(8.dp)).background(CL.grad), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(8.dp))
        Text("Cine", fontSize = 20.sp, fontWeight = FontWeight.Medium)
        Text("Local", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
    }
}
