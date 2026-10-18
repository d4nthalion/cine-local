package com.cinelocal.android.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import java.io.File

/** Persistencia sencilla en JSON dentro de la carpeta privada de la app (como store() en main.js) */
class JsonStore<T>(
    private val file: File,
    private val serializer: KSerializer<T>,
    default: T,
    private val scope: CoroutineScope
) {
    private val state = MutableStateFlow(load() ?: default)
    val flow: StateFlow<T> = state.asStateFlow()
    val value: T get() = state.value
    private var pending: Job? = null

    private fun load(): T? = try {
        if (file.exists()) json.decodeFromString(serializer, file.readText()) else null
    } catch (_: Exception) { null }

    fun update(fn: (T) -> T) {
        state.update(fn)
        save()
    }

    fun set(v: T) = update { v }

    private fun save() {
        pending?.cancel()
        pending = scope.launch(Dispatchers.IO) {
            delay(300)
            flush()
        }
    }

    @Synchronized
    fun flush() {
        try {
            file.parentFile?.mkdirs()
            val tmp = File(file.path + ".tmp")
            tmp.writeText(json.encodeToString(serializer, state.value))
            if (!tmp.renameTo(file)) { file.delete(); tmp.renameTo(file) }
        } catch (_: Exception) { }
    }

    companion object {
        val json = Json { ignoreUnknownKeys = true; encodeDefaults = false; explicitNulls = false }
    }
}
