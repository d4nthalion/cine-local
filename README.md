# CineLocal

Cliente de escritorio para Windows con estilo de plataforma de streaming (HBO Max / Netflix / Filmin) para la biblioteca de películas y series de **CineLocal Server**, el servicio que corre en el NAS ([`server/`](server/README.md)). Se entra con el usuario de DSM; la biblioteca, los metadatos, el progreso, las listas y las peticiones están en el servidor, y la app reproduce con mpv.

## Cómo organiza la biblioteca

La biblioteca la escanea CineLocal Server en la carpeta de vídeo del NAS, con estas reglas:

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
* **Carpetas de categoría:** en la raíz de una carpeta de la biblioteca, una carpeta `Películas` (o `Peliculas`, `Pelis`, `Movies`, `Films`, `Cine`) contiene películas y una `Series` (o `TV`, `TV Shows`, `Shows`) contiene series. Así `\\NAS\Multimedia` con `Peliculas\` y `Series\` dentro funciona como una sola carpeta, también en Android.
  * Dentro de `Películas`, cada vídeo es una película, aunque esté en su propia carpeta (`Blade Runner (1982)\br.mkv` toma el título de la carpeta) o en una carpeta de saga con varias.
  * eMule copia ahí las películas y crea ahí las series nuevas.
  * Se ignoran las carpetas internas de los NAS Synology (`@eaDir`, `#recycle`, `#snapshot`).
* **Varias carpetas:** un administrador puede sumar las que quiera en *Ajustes → Biblioteca del servidor → Añadir nueva ruta* (rutas dentro del contenedor, p. ej. `/media/Documentales`).
  * Todo aparece en una sola biblioteca. Una serie repartida entre carpetas (mismo título y año) se muestra como una sola.
  * Lo que ya había en una carpeta recién añadida no se anuncia como novedad.
  * Si un disco está desconectado, se conservan sus títulos y se avisa de que falta.
* Episodios reconocidos: `S01E02`, `1x02`, `Cap.102`, `Episodio 2`, `02 - Título`… y subcarpetas `Temporada N` / `Season N` / `S01`.
* Se limpian del título las etiquetas típicas (1080p, BluRay, x265, Castellano…) y se detecta el año.
* Se ignoran `sample`, `extras`, `featurettes`, etc.
* Formatos de nombre que funcionan bien:
  * `Título (Año).mkv` → el más fiable, p. ej. `The Godfather Part II (1974).mkv`
  * `Director - Título.mkv` → se comprueba el director en TMDB (tolera erratas)
* Si algo se identifica mal: ficha → `···` → **Corregir coincidencia** (se recuerda aunque reescanees).
* Subtítulos externos: junto al vídeo con el mismo nombre (`Película.es.srt`) o en una carpeta `Subtítulos` dentro de la biblioteca; se emparejan por código IMDb (`tt1234567`) o por título y se detecta el idioma (`es`, `spa`, `castellano`, `en`…).

## Primer uso

