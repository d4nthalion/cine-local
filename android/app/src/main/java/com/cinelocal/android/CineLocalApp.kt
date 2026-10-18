package com.cinelocal.android

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.cinelocal.android.data.Repository

class CineLocalApp : Application(), ImageLoaderFactory {
    lateinit var repo: Repository
        private set

    override fun onCreate() {
        super.onCreate()
        repo = Repository(this)
    }

    /** Las imágenes entran con un fundido de 220 ms */
    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this).crossfade(220).respectCacheHeaders(false).build()
}

val android.content.Context.repo: Repository get() = (applicationContext as CineLocalApp).repo
