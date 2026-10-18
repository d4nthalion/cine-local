package com.cinelocal.android.core

import kotlinx.serialization.Serializable

// Rutas: siempre relativas a la carpeta de la biblioteca y con "/" (p. ej. "Breaking Bad/Temporada 1/x.mkv").

@Serializable
data class SubFile(val path: String, val lang: String? = null, val forced: Boolean = false)

@Serializable
data class Episode(
    val id: String,
    val path: String,
    val fileName: String,
    val size: Long = 0,
    val added: Long = 0,
    val season: Int,
    val episode: Int,
    val episodeEnd: Int? = null,
    val guessed: Boolean = false,
    val subs: List<SubFile> = emptyList()
) {
    val label get() = "T$season:E$episode" + (episodeEnd?.let { "-$it" } ?: "")
}

@Serializable
data class LibraryItem(
    val id: String,
    val type: String,                 // "movie" | "series"
    val path: String,
    val title: String,
    val year: Int? = null,
    val fileName: String? = null,
    val size: Long = 0,
    val added: Long = 0,
    val seasons: List<Int> = emptyList(),
    val episodes: List<Episode> = emptyList(),
    val subs: List<SubFile> = emptyList()
) {
    val isMovie get() = type == "movie"
}

@Serializable
data class LibraryData(val items: List<LibraryItem> = emptyList(), val scannedAt: Long = 0, val error: String? = null)

@Serializable
data class CastMember(val name: String, val character: String? = null, val photo: String? = null)

@Serializable
data class EpisodeMeta(
    val name: String? = null,
    val overview: String? = null,
    val still: String? = null,
    val runtime: Int? = null,
    val airDate: String? = null
)

@Serializable
data class SeasonMeta(
    val name: String? = null,
    val overview: String? = null,
    val poster: String? = null,
    val episodes: Map<Int, EpisodeMeta> = emptyMap()
)

@Serializable
data class Meta(
    val tmdbId: Int,
    val title: String,
    val originalTitle: String? = null,
    val tagline: String? = null,
    val overview: String? = null,
    val year: Int? = null,
    val endYear: Int? = null,
    val runtime: Int? = null,
    val rating: Double? = null,
    val genres: List<String> = emptyList(),
    val poster: String? = null,
    val backdrop: String? = null,
    val logo: String? = null,
    val certification: String? = null,
    val director: String? = null,
    val creators: String? = null,
    val cast: List<CastMember> = emptyList(),
    val trailer: String? = null,
    val seasons: Map<Int, SeasonMeta> = emptyMap()
)

/** Metadatos guardados de un título. tmdbId == null: se buscó y no se encontró. */
@Serializable
data class MetaEntry(
    val tmdbId: Int? = null,
    val meta: Meta? = null,
    val lang: String,
    val at: Long,
    val manual: Boolean = false,
    val seasons: List<Int> = emptyList()
)

/** Progreso por archivo, en segundos (mismo formato que progress.json del escritorio) */
@Serializable
data class Progress(val pos: Double = 0.0, val dur: Double = 0.0, val watched: Boolean = false, val at: Long = 0)

@Serializable
data class UserState(val favorites: List<String> = emptyList())

@Serializable
data class Settings(
    val libraryPath: String = "",        // \\EQUIPO\Carpeta o smb://equipo/carpeta
    val smbUser: String = "",
    val smbPassword: String = "",
    val tmdbKey: String = "",
    val metaLang: String = "es-ES",
    val region: String = "ES",
    val audioLang: String = "spa",
    val subLang: String = "spa",
    val subMode: String = "foreign",     // always | foreign | off
    val autoplayNext: Boolean = true
) {
    val configured get() = libraryPath.isNotBlank()
}

/** Un título con sus metadatos, listo para pintar */
data class Title(val item: LibraryItem, val meta: Meta?) {
    val id get() = item.id
    val name get() = meta?.title ?: item.title
    val year get() = meta?.year ?: item.year
    val isMovie get() = item.isMovie
}
