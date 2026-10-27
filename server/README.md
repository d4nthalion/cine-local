# CineLocal Server

CineLocal como **servicio web del NAS**, alternativa a Video Station / DS Video (Synology la retiró en DSM 7.2.2). Es la misma interfaz que la app de escritorio, pero en el navegador: se entra con los **usuarios de DSM** y cada uno tiene su propio progreso y su lista.

> Rama de pruebas `nas-web`.

## Cómo funciona

```
Navegador ──HTTPS──► DSM (proxy inverso, certificado, bloqueo automático) ──► contenedor «cinelocal» :8095
                                                                               ├─ /media = carpeta de vídeo (sólo lectura)
                                                                               └─ /data  = ajustes, metadatos, sesiones, progreso
```

* **Interfaz:** `src/renderer/` tal cual. `server/web/api.js` sustituye a `preload.js`: el mismo `window.api`, pero hablando con el servidor por HTTP y recibiendo los cambios por Server-Sent Events (`/api/events`). En la web no hay mpv, eMule, Discord, Letterboxd ni actualizaciones (`WEB` en `app.js`).
* **Biblioteca:** `server/library.js` reutiliza `scanner.js`, `metadata.js` y `watcher.js` (misma lógica que `main.js`). El progreso, la lista y lo último visto se guardan por usuario en `data/users/<usuario>.json`.
* **Reproducción** (`server/media.js` y `server/web/player.js`). El navegador decide con `canPlayType` qué puede reproducir, igual que Plex o Video Station:

  | Nivel | Cuándo | Qué hace el servidor |
  |---|---|---|
  | `direct` | MP4/WebM con vídeo y audio compatibles | Envía el archivo tal cual, con `Range` para saltar |
  | `remux` | El vídeo es compatible pero el contenedor (MKV) o el audio (AC3, DTS) no | ffmpeg reempaqueta en MP4 fragmentado sin tocar el vídeo y pasa el audio a AAC |
  | `transcode` | El vídeo tampoco es compatible (HEVC en Chrome, H.264 de 10 bits…) | ffmpeg convierte a H.264 1080p con la gráfica Intel del NAS (`CINELOCAL_HWACCEL=vaapi`) |

  En `remux` y `transcode`, para saltar se vuelve a pedir el vídeo desde ese punto (`?start=`). Los subtítulos de texto (internos o `.srt`/`.ass` externos) se convierten a WebVTT y los pinta el propio reproductor. Los internos se extraen una vez y se guardan en `data/cache/subs`. Los de imagen (PGS) aún no.
* **Saltar intro / resumen / créditos:** los tiempos de TheIntroDB, como en la app de escritorio.

## Grupos de DSM

Quién entra y qué puede hacer lo deciden dos grupos de DSM (*Panel de control → Grupo*), con estos nombres exactos (se cambian con `ADMIN_GROUP` y `USER_GROUP` en `.env`):

* **`cinelocal-admin`:** carpetas de la biblioteca, clave e idioma de TMDB, escanear, corregir fichas, gestionar las peticiones y eMule en la app de escritorio.
* **`cinelocal-user`:** ver, llevar su progreso, sus listas, sus peticiones y sus preferencias de audio, subtítulos y plataformas.

Los dos grupos necesitan *Privilegios de aplicaciones → DSM → Permitir*: la contraseña se comprueba con el inicio de sesión de DSM. Permisos de carpetas no hacen falta (el contenedor lee el vídeo con su propio grupo). En cuanto existe uno de los dos grupos, quien no esté en ninguno no entra (aunque esté en `ADMINS`/`USERS`, que sólo valen mientras no haya grupos), y quien sale de un grupo pierde el acceso, aunque tenga la sesión abierta, en el siguiente minuto.

El servidor lee `/etc/group` del NAS. DSM sustituye ese archivo por otro al cambiar un grupo, y un archivo montado suelto en el contenedor se quedaría con la versión vieja, así que una **tarea programada** de DSM deja una copia en `data/` (*Programador de tareas → Crear → Tarea programada → Script definido por el usuario*; usuario `root`, diaria, cada minuto hasta las 23:59):

```sh
D=/volume1/docker/cinelocal/server/data
cmp -s /etc/group "$D/group" || { cp /etc/group "$D/group.tmp" && chmod 644 "$D/group.tmp" && mv -f "$D/group.tmp" "$D/group"; }
```

Sin esa copia se usa el `/etc/group` montado, y los cambios en los grupos no se ven hasta reiniciar el contenedor.

## App de escritorio

La app de Windows sólo funciona con CineLocal Server: al abrirla pide la dirección del servidor (la primera vez) y el usuario de DSM. `src/main/remote.js` inicia sesión con `client: 'app'` y recibe un token, que se guarda cifrado con `safeStorage`; la contraseña no se guarda. Con eso:

