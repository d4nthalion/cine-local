package com.cinelocal.android.core

import java.security.MessageDigest
import java.text.Collator
import java.util.Calendar
import java.util.Locale

/**
 * Reconocimiento de nombres de archivo y carpeta. Es una traducción directa de
 * src/main/scanner.js de CineLocal para escritorio: las dos apps deben entender igual la biblioteca.
 */
object NameParser {

    val VIDEO_EXT = setOf(
        "mkv", "mp4", "avi", "m4v", "mov", "wmv", "ts", "m2ts", "mts",
        "webm", "mpg", "mpeg", "flv", "vob", "ogv", "divx", "3gp"
    )
    val SUB_EXT = setOf("srt", "ass", "ssa", "sub", "vtt")

    private val IC = setOf(RegexOption.IGNORE_CASE)

    val SKIP_DIRS = Regex(
        // @eaDir, #recycle, #snapshot: carpetas internas de los NAS Synology
        "^(sample|samples|extras?|featurettes?|behind the scenes|deleted scenes|trailers?|\\\$recycle\\.bin|system volume information|\\..*|@.*|#recycle|#snapshot)$",
        IC
    )
    val SKIP_FILES = Regex("(^|[\\s._-])sample([\\s._-]|$)", IC)
    // carpetas de categoría (sólo en la raíz de la biblioteca)
    val MOVIES_DIR = Regex("^(pel[iíÍ]culas|pelis|movies|films|cine)$", IC)   // IC sólo pliega ASCII: la Í va aparte
    val SERIES_DIR = Regex("^(series|tv|tv shows|shows)$", IC)

    private val JUNK = listOf(
        "2160p", "1080p", "1080i", "720p", "576p", "480p", "4k", "uhd", "hdr", "hdr10", "dv", "dolby vision",
        "bluray", "blu-ray", "bdrip", "brrip", "bdremux", "remux", "web-dl", "webdl", "webrip", "web", "hdtv",
        "dvdrip", "dvdscr", "dvd", "hdrip", "microhd", "screener", "hdcam", "cam", "ts-screener",
        "x264", "x265", "h264", "h.264", "h265", "h.265", "hevc", "avc", "xvid", "divx", "10bit", "8bit",
        "aac", "ac3", "eac3", "dts", "dts-hd", "truehd", "atmos", "ddp", "dd5", "flac", "mp3", "5.1", "7.1", "2.0",
        "castellano", "español", "espanol", "spanish", "latino", "english", "ingles", "inglés", "vose", "vos", "subs",
        "multi", "dual", "dual audio", "multisub", "subbed", "dubbed",
        "proper", "repack", "extended", "unrated", "directors cut", "director's cut", "remastered", "imax",
        "internal", "limited", "complete", "completa", "temporada", "season", "amzn", "nf", "hmax", "dsnp", "atvp"
    )
    private val JUNK_RE = Regex("(^|\\s)(" + JUNK.joinToString("|") { Regex.escape(it) } + ")(\\s|$)", IC)

    data class ParsedName(val title: String, val year: Int?)
    data class ParsedEpisode(val season: Int, val episode: Int, val episodeEnd: Int? = null)

    fun extension(name: String): String {
        val dot = name.lastIndexOf('.')
        return if (dot <= 0 || dot == name.length - 1) "" else name.substring(dot + 1).lowercase(Locale.ROOT)
    }

    fun baseName(name: String): String {
        val ext = extension(name)
        return if (ext.isEmpty()) name else name.substring(0, name.length - ext.length - 1)
    }

    fun isVideo(name: String) = extension(name) in VIDEO_EXT
    fun isSubtitle(name: String) = extension(name) in SUB_EXT

