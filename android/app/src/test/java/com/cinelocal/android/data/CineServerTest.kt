package com.cinelocal.android.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.IOException

class CineServerTest {

    /** Cliente que no sale a la red: guarda la petición y contesta [code] con [body] */
    private fun fake(code: Int = 200, body: String = """{"items":[],"pending":0}""", sent: MutableList<Request>) =
        OkHttpClient.Builder().addInterceptor { chain ->
            sent += chain.request()
            Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(code).message("x")
                .body(body.toResponseBody("application/json".toMediaType())).build()
        }.build()

    private fun bodyOf(r: Request): JsonObject = Json.parseToJsonElement(Buffer().also { r.body!!.writeTo(it) }.readUtf8()).jsonObject

    @Test fun createRequestGoesToServerRequests() {
        val sent = mutableListOf<Request>()
        CineServer("https://cine.example.com", "tok", fake(sent = sent))
            .createRequest(438631, "Dune: \"Parte\" Dos", 2024, "https://image.tmdb.org/t/p/w342/x.jpg", "En mi watchlist de Letterboxd")
        val r = sent.single()
        assertEquals("https://cine.example.com/api/requests", r.url.toString())
        assertEquals("POST", r.method)
        assertEquals("Bearer tok", r.header("Authorization"))
        assertEquals("1", r.header("X-CineLocal"))
        val b = bodyOf(r)
        assertEquals("create", b["op"]!!.jsonPrimitive.content)
        val e = b["entry"]!!.jsonObject
        assertEquals(438631, e["tmdb"]!!.jsonPrimitive.int)
        assertEquals("movie", e["type"]!!.jsonPrimitive.content)
        assertEquals("Dune: \"Parte\" Dos", e["title"]!!.jsonPrimitive.content)
        assertEquals(2024, e["year"]!!.jsonPrimitive.int)
        assertEquals("https://image.tmdb.org/t/p/w342/x.jpg", e["poster"]!!.jsonPrimitive.content)
        assertEquals("En mi watchlist de Letterboxd", e["note"]!!.jsonPrimitive.content)
    }

    @Test fun createRequestWithoutOptionalFields() {
        val sent = mutableListOf<Request>()
        CineServer("https://cine.example.com", "tok", fake(sent = sent)).createRequest(1, "X", null, null, null)
        val e = bodyOf(sent.single())["entry"]!!.jsonObject
        assertFalse("year" in e || "poster" in e || "note" in e)
    }

    @Test fun serverErrorIsShown() {
        val sent = mutableListOf<Request>()
        try {
            CineServer("https://cine.example.com", "tok", fake(400, """{"ok":false,"error":"Tienes ya 50 peticiones pendientes"}""", sent))
                .createRequest(1, "X", null, null, null)
            fail("debería fallar")
        } catch (e: IOException) {
            assertTrue(e.message!!.contains("50 peticiones"))
        }
    }
}