1. **Inicio de sesión:** al abrir, CineLocal pide la dirección de CineLocal Server (con su puerto, p. ej. `https://tu-nas.synology.me:5443`; sólo la primera vez) y tu usuario y contraseña de DSM, más el código si tienes la verificación en dos pasos. La contraseña no se guarda: sólo la sesión, cifrada con `safeStorage`, durante 30 días. Si caduca, o te sacan del grupo de CineLocal, la app vuelve a esta pantalla. *Ajustes → Cuenta → Cerrar sesión*.
2. **mpv** (el motor de reproducción) viene incluido en el instalador y en la versión portable; no hay que instalar nada. Si prefieres otro, selecciona su `mpv.exe` en *Ajustes*. Ejecutando desde el código (`npm start`) se usa el de `mpv\` (lo descarga `npm run fetch-mpv`) o uno instalado en el sistema (`winget install --id=shinchiro.mpv -e`).
3. Elige **idioma de audio** y **subtítulos** en *Ajustes*: son tuyos (se guardan en el servidor con tu usuario) y valen también en la web y en Android. Al reproducir se seleccionan automáticamente esas pistas si existen (incluidos `.srt`/`.ass` junto al vídeo). Con el modo *“Sólo si el audio está en otro idioma”* no verás subtítulos en español cuando el audio ya sea español.

### Administradores y usuarios

Quién entra y qué puede hacer lo deciden dos grupos de DSM (ver [`server/README.md`](server/README.md#grupos-de-dsm)):

* **`cinelocal-admin`:** además de todo lo de un usuario, cambia las carpetas de la biblioteca del servidor y TMDB (*Ajustes → Biblioteca del servidor* y *Metadatos*), escanea, corrige fichas, gestiona las peticiones y usa eMule.
* **`cinelocal-user`:** ve y lleva su progreso, sus listas y sus peticiones, y sus ajustes de audio, subtítulos y plataformas.

### Peticiones

En **Peticiones** se piden películas y series que no están en la biblioteca (buscador de TMDB, o *Pedir* en cualquier título que no tengas), con una nota opcional. Si dos usuarios piden lo mismo, queda una sola petición con los dos. Los administradores ven todas, con un contador en el menú y un aviso al momento, y las marcan como conseguidas o rechazadas (con motivo); quien la pidió recibe el aviso. Lo que llega a la biblioteca se marca solo como conseguido. Con eMule activo, cada petición pendiente tiene *Buscar en eMule*.

Cualquier título que no está en la biblioteca (al buscar, en la filmografía de un director, en tus listas o en Peticiones) tiene su propia ficha con sinopsis, reparto, tráiler, *Pedir*, *Dónde verla* y *Guardar en lista*.

## Funciones

* Portada con carrusel destacado, *Continuar viendo*, *Añadido recientemente*, filas por género y mejor valoradas.
* Fichas con fondo, logo, sinopsis, reparto, tráiler, temporadas y episodios con miniaturas.
* Reanuda donde lo dejaste, marca vistos y reproduce el siguiente episodio automáticamente.
* Mi lista, búsqueda (título, actor, director, género) y orden en Películas y Series, con filtro de vistas / sin ver y, tras el icono de filtros, por género.
* Si la búsqueda no encuentra nada en tu biblioteca, busca la película en TMDB: cada resultado lleva *Dónde verla* y, con eMule activado, *Buscar en eMule*. Un año al final («dune 2021») afina la búsqueda.
* Detección automática: lo que se copie o descargue en la carpeta del NAS aparece solo (cuando termina de copiarse), con aviso en la app y notificación de Windows.
* Pantalla completa de la app: botón en la barra superior, **F11**, u opción *Iniciar en pantalla completa*.
* Discord: tu perfil muestra lo que estás viendo («Viendo CineLocal», con póster y tiempo). Ver [Discord](#discord).
* Saltar intro, resumen y créditos con los tiempos de [TheIntroDB](https://theintrodb.org), como en Netflix. Ver [Saltar intro](#saltar-intro).

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
| En el reproductor: `s` | Saltar intro / resumen o ir al siguiente episodio (si el botón está a la vista; si no, captura de pantalla) |
| En el reproductor: clic / doble clic / rueda | Pausa / pantalla completa / ±5 s |

### Reproductor integrado

En Windows el vídeo se reproduce **dentro de la ventana de CineLocal** (que pasa a pantalla completa si así está en Ajustes) y al terminar o pulsar `q` vuelves a la ficha. mpv dibuja en la ventana de la app con `--wid`; como Chromium pinta su contenido por encima, `src/main/winembed.js` sube la ventana de mpv al frente con `SetWindowPos` mediante un pequeño proceso de PowerShell que se arranca una vez. mpv crea esa ventana deshabilitada (no recibiría el ratón), así que el ayudante también la habilita. Los botones de minimizar, maximizar y cerrar de uosc actúan sobre la ventana de CineLocal (cerrar vuelve a la ficha), la pantalla completa se sincroniza en ambos sentidos (F11 en la app, `f`/`Esc`/botón de uosc en mpv), arrastrar el vídeo está desactivado y las teclas pulsadas con el foco en la app se reenvían a mpv. Un clic en el vídeo pausa. Si no se puede integrar, se abre en ventana aparte; también se puede elegir así en *Ajustes → Reproducción → Dónde se reproduce*. Prueba: `npx electron test/embed-test.js <carpetaTemporal> <carpetaCapturas> "C:\ruta\mpv.exe"`.

### Interfaz del reproductor

Por defecto el reproductor usa la interfaz propia de CineLocal (`player-ui/scripts/cinelocal-osc.lua`), al estilo de Netflix / Prime Video: al mover el ratón aparecen los sombreados, el título con el botón de volver, el botón grande de reproducir/pausa con ±10 s, la barra de tiempo con miniaturas ([thumbfast](https://github.com/po5/thumbfast), MPL‑2.0) y la fila de controles (volumen desplegable, siguiente episodio, episodios, subtítulos, audio, pantalla completa y, fuera de pantalla completa, minimizar/maximizar/cerrar); se oculta sola a los ~2,5 s salvo en pausa. Un clic en el vídeo pausa, doble clic pone pantalla completa y la rueda avanza o retrocede 5 s (sobre el altavoz, cambia el volumen). Los menús de audio, subtítulos y episodios (y el del clic derecho) son de [uosc](https://github.com/tomasklaen/uosc) (LGPL‑2.1), al que se le desactivan sus propios controles. Todo está en `player-ui/`, que se copia a `%APPDATA%\CineLocal\mpv-config` y se pasa a mpv con `--config-dir` (al cambiar `player-ui/VERSION` se vuelve a copiar). Con esa interfaz mpv no lee tu configuración propia de `%APPDATA%\mpv`; si la prefieres, elige *Ajustes → Reproducción → Interfaz del reproductor → Clásica de mpv*. Capturas de prueba: `node test/player-ui-test.js "C:\ruta\mpv.exe" <carpeta>`. Clic y arrastre en la barra de tiempo: `node test/seekbar-test.js "C:\ruta\mpv.exe"`.

### Saltar intro

Con la interfaz moderna del reproductor, durante la intro, el resumen («Anteriormente en…») o los créditos aparece abajo a la derecha, sobre la barra de tiempo, un botón **Saltar intro**, **Saltar resumen** o **Siguiente episodio** (en los créditos, sólo si hay otro capítulo en la lista; en el último capítulo y en las películas no sale). Se ve durante todo el tramo aunque el resto de los controles estén ocultos; se pulsa con el ratón o con la tecla `s`. Saltar lleva al final del tramo (+0,5 s).

Viene siempre activado y no tiene nada que configurar.

* Los tiempos son de [TheIntroDB](https://theintrodb.org), una base de datos de la comunidad: no todas las series tienen tiempos. Se buscan por el id de TMDB de la serie, la temporada y el capítulo (y la duración del archivo, para elegir el montaje correcto), así que hace falta que la serie esté identificada en TMDB. Con la interfaz clásica de mpv no hay botón.
* Una consulta por capítulo al empezar a reproducirlo (`GET https://api.theintrodb.org/v4/media?tmdb_id=…&season=…&episode=…&duration_ms=…`) y, al minuto de verlo, la del siguiente capítulo de la lista en segundo plano. Las respuestas se guardan en `%APPDATA%\CineLocal\introdb.json`: 30 días lo encontrado y 7 días lo que no está. Si la API pide esperar (429), no se le vuelve a preguntar hasta que pase el tiempo que indica; nunca más de 20 consultas cada 10 s.
* `src/main/introdb.js` (consultas, caché y normalización: `start_ms` nulo = 0, `end_ms` nulo = hasta el final, rangos vacíos como `{0,0}` se ignoran) manda los tramos a `cinelocal-osc.lua` con `script-message cinelocal-segments`.

