# CineLocal para Android

Versión para móvil de [CineLocal](../README.md): tus películas y series de la carpeta compartida del PC, con estilo de plataforma de streaming. Kotlin + Jetpack Compose.

## Cómo funciona

* Lee la biblioteca **directamente de la carpeta compartida del PC** (SMB, como `\\MI-PC\Peliculas`); no hay que copiar nada al móvil.
* Entiende los nombres igual que la app de escritorio: **archivo suelto = película, carpeta = serie**, `S01E02`, `1x02`, `Cap.102`, `Temporada N`… (`core/NameParser.kt` es una traducción de `scanner.js`).
* Carátulas, sinopsis, reparto y episodios desde **TMDB** (misma búsqueda que en escritorio, con *Corregir coincidencia*).
* Reproduce con **LibVLC**: MKV, AC3, DTS, subtítulos `.srt`/`.ass` internos o junto al vídeo, audio y subtítulos según el idioma elegido (con el modo *“Sólo si el audio está en otro idioma”*), reanuda donde lo dejaste y pasa al siguiente episodio.
* Portada con *Continuar viendo*, *Añadido recientemente*, Mi lista, mejor valoradas y filas por género; Películas y Series con orden, filtro vistas/sin ver y géneros; búsqueda por título, reparto, director o género.
* El progreso, Mi lista y las vistas son de cada móvil.
* **Letterboxd**, igual que en escritorio (ver abajo).

## Letterboxd

En *Ajustes → Letterboxd* escribe tu usuario y el móvil lee tu perfil público: películas vistas, notas, «me gusta», fechas del diario y watchlist. No depende del PC.

* **Portada:** fila *Tu watchlist de Letterboxd*, con las que ya tienes primero. Las que no tienes abren su ficha en Letterboxd. Al tocar el título se abre la watchlist completa, con filtros.
* **Tarjetas y fichas:** tu nota en estrellas verdes y el ♥. La ficha añade la fecha en que la viste y enlaza a Letterboxd.
* **Orden:** *Mi nota (Letterboxd)* en Películas.
* **Vistas:** opcionalmente, marca como vistas las películas de la biblioteca que ya viste, sin tocar las que tienen progreso.
* **Sincronización:** la primera vez es completa; un perfil de 3.000 películas tarda unos minutos y la app debe seguir abierta. Al abrir la app se añade lo último del RSS, y cada 3 días se repite la sincronización completa.
* **Cómo lee el perfil:** Letterboxd no tiene API, así que `data/LetterboxdFetcher.kt` lee las páginas desde una WebView oculta que supera la comprobación de Cloudflare, como mucho una cada 1,5 s y con reintentos.
* **Emparejado:** con TMDB igual que en escritorio (`data/LetterboxdService.kt`). Los lectores de páginas, RSS y ZIP están en `core/Letterboxd.kt`, con pruebas.
* **Alternativa:** importar el ZIP de *Letterboxd → Settings → Data → Export your data*.

## Primer uso

1. En el PC, comparte la carpeta de la biblioteca (clic derecho → *Propiedades → Compartir*, solo lectura basta). La red debe ser **Privada**.
2. En la app: *Ajustes* → **Carpeta de red** `\\NOMBRE-DEL-PC\Carpeta` (o con la IP, `\\192.168.1.20\Carpeta`), usuario y contraseña de Windows del PC → **Probar conexión**.
   * Cuenta de Microsoft: usuario = correo, contraseña = la de Microsoft (no el PIN).
   * Sin usuario se entra como invitado (solo si el PC tiene desactivado el *uso compartido con protección por contraseña*).
3. Pon tu **API key de TMDB** (gratis en themoviedb.org → Ajustes → API) y guarda.

## Desarrollo

Requisitos: JDK 17 o superior y Android SDK 36 (vale el de Android Studio). Todo se ejecuta desde esta carpeta `android/`.

```bash
gradlew assembleDebug        # app/build/outputs/apk/debug/CineLocal-android-<versión>-debug.apk
gradlew assembleRelease      # app/build/outputs/apk/release/CineLocal-android-<versión>.apk (firmada)
gradlew testDebugUnitTest    # pruebas del reconocimiento de nombres, del escáner y de Letterboxd
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

Para publicar: sube `versionCode` y `versionName` en `app/build.gradle.kts`, compila con `assembleRelease` y crea la release en GitHub con la etiqueta `android-v<versión>` y `--latest=false`, para que la de Windows siga siendo la destacada.

| Carpeta | Contenido |
|---|---|
| `core/` | Modelos, reconocimiento de nombres, escáner e idiomas. Sin dependencias de Android (preparado para reutilizar en Android TV). |
| `data/` | Acceso SMB (smbj), TMDB (OkHttp), Letterboxd (WebView), almacenamiento JSON y `Repository` (equivale a `main.js`). |
| `ui/` | Pantallas en Compose: Inicio, Películas/Series/Mi lista, Buscar, Ficha y Ajustes. |
| `player/` | Reproductor con LibVLC y sus controles. |

Bibliotecas: Compose (BOM 2026.06.01), LibVLC 3.6.5 (LGPL), smbj 0.14.0 + BouncyCastle (para NTLM), OkHttp, Coil y kotlinx.serialization. El APK incluye LibVLC para `arm64-v8a` (móviles) y `x86_64` (emulador).

## Pendiente

* **Metadatos compartidos:** que la app de escritorio deje los datos de TMDB y las correcciones en la carpeta compartida para que el móvil no necesite clave de TMDB ni repetir correcciones.
* Android TV (Compose for TV, navegación con mando).
