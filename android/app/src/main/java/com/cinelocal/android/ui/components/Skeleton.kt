package com.cinelocal.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/** Portada mientras se lee la biblioteca por primera vez: destacado y dos filas */
@Composable
fun HomeSkeleton(modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().aspectRatio(0.72f).skeleton())
        repeat(2) { row ->
            Box(
                Modifier.padding(start = 16.dp, top = if (row == 0) 16.dp else 28.dp, bottom = 12.dp)
                    .width(140.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).skeleton()
            )
            Row(Modifier.padding(start = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(4) { Box(Modifier.width(112.dp).aspectRatio(2f / 3f).clip(cardShape).skeleton()) }
            }
        }
    }
}

/** Cuadrícula de 9 pósteres vacíos */
@Composable
fun GridSkeleton() {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(104.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        userScrollEnabled = false
    ) {
        items(9) { Box(Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(cardShape).skeleton()) }
    }
}
