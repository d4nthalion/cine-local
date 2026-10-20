package com.cinelocal.android.core

/**
 * Qué se reproduce cuando no se puede llegar al PC (lógica pura, sin Android, para poder probarla).
 *
 * [paths] son los vídeos en orden (los episodios de la serie o solo la película), [isLocal] dice si uno está
 * descargado y [reachable] si se puede llegar ahora a la carpeta compartida. [reachable] solo se consulta
 * cuando hace falta (lo descargado se reproduce siempre desde el móvil, haya red o no), porque comprobarlo
 * puede tardar un par de segundos.
 */
object PlayQueue {

    const val EPISODE_NOT_DOWNLOADED = "Este capítulo no está descargado y no hay conexión con el PC."
    const val MOVIE_NOT_DOWNLOADED = "Esta película no está descargada y no hay conexión con el PC."
    const val NOTHING_DOWNLOADED = "No hay ningún capítulo descargado de esta serie y no hay conexión con el PC."

    /** El vídeo con el que se empieza ([index]) o, si no se puede reproducir, el motivo ([message]) */
    data class Pick(val index: Int?, val message: String? = null) {
        /** Se cambió el vídeo pedido por otro descargado */
        fun switched(requested: Int) = index != null && index != requested
    }

    /**
     * Por dónde empezar.
     * - Lo pedido está descargado, o se llega al PC: lo pedido.
     * - Sin conexión y se eligió ese capítulo en concreto ([explicit]): aviso claro, no el error genérico del PC.
     * - Sin conexión desde Reproducir / Continuar: el siguiente capítulo descargado a partir del pedido
     *   y, si no hay ninguno después, el primero descargado de la serie.
     */
    fun start(
        paths: List<String>,
        requested: Int,
        explicit: Boolean,
        isMovie: Boolean,
        isLocal: (String) -> Boolean,
        reachable: () -> Boolean
    ): Pick {
        if (requested !in paths.indices) return Pick(null)
        if (isLocal(paths[requested]) || reachable()) return Pick(requested)
        if (isMovie) return Pick(null, MOVIE_NOT_DOWNLOADED)
        if (explicit) return Pick(null, EPISODE_NOT_DOWNLOADED)
        val after = (requested + 1 until paths.size).firstOrNull { isLocal(paths[it]) }
        val any = after ?: paths.indices.firstOrNull { isLocal(paths[it]) }
        return if (any != null) Pick(any) else Pick(null, NOTHING_DOWNLOADED)
    }

    /**
     * El siguiente para la reproducción automática: el que va después si está descargado o si se llega al PC;
     * sin conexión se salta lo que no está descargado. null si no queda nada que se pueda reproducir.
     */
    fun next(paths: List<String>, current: Int, isLocal: (String) -> Boolean, reachable: () -> Boolean): Int? {
        val n = current + 1
        if (n !in paths.indices) return null
        if (isLocal(paths[n])) return n
        // la comprobación de red solo una vez
        val online by lazy(LazyThreadSafetyMode.NONE) { reachable() }
        if (online) return n
        return (n + 1 until paths.size).firstOrNull { isLocal(paths[it]) }
    }
}
