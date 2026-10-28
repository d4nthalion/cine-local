package com.cinelocal.android.data

import com.cinelocal.android.core.Episode
import com.cinelocal.android.core.LibraryItem
import com.cinelocal.android.core.Meta
import com.cinelocal.android.core.Progress
import com.cinelocal.android.core.SubFile
import com.cinelocal.android.core.ListEntry
import com.cinelocal.android.core.UserList
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.URI
import java.util.concurrent.TimeUnit

/**
 * Cliente de CineLocal Server (el servicio web del NAS): la biblioteca, los metadatos, el progreso y Mi lista
 * vienen del servidor por HTTPS, sin VPN. Se entra con el usuario de DSM; se guarda el token de la sesión, no la contraseña.
 * El vídeo y los subtítulos se abren con enlaces firmados (LibVLC no puede enviar la sesión).
 */
class CineServer(url: String, private val token: String = "", private val http: OkHttpClient = client) {

    val base: String = normUrl(url)

    // ---------------------------------------------------------------- formato de la respuesta del servidor

    @Serializable data class Sub(val path: String, val url: String, val lang: String? = null)

    @Serializable data class Ep(
        val id: String, val path: String, val fileName: String, val size: Long = 0, val added: Double = 0.0,
        val season: Int, val episode: Int, val episodeEnd: Int? = null, val guessed: Boolean = false,
        val url: String? = null, val subs: List<Sub> = emptyList()
    )

    @Serializable data class Item(
        val id: String, val type: String, val path: String, val title: String, val year: Int? = null,
        val fileName: String? = null, val size: Long = 0, val added: Double = 0.0,
        val seasons: List<Int> = emptyList(), val episodes: List<Ep> = emptyList(),
        val meta: JsonObject? = null, val url: String? = null, val subs: List<Sub> = emptyList()
    )

    @Serializable data class View(
        val items: List<Item> = emptyList(), val error: String? = null,
        val progress: Map<String, Progress> = emptyMap(), val favorites: List<String> = emptyList(),
        val lists: List<UserList> = emptyList()
    )

    /** Biblioteca convertida al formato de la app, con los enlaces (ruta → dirección completa) */
    data class Library(
        val items: List<LibraryItem>, val meta: Map<String, Meta>, val links: Map<String, String>,
        val progress: Map<String, Progress>, val favorites: List<String>, val lists: List<UserList>, val error: String?
    )

    // ---------------------------------------------------------------- peticiones

    /** Inicia sesión con el usuario de DSM. Devuelve el token, o lanza IOException con el motivo (otp = falta el código) */
    fun login(user: String, password: String, otp: String?): String {
        val body = buildMap {
            put("user", user.trim()); put("password", password); put("client", "app")
            if (!otp.isNullOrBlank()) put("otp", otp.trim())
        }
        val res = call(post("/api/login", json.encodeToString(body), auth = false))
        val o = res.second
        if (o?.get("ok")?.jsonPrimitive?.booleanOrNull == true) return o["token"]!!.jsonPrimitive.content
        val msg = o?.get("error")?.jsonPrimitive?.contentOrNull ?: "El servidor no ha respondido como CineLocal Server (HTTP ${res.first})"
        throw LoginException(msg, o?.get("otp")?.jsonPrimitive?.booleanOrNull == true)
    }

    class LoginException(message: String, val otp: Boolean) : IOException(message)

    fun library(): Library {
        val text = request(Request.Builder().url("$base/api/library?client=app").get().auth().build())
        val v = json.decodeFromString<View>(text)
        val links = HashMap<String, String>()
        fun subs(list: List<Sub>) = list.map { s -> links[s.path] = abs(s.url); SubFile(s.path, s.lang) }
        val items = v.items.map { it ->
            it.url?.let { u -> links[it.path] = abs(u) }
            LibraryItem(
                id = it.id, type = it.type, path = it.path, title = it.title, year = it.year, fileName = it.fileName,
                size = it.size, added = it.added.toLong(), seasons = it.seasons, subs = subs(it.subs),
                episodes = it.episodes.map { e ->
                    e.url?.let { u -> links[e.path] = abs(u) }
                    Episode(e.id, e.path, e.fileName, e.size, e.added.toLong(), e.season, e.episode, e.episodeEnd, e.guessed, subs(e.subs))
                }
            )
        }
        // cada ficha por separado: una que no encaje (un campo nulo raro) no deja sin biblioteca
        val meta = v.items.mapNotNull { i -> i.meta?.let { m -> runCatching { json.decodeFromJsonElement(Meta.serializer(), m) }.getOrNull()?.let { i.id to it } } }.toMap()
        return Library(items, meta, links, v.progress, v.favorites, v.lists, v.error)
    }

    fun reportProgress(id: String, pos: Double, dur: Double) {
        request(post("/api/progress", """{"id":${json.encodeToString(id)},"pos":$pos,"dur":$dur}"""))
    }

    fun mark(paths: List<String>, watched: Boolean) {
        request(post("/api/progress/mark", """{"paths":${json.encodeToString(paths)},"watched":$watched}"""))
    }

