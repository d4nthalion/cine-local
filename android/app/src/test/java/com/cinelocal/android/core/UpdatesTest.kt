package com.cinelocal.android.core

import com.cinelocal.android.core.Updates.NoteLine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdatesTest {

    private fun asset(name: String, size: Long = 64_357_515, state: String = "uploaded") = """
        {"name":"$name","state":"$state","size":$size,
         "browser_download_url":"https://github.com/d4nthalion/cine-local/releases/download/x/$name"}"""

    private fun release(tag: String, vararg assets: String, draft: Boolean = false, pre: Boolean = false, body: String = "Notas") = """
        {"tag_name":"$tag","draft":$draft,"prerelease":$pre,"body":"$body",
         "html_url":"https://github.com/d4nthalion/cine-local/releases/tag/$tag","assets":[${assets.joinToString(",")}]}"""

    /** Como la respuesta real: la de escritorio es la "latest" y va primero */
    private val sample = "[" + listOf(
        release("v1.5.0", asset("CineLocal.Setup.1.5.0.exe"), asset("CineLocal-1.5.0-portable.exe")),
        release("android-v0.4.0", asset("CineLocal-android-0.4.0.apk"), body = "## Novedades\\n- **Diseño nuevo**"),
        release("android-v0.2.1", asset("CineLocal-android-0.2.1.apk")),
        release("android-v0.10.0-beta", asset("CineLocal-android-0.10.0.apk")),
        release("android-v0.9.0", asset("CineLocal-android-0.9.0.apk"), draft = true),
        release("android-v0.8.0", asset("CineLocal-android-0.8.0.apk"), pre = true),
        release("android-v0.7.0", asset("notas.txt")),
        release("android-v0.6.0", asset("CineLocal-android-0.6.0.apk", state = "new"))
    ).joinToString(",") + "]"

    @Test fun versiones() {
        assertEquals(AppVersion(0, 4, 0), AppVersion.parse("0.4.0"))
        assertEquals(AppVersion(1, 2, 0), AppVersion.parse("v1.2"))
        assertEquals(AppVersion(0, 5, 0), AppVersion.parse("0.5.0-debug"))
        assertNull(AppVersion.parse("beta"))
        assertNull(AppVersion.parse(null))
        // numéricas, no alfabéticas
        assertTrue(AppVersion.parse("0.10.0")!! > AppVersion.parse("0.9.9")!!)
        assertTrue(AppVersion.parse("1.0.0")!! > AppVersion.parse("0.99.99")!!)
        assertTrue(AppVersion.parse("0.4.1")!! > AppVersion.parse("0.4.0")!!)
        assertEquals(0, AppVersion.parse("0.4")!!.compareTo(AppVersion.parse("0.4.0")!!))
    }

    @Test fun soloReleasesDeAndroidConApk() {
        val list = Updates.parseReleases(sample)
        // fuera: escritorio, etiqueta con sufijo, borrador, prerelease, sin .apk y .apk a medio subir
        assertEquals(listOf("android-v0.4.0", "android-v0.2.1"), list.map { it.tag })
        val r = list.first()
        assertEquals("0.4.0", r.version)
        assertEquals("CineLocal-android-0.4.0.apk", r.apkName)
        assertEquals(64_357_515L, r.apkSize)
        assertEquals("https://github.com/d4nthalion/cine-local/releases/download/x/CineLocal-android-0.4.0.apk", r.apkUrl)
        assertEquals("## Novedades\n- **Diseño nuevo**", r.notes)
    }

    @Test fun eligeLaMasAltaAunqueNoVayaPrimero() {
        val body = "[" + release("android-v0.9.0", asset("a.apk")) + "," + release("android-v0.10.0", asset("b.apk")) + "," +
            release("android-v0.2.0", asset("c.apk")) + "]"
        assertEquals("0.10.0", Updates.newer(body, "0.9.0")?.version)
    }

    @Test fun comparaConLaInstalada() {
        assertEquals("0.4.0", Updates.newer(sample, "0.3.9")?.version)
        assertNull(Updates.newer(sample, "0.4.0"))
        assertNull(Updates.newer(sample, "0.5.0"))
        assertNull(Updates.newer("[]", "0.1.0"))
        assertNull(Updates.newer("""{"message":"API rate limit exceeded"}""", "0.1.0"))
    }

    @Test fun prefiereElApkDeCineLocal() {
        val body = "[" + release("android-v1.0.0", asset("otro.apk", 10), asset("CineLocal-android-1.0.0.apk", 20)) + "]"
        assertEquals("CineLocal-android-1.0.0.apk", Updates.parseReleases(body).single().apkName)
    }

    @Test fun notasSinMarkdown() {
        val md = "## Novedades\r\n" +
            "- **Diseño nuevo.** La app deja de parecer *genérica*:\n" +
            "  - **Tipografía:** títulos con `Archivo` y [más](https://example.com).\n" +
            "\n\n\n" +
            "### Correcciones ###\n" +
            "1. Arreglado el ![icono](x.png)fallo de _Cloudflare_.\n" +
            "> Ojo: snake_case_name se queda igual\n" +
            "---\n" +
            "<!-- nota interna\nen dos líneas -->\n" +
            "Texto con <b>HTML</b> y \\*asteriscos\\*.\n\n"
        val lines = Updates.parseNotes(md)
        assertEquals(
            listOf(
                NoteLine(NoteLine.Kind.HEADING, "Novedades"),
                NoteLine(NoteLine.Kind.BULLET, "Diseño nuevo. La app deja de parecer genérica:", 0),
                NoteLine(NoteLine.Kind.BULLET, "Tipografía: títulos con Archivo y más.", 1),
                NoteLine(NoteLine.Kind.BLANK),
                NoteLine(NoteLine.Kind.HEADING, "Correcciones"),
                NoteLine(NoteLine.Kind.BULLET, "Arreglado el fallo de Cloudflare.", 0, "1."),
                NoteLine(NoteLine.Kind.TEXT, "Ojo: snake_case_name se queda igual"),
                NoteLine(NoteLine.Kind.BLANK),
                NoteLine(NoteLine.Kind.TEXT, "Texto con HTML y *asteriscos*.")
            ),
            lines
        )
        assertEquals(
            "Novedades\n• Diseño nuevo. La app deja de parecer genérica:\n  • Tipografía: títulos con Archivo y más.\n\nCorrecciones\n" +
                "1. Arreglado el fallo de Cloudflare.\nOjo: snake_case_name se queda igual\n\nTexto con HTML y *asteriscos*.",
            Updates.plainNotes(md)
        )
    }

    @Test fun notasConCodigo() {
        val md = "Antes\n```bash\ngradlew **assembleRelease**\n```\nDespués"
        assertEquals("Antes\ngradlew **assembleRelease**\nDespués", Updates.plainNotes(md))
        assertEquals("", Updates.plainNotes(""))
    }
}
