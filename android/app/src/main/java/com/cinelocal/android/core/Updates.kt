package com.cinelocal.android.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.longOrNull

/** Versión X.Y.Z, comparable numéricamente (0.10.0 > 0.9.0) */
data class AppVersion(val major: Int, val minor: Int, val patch: Int) : Comparable<AppVersion> {
    override fun compareTo(other: AppVersion) = compareValuesBy(this, other, { it.major }, { it.minor }, { it.patch })
    override fun toString() = "$major.$minor.$patch"

    companion object {
        private val RE = Regex("""^\s*v?(\d+)\.(\d+)(?:\.(\d+))?""")

        /** "0.4.0", "v1.2", "0.5.0-debug" -> versión; null si no empieza por números */
        fun parse(s: String?): AppVersion? {
            val m = RE.find(s ?: return null) ?: return null
            val (a, b, c) = m.destructured
            return AppVersion(a.toIntOrNull() ?: return null, b.toIntOrNull() ?: return null, c.toIntOrNull() ?: 0)
        }
    }
}

/** Una release de la app de Android en GitHub, con su APK */
@Serializable
data class UpdateRelease(
    val tag: String,              // android-v0.5.0
    val version: String,          // 0.5.0
    val notes: String = "",       // cuerpo de la release (markdown)
    val apkName: String,
    val apkUrl: String,
    val apkSize: Long,
    val pageUrl: String = ""
) {
    val appVersion: AppVersion get() = AppVersion.parse(version)!!
}

/**
 * Elección de la actualización entre las releases de GitHub.
 * El repositorio publica también la app de escritorio (etiquetas vX.Y.Z, la "latest" de GitHub):
 * sólo cuentan las etiquetas android-vX.Y.Z que no son borrador ni prerelease y llevan un .apk.
 */
object Updates {
    const val REPO = "d4nthalion/cine-local"
    const val RELEASES_URL = "https://api.github.com/repos/$REPO/releases?per_page=30"

    private val TAG = Regex("""^android-v(\d+)\.(\d+)\.(\d+)$""")
    private val json = Json { ignoreUnknownKeys = true }

    private fun JsonObject.str(k: String) = (this[k] as? JsonPrimitive)?.contentOrNull
    private fun JsonObject.bool(k: String) = (this[k] as? JsonPrimitive)?.booleanOrNull ?: false
    private fun JsonObject.long(k: String) = (this[k] as? JsonPrimitive)?.longOrNull

    /** Releases de Android válidas en la respuesta de /releases (en cualquier orden) */
    fun parseReleases(body: String): List<UpdateRelease> {
        val arr = json.parseToJsonElement(body) as? JsonArray ?: return emptyList()
        return arr.mapNotNull { el ->
            val r = el as? JsonObject ?: return@mapNotNull null
            val tag = r.str("tag_name")?.trim() ?: return@mapNotNull null
            val m = TAG.matchEntire(tag) ?: return@mapNotNull null
            if (r.bool("draft") || r.bool("prerelease")) return@mapNotNull null
            val apks = (r["assets"] as? JsonArray).orEmpty().mapNotNull { a ->
                val o = a as? JsonObject ?: return@mapNotNull null
                val name = o.str("name") ?: return@mapNotNull null
                val url = o.str("browser_download_url") ?: return@mapNotNull null
                val size = o.long("size") ?: return@mapNotNull null
                val state = o.str("state")
                if (!name.endsWith(".apk", ignoreCase = true) || size <= 0 || (state != null && state != "uploaded")) null
                else Triple(name, url, size)
            }
            // si hubiera varios .apk, el de nombre CineLocal-android-…
            val apk = apks.firstOrNull { it.first.startsWith("CineLocal-android", ignoreCase = true) } ?: apks.firstOrNull() ?: return@mapNotNull null
            val (a, b, c) = m.destructured
            UpdateRelease(
                tag = tag, version = "$a.$b.$c", notes = r.str("body").orEmpty(),
                apkName = apk.first, apkUrl = apk.second, apkSize = apk.third, pageUrl = r.str("html_url").orEmpty()
            )
        }
    }

    /** La release de versión más alta */
    fun latest(releases: List<UpdateRelease>): UpdateRelease? = releases.maxByOrNull { it.appVersion }

    /** La release a ofrecer si es más nueva que la instalada; null si ya está al día */
    fun newer(releases: List<UpdateRelease>, installed: String): UpdateRelease? {
        val best = latest(releases) ?: return null
        val current = AppVersion.parse(installed) ?: return best
        return best.takeIf { it.appVersion > current }
    }

    fun newer(body: String, installed: String): UpdateRelease? = newer(parseReleases(body), installed)

    // ---------------------------------------------------------------- notas de la release (markdown -> texto)