* La biblioteca, los metadatos, el progreso, las listas, las peticiones y las preferencias vienen del servidor, y sus cambios llegan en vivo por `/api/events`.
* Las peticiones llevan `Authorization: Bearer <token>`.
* Para reproducir, `/api/play` con `client: 'app'` da **enlaces firmados** (HMAC, válidos 24 h y sólo para ese vídeo) al archivo tal cual y a sus subtítulos externos. mpv, su generador de miniaturas y, más adelante, LibVLC los abren sin cabeceras ni cookies, y el token de la sesión nunca va en una URL.
* El progreso de mpv se envía al servidor cada 10 s y al cerrar.

## Seguridad

* **Usuarios de DSM.** La contraseña se comprueba contra `SYNO.API.Auth` (por POST, con verificación en dos pasos si la tienes) y no se guarda. La sesión de DSM se cierra al momento. CineLocal da su propia cookie de sesión (`HttpOnly`, `SameSite=Strict`, `Secure` tras HTTPS) de 30 días. En disco sólo queda el hash del token.
* **Fuerza bruta:** como mucho 5 intentos fallidos por IP cada 15 min, y 20 en total. Todas las peticiones a DSM salen del propio NAS, así que hay que cortarlas antes de que su bloqueo automático bloquee al servidor.
* **Administradores** (grupo `cinelocal-admin`): los únicos que cambian la biblioteca, la clave de TMDB y las coincidencias, y que gestionan las peticiones. Al resto ni siquiera se les envía la clave. Ver [Grupos de DSM](#grupos-de-dsm).
* **Los vídeos se piden por su id, nunca por ruta.** No hay forma de pedir un archivo fuera de la biblioteca. Los estáticos tampoco salen de su carpeta.
* **Peticiones que cambian algo:** llevan la cabecera `X-CineLocal: 1`, que otra web no puede enviar sin CORS. Junto con `SameSite=Strict`, eso evita CSRF.
* **Cabeceras:** CSP estricta (sin scripts en línea), `X-Frame-Options: DENY`, `nosniff`, `no-referrer` y HSTS tras HTTPS.
* **Contenedor:** usuario sin privilegios (el uid de DSM), carpeta de vídeo en sólo lectura, sistema de archivos de sólo lectura, `cap_drop: ALL` y `no-new-privileges`.
* **Exposición:** sólo por HTTPS, a través del proxy inverso de DSM con el certificado de Let's Encrypt de `tu-nas.synology.me`. Nunca se abre el 8095 en el router. Para lo más seguro, no abras nada y entra por Tailscale o por la VPN.

## Instalación en el NAS

1. *Centro de paquetes* → instala **Container Manager**.
2. Copia el repositorio (al menos `package.json`, `src/` y `server/`) a una carpeta del NAS, por ejemplo `/volume1/docker/cinelocal`.
3. En `server/`, copia `.env.example` como `.env` y ajústalo:
   * `PUID` y `PGID`: salen de `id tu_usuario` por SSH.
   * `VIDEO_GID`: sale de `ls -ln /dev/dri`.
4. Arranca: `cd server && docker compose up -d --build`. También vale desde *Container Manager → Proyecto → Crear*, con la ruta `server/`.
5. Entra en `http://<nas>:8095` con tu usuario de DSM. Desde fuera, por la VPN: `http://10.8.0.1:8095`. Ve a *Ajustes* y pega la clave de TMDB.
6. Para entrar desde internet:
   * En *Panel de control → Portal de inicio de sesión → Avanzado → Proxy inverso*, crea `https://cine.tu-nas.synology.me:443` → `http://localhost:8095`.
   * En *Encabezado personalizado → Crear → WebSocket* (sirve también para los eventos en vivo).
   * Pide un certificado para ese nombre en *Seguridad → Certificado*.
   * Abre el 443 en el router hacia el DS220+.
   * Pon `BIND_HOST=127.0.0.1` en `.env`.

## Desarrollo en Windows

Sin Docker, contra la carpeta de red y sin pedir contraseña:

```powershell
$env:FFMPEG = 'C:\ruta\ffmpeg.exe'; $env:FFPROBE = 'C:\ruta\ffprobe.exe'
$env:CINELOCAL_DATA = "$env:TEMP\cinelocal-server"; $env:CINELOCAL_LIBRARY = '\\10.8.0.1\Multimedia'
$env:CINELOCAL_AUTH = 'none'; $env:HOST = '127.0.0.1'
node server/index.js
```

`CINELOCAL_AUTH=none` deja entrar a cualquiera como `dev` (o `CINELOCAL_DEV_USER`). Es sólo para probar en local.
