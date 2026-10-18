# CineLocal

Cliente de escritorio para Windows con estilo de plataforma de streaming (HBO Max / Netflix / Filmin) que reproduce tus películas y series desde una ruta configurable.

## Cómo organiza la biblioteca

```
D:\Películas y Series\
├── Dune Parte Dos (2024).mkv              → película
├── The.Matrix.1999.1080p.BluRay.mkv       → película
├── Breaking Bad\                          → serie
│   ├── Temporada 1\Breaking.Bad.S01E01.mkv
│   └── Temporada 2\Breaking Bad 2x01.mkv
└── Dark (2017)\Dark.S01E01.mkv            → serie
```

* **Archivo suelto = película. Carpeta = serie.**
* Episodios reconocidos: `S01E02`, `1x02`, `Cap.102`, `Episodio 2`, `02 - Título`… y subcarpetas `Temporada N` / `Season N` / `S01`.
* Se limpian del título las etiquetas típicas (1080p, BluRay, x265, Castellano…) y se detecta el año.
* Se ignoran `sample`, `extras`, `featurettes`, etc.
* Formatos de nombre que funcionan bien:
  * `Título (Año).mkv` → el más fiable, p. ej. `The Godfather Part II (1974).mkv`
  * `Director - Título.mkv` → se comprueba el director en TMDB (tolera erratas)
* Si algo se identifica mal: ficha → `···` → **Corregir coincidencia** (se recuerda aunque reescanees).
* Subtítulos externos: junto al vídeo con el mismo nombre (`Película.es.srt`) o en una carpeta `Subtítulos` dentro de la biblioteca; se emparejan por código IMDb (`tt1234567`) o por título y se detecta el idioma (`es`, `spa`, `castellano`, `en`…).

## Primer uso

1. **mpv** (el motor de reproducción) viene incluido en el instalador y en la versión portable; no hay que instalar nada. Si prefieres otro, selecciona su `mpv.exe` en *Ajustes*. Ejecutando desde el código (`npm start`) se usa el de `mpv\` (lo descarga `npm run fetch-mpv`) o uno instalado en el sistema (`winget install --id=shinchiro.mpv -e`).
2. **API key de TMDB** (gratis): https://www.themoviedb.org/settings/api → pégala en *Ajustes → Metadatos*. Sirve la clave v3 o el token de lectura v4.
3. Elige **idioma de audio** y **subtítulos** por defecto en *Ajustes*. Al reproducir se seleccionan automáticamente esas pistas si existen (incluidos `.srt`/`.ass` junto al vídeo). Con el modo *“Sólo si el audio está en otro idioma”* no verás subtítulos en español cuando el audio ya sea español.

## Funciones

* Portada con carrusel destacado, *Continuar viendo*, *Añadido recientemente*, filas por género y mejor valoradas.
* Fichas con fondo, logo, sinopsis, reparto, tráiler, temporadas y episodios con miniaturas.
* Reanuda donde lo dejaste, marca vistos y reproduce el siguiente episodio automáticamente.
* Mi lista, búsqueda (título, actor, director, género) y orden en Películas y Series, con filtro de vistas / sin ver y, tras el icono de filtros, por género.
* Detección automática: lo que copies o descargues en la carpeta aparece solo (cuando termina de copiarse), con aviso en la app y notificación de Windows.
* Pantalla completa de la app: botón en la barra superior, **F11**, u opción *Iniciar en pantalla completa*.

### Atajos

| Tecla | Acción |
|---|---|
| F11 | Pantalla completa |
| `/` o Ctrl+F | Buscar |
| Esc / Retroceso / botón “atrás” del ratón | Volver |
| En el reproductor: `#` / `j` | Cambiar pista de audio / subtítulos |
| En el reproductor: `f` | Pantalla completa · `q` salir (guarda el progreso) |
| En el reproductor: clic derecho | Menú: subtítulos, audio, capítulos, episodios, velocidad |
| En el reproductor: `Tab` | Mostrar u ocultar los controles |
| En el reproductor: clic / doble clic / rueda | Pausa / pantalla completa / ±5 s |

### Reproductor integrado

En Windows el vídeo se reproduce **dentro de la ventana de CineLocal** (que pasa a pantalla completa si así está en Ajustes) y al terminar o pulsar `q` vuelves a la ficha. mpv dibuja en la ventana de la app con `--wid`; como Chromium pinta su contenido por encima, `src/main/winembed.js` sube la ventana de mpv al frente con `SetWindowPos` mediante un pequeño proceso de PowerShell que se arranca una vez. mpv crea esa ventana deshabilitada (no recibiría el ratón), así que el ayudante también la habilita. Los botones de minimizar, maximizar y cerrar de uosc actúan sobre la ventana de CineLocal (cerrar vuelve a la ficha), la pantalla completa se sincroniza en ambos sentidos (F11 en la app, `f`/`Esc`/botón de uosc en mpv), arrastrar el vídeo está desactivado y las teclas pulsadas con el foco en la app se reenvían a mpv. Un clic en el vídeo pausa. Si no se puede integrar, se abre en ventana aparte; también se puede elegir así en *Ajustes → Reproducción → Dónde se reproduce*. Prueba: `npx electron test/embed-test.js <carpetaTemporal> <carpetaCapturas> "C:\ruta\mpv.exe"`.

### Interfaz del reproductor

