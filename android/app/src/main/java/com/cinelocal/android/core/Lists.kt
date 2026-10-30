package com.cinelocal.android.core

import kotlin.random.Random

/**
 * Listas: la Watchlist (siempre la primera; no se puede renombrar ni borrar; sustituye a la antigua «Mi lista») y las
 * propias. La misma lógica que src/main/lists.js (escritorio y CineLocal Server)
 */
object Lists {
    const val WATCHLIST = "watchlist"
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

    /** Cómo puede estar un título de la biblioteca en una lista: por su ficha o, si se guardó antes de tenerla, por su id */
    fun keysOf(t: Title) = listOf(entryOf(t).key, "id:${t.id}")

    /** La entrada con la que está [t] en [l], o la nueva si no está (para quitar la que se guardó sin ficha) */
    fun entryIn(l: UserList?, t: Title): ListEntry {
        val keys = keysOf(t)
        return l?.items?.firstOrNull { it.key in keys } ?: entryOf(t)
    }

    fun watchlist(lists: List<UserList>) = lists.firstOrNull { it.id == WATCHLIST }

    /** ¿Está [t] en alguna de [lists]? */
    fun containsTitle(lists: List<UserList>, t: Title): Boolean {
        val keys = keysOf(t)
        return lists.any { l -> l.items.any { it.key in keys } }
    }

    /** Las listas con la Watchlist delante (la crea, si aún no existe, con [entries]: lo que había en «Mi lista») */
    fun withWatchlist(lists: List<UserList>, entries: List<ListEntry>, now: Long = System.currentTimeMillis()): List<UserList> =
        if (lists.any { it.id == WATCHLIST }) lists
        else listOf(UserList(WATCHLIST, "Watchlist", entries.distinctBy { it.key }, now)) + lists

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
        if (l.id == WATCHLIST) throw ListException("La Watchlist no se puede renombrar")
        val n = cleanName(name)
        if (n.isEmpty()) throw ListException("Escribe un nombre para la lista")
        if (taken(lists, n, l)) throw ListException("Ya tienes una lista llamada «$n»")
        return lists.map { if (it.id == id) it.copy(name = n) else it }
    }

    fun delete(lists: List<UserList>, id: String): List<UserList> {
        if (find(lists, id).id == WATCHLIST) throw ListException("La Watchlist no se puede borrar")
        return lists.filter { it.id != id }
    }

    /** Añade o quita; lo último añadido va primero */
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
        n.equals("mi lista", true) || n.equals("watchlist", true) || lists.any { it !== except && it.name.equals(n, true) }
}
