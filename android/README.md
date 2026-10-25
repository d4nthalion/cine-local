# CineLocal para Android

Versión para móvil de [CineLocal](../README.md): tus películas y series de la carpeta compartida del PC, con estilo de plataforma de streaming. Kotlin + Jetpack Compose.

## Cómo funciona

* Lee la biblioteca **directamente de la carpeta compartida del PC** (SMB, como `\\MI-PC\Peliculas`); no hay que copiar nada al móvil.
* Entiende los nombres igual que la app de escritorio: **archivo suelto = película, carpeta = serie** (y carpetas `Películas` / `Series` en la raíz), `S01E02`, `1x02`, `Cap.102`, `Temporada N`… (`core/NameParser.kt` es una traducción de `scanner.js`).
* Carátulas, sinopsis, reparto y episodios desde **TMDB** (misma búsqueda que en escritorio, con *Corregir coincidencia*).
* Reproduce con **LibVLC**: MKV, AC3, DTS, subtítulos `.srt`/`.ass` internos o junto al vídeo, audio y subtítulos según el idioma elegido (con el modo *“Sólo si el audio está en otro idioma”*), reanuda donde lo dejaste y pasa al siguiente episodio.
* **Saltar intro, resumen y créditos** con los tiempos de [TheIntroDB](https://theintrodb.org) (ver abajo).
* Portada con *Continuar viendo*, *Añadido recientemente*, Mi lista, mejor valoradas y filas por género; Películas y Series con orden, filtro vistas/sin ver y géneros; búsqueda por título, reparto, director o género.
* Si la búsqueda no encuentra nada en la biblioteca, busca la película en **TMDB** (un año al final afina: `dune 2021`) y cada resultado tiene **Pedir descarga** por ntfy, como en la watchlist (`core/OnlineSearch.kt`, con pruebas).
* **Descargas para ver sin conexión** con el PC: películas, temporadas, series o episodios sueltos (ver abajo).
* El progreso, Mi lista y las vistas son de cada móvil.
* **Letterboxd**, igual que en escritorio (ver abajo).
* **Se actualiza sola** desde las releases de GitHub (ver abajo).

## Ver sin conexión (descargas)

Para ver algo cuando el PC está apagado o fuera de casa, descárgalo antes al móvil desde su ficha:

* **Película:** botón **Descargar · 1,2 GB** bajo *Reproducir*. Mientras baja muestra *Descargando 42 %* y, al terminar, *Descargada*; tocándolo se puede pausar, cancelar o **Eliminar descarga**.
* **Serie:** *Descargar serie* bajo *Reproducir*, *Descargar temporada* bajo las temporadas y un icono en cada episodio (descargar, anillo de progreso, descargado).
* **Espacio:** antes de empezar se compara el tamaño (conocido del escaneo) con el espacio libre. Si no cabe, se avisa con *«Necesitas X GB, hay Y GB libres»* y no se descarga; si cabe pero quedaría menos de 1 GB libre, se pide confirmación. El tamaño se muestra siempre.
* **Cómo descarga:** un servicio en primer plano (`data/DownloadService.kt`) copia por SMB los archivos de uno en uno, con notificación de progreso (*Pausar*, *Cancelar*), aunque se cierre la app. Cada vídeo se copia a `<archivo>.part` y se renombra al terminar; si se corta (PC apagado, app cerrada a la fuerza…), al volver a abrir CineLocal sigue desde donde iba. Los subtítulos externos (`.srt`, `.ass`…) se descargan junto al vídeo. Los cortes de red se reintentan solos (3 veces); si no, queda con el error en español y *Reintentar*.
* **Solo con Wi-Fi** (por defecto, en *Ajustes → Descargas*): con datos móviles la descarga espera a que haya Wi-Fi.
* **Notificaciones:** en Android 13 o superior, la primera vez se pide permiso para mostrar el progreso. Si se deniega, las descargas funcionan igual.
* **Dónde se guardan:** en la carpeta de la app (`Android/data/com.cinelocal.android/files/Movies`), con la misma estructura de carpetas que la biblioteca. No hace falta ningún permiso de almacenamiento y se borran al desinstalar. El estado de cada archivo (en cola, descargando, en pausa, error, descargado) está en `downloads.json`.
* **Reproducción:** si el vídeo está descargado, el reproductor usa el archivo local y sus subtítulos locales, sin tocar la red; si no, lo lee por SMB como siempre. El progreso y *Continuar viendo* funcionan igual.
* **Sin conexión con el PC:** si el escaneo no puede leer la carpeta compartida, aparece el aviso *«Sin conexión con el PC · solo puedes ver lo descargado»* con el filtro **Descargadas** (Inicio, Películas, Series y Mi lista). Las tarjetas de lo descargado llevan la insignia *Descargada*; en Películas y Series también hay una pestaña *Descargadas*.
* **Pantalla Descargas:** desde el icono de la cabecera (aparece cuando hay alguna) o *Ajustes → Descargas → Ver descargas*. Muestra lo que está en curso (pausar, reanudar, cancelar), lo descargado agrupado por título con su tamaño (eliminar) y el espacio usado y libre.
* **Carátulas:** al pedir una descarga se guardan en la caché de imágenes el póster, el fondo, el logotipo y las imágenes de los episodios, para que se vean sin conexión.
* La lógica pura (índice y estados, comprobación de espacio, rutas locales, resúmenes) está en `core/Downloads.kt`, con pruebas.

## Saltar intro, resumen y créditos

Durante la intro aparece abajo a la derecha **Saltar intro** (y **Saltar resumen** en el *«Anteriormente en…»*), aunque los controles estén ocultos; al tocarlo, el vídeo sigue medio segundo después de donde acaba. En los créditos, si hay un siguiente episodio que se pueda ver (sin conexión, uno descargado), el botón es **Siguiente episodio** y cuenta el actual como visto. En el último episodio o en una película no hay botón si los créditos llegan al final (cerrar el reproductor de golpe sorprende y salir ya está a un toque); si después hay una escena, el botón es **Saltar créditos**. Con mando o teclado el botón toma el foco.

* **Siempre activo y sin ajustes:** no hay nada que configurar ni clave que poner. Nunca se salta nada sin tocar el botón.
* **De dónde salen los tiempos:** `GET https://api.theintrodb.org/v4/media?tmdb_id=…&season=…&episode=…` con el id de TMDB del título (las películas, solo `tmdb_id`). Una petición por capítulo al empezar a verlo, y la del siguiente en segundo plano. Las peticiones son anónimas, con un límite (25 cada 10 s y uno diario): la app va con margen y, ante un *429*, espera lo que diga `Retry-After`.
* **Caché:** en `skip.json`; lo encontrado vale 30 días y lo que TheIntroDB no tiene, 7. Sin red se usa lo guardado aunque haya caducado. Al pedir una descarga se guardan también sus tiempos, para tener el botón sin conexión.
* La lógica pura (lectura y limpieza de la respuesta, tramo activo, botón, caducidad, límite de peticiones) está en `core/SkipSegments.kt`, con pruebas; la red en `data/IntroDb.kt`.

## Letterboxd

En *Ajustes → Letterboxd* escribe tu usuario y el móvil lee tu perfil público: películas vistas, notas, «me gusta», fechas del diario y watchlist. No depende del PC.

* **Portada:** fila *Tu watchlist de Letterboxd*, con las que ya tienes primero. Las que no tienes abren su ficha en Letterboxd. Al tocar el título se abre la watchlist completa, con filtros.
* **Tarjetas y fichas:** tu nota en estrellas verdes y el ♥. La ficha añade la fecha en que la viste y enlaza a Letterboxd.
* **Orden:** *Mi nota (Letterboxd)* en Películas.
* **Vistas:** opcionalmente, marca como vistas las películas de la biblioteca que ya viste, sin tocar las que tienen progreso.
* **Sincronización:** la primera vez es completa; un perfil de 3.000 películas tarda unos minutos y la app debe seguir abierta. Al abrir la app se añade lo último del RSS, y cada 3 días se repite la sincronización completa.
* **Cómo lee el perfil:** Letterboxd no tiene API, así que `data/LetterboxdFetcher.kt` lee las páginas desde una WebView oculta, como mucho una cada 1,5 s y con reintentos.
  * Si Cloudflare pide una comprobación que no pasa sola, la app la muestra en un recuadro para que termine o marques la casilla, y se cierra sola al pasar.
  * La WebView usa su user-agent y sus imágenes normales: si se cambia el user-agent, Cloudflare no da por buena la comprobación y pide la casilla una y otra vez.
* **Emparejado:** con TMDB igual que en escritorio (`data/LetterboxdService.kt`). Los lectores de páginas, RSS y ZIP están en `core/Letterboxd.kt`, con pruebas.
* **Alternativa:** importar el ZIP de *Letterboxd → Settings → Data → Export your data*.

## Actualizaciones

Al abrir, la app mira en GitHub si hay una versión nueva (como mucho una vez cada 6 horas) y, si la hay, muestra sus novedades con **Actualizar**, **Más tarde** y **Omitir esta versión**. En *Ajustes → Actualizaciones* se puede desactivar la búsqueda al abrir, ver la versión instalada y **Comprobar ahora**.

* **Qué release elige:** lee `GET /repos/d4nthalion/cine-local/releases` y se queda con la de versión más alta cuya etiqueta sea exactamente `android-vX.Y.Z`, que no sea borrador ni prerelease y que tenga un `.apk`. Las de escritorio (`vX.Y.Z`, la *latest* de GitHub) no cuentan. La comparación es numérica (`0.10.0` > `0.9.0`) con el `versionName` instalado. Las notas de la release se muestran sin la sintaxis de markdown. Todo esto está en `core/Updates.kt`, con pruebas.
* **Descarga:** el APK va a la caché de la app (`cache/updates`) con barra de progreso; se comprueba que el tamaño coincide con el de GitHub y se borran las descargas anteriores.
* **Permiso:** la primera vez, Android pide permitir que CineLocal instale aplicaciones (*Instalar aplicaciones desconocidas*). La app abre esa pantalla y, al volver con el permiso activado, sigue con la instalación.
* **Instalación:** con la API de sesiones de `PackageInstaller` (`data/Updater.kt`). El APK se copia a la sesión desde la caché privada, sin `FileProvider`, y el resultado vuelve con un código de estado, así que los fallos (por ejemplo, *firmada con otra clave*) se explican en español. Android siempre pide confirmar la actualización; al terminar, la app se cierra y hay que volver a abrirla.

**Para que funcione, cada release de Android debe:**

1. llevar la etiqueta `android-vX.Y.Z` (sin sufijos como `-beta`; esas se ignoran) y una versión mayor que la anterior en `versionName`,
2. tener adjunto el `.apk` (`CineLocal-android-X.Y.Z.apk`),
3. ir firmada con **la misma clave** que las anteriores (ver *Firma y versiones*); si no, Android no la instala encima.

## Primer uso

1. En el PC, comparte la carpeta de la biblioteca (clic derecho → *Propiedades → Compartir*, solo lectura basta). La red debe ser **Privada**.
2. En la app: *Ajustes* → **Carpeta de red** `\\NOMBRE-DEL-PC\Carpeta` (o con la IP, `\\192.168.1.20\Carpeta`), usuario y contraseña de Windows del PC → **Probar conexión**.
   * Cuenta de Microsoft: usuario = correo, contraseña = la de Microsoft (no el PIN).
   * Si el servidor SMB no usa el puerto 445: `\\EQUIPO:4445\Carpeta` o `smb://equipo:4445/Carpeta`.
   * Sin usuario se entra como invitado (solo si el PC tiene desactivado el *uso compartido con protección por contraseña*).
   * **Biblioteca en un NAS:** activa **Modo NAS** y usa la carpeta compartida del NAS (`\\NAS\Multimedia`) con un usuario del NAS (de DSM en un Synology). Fuera de casa, conecta la VPN del NAS y escribe la carpeta con su IP dentro de la VPN (`\\10.8.0.1\Multimedia`).
3. Pon tu **API key de TMDB** (gratis en themoviedb.org → Ajustes → API) y guarda.

## Desarrollo

Requisitos: JDK 17 o superior y Android SDK 36 (vale el de Android Studio). Todo se ejecuta desde esta carpeta `android/`.

```bash
gradlew assembleDebug        # app/build/outputs/apk/debug/CineLocal-android-<versión>-debug.apk
gradlew assembleRelease      # app/build/outputs/apk/release/CineLocal-android-<versión>.apk (firmada)
gradlew testDebugUnitTest    # pruebas del reconocimiento de nombres, de Letterboxd, de las actualizaciones, de las descargas, de saltar la intro y de las rutas SMB
gradlew installDebug         # instalar en el móvil conectado por USB (depuración USB activada)
```

### Firma y versiones

Android solo instala una actualización encima si va firmada con **la misma clave**. La de las releases está fuera del repositorio y se indica en `~/.gradle/gradle.properties`:

```properties
CINELOCAL_KEYSTORE=C:/Users/<usuario>/.android/cinelocal-release.jks
CINELOCAL_KEYSTORE_PASSWORD=…
CINELOCAL_KEY_ALIAS=cinelocal
CINELOCAL_KEY_PASSWORD=…
```

Sin esas propiedades, `assembleRelease` firma con la clave de depuración (sirve para probar, no para publicar). **Guarda una copia del `.jks` y de la contraseña**: si se pierden, las nuevas versiones no se podrán instalar encima y habrá que desinstalar la app.

Para publicar: sube `versionCode` y `versionName` en `app/build.gradle.kts`, compila con `assembleRelease` y crea la release en GitHub con la etiqueta `android-v<versión>`, el `.apk` adjunto y `--latest=false`, para que la de Windows siga siendo la destacada. Los móviles con la app instalada la encontrarán solos (ver *Actualizaciones*).

| Carpeta | Contenido |
|---|---|
| `core/` | Modelos, reconocimiento de nombres, escáner, idiomas y elección de actualizaciones. Sin dependencias de Android (preparado para reutilizar en Android TV). |
| `data/` | Acceso SMB (smbj), TMDB (OkHttp), Letterboxd (WebView), actualizaciones (`Updater`), descargas (`DownloadManager` y `DownloadService`), almacenamiento JSON y `Repository` (equivale a `main.js`). |
| `ui/` | Pantallas en Compose: Inicio, Películas/Series/Mi lista, Buscar, Ficha, Descargas y Ajustes. |
| `player/` | Reproductor con LibVLC y sus controles. |

Bibliotecas: Compose (BOM 2026.06.01), LibVLC 3.6.5 (LGPL), smbj 0.14.0 + BouncyCastle (para NTLM), OkHttp, Coil y kotlinx.serialization. El APK incluye LibVLC para `arm64-v8a` (móviles) y `x86_64` (emulador).

## Pendiente

* **Metadatos compartidos:** que la app de escritorio deje los datos de TMDB y las correcciones en la carpeta compartida para que el móvil no necesite clave de TMDB ni repetir correcciones.
* Android TV (Compose for TV, navegación con mando).
