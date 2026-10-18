package com.cinelocal.android

import android.app.Application
import com.cinelocal.android.data.Repository

class CineLocalApp : Application() {
    lateinit var repo: Repository
        private set

    override fun onCreate() {
        super.onCreate()
        repo = Repository(this)
    }
}

val android.content.Context.repo: Repository get() = (applicationContext as CineLocalApp).repo
