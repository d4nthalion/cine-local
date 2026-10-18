package com.cinelocal.android.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * Avisos por ntfy (https://ntfy.sh): publica un mensaje en un tema al que estás suscrito en la app de ntfy.
 * Se publica en JSON a la raíz del servidor para que el título pueda llevar tildes (las cabeceras HTTP sólo admiten ASCII).
 */
class Ntfy(server: String, private val topic: String, private val token: String = "", private val http: OkHttpClient = Tmdb.defaultClient) {

    private val base = server.trim().ifEmpty { DEFAULT_SERVER }.trimEnd('/').let { if ("://" in it) it else "https://$it" }

    /** Un botón del aviso que abre una dirección */
    data class Link(val label: String, val url: String)

    fun send(title: String, message: String, tags: List<String> = emptyList(), click: String? = null, links: List<Link> = emptyList()) {
        if (topic.isBlank()) throw IOException("Falta el tema de ntfy")
        val body = buildJsonObject {
            put("topic", topic.trim())
            put("title", title)
            put("message", message)
            if (tags.isNotEmpty()) put("tags", JsonArray(tags.map(::JsonPrimitive)))
            if (click != null) put("click", click)
            if (links.isNotEmpty()) put("actions", buildJsonArray {
                for (l in links) add(JsonObject(mapOf("action" to JsonPrimitive("view"), "label" to JsonPrimitive(l.label), "url" to JsonPrimitive(l.url))))
            })
        }
        val req = Request.Builder().url(base).post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
        if (token.isNotBlank()) req.header("Authorization", "Bearer ${token.trim()}")
        http.newCall(req.build()).execute().use { res ->
            if (res.isSuccessful) return
            throw IOException(
                when (res.code) {
                    401, 403 -> "ntfy rechaza el aviso: revisa el token o los permisos del tema"
                    404 -> "No se encuentra el servidor de ntfy"
                    429 -> "ntfy: demasiados avisos seguidos, prueba en un rato"
                    else -> "ntfy respondió ${res.code}"
                }
            )
        }
    }

    companion object {
        const val DEFAULT_SERVER = "https://ntfy.sh"
    }
}
