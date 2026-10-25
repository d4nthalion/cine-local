package com.cinelocal.android.core

import org.junit.Assert.assertEquals
import org.junit.Test

class LibraryScannerTest {

    /** Biblioteca en memoria a partir de rutas de archivo ("Carpeta/archivo.mkv") */
    private fun fsOf(vararg files: String) = LibraryFs { dir ->
        val prefix = if (dir.isEmpty()) "" else "$dir/"
        files.filter { it.startsWith(prefix) }
            .map { it.removePrefix(prefix).substringBefore('/') to it.removePrefix(prefix).contains('/') }
            .distinct()
            .map { (name, isDir) -> FsEntry(name, isDir) }
    }

    private fun summary(items: List<LibraryItem>) =
        items.map { "${it.type}:${it.title}" + if (it.type == "series") "(${it.episodes.size})" else "" }

    @Test fun carpetasDeCategoria() {
        val items = LibraryScanner.scan(fsOf(
            "Películas/Dune (2021).mkv",
            "Películas/Blade Runner (1982)/br.mkv",
            "Películas/Trilogía/Matrix (1999).mkv",
            "Películas/Trilogía/Matrix Reloaded (2003).mkv",
            "Series/Breaking Bad (2008)/Temporada 1/Breaking Bad S01E01.mkv",
            "Series/Breaking Bad (2008)/Temporada 1/Breaking Bad S01E02.mkv",
            "Suelta (2000).mkv",
            "Dark (2017)/S01E01.mkv",
            "#recycle/Borrada (1990).mkv",
            "@eaDir/x.mkv"
        ))
        assertEquals(
            listOf("movie:Blade Runner", "series:Breaking Bad(2)", "series:Dark(1)", "movie:Dune", "movie:Matrix", "movie:Matrix Reloaded", "movie:Suelta"),
            summary(items)
        )
        assertEquals("Películas/Blade Runner (1982)/br.mkv", items.first { it.title == "Blade Runner" }.path)
        assertEquals("Series/Breaking Bad (2008)", items.first { it.title == "Breaking Bad" }.path)
    }

    @Test fun categoriaEnMayusculas() =
        assertEquals(listOf("movie:Dune"), summary(LibraryScanner.scan(fsOf("PELÍCULAS/Dune (2021).mkv"))))

    @Test fun soloEnLaRaiz() =
        // dentro de una serie, una subcarpeta «Series» no es una categoría
        assertEquals(listOf("series:Docs(2)"), summary(LibraryScanner.scan(fsOf("Docs/Series/a S01E01.mkv", "Docs/Series/a S01E02.mkv"))))
}