Pruebas: `node test/introdb-test.js` (normalización, tramo activo, caché, 429; añade `real` para 3 consultas a la API de verdad) y capturas del botón con `node test/skip-intro-ui-test.js "C:\ruta\mpv.exe" <carpeta>`.

## Descargas con eMule

Sólo para administradores (grupo `cinelocal-admin`). CineLocal puede buscar y descargar con el eMule de este PC y seguir el progreso desde la sección **Descargas**. Se comunica con eMule a través de su servidor web, con una plantilla propia que devuelve datos en lugar de páginas HTML. Está probado con eMule 0.50a.

1. *Ajustes → Descargas (eMule)* → activa **Buscar y descargar con eMule**.
2. En eMule: *Opciones → Servidor Web* → marca **Activado**, escribe una contraseña y deja el puerto 4711.
3. En **Plantilla** pon la ruta que muestra CineLocal (`%APPDATA%\CineLocal\emule\CineLocal.tmpl`), pulsa **Recargar** y después **Aplicar**.
4. Escribe la misma contraseña en CineLocal y pulsa **Probar**.

* Busca en servidores o Kad, descarga, pausa, reanuda y cancela, o pega un enlace `ed2k://`.
* En la ficha de un título: `···` → **Buscar en eMule**.

### Conexión: servidores y Kad