    fun toggleFavorite(id: String) {
        request(post("/api/favorites/toggle", """{"id":${json.encodeToString(id)}}"""))
    }

    /** Listas propias: create · rename · delete · toggle (src/main/lists.js en el servidor). Devuelve todas */
    fun listOp(op: String, id: String? = null, name: String? = null, entry: ListEntry? = null): List<UserList> {
        val body = buildString {
            append("{\"op\":").append(json.encodeToString(op))
            id?.let { append(",\"id\":").append(json.encodeToString(it)) }
            name?.let { append(",\"name\":").append(json.encodeToString(it)) }
            entry?.let { append(",\"entry\":").append(json.encodeToString(ListEntry.serializer(), it)) }
            append('}')
        }
        return json.decodeFromString(ListSerializer(UserList.serializer()), request(post("/api/lists", body)))
    }

    fun identify(itemId: String, tmdbId: Int) {
        request(post("/api/meta/identify", """{"itemId":${json.encodeToString(itemId)},"tmdbId":$tmdbId}"""))
    }

    fun logout() = runCatching { request(post("/api/logout", "{}")) }

    /** Copia el archivo enlazado al final de [dest] desde [offset] (reanuda un .part). Como SmbLibrary.download */
    fun download(url: String, dest: File, offset: Long, onChunk: (Long) -> Boolean): Long? {
        // «dl=1»: el registro de accesos del servidor lo apunta como descarga y no como reproducción
        val link = if ("/file?" in url) "$url&dl=1" else url
        val req = Request.Builder().url(link).apply { if (offset > 0) header("Range", "bytes=$offset-") }.build()
        http.newBuilder().readTimeout(60, TimeUnit.SECONDS).build().newCall(req).execute().use { res ->
            if (res.code == 416) return offset   // ya estaba entero
            if (!res.isSuccessful) throw IOException(httpError(res.code))
            val body = res.body ?: throw IOException("Respuesta vacía del servidor")
            // si el servidor no respeta el Range (200), se empieza de cero
            val start = if (res.code == 206) offset else 0L
            // los subtítulos (WebVTT generado al vuelo) llegan sin tamaño: entonces vale lo que se haya recibido
            val length = body.contentLength()
            FileOutputStream(dest, start > 0).use { out ->
                val input = body.byteStream()
                val buf = ByteArray(256 * 1024)
                var total = start
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    total += n
                    if (!onChunk(total)) return null
                }
                out.fd.sync()
                return if (length >= 0) start + length else total
            }
        }
    }

    /** host y puerto, para comprobar si se llega al servidor sin hacer una petición entera */
    fun hostPort(): Pair<String, Int>? = runCatching {
        val u = URI(base)
        u.host to (if (u.port > 0) u.port else if (u.scheme == "http") 80 else 443)
    }.getOrNull()

    // ---------------------------------------------------------------- utilidades

    private fun abs(path: String) = if (path.startsWith("http")) path else base + path

    private fun Request.Builder.auth() = apply { if (token.isNotEmpty()) header("Authorization", "Bearer $token") }

    private fun post(path: String, body: String, auth: Boolean = true) = Request.Builder().url(base + path)
        .post(body.toRequestBody(JSON))
        .header("X-CineLocal", "1")
        .apply { if (auth) auth() }
        .build()

    private fun call(req: Request): Pair<Int, JsonObject?> = try {
        http.newCall(req).execute().use { res -> res.code to runCatching { json.parseToJsonElement(res.body!!.string()) as JsonObject }.getOrNull() }
    } catch (e: IOException) {
        throw IOException("No se puede conectar con CineLocal Server (${e.message})", e)
    }

    private fun request(req: Request): String {
        try {
            http.newCall(req).execute().use { res: Response ->
                val text = res.body?.string().orEmpty()
                if (!res.isSuccessful) {
                    val msg = runCatching { (json.parseToJsonElement(text) as JsonObject)["error"]?.jsonPrimitive?.contentOrNull }.getOrNull()
                    throw IOException(msg ?: httpError(res.code))
                }
                return text
            }
        } catch (e: IOException) {
            if (e.message?.startsWith("No se puede") == true || e.message?.contains("sesión") == true) throw e
            throw IOException(e.message?.takeIf { it.isNotBlank() && !it.contains("Failed to connect", true) && !it.contains("Unable to resolve", true) }
                ?: "No se puede conectar con CineLocal Server", e)
        }
    }

    private fun httpError(code: Int) = when (code) {
        401 -> "La sesión de CineLocal Server ha caducado: vuelve a conectar en Ajustes"
        403 -> "CineLocal Server no permite esta acción"
        404 -> "No se encuentra el archivo en el servidor"
        else -> "CineLocal Server: error $code"
    }

    companion object {
        private val JSON = "application/json".toMediaType()
        private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true; explicitNulls = false }

        val client: OkHttpClient by lazy {
            OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(60, TimeUnit.SECONDS).build()
        }

        /** «cine.dominio.com:5443» → «https://cine.dominio.com:5443», sin barra final */
        fun normUrl(u: String): String {
            val s = u.trim().trimEnd('/')
            if (s.isEmpty()) return ""
            return if (Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(s)) s else "https://$s"
        }
    }
}
