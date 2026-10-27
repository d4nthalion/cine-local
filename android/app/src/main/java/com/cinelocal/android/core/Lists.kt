package com.cinelocal.android.core

import kotlin.random.Random

/** Listas propias, además de Mi lista: la misma lógica que src/main/lists.js (escritorio y CineLocal Server) */
object Lists {
    private const val MAX_LISTS = 50
    private const val MAX_ITEMS = 5000
    private const val MAX_NAME = 60

    class ListException(message: String) : Exception(message)

    fun cleanName(n: String) = n.replace(Regex("\\s+"), " ").trim().take(MAX_NAME)

    /** Entrada de un título de la biblioteca: por su ficha de TMDB si la tiene */
    fun entryOf(t: Title): ListEntry {
        val type = if (t.isMovie) "movie" else "series"
        val tmdb = t.meta?.tmdbId
        return if (tmdb != null) ListEntry("$type:$tmdb", tmdb = tmdb, type = type, title = t.name, year = t.year, poster = t.meta.poster)
        else ListEntry("id:${t.id}", id = t.id, type = type, title = t.name, year = t.year)
    }

    /** Película que no está en la biblioteca (de la watchlist o buscada en TMDB) */
    fun entryOf(e: LbEntry): ListEntry? = e.tmdbId?.let {
        ListEntry("movie:$it", tmdb = it, type = "movie", title = e.localTitle ?: e.film.title, year = e.film.year, poster = e.poster)
    }

    /** El título de la biblioteca de una entrada, si lo tienes */
    fun owned(e: ListEntry, titles: List<Title>): Title? =
        if (e.tmdb != null) titles.firstOrNull { it.meta?.tmdbId == e.tmdb && (if (it.isMovie) "movie" else "series") == e.type }
        else titles.firstOrNull { it.id == e.id }

    /** Para pintarla con MissingCard / RequestSheet como cualquier película que no tienes */
    fun asLbEntry(e: ListEntry) = LbEntry("tmdb:${e.tmdb}", LbFilm(e.title, e.year), e.tmdb, e.poster, e.title)

    fun contains(lists: List<UserList>, key: String) = lists.any { l -> l.items.any { it.key == key } }

    fun create(lists: List<UserList>, name: String, entry: ListEntry? = null, now: Long = System.currentTimeMillis()): List<UserList> {
        val n = cleanName(name)
        if (n.isEmpty()) throw ListException("Escribe un nombre para la lista")
        if (lists.size >= MAX_LISTS) throw ListException("Como mucho $MAX_LISTS listas")
        if (taken(lists, n, null)) throw ListException("Ya tienes una lista llamada «$n»")
        val id = "l" + (1..10).joinToString("") { "0123456789abcdef"[Random.nextInt(16)].toString() }
        return lists + UserList(id, n, listOfNotNull(entry), now)
    }

    fun rename(lists: List<UserList>, id: String, name: String): List<UserList> {
        val l = find(lists, id)
        val n = cleanName(name)
        if (n.isEmpty()) throw ListException("Escribe un nombre para la lista")
        if (taken(lists, n, l)) throw ListException("Ya tienes una lista llamada «$n»")
        return lists.map { if (it.id == id) it.copy(name = n) else it }
    }

    fun delete(lists: List<UserList>, id: String): List<UserList> {
        find(lists, id)
        return lists.filter { it.id != id }
    }

    /** Añade o quita; lo último añadido va primero (como Mi lista) */
    fun toggle(lists: List<UserList>, id: String, entry: ListEntry): List<UserList> {
        find(lists, id)
        return lists.map { l ->
            if (l.id != id) l
            else if (l.items.any { it.key == entry.key }) l.copy(items = l.items.filter { it.key != entry.key })
            else if (l.items.size >= MAX_ITEMS) l
            else l.copy(items = listOf(entry) + l.items)
        }
    }

    private fun find(lists: List<UserList>, id: String) = lists.firstOrNull { it.id == id } ?: throw ListException("Esa lista ya no existe")

    private fun taken(lists: List<UserList>, n: String, except: UserList?) =
        n.equals("mi lista", true) || lists.any { it !== except && it.name.equals(n, true) }
}