La barra de arriba de **Descargas** muestra el servidor (con *ID alta* o *ID baja*) y el estado de Kad (*Desconectado*, *Conectando…*, *Tras cortafuegos* o *Abierto*, con los contactos), sin tener que abrir la ventana de eMule:

* **Conectar** entra en el primer servidor disponible (como el botón de eMule); mientras conecta, **Cancelar**; ya conectado, **Desconectar**.
* **Conectar Kad** / **Desconectar Kad**.
* **Servidores** despliega la lista de servidores de eMule: nombre y descripción, dirección, usuarios, archivos, ping y fallos, con las etiquetas *Estático* y *Prioridad alta*. Se ordena por usuarios, archivos, ping o nombre pulsando la cabecera; el servidor conectado aparece arriba y resaltado, y cada fila tiene su botón **Conectar**. Mientras está a la vista se actualiza cada 5 s. Se abre sola si no hay servidor conectado.
* Debajo de la lista: **Añadir servidores de un server.met** (pega su dirección `http://…/server.met`; eMule lo descarga y muestra su ventana de progreso) y, con Kad sin conectar, **Conectar Kad desde un nodo** (`IP:puerto`), útil si Kad no encuentra contactos.

Esto necesita la revisión 2 de la plantilla, que CineLocal copia al arrancar en `%APPDATA%\CineLocal\emule\CineLocal.tmpl`. eMule solo lee la plantilla al activar el servidor web o al pulsar *Recargar*, así que si ya la tenías puesta, la primera vez hay que ir a *eMule → Opciones → Servidor Web*, pulsar **Recargar** junto a la plantilla y después **Aplicar** (no hace falta reiniciar eMule). Mientras tanto, Descargas lo avisa en lugar de la lista.

Límites del servidor web de eMule 0.50a: mientras conecta no dice con qué servidor lo está intentando, de Kad solo da el estado y el número de contactos (no los nodos), y no puede cargar un `nodes.dat` desde una dirección (solo arrancar Kad desde un nodo concreto). Si alguna vez ocultaste columnas en la lista de servidores de la interfaz web original, eMule las devuelve vacías.

* Prueba del parser y de los comandos contra un eMule simulado: `node test/emule-servers-test.js`. Capturas del panel: `npx electron test/emule-servers-ui-test.js <carpetaTemporal> <carpetaCapturas>`.
* Con **Copiar al NAS al terminar**, los vídeos que acaba eMule se copian a la carpeta de la biblioteca en el NAS vista desde Windows (*Carpeta de la biblioteca en el NAS*, p. ej. `\\NAS\Multimedia`): las películas a su carpeta `Películas` y los episodios (`S01E02`, `1x02`, `Cap.102`) a la carpeta de su serie (se reutiliza la de la biblioteca si la serie ya existe). Antes de copiar, CineLocal inicia sesión en el NAS con el usuario de esa opción (`net use`, contraseña cifrada con `safeStorage`); sin usuario, usa la sesión que tenga Windows. El PC tiene que llegar al NAS (en casa o con la VPN). CineLocal Server detecta lo copiado y lo añade, y si alguien lo había pedido, la petición se marca como conseguida. Solo se copian las descargas que CineLocal ha visto en curso.
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