    /** Convierte "The.Matrix.1999.1080p.BluRay.x264" en ("The Matrix", 1999) */
    fun parseName(raw: String, maxYear: Int = Calendar.getInstance().get(Calendar.YEAR) + 1): ParsedName {
        var s = if (isVideo(raw)) baseName(raw) else raw
        s = s.replace(Regex("\\[[^\\]]*\\]"), " ")
            .replace(Regex("\\{[^}]*\\}"), " ")
            .replace(Regex("[._]+"), " ")
            .replace(Regex("(\\p{L})(\\d{3,4}p)\\b", RegexOption.IGNORE_CASE), "$1 $2")   // "Drácula720p"
            .replace(Regex("\\s+"), " ")
            .trim()

        var year: Int? = null
        // año entre paréntesis tiene prioridad: "Dune (2021)"; delante del título, "(1958) Drácula"
        val paren = Regex("\\((19\\d{2}|20\\d{2})\\)").find(s)
        if (paren != null && paren.groupValues[1].toInt() <= maxYear) {
            year = paren.groupValues[1].toInt()
            s = if (paren.range.first == 0) s.substring(paren.range.last + 1) else s.substring(0, paren.range.first)
        } else {
            // último año que no esté al principio del título ("2001 Una odisea... 1968")
            var last: MatchResult? = null
            for (r in Regex("(?:^|\\s)(19\\d{2}|20\\d{2})(?=\\s|$|-)").findAll(s)) {
                if (r.range.first == 0 || r.groupValues[1].toInt() > maxYear) continue
                // sólo es un año si detrás no queda más título ("2001 A Space Odyssey" no es del 2001)
                val rest = s.substring(r.range.last + 1).trim()
                val restClean = rest.replace(Regex("^[-–\\s]+"), "")
                if (restClean.isEmpty() ||
                    JUNK_RE.containsMatchIn(" " + restClean.split(" ")[0] + " ") ||
                    Regex("^[\\[(]").containsMatchIn(restClean)
                ) last = r
            }
            if (last != null) {
                year = last.groupValues[1].toInt()
                s = s.substring(0, last.range.first)
            }
        }
        s = s.replace(Regex("\\([^)]*\\)"), " ")
        // cortar en la primera etiqueta basura
        val j = JUNK_RE.find(s)
        if (j != null && j.range.first > 0) s = s.substring(0, j.range.first)
        // quitar marcadores de temporada/episodio en nombres de carpeta
        s = s.replace(Regex("\\s(S\\d{1,2}(?:E\\d{1,3})?(?:\\s*-\\s*S?\\d{1,2})?|\\d{1,2}x\\d{2,3})(\\s.*)?$", IC), "")
        s = s.replace(Regex("\\s[-–]\\s*$"), "").replace(Regex("\\s+"), " ").trim()
        if (s.isEmpty()) s = raw
        return ParsedName(s, year)
    }

    fun seasonFromDir(name: String): Int? {
        val m = Regex("(?:season|temporada|temp|series|serie|staffel|saison|^s)\\s*\\.?\\s*(\\d{1,2})\\b", IC).find(name)
            ?: Regex("^(\\d{1,2})$").find(name)
        if (m != null) return m.groupValues[1].toInt()
        if (Regex("^(specials?|especiales?)$", IC).matches(name)) return 0
        return null
    }

    /** Intenta extraer temporada y episodio de un nombre de archivo */
    fun parseEpisode(fileName: String, dirSeason: Int?): ParsedEpisode? {
        val base = baseName(fileName).replace(Regex("[._]"), " ")
        Regex("S(\\d{1,2})\\s*[-.]?\\s*E(\\d{1,3})(?:\\s*-?\\s*E(\\d{1,3}))?", IC).find(base)?.let { m ->
            return ParsedEpisode(m.groupValues[1].toInt(), m.groupValues[2].toInt(), m.groupValues[3].toIntOrNull())
        }
        Regex("(?:^|\\D)(\\d{1,2})x(\\d{2,3})(?:\\D|$)", IC).find(base)?.let { m ->
            return ParsedEpisode(m.groupValues[1].toInt(), m.groupValues[2].toInt())
        }
        // "Cap.102" / "Capitulo 102" (formato habitual en releases españolas)
        Regex("cap(?:itulo|ítulo)?\\s*\\.?\\s*(\\d{1,2})(\\d{2})(?!\\d)", IC).find(base)?.let { m ->
            return ParsedEpisode(m.groupValues[1].toInt(), m.groupValues[2].toInt())
        }
        Regex("(?:episod(?:e|io)|ep|cap(?:itulo|ítulo)?|e)\\s*\\.?\\s*(\\d{1,3})(?!\\d)", IC).find(base)?.let { m ->
            return ParsedEpisode(dirSeason ?: 1, m.groupValues[1].toInt())
        }
        Regex("^(\\d{1,3})(?:\\s|-|$)").find(base)?.let { m ->
            return ParsedEpisode(dirSeason ?: 1, m.groupValues[1].toInt())
        }
        return null
    }

    fun hashId(str: String): String {
        val d = MessageDigest.getInstance("SHA-1").digest(str.lowercase(Locale.ROOT).toByteArray())
        return d.joinToString("") { "%02x".format(it) }.take(12)
    }

    private val collator: Collator = Collator.getInstance(Locale.forLanguageTag("es")).apply { strength = Collator.PRIMARY }
    private val CHUNK = Regex("\\d+|\\D+")

    /** Orden natural sin distinguir mayúsculas ni acentos: "Episodio 2" antes que "Episodio 10" */
    val naturalOrder = Comparator<String> { a, b ->
        val ca = CHUNK.findAll(a).map { it.value }.toList()
        val cb = CHUNK.findAll(b).map { it.value }.toList()
        for (i in 0 until minOf(ca.size, cb.size)) {
            val x = ca[i]
            val y = cb[i]
            val c = if (x[0].isDigit() && y[0].isDigit()) {
                x.toBigInteger().compareTo(y.toBigInteger())
            } else collator.compare(x, y)
            if (c != 0) return@Comparator c
        }
        ca.size - cb.size
    }
}
