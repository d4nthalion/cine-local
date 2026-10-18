package com.cinelocal.android.core

import java.util.Locale

/** Idiomas de audio y subtítulos, con las variantes de etiqueta que aparecen en los MKV/MP4 (como player.js). */
object Languages {

    data class Lang(val code: String, val label: String, val tags: List<String>)

    val ALL = listOf(
        Lang("spa", "Español", listOf("spa", "es", "esp", "es-ES", "es-419", "es-MX", "cas", "castellano", "spanish", "español")),
        Lang("eng", "Inglés", listOf("eng", "en", "en-US", "en-GB", "english", "inglés")),
        Lang("fre", "Francés", listOf("fre", "fra", "fr", "fr-FR", "french", "français")),
        Lang("ger", "Alemán", listOf("ger", "deu", "de", "de-DE", "german", "deutsch")),
        Lang("ita", "Italiano", listOf("ita", "it", "it-IT", "italian", "italiano")),
        Lang("por", "Portugués", listOf("por", "pt", "pt-PT", "pt-BR", "portuguese", "português")),
        Lang("cat", "Catalán", listOf("cat", "ca", "catalan", "català")),
        Lang("baq", "Euskera", listOf("baq", "eus", "eu", "basque", "euskara")),
        Lang("glg", "Gallego", listOf("glg", "gl", "galician", "galego")),
        Lang("jpn", "Japonés", listOf("jpn", "ja", "japanese")),
        Lang("kor", "Coreano", listOf("kor", "ko", "korean")),
        Lang("chi", "Chino", listOf("chi", "zho", "zh", "chinese")),
        Lang("rus", "Ruso", listOf("rus", "ru", "russian")),
        Lang("dut", "Neerlandés", listOf("dut", "nld", "nl", "dutch")),
        Lang("swe", "Sueco", listOf("swe", "sv", "swedish")),
        Lang("dan", "Danés", listOf("dan", "da", "danish")),
        Lang("nor", "Noruego", listOf("nor", "nob", "no", "norwegian")),
        Lang("pol", "Polaco", listOf("pol", "pl", "polish")),
        Lang("tur", "Turco", listOf("tur", "tr", "turkish")),
        Lang("ara", "Árabe", listOf("ara", "ar", "arabic")),
        Lang("hin", "Hindi", listOf("hin", "hi", "hindi"))
    )

    fun tags(code: String?): List<String> =
        ALL.firstOrNull { it.code == code }?.tags?.map { it.lowercase(Locale.ROOT) } ?: emptyList()

    fun label(code: String?): String = ALL.firstOrNull { it.code == code }?.label ?: (code ?: "")

    /** Lista para la opción :audio-language de VLC */
    fun vlcList(code: String?): String = tags(code).filter { !it.contains(' ') }.joinToString(",")

    private val WORD = Regex("[\\p{L}]+(?:-[\\p{L}0-9]+)?")

    /**
     * ¿El texto (idioma de la pista, su nombre o el nombre de un .srt) corresponde al idioma?
     * Se compara palabra a palabra para que "es" no coincida dentro de "Forzados".
     */
    fun matches(text: String?, code: String?): Boolean {
        if (text.isNullOrBlank()) return false
        val wanted = tags(code).toSet()
        if (wanted.isEmpty()) return false
        return WORD.findAll(text.lowercase(Locale.ROOT)).any { it.value in wanted }
    }

    /** Idioma de un subtítulo externo por su nombre: "Película.es.srt", "Película.castellano.forzados.srt" */
    fun detect(text: String): String? = ALL.firstOrNull { matches(text, it.code) }?.code

    fun isForced(text: String?): Boolean =
        text != null && Regex("forz|forced|forc[ée]s", RegexOption.IGNORE_CASE).containsMatchIn(text)
}