## Discord

Mientras ves algo en CineLocal, tu perfil de Discord puede mostrarlo (Rich Presence):

> **Viendo CineLocal**
> Twin Peaks
> T2:E5 · El hombre tras el cristal
> 12:31 ━━━━━━━━━━──── 47:02

Con el póster de TMDB, la barra de tiempo (desaparece y pone *En pausa* al pausar) y los botones *Ver en TMDB* y, en las películas que tienes en Letterboxd, *Ver en Letterboxd* (los botones sólo los ven los demás, no tú). Las películas muestran *Título (año)* y *Película de* su director. Al terminar de ver, al cerrar CineLocal o al desactivarlo, la actividad desaparece.

Configuración (una sola vez):

1. Entra en [discord.com/developers/applications](https://discord.com/developers/applications) y crea una aplicación con **New Application**. Llámala **CineLocal**: el nombre es lo que aparece después de «Viendo».
2. En *General Information*, copia el **Application ID** y pégalo en *Ajustes → Discord → ID de la aplicación de Discord*. Activa **Mostrar en Discord lo que estoy viendo** y pulsa **Probar**: durante 15 s tu perfil mostrará *Probando CineLocal*.
3. Opcional: en *Rich Presence → Art Assets* sube el icono de la app (`build/icon.png`) con el nombre `cinelocal`. Si no lo subes se usa el icono del repositorio de GitHub.
4. En Discord: *Ajustes de usuario → Privacidad de actividad* → activa *Compartir tu actividad*.

* **Modo discreto:** sólo *Viendo una película* o *Viendo una serie*, sin título, póster ni botones.
* **Estado** (en Ajustes): *Conectado a Discord*, *Discord no está abierto* (lo vuelve a intentar solo, cada vez más espaciado, hasta un minuto) o el error, p. ej. un ID que Discord no reconoce.
* Sólo se conecta a Discord cuando empiezas a reproducir, y cierra la conexión poco después de terminar. Envía una actualización al empezar, pausar o reanudar, saltar y cambiar de capítulo, como mucho una cada 4 s (Discord admite unas 5 cada 20 s); el avance normal no se envía porque Discord calcula la barra solo.
* Habla directamente el protocolo local de Discord (tubería `\\?\pipe\discord-ipc-N`), sin librerías ni internet salvo para comprobar si la aplicación tiene el icono `cinelocal`.

Pruebas: `node test/discord-test.js` (actividad y protocolo con un Discord falso). Contra el Discord de tu PC: `node test/discord-test.js real <ApplicationID>` (prueba de 15 s, una película de ejemplo unos segundos y la borra).

## Actualizaciones

CineLocal se actualiza solo desde las [releases de GitHub](https://github.com/d4nthalion/cine-local/releases) (con [electron-updater](https://www.electron.build/auto-update)).

* **Instalada:** unos 10 s después de abrir, busca una versión nueva. Si la hay, la descarga en segundo plano. Al terminar aparece el aviso *«CineLocal X.Y.Z está lista · se instalará al cerrar»* con el botón **Reiniciar ahora**; si la ventana no está en primer plano, también llega una notificación de Windows. Si no reinicias, se instala sola al cerrar CineLocal.
* **Portable:** no puede instalarse sola. Avisa de la versión nueva con un botón **Descargar** que abre la página de la release.
* **Ajustes → Actualizaciones:** activa o desactiva *Buscar actualizaciones al abrir*, muestra la versión actual, el estado (con el progreso de la descarga y las novedades) y el botón **Comprobar ahora**.
* **Errores:** nunca interrumpen. Se ven sólo en Ajustes y el detalle queda en `%APPDATA%\CineLocal\updater.log`.
* **Qué versión elige:** la release marcada como *Latest* en GitHub, leyendo su `latest.yml`. Las releases de Android (`android-v…`) se publican con `--latest=false`, así que nunca lo son. Aun así, CineLocal sólo descarga etiquetas `vX.Y.Z` más nuevas que la instalada.
* Las versiones hasta la 1.5.0 no traen el actualizador: a la 1.7.0 hay que pasar instalándola a mano.

Pruebas, sin publicar ni instalar nada (antes, `npm run dist`):
* Flujo completo con un servidor local que ofrece una versión siguiente falsa: `npx electron test/update-test.js <carpetaTemporal> <carpetaCapturas> installer`.
* Aviso de la portable (incluido descartar una release de Android): `npx electron test/update-test.js <carpetaTemporal> <carpetaCapturas> portable`.
* Qué release elige en el repositorio real (sólo lectura): `npx electron test/update-test.js <carpetaTemporal> <carpetaCapturas> github`.

## CineLocal Server (NAS, sin VPN)

En [`server/`](server/README.md) está **CineLocal Server**: la misma interfaz como servicio web del NAS (contenedor Docker en Synology), alternativa a Video Station / DS Video. Se entra con los usuarios de DSM y cada uno tiene su progreso y su lista. En el navegador, el vídeo se envía tal cual o se reempaqueta o convierte con la gráfica del NAS.

La app de escritorio es su cliente: la biblioteca, el progreso, las listas, las peticiones y las preferencias de audio y subtítulos vienen del servidor, y mpv reproduce el archivo original con enlaces firmados. No hace falta VPN.

Para que un usuario de DSM que no es administrador pueda entrar, necesita permiso en *Panel de control → Privilegios de aplicaciones → DSM*. Instalación, seguridad y puertos: [`server/README.md`](server/README.md).

## Android

En [`android/`](android/README.md) está **CineLocal para Android** (móvil): lee la biblioteca directamente de la carpeta compartida del PC (`\\MI-PC\Peliculas`), con la misma forma de reconocer películas y series, metadatos de TMDB y reproductor propio (LibVLC). Se descarga como `CineLocal-android-<versión>.apk` desde las releases `android-v…`.

Para que el móvil vea la biblioteca, comparte la carpeta en Windows (clic derecho → *Propiedades → Compartir*, solo lectura) con la red configurada como **Privada**. El PC puede estar encendido sin haber iniciado sesión.

## Desarrollo

```bash
npm install
npm start          # ejecutar
npm run dist       # en Windows: genera instalador NSIS + versión portable en dist/
npm run fetch-mpv -- --update   # actualiza el mpv que se incluye
```

`npm run dist` descarga mpv en `mpv\` la primera vez (compilación x86_64 de [shinchiro](https://github.com/shinchiro/mpv-winbuild-cmake), GPL) y luego reutiliza esa copia; la carpeta no se sube a git.

### Publicar una versión

1. Sube la versión: `npm version X.Y.Z --no-git-tag-version`.
2. Genera los instaladores: `npm run dist`. En `dist\` quedan:
   * `CineLocal-Setup-X.Y.Z.exe` (instalador)
   * `CineLocal-Setup-X.Y.Z.exe.blockmap` (para descargar sólo lo que cambia)
   * `latest.yml` (versión y sha512 del instalador)
   * `CineLocal-X.Y.Z-portable.exe`
3. Publica la release con **los cuatro archivos**. Sin `latest.yml` las versiones instaladas no ven la actualización:

```bash
gh release create vX.Y.Z dist/CineLocal-Setup-X.Y.Z.exe dist/CineLocal-Setup-X.Y.Z.exe.blockmap dist/latest.yml dist/CineLocal-X.Y.Z-portable.exe --title "CineLocal X.Y.Z" --notes "Novedades…" --latest
```

* La etiqueta debe ser `vX.Y.Z` y la release, la *Latest*.
* `latest.yml` tiene que ser el del mismo `npm run dist` que el instalador, porque lleva su sha512.
* No renombres los archivos: `latest.yml` los busca por su nombre exacto.
* Las releases de Android van siempre con `--latest=false`, para que la *Latest* sea siempre la de escritorio.

En `%APPDATA%\CineLocal` sólo quedan los ajustes de este PC (reproductor, eMule, Letterboxd, Discord), la sesión cifrada y las cachés; la biblioteca y el progreso están en el servidor.
