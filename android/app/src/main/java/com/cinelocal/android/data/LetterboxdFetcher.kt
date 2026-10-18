package com.cinelocal.android.data

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.cinelocal.android.core.Letterboxd
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.resume

class LbHttpException(val code: Int, message: String) : IOException(message)

/**
 * Pide páginas de Letterboxd desde una WebView oculta, que supera la comprobación de Cloudflare
 * igual que un navegador (en escritorio se hace con una ventana oculta de Chromium).
 * Las peticiones se hacen con fetch() desde la propia página, con sus cookies.
 */
class LetterboxdFetcher(private val context: Context) {

    private var web: WebView? = null
    private var ready = false
    private var last = 0L
    private val pending = ConcurrentHashMap<Int, CompletableDeferred<Pair<Int, String>>>()
    private val seq = AtomicInteger()

    /** WebView con la comprobación de Cloudflare cuando no pasa sola: la app la muestra para que termine (o la marques tú) */
    val challenge = MutableStateFlow<WebView?>(null)

    /** Aviso al esperar porque Letterboxd pide ir más despacio (segundos) */
    var onWait: ((Int) -> Unit)? = null

    /** Recibe desde la página el resultado de cada fetch() */
    private inner class Bridge {
        @JavascriptInterface
        fun done(id: Int, status: Int, text: String) { pending.remove(id)?.complete(status to text) }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun ensureView(): WebView = web ?: WebView(context.applicationContext).also { w ->
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true)
        w.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = true
            // Ni se cambia el user-agent ni se bloquean las imágenes: con cualquiera de las dos cosas la
            // comprobación de Cloudflare no se da por buena y vuelve a pedir la casilla una y otra vez
        }
        w.webViewClient = object : WebViewClient() {
            // sólo letterboxd.com (y la comprobación de Cloudflare dentro de ella)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) =
                request.url.host?.endsWith("letterboxd.com") != true
        }
        w.addJavascriptInterface(Bridge(), "CineLocalLb")
        w.onResume()
        w.resumeTimers()
        web = w
        ready = false
    }

    private suspend fun js(script: String): String? = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont -> ensureView().evaluateJavascript(script) { cont.resume(it) } }
    }

    /** Abre una página y espera a que pase la comprobación de Cloudflare ("Just a moment…") */
    private suspend fun open(url: String) {
        withContext(Dispatchers.Main) { ensureView().loadUrl(url) }
        val t0 = System.currentTimeMillis()
        try {
            // oculta, la comprobación no siempre termina (la página no se llega a pintar):
            // a los pocos segundos se muestra en la app (challenge) y se espera más
            while (System.currentTimeMillis() - t0 < (if (challenge.value != null) 120_000 else 30_000)) {
                delay(700)
                val title = js("document.title")?.trim('"').orEmpty()
                val host = withContext(Dispatchers.Main) { web?.url?.let { Uri.parse(it).host } }
                if (title.isNotEmpty() && !CHALLENGE.containsMatchIn(title) && host?.endsWith("letterboxd.com") == true) return
                if (challenge.value == null && System.currentTimeMillis() - t0 > 4_000 && CHALLENGE.containsMatchIn(title)) challenge.value = web
            }
        } finally {
            challenge.value = null
        }
        throw IOException("Letterboxd no ha dejado pasar la comprobación de seguridad (Cloudflare). Prueba más tarde o importa la exportación en ZIP.")
    }

    private suspend fun fetchOnce(path: String): Pair<Int, String> {
        val id = seq.incrementAndGet()
        val result = CompletableDeferred<Pair<Int, String>>()
        pending[id] = result
        val url = JSONObject.quote(Letterboxd.BASE + path)
        js("""fetch($url, { credentials: 'include' })
            .then(r => r.text().then(t => CineLocalLb.done($id, r.status, t)))
            .catch(() => CineLocalLb.done($id, 0, '')); 0""")
        return withTimeoutOrNull(60_000) { result.await() } ?: run { pending.remove(id); 0 to "" }
    }

    /** Texto de una página de Letterboxd (ruta como "/usuario/films/") */
    suspend fun get(path: String): String {
        val wait = last + 1500 - System.currentTimeMillis()   // una página cada segundo y medio, como mucho
        if (wait > 0) delay(wait)
        if (!ready) { open(Letterboxd.BASE + "/"); ready = true }
        var r: Pair<Int, String> = 0 to ""
        // Cloudflare corta a veces tras muchas páginas seguidas: esperar, volver a pasar la comprobación y reintentar
        for (pause in listOf(0, 15, 40, 90)) {
            if (pause > 0) {
                onWait?.invoke(pause)
                delay(pause * 1000L)
                runCatching { open(Letterboxd.BASE + path) }
            }
            r = fetchOnce(path)
            if (r.first !in RETRY) break
        }
        last = System.currentTimeMillis()
        if (r.first == 404) throw LbHttpException(404, "No encontrado")
        if (r.first != 200) throw LbHttpException(
            r.first,
            if (r.first != 0) "Letterboxd respondió ${r.first}. Prueba más tarde o importa la exportación en ZIP." else "No se pudo conectar con Letterboxd"
        )
        return r.second
    }

    suspend fun close() = withContext(Dispatchers.Main) {
        challenge.value = null
        web?.apply { (parent as? android.view.ViewGroup)?.removeView(this) }
        web?.apply { stopLoading(); removeJavascriptInterface("CineLocalLb"); destroy() }
        web = null
        ready = false
        pending.values.forEach { it.complete(0 to "") }
        pending.clear()
    }

    companion object {
        private val CHALLENGE = Regex("just a moment|un momento|attention required|checking your browser", RegexOption.IGNORE_CASE)
        private val RETRY = setOf(0, 403, 429, 503)
    }
}