    /** Una línea de las notas, ya sin sintaxis de markdown */
    data class NoteLine(val kind: Kind, val text: String = "", val level: Int = 0, val marker: String = "•") {
        enum class Kind { HEADING, BULLET, TEXT, BLANK }
    }

    private val HEADING = Regex("""^#{1,6}\s+(.*?)\s*#*\s*$""")
    private val BULLET = Regex("""^(\s*)([-*+]|\d+[.)])\s+(.*)$""")
    private val RULE = Regex("""^\s*([-*_])(\s*\1){2,}\s*$""")
    private val FENCE = Regex("""^\s*(```|~~~)""")
    private val QUOTE = Regex("""^\s*>\s?""")

    private val inlineRules: List<Pair<Regex, String>> = listOf(
        Regex("""<!--[\s\S]*?-->""") to "",
        Regex("""<(https?://[^>\s]+)>""") to "$1",
        Regex("""</?[A-Za-z][^>]*>""") to "",
        Regex("""!\[([^\]]*)]\([^)]*\)""") to "",
        Regex("""\[([^\]]+)]\([^)]*\)""") to "$1",
        Regex("""\*\*(.+?)\*\*""") to "$1",
        Regex("""__(.+?)__""") to "$1",
        Regex("""~~(.+?)~~""") to "$1",
        Regex("""(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])""") to "$1",
        Regex("""(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])""") to "$1"
    )
    private val ESCAPE = Regex("""\\([\\`*_{}\[\]()#+\-.!>~|])""")
    private val CODE = Regex("""`([^`]+)`""")
    private val PROTECTED = Regex("""(\d+)""")

    /** Quita la sintaxis de una línea: negritas, cursivas, código, enlaces, imágenes y etiquetas HTML */
    fun inline(s: String): String {
        // lo escapado (\*) y el código (`a_b`) se apartan para que las reglas de énfasis no los toquen
        val kept = ArrayList<String>()
        fun keep(t: String) = "${kept.size}".also { kept += t }
        var t = ESCAPE.replace(s) { keep(it.groupValues[1]) }
        t = CODE.replace(t) { keep(it.groupValues[1]) }
        t = inlineRules.fold(t) { acc, (re, rep) -> re.replace(acc, rep) }
        return PROTECTED.replace(t) { kept[it.groupValues[1].toInt()] }.trim()
    }

    /** Notas de una release como líneas limpias: títulos, viñetas (con nivel) y párrafos */
    fun parseNotes(md: String): List<NoteLine> {
        val out = ArrayList<NoteLine>()
        var inFence = false
        // los comentarios HTML pueden ocupar varias líneas
        val text = Regex("""<!--[\s\S]*?-->""").replace(md.replace("\r\n", "\n").replace('\r', '\n'), "")
        for (raw in text.split('\n')) {
            if (FENCE.containsMatchIn(raw)) { inFence = !inFence; continue }
            val line = if (inFence) raw.trimEnd() else QUOTE.replace(raw, "").trimEnd()
            when {
                inFence -> out += if (line.isBlank()) NoteLine(NoteLine.Kind.BLANK) else NoteLine(NoteLine.Kind.TEXT, line.trim())
                line.isBlank() || RULE.matches(line) -> out += NoteLine(NoteLine.Kind.BLANK)
                HEADING.matches(line) -> out += NoteLine(NoteLine.Kind.HEADING, inline(HEADING.matchEntire(line)!!.groupValues[1]))
                BULLET.matches(line) -> {
                    val (indent, mark, body) = BULLET.matchEntire(line)!!.destructured
                    val level = (indent.replace("\t", "    ").length / 2).coerceAtMost(3)
                    val marker = if (mark[0].isDigit()) mark.trimEnd(')', '.') + "." else "•"
                    out += NoteLine(NoteLine.Kind.BULLET, inline(body), level, marker)
                }
                else -> out += NoteLine(NoteLine.Kind.TEXT, inline(line))
            }
        }
        // sin líneas vacías (o que se quedaron vacías al limpiarlas) repetidas, ni al principio o al final
        val clean = ArrayList<NoteLine>()
        for (l in out) {
            val blank = l.kind == NoteLine.Kind.BLANK || l.text.isBlank()
            if (blank) { if (clean.isNotEmpty() && clean.last().kind != NoteLine.Kind.BLANK) clean += NoteLine(NoteLine.Kind.BLANK) }
            else clean += l
        }
        while (clean.lastOrNull()?.kind == NoteLine.Kind.BLANK) clean.removeAt(clean.lastIndex)
        return clean
    }

    /** Las notas como texto plano */
    fun plainNotes(md: String): String = parseNotes(md).joinToString("\n") { l ->
        when (l.kind) {
            NoteLine.Kind.BLANK -> ""
            NoteLine.Kind.BULLET -> "  ".repeat(l.level) + l.marker + " " + l.text
            else -> l.text
        }
    }
}