Por defecto el reproductor usa la interfaz propia de CineLocal (`player-ui/scripts/cinelocal-osc.lua`), al estilo de Netflix / Prime Video: al mover el ratón aparecen los sombreados, el título con el botón de volver, el botón grande de reproducir/pausa con ±10 s, la barra de tiempo con miniaturas ([thumbfast](https://github.com/po5/thumbfast), MPL‑2.0) y la fila de controles (volumen desplegable, siguiente episodio, episodios, subtítulos, audio, pantalla completa y, fuera de pantalla completa, minimizar/maximizar/cerrar); se oculta sola a los ~2,5 s salvo en pausa. Un clic en el vídeo pausa, doble clic pone pantalla completa y la rueda avanza o retrocede 5 s (sobre el altavoz, cambia el volumen). Los menús de audio, subtítulos y episodios (y el del clic derecho) son de [uosc](https://github.com/tomasklaen/uosc) (LGPL‑2.1), al que se le desactivan sus propios controles. Todo está en `player-ui/`, que se copia a `%APPDATA%\CineLocal\mpv-config` y se pasa a mpv con `--config-dir` (al cambiar `player-ui/VERSION` se vuelve a copiar). Con esa interfaz mpv no lee tu configuración propia de `%APPDATA%\mpv`; si la prefieres, elige *Ajustes → Reproducción → Interfaz del reproductor → Clásica de mpv*. Capturas de prueba: `node test/player-ui-test.js "C:\ruta\mpv.exe" <carpeta>`.

## Descargas con eMule

CineLocal puede buscar y descargar con eMule y seguir el progreso desde la sección **Descargas**. Se comunica con eMule a través de su servidor web, con una plantilla propia que devuelve datos en lugar de páginas HTML. Está probado con eMule 0.50a.

1. *Ajustes → Descargas (eMule)* → activa **Buscar y descargar con eMule**.
2. En eMule: *Opciones → Servidor Web* → marca **Activado**, escribe una contraseña y deja el puerto 4711.
3. En **Plantilla** pon la ruta que muestra CineLocal (`%APPDATA%\CineLocal\emule\CineLocal.tmpl`), pulsa **Recargar** y después **Aplicar**.
4. Escribe la misma contraseña en CineLocal y pulsa **Probar**.

* Busca en servidores o Kad, descarga, pausa, reanuda y cancela, o pega un enlace `ed2k://`.
* En la ficha de un título: `···` → **Buscar en eMule**.
* Con **Mover a la biblioteca al terminar**, los vídeos que acaba eMule se mueven a la biblioteca: las películas a la raíz y los episodios (`S01E02`, `1x02`, `Cap.102`) a la carpeta de su serie (se reutiliza la carpeta si la serie ya existe). Solo se mueven las descargas que CineLocal ha visto en curso.
* Con la plantilla de CineLocal, la interfaz web original de eMule deja de verse en el navegador. Para recuperarla, elige `eMule.tmpl` en *Opciones → Servidor Web*.
* No abras el puerto del servidor web en el router: CineLocal solo se conecta a `127.0.0.1`.
* Prueba contra un eMule real: `npx electron test/emule-test.js <carpetaTemporal> <carpetaCapturas> <contraseña>`.

## Letterboxd

En *Ajustes → Letterboxd* escribe tu usuario y CineLocal importa tu perfil público: las películas vistas, tus notas, los “me gusta”, las fechas del diario y la watchlist.

* **Portada:** fila *Tu watchlist de Letterboxd*, con las que ya tienes primero. Las que no tienes llevan *Dónde verla* y *Buscar en eMule*. *Ver todo* abre la watchlist completa.
* **Tarjetas y fichas:** muestran tu nota en estrellas y el ♥. La ficha añade además la fecha en que la viste y enlaza a la película en Letterboxd.
* **Orden y filtros:** *Mi nota (Letterboxd)* en Películas y en la filmografía de los directores. La filmografía tiene también el filtro *Vistas en Letterboxd*.
* **Vistas:** opcionalmente, marca como vistas en CineLocal las películas de tu biblioteca que ya has visto, sin tocar las que tienen progreso.

Letterboxd no tiene API pública, así que las páginas del perfil (`/usuario/films/`, `/usuario/watchlist/`, `/usuario/rss/`) se leen desde una ventana oculta de Chromium, que supera la comprobación de Cloudflare.

* **Ritmo:** se pide como mucho una página cada 1,5 s y, si Cloudflare corta, se espera y se reintenta.
* **Sincronización:** la primera es completa; un perfil de 3.000 películas lleva un par de minutos. Al abrir la app se añade lo último del RSS, y cada 3 días se repite la sincronización completa.
* **Emparejado con TMDB:** cada película se identifica primero con tu biblioteca y después con una búsqueda en TMDB por título y año. Como último recurso se usa el `data-tmdb-id` de su ficha en Letterboxd. El resultado se guarda en `%APPDATA%\CineLocal\letterboxd.json`.
* **Alternativa:** importar el ZIP de *Letterboxd → Settings → Data → Export your data* (`watched.csv`, `ratings.csv`, `watchlist.csv`, `diary.csv`, `likes/films.csv`).

Pruebas:
* Perfil: `npx electron test/letterboxd-test.js <copiaDeDatos> <carpetaCapturas> profile <usuario>`.
* ZIP: `npx electron test/letterboxd-test.js <copiaDeDatos> <carpetaCapturas> export <zip>`.

## Desarrollo

```bash
npm install
npm start          # ejecutar
npm run dist       # en Windows: genera instalador NSIS + versión portable en dist/
npm run fetch-mpv -- --update   # actualiza el mpv que se incluye
```

`npm run dist` descarga mpv en `mpv\` la primera vez (compilación x86_64 de [shinchiro](https://github.com/shinchiro/mpv-winbuild-cmake), GPL) y luego reutiliza esa copia; la carpeta no se sube a git.

Los datos (ajustes, caché de metadatos, progreso) se guardan en `%APPDATA%\CineLocal`.
