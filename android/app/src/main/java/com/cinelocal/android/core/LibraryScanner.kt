package com.cinelocal.android.core

/** Entrada de un listado de carpeta */
data class FsEntry(val name: String, val isDir: Boolean, val size: Long = 0, val created: Long = 0, val modified: Long = 0)

/** Acceso a la biblioteca: lista una carpeta por su ruta relativa ("" = raíz, separador "/") */
fun interface LibraryFs {
    fun list(relPath: String): List<FsEntry>
}

/**
 * Escáner de la biblioteca: archivo suelto = película, carpeta = serie.
 * Excepción: en la raíz, una carpeta «Películas» / «Movies» contiene películas y una «Series» / «TV» contiene series.
 * Misma lógica que src/main/scanner.js; además recoge los subtítulos externos junto a cada vídeo.
 */
object LibraryScanner {

    private const val MAX_DEPTH = 4

    private data class FoundVideo(val path: String, val entry: FsEntry, val siblings: List<FsEntry>)

    fun scan(fs: LibraryFs): List<LibraryItem> {
        val items = mutableListOf<LibraryItem>()
        scanEntries(fs, "", fs.list(""), items, top = true)
        return items.sortedWith(compareBy(NameParser.naturalOrder) { it.title })
    }

    /** Vídeo suelto = película, carpeta = serie; en la raíz (top) se respetan las carpetas «Películas» y «Series» */
    private fun scanEntries(fs: LibraryFs, dir: String, entries: List<FsEntry>, items: MutableList<LibraryItem>, top: Boolean) {
        for (e in entries) {
            val path = join(dir, e.name)
            if (e.isDir) {
                if (NameParser.SKIP_DIRS.matches(e.name)) continue
                when {
                    top && NameParser.MOVIES_DIR.matches(e.name) -> scanMovies(fs, path, items)
                    top && NameParser.SERIES_DIR.matches(e.name) ->
                        try { scanEntries(fs, path, fs.list(path), items, top = false) } catch (_: Exception) {}
                    else -> scanSeries(fs, e.copy(name = path))?.let { items += it }
                }
            } else if (isPlayable(e.name)) {
                items += movieItem(FoundVideo(path, e, entries))
            }
        }
    }

    /** Carpeta «Películas»: cada vídeo es una película; si está solo en su carpeta, el título sale de la carpeta */
    private fun scanMovies(fs: LibraryFs, dir: String, items: MutableList<LibraryItem>) {
        val entries = try { fs.list(dir) } catch (_: Exception) { return }
        for (e in entries) {
            val path = join(dir, e.name)
            if (e.isDir) {
                if (NameParser.SKIP_DIRS.matches(e.name)) continue
                val files = mutableListOf<FoundVideo>()
                walkVideos(fs, path, 0, files)
                for (f in files) items += movieItem(f, if (files.size == 1) e.name else null)
            } else if (isPlayable(e.name)) {
                items += movieItem(FoundVideo(path, e, entries))
            }
        }
    }

    private fun movieItem(f: FoundVideo, folderName: String? = null): LibraryItem {
        val info = NameParser.parseName(folderName ?: f.entry.name)
        return LibraryItem(
            id = NameParser.hashId("movie:" + f.path), type = "movie", path = f.path, fileName = f.entry.name,
            title = info.title, year = info.year, size = f.entry.size, added = added(f.entry),
            subs = subsFor(f.entry.name, f.path.substringBeforeLast('/', ""), f.siblings)
        )
    }

    private fun isPlayable(name: String) = NameParser.isVideo(name) && !NameParser.SKIP_FILES.containsMatchIn(name)
    private fun added(e: FsEntry) = if (e.created > 0) e.created else e.modified
    private fun join(dir: String, name: String) = if (dir.isEmpty()) name else "$dir/$name"

    private fun walkVideos(fs: LibraryFs, dir: String, depth: Int, out: MutableList<FoundVideo>) {
        if (depth > MAX_DEPTH) return
        val entries = try { fs.list(dir) } catch (_: Exception) { return }
        for (e in entries) {
            if (e.isDir) {
                if (!NameParser.SKIP_DIRS.matches(e.name)) walkVideos(fs, join(dir, e.name), depth + 1, out)
            } else if (isPlayable(e.name)) {
                out += FoundVideo(join(dir, e.name), e, entries)
            }
        }
    }

    private fun scanSeries(fs: LibraryFs, dirEntry: FsEntry): LibraryItem? {
        val dirPath = dirEntry.name
        val files = mutableListOf<FoundVideo>()
        walkVideos(fs, dirPath, 0, files)
        if (files.isEmpty()) return null
        files.sortWith(compareBy(NameParser.naturalOrder) { it.path })
        val info = NameParser.parseName(dirPath.substringAfterLast('/'))

        val episodes = mutableListOf<Episode>()
        val unplaced = mutableListOf<Pair<Episode, Int?>>()
        for (f in files) {
            val parts = f.path.removePrefix("$dirPath/").split('/')
            var dirSeason: Int? = null
            for (i in parts.size - 2 downTo 0) {
                val s = NameParser.seasonFromDir(parts[i])
                if (s != null) { dirSeason = s; break }
            }
            val ep = NameParser.parseEpisode(f.entry.name, dirSeason)
            val parent = f.path.substringBeforeLast('/', "")
            val base = Episode(
                id = NameParser.hashId("ep:" + f.path), path = f.path, fileName = f.entry.name,
                size = f.entry.size, added = added(f.entry), season = 0, episode = 0,
                subs = subsFor(f.entry.name, parent, f.siblings)
            )
            if (ep != null) episodes += base.copy(season = ep.season, episode = ep.episode, episodeEnd = ep.episodeEnd)
            else unplaced += base to dirSeason
        }
        // Archivos sin numeración: se colocan detrás, por orden natural
        for ((e, dirSeason) in unplaced) {
            val season = dirSeason ?: 1
            val max = episodes.filter { it.season == season }.maxOfOrNull { it.episode } ?: 0
            episodes += e.copy(season = season, episode = max + 1, guessed = true)
        }
        episodes.sortWith(
            compareBy<Episode> { it.season }.thenBy { it.episode }.thenComparator { a, b -> NameParser.naturalOrder.compare(a.fileName, b.fileName) }
        )
        return LibraryItem(
            id = NameParser.hashId("series:$dirPath"), type = "series", path = dirPath,
            title = info.title, year = info.year,
            added = maxOf(dirEntry.modified, episodes.maxOf { it.added }),
            seasons = episodes.map { it.season }.distinct().sorted(),
            episodes = episodes
        )
    }

    /** Subtítulos junto al vídeo con el mismo nombre: "Película.srt", "Película.es.srt", "Película.forzados.srt" */
    private fun subsFor(videoName: String, dir: String, siblings: List<FsEntry>): List<SubFile> {
        val base = NameParser.baseName(videoName).lowercase()
        return siblings
            .filter { !it.isDir && NameParser.isSubtitle(it.name) && it.name.lowercase().startsWith(base) }
            .map {
                val extra = NameParser.baseName(it.name).substring(base.length)
                SubFile(join(dir, it.name), Languages.detect(extra), Languages.isForced(extra))
            }
    }
}
