const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, net, Notification, clipboard, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { Player, findMpv } = require('./player');
const { WinEmbed } = require('./winembed');
const emule = require('./emule');
const { EmuleService } = require('./emule/service');
const { LetterboxdService, keyOf: lbKey } = require('./letterboxd');
const { Updater } = require('./updater');
const { DiscordPresence, mediaInfo } = require('./discord');
const { IntroDB, flatten: flattenSegments } = require('./introdb');
const { NasSession, cleanHost } = require('./nas');
const { RemoteServer, normUrl } = require('./remote');

app.setAppUserModelId('com.cinelocal.app');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const DATA = app.getPath('userData');

// La biblioteca, los metadatos, el progreso, las listas y las preferencias de audio y subtítulos son de
// CineLocal Server (cada usuario de DSM tiene los suyos). Aquí sólo queda lo propio de este PC.
const DEFAULT_SETTINGS = {
  playerFullscreen: true,
  playerUi: 'modern',          // modern (uosc) | classic (OSC de mpv)
  playerMode: 'embedded',      // embedded (dentro de CineLocal) | window (ventana propia de mpv)
  startFullscreen: false,
  minimizeOnPlay: false,
  mpvPath: '',
  extraMpvArgs: '',
  emuleEnabled: false,           // sólo administradores
  emulePort: 4711,
  emulePassword: '',
  emulePath: '',
  emuleMoveToLibrary: true,      // copiar los vídeos terminados a la carpeta del NAS
  emuleDest: '',                 // carpeta de la biblioteca en el NAS vista desde Windows: \\NAS\Multimedia
  emuleSearchMethod: 'global',
  nasUser: '',                   // usuario del NAS para copiar ahí las descargas (net use)
  nasPasswordEnc: '',            // contraseña cifrada con safeStorage (nunca se envía a la ventana)
  lbUser: '',                    // usuario de Letterboxd
  autoUpdate: true,              // buscar actualizaciones al abrir (se descargan solas y se instalan al cerrar)
  discordEnabled: false,         // mostrar en Discord lo que estás viendo (Rich Presence)
  discordClientId: '',           // ID de la aplicación creada en discord.com/developers
  discordDiscreet: false,        // sin título ni póster: «Viendo una película» / «Viendo una serie»
  remoteUrl: '',                 // CineLocal Server: https://cine.dominio.com
  remoteUser: '',
  remoteTokenEnc: ''             // token de la sesión, cifrado (la contraseña no se guarda)
};
// ajustes que guarda el servidor (los de la biblioteca y TMDB sólo los cambia un administrador)
const SERVER_KEYS = new Set(['libraryPath', 'extraLibraryPaths', 'tmdbKey', 'metaLang', 'audioLang', 'subLang', 'subMode',
  'autoplayNext', 'autoWatch', 'singleFileFolderAsMovie', 'libraryLayouts', 'myProviders', 'region']);

// ---------- persistencia sencilla en JSON ----------
function store(name, fallback) {
  const file = path.join(DATA, name);
  let data = fallback;
  try { data = { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        fs.mkdirSync(DATA, { recursive: true });
        fs.writeFileSync(file + '.tmp', JSON.stringify(data));
        fs.renameSync(file + '.tmp', file);
      } catch (e) { console.error('No se pudo guardar', name, e); }
    }, 300);
  };
  return { get data() { return data; }, set data(v) { data = v; save(); }, save, flushSync() {
    clearTimeout(timer);
    try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)); } catch {}
  } };
}

const settings = store('settings.json', DEFAULT_SETTINGS);
// ajustes de cuando la biblioteca era local (carpetas, TMDB, Modo NAS…): ahora son del servidor y no deben taparlos
if (Object.keys(settings.data).some(k => !(k in DEFAULT_SETTINGS))) {
  settings.data = Object.fromEntries(Object.entries(settings.data).filter(([k]) => k in DEFAULT_SETTINGS));
}
const emuleState = store('emule.json', { tracked: {} });
const lbStore = store('letterboxd.json', { films: {}, ids: {}, user: '', syncedAt: 0, fullAt: 0, source: null });
const introStore = store('introdb.json', { entries: {} });

let win = null;
const player = new Player();
const winEmbed = new WinEmbed();

// ---------- ventana ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#08080c',
    show: false,
    title: 'CineLocal',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'win32'
      ? { color: '#00000000', symbolColor: '#ffffff', height: 40 }
      : false,
    fullscreen: !!settings.data.startFullscreen,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  nativeTheme.themeSource = 'dark';
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // En Windows ready-to-show a veces no llega (la ventana oculta no pinta) y la app quedaba abierta sin ventana:
  // mostrarla también al terminar de cargar y, como muy tarde, a los 4 s
  const reveal = () => { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); };
  win.once('ready-to-show', reveal);
  win.webContents.once('did-finish-load', reveal);
  setTimeout(reveal, 4000);

  win.on('enter-full-screen', () => { send('window:fullscreen', true); syncEmbeddedFullscreen(true); });
  win.on('leave-full-screen', () => { send('window:fullscreen', false); syncEmbeddedFullscreen(false); });
  win.on('maximize', () => { if (embedded && player.playing) player.setMaximized(true); });
  win.on('unmaximize', () => { if (embedded && player.playing) player.setMaximized(false); });
  // al restaurar desde la barra de tareas, volver a poner el vídeo delante
  win.on('restore', () => { if (embedded && player.playing) winEmbed.raise(embedded.hwnd); });
  // al volver a la ventana (Alt+Tab, clic en la barra de tareas) Chromium se repinta encima del vídeo
  // y mpv deja de recibir el ratón: sin esto la interfaz del reproductor no reaparece hasta pulsar Esc
  win.on('focus', () => {
    if (!embedded || !player.playing) return;
    const hwnd = embedded.hwnd;
    for (const ms of [0, 150, 600]) setTimeout(() => { if (embedded?.hwnd === hwnd && player.playing) winEmbed.raise(hwnd); }, ms);
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
      return;
    }
    if (input.type === 'keyDown' && input.key === 'F12' && input.control && input.shift) {
      win.webContents.toggleDevTools();
      return;
    }
    // Reproductor integrado: las teclas pulsadas con el foco en la app van a mpv (y no navegan por la app)
    if (player.playing && player.embedded) {
      e.preventDefault();
      const k = input.type === 'keyDown' && mpvKeyName(input);
      if (k) player.key(k);
    }
  });
  // enlaces externos (tráiler, TMDB) en el navegador
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}

function send(ch, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(ch, payload);
}

app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
});
app.whenReady().then(() => { configureRemote(); createWindow(); startSession(); if (embeddedMode()) winEmbed.start(); setTimeout(autoSyncLetterboxd, 15000); setTimeout(() => updater.start(), 10000); });
app.on('window-all-closed', () => {
  player.stop();
  winEmbed.stop();
  emuleService.stop();
  discord.shutdown();
  for (const s of [settings, emuleState, lbStore, introStore]) s.flushSync();
  app.quit();
});

// ---------- secretos ----------
function encryptSecret(v) {
  if (!v) return '';
  return safeStorage.isEncryptionAvailable() ? 'enc:' + safeStorage.encryptString(v).toString('base64') : 'plain:' + v;
}
function decryptSecret(v) {
  if (!v) return '';
  if (v.startsWith('plain:')) return v.slice(6);
  try { return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64')); } catch { return ''; }
}

// ---------- CineLocal Server ----------
const remote = new RemoteServer({ fetch: (u, o) => net.fetch(u, o) });
let remoteView = null;      // última biblioteca recibida del servidor
let remoteError = null;
let me = null;              // { user, role, admin, … } de /api/me
let serverSettings = {};    // ajustes del servidor con las preferencias del usuario encima

const isAdmin = () => !!me?.admin;

function configureRemote(s = settings.data) {
  remote.configure({ url: s.remoteUrl, token: decryptSecret(s.remoteTokenEnc) });
}

/** Con la sesión abierta: quién soy, mis ajustes y la biblioteca; y eMule si soy administrador */
async function startSession() {
  if (!remote.ready) { me = null; serverSettings = {}; remoteView = null; emuleService.restart(); return; }
  me = await remote.get('/api/me').catch(() => me);
  serverSettings = await remote.get('/api/settings').catch(() => serverSettings);
  await remoteFetch();
  emuleService.restart();
  send('library:updated', view());
}

async function remoteFetch(p = '/api/library?slim=1', method = 'GET') {
  try {
    remoteView = await remote.request(method, p);
    remoteError = null;
  } catch (e) {
    remoteError = e.message;
  }
  return view();
}

function view() {
  const v = remoteView || { items: [], scannedAt: 0, error: null, progress: {}, favorites: [], lists: [], hasKey: true, fetching: false };
  return { ...v, error: remoteError || v.error, nas: null, remote: true, mpv: findMpv(settings.data.mpvPath, process.resourcesPath) };
}

/** Ajustes que ve la ventana: los de este PC (sin secretos) y los del servidor */
function publicSettings() {
  const { nasPasswordEnc, remoteTokenEnc, ...rest } = settings.data;
  return { ...serverSettings, ...rest, nasHasPassword: !!nasPasswordEnc, loggedIn: remote.ready };
}

/** Lo que necesita mpv: idiomas y reproducción automática del usuario (servidor) y opciones de este PC */
const playSettings = () => ({ ...serverSettings, ...settings.data });

// la biblioteca ha cambiado en el servidor: se vuelve a pedir (varios avisos seguidos, una sola vez)
let libTimer = null;
function reloadLibrary() {
  clearTimeout(libTimer);
  libTimer = setTimeout(() => remoteFetch().then(v => send('library:updated', v)), 300);
}
remote.on('event', (ev, data) => {
  if (ev === 'library:changed') reloadLibrary();
  else if (ev === 'progress:updated') { if (remoteView) remoteView.progress = data; send('progress:updated', data); }
  else send(ev, data);   // meta:progress, toast, library:new, requests:updated
});
// sesión caducada o cerrada en el servidor (o el usuario ha salido del grupo de CineLocal): a la pantalla de inicio de sesión
remote.on('unauthorized', () => {
  settings.data = { ...settings.data, remoteTokenEnc: '' };
  configureRemote();
  me = null; remoteView = null;
  emuleService.restart();
  send('session:expired', 'La sesión ha caducado o ya no tienes acceso. Vuelve a iniciar sesión.');
});
remote.on('offline', () => { remoteError = 'No se puede conectar con CineLocal Server'; send('library:updated', view()); });
remote.on('online', () => { if (remoteError) remoteFetch().then(v => send('library:updated', v)); });

// progreso de mpv → servidor, como mucho cada 10 s por vídeo (y el último al cerrar)
const remoteProgress = { last: new Map(), pending: null };
function reportRemoteProgress(id, pos, dur, force) {
  remoteProgress.pending = { id, pos, dur };
  if (!force && Date.now() - (remoteProgress.last.get(id) || 0) < 10000) return;
  remoteProgress.last.set(id, Date.now());
  remoteProgress.pending = null;
  remote.post('/api/progress', { id, pos, dur }).catch(() => {});
}

// ---------- reproducción ----------
/**
 * Prepara la interfaz moderna del reproductor (uosc) en la carpeta de datos.
 * mpv no puede leer dentro del .asar y Archivos de programa no es escribible, así que se copia
 * player-ui/ a %APPDATA%CineLocalmpv-config cuando cambia su versión.
 */
function playerUiDir() {
  if (settings.data.playerUi === 'classic') return null;
  const src = app.isPackaged ? path.join(process.resourcesPath, 'player-ui') : path.join(__dirname, '..', '..', 'player-ui');
  const dest = path.join(DATA, 'mpv-config');
  try {
    const version = fs.readFileSync(path.join(src, 'VERSION'), 'utf8');
    let current = null;
    try { current = fs.readFileSync(path.join(dest, 'VERSION'), 'utf8'); } catch {}
    if (current !== version) {
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
    }
    return dest;
  } catch (e) {
    console.error('Interfaz del reproductor:', e);
    return null;   // sin uosc se usa la interfaz clásica de mpv
  }
}

/** Ficha de la película en Letterboxd, si la conocemos (botón de Discord) */
function lbSlugOf(item) {
  const id = item.meta?.tmdbId;
  if (!id) return null;
  for (const [k, f] of Object.entries(lbStore.data.films || {})) if (f.slug && lbStore.data.ids?.[k]?.id === id) return f.slug;
  return null;
}

player.on('progress', ({ path: p, pos, dur }) => {
  // el progreso se guarda en el servidor (y llega de vuelta por sus eventos)
  const remoteId = (player.state.playlist || []).find(i => i.path === p)?.remoteId;
  if (remoteId) reportRemoteProgress(remoteId, pos, dur);
});
// Integrado: la pantalla completa la piden mpv (tecla f, botón de uosc, Esc) o la app (F11).
// embedded.fs es el estado acordado; los cambios que coinciden con él son ecos y se ignoran.
player.on('fullscreen', v => {
  if (!embedded || v === embedded.fs) return;
  embedded.fs = v;
  if (win && !win.isDestroyed()) win.setFullScreen(v);
});
player.on('started', () => { if (embedded) { player.setFullscreen(embedded.fs); player.setMaximized(win.isMaximized()); } });
player.on('minimize', () => { if (embedded && win && !win.isDestroyed()) win.minimize(); });
player.on('maximize', v => {
  if (!embedded || !win || win.isDestroyed() || win.isMaximized() === v) return;
  v ? win.maximize() : win.unmaximize();
});
player.on('closed', ({ code, stderr }) => {
  const last = remoteProgress.pending;
  if (last) reportRemoteProgress(last.id, last.pos, last.dur, true);
  discord.setPlayback(null);
  clearTimeout(introPrefetch);
  if (embedded && win && !win.isDestroyed()) {
    // volver al estado de pantalla completa que tenía la app antes de reproducir
    if (win.isFullScreen() !== embedded.wasFullscreen) win.setFullScreen(embedded.wasFullscreen);
  }
  embedded = null;
  send('player:closed', { code, error: code && code !== 4 ? stderr.trim().split(/\r?\n/).slice(-3).join('\n') : null });
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
player.on('error', msg => send('toast', { type: 'error', text: 'No se pudo iniciar mpv: ' + msg }));

// ---------- Discord ----------
const discord = new DiscordPresence({
  // imágenes subidas a la aplicación de Discord (endpoint público): ¿está el icono «cinelocal»?
  fetchAssets: id => net.fetch(`https://discord.com/api/v10/oauth2/applications/${id}/assets`).then(r => r.ok ? r.json() : [])
});
const discordConfig = (s = settings.data) => ({ enabled: s.discordEnabled, clientId: s.discordClientId, discreet: s.discordDiscreet });
discord.configure(discordConfig());
discord.on('status', st => send('discord:status', st));
// al empezar, pausar o reanudar, saltar, cambiar de capítulo y cada 5 s (sólo se envía a Discord si cambia algo)
player.on('state', ({ path: p, pos, dur, paused }) => {
  const item = (player.state.playlist || []).find(i => i.path === p);
  discord.setPlayback(item?.discord ? { media: item.discord, pos, dur, paused } : null);
});

// ---------- saltar intro / resumen / créditos (TheIntroDB) ----------
const introDb = new IntroDB({
  fetch: (u, o) => net.fetch(u, o),
  store: introStore,
  apiKey: () => '',   // sin clave: va de serie, sin nada que configurar
  userAgent: `CineLocal/${app.getVersion()}`
});
let introPrefetch = null;

// al empezar cada archivo (con su duración ya conocida) se piden sus tiempos y se pasan a la interfaz del reproductor
player.on('loaded', async ({ path: p, mpvPath, dur }) => {
  if (!player.modernUi) return;   // la interfaz clásica de mpv no tiene el botón
  const list = player.state.playlist || [];
  const idx = list.findIndex(i => i.path === p);
  const item = list[idx];
  clearTimeout(introPrefetch);
  if (!item?.skip) return;
  const segs = await introDb.get(item.skip, { durationMs: dur * 1000 });
  if (!player.playing || player.state.playlist !== list) return;
  if (segs) {
    player.sendSegments({
      path: mpvPath,
      segments: flattenSegments(segs, dur),
      autoIntro: false,
      autoRecap: false
    });
  }
  // el siguiente capítulo, en segundo plano y sin prisa (si se sigue viendo este)
  const next = list[idx + 1];
  if (next?.skip && introDb.cached(next.skip) === undefined) {
    introPrefetch = setTimeout(() => {
      if (player.playing && player.state.playlist === list) introDb.get(next.skip, {}).catch(() => {});
    }, 60e3);
  }
});

// ---------- reproductor integrado (Windows) ----------
// mpv dibuja dentro de la ventana de CineLocal (--wid) y winEmbed lo sube por encima del contenido web.
let embedded = null;   // { hwnd, wasFullscreen, fs } mientras se reproduce integrado

function embeddedMode() { return settings.data.playerMode !== 'window' && winEmbed.supported; }

/** La ventana de la app ha entrado o salido de pantalla completa (por F11 o a petición de mpv) */
function syncEmbeddedFullscreen(isFull) {
  if (!embedded || !player.playing) return;
  embedded.fs = isFull;
  player.setFullscreen(embedded.fs);
  winEmbed.raise(embedded.hwnd);
}

const MPV_KEYS = {
  ' ': 'SPACE', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', Escape: 'ESC',
  Enter: 'ENTER', Backspace: 'BS', Tab: 'TAB', PageUp: 'PGUP', PageDown: 'PGDWN', Home: 'HOME', End: 'END',
  Delete: 'DEL', Insert: 'INS', '#': 'SHARP'
};
/** Tecla de Electron → nombre de tecla de mpv ("ctrl+LEFT", "j", "SPACE"…) */
function mpvKeyName(input) {
  const k = input.key;
  if (['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead', 'Unidentified'].includes(k)) return null;
  let name = MPV_KEYS[k] || (/^F\d{1,2}$/.test(k) ? k : k.length === 1 ? k : null);
  if (!name) return null;
  // en las teclas de carácter ("J", "?") la mayúscula ya va en el propio carácter
  if (input.shift && k.length > 1) name = 'shift+' + name;
  if (input.alt) name = 'alt+' + name;
  if (input.control) name = 'ctrl+' + name;
  return name;
}

async function playEmbedded({ mpv, playlist, uiDir }) {
  const hwnd = win.getNativeWindowHandle().readBigUInt64LE(0).toString();
  const wasFullscreen = win.isFullScreen();
  embedded = { hwnd, wasFullscreen, fs: settings.data.playerFullscreen !== false || wasFullscreen };
  if (embedded.fs && !wasFullscreen) win.setFullScreen(true);
  player.play({ mpv, playlist, settings: playSettings(), uiDir, wid: hwnd });
  win.focus();
  if (await winEmbed.raiseWhenReady(hwnd)) {
    // mpv deshabilita su ventana incrustada justo después de crearla (y así no recibiría el ratón):
    // repetir unas veces para habilitarla después de que lo haga
    for (const ms of [250, 700, 1500, 3000]) setTimeout(() => { if (embedded?.hwnd === hwnd) winEmbed.raise(hwnd); }, ms);
    return;
  }
  // No se ha podido poner el vídeo delante (p. ej. PowerShell bloqueado): abrir en ventana propia
  console.warn('Reproductor integrado no disponible; se usa ventana propia');
  const was = embedded.wasFullscreen;
  embedded = null;
  if (win.isFullScreen() !== was) win.setFullScreen(was);
  player.play({ mpv, playlist, settings: playSettings(), uiDir });
  send('toast', { type: 'error', text: 'No se pudo integrar el reproductor en la ventana; se abre en una ventana aparte.' });
}

// ---------- eMule (sólo administradores) ----------
// Al terminar, el vídeo se copia a la carpeta de la biblioteca en el NAS (\\NAS\Multimedia); el servidor lo ve solo.
const nas = new NasSession();
const emuleService = new EmuleService({
  getSettings: () => ({ ...settings.data, emuleEnabled: settings.data.emuleEnabled && isAdmin(), libraryPath: settings.data.emuleDest }),
  // series de la biblioteca con su carpeta vista desde Windows, para dejar cada episodio junto a los demás
  getItems: () => view().items.map(it => ({ ...it, path: uncPathOf(it.path) })).filter(it => it.path),
  state: emuleState,
  // antes de copiar: sesión en el NAS con el usuario de Ajustes (si se ha puesto uno)
  prepare: async () => {
    const s = settings.data;
    if (!s.nasUser) return;
    const r = await nas.ensure({ host: cleanHost(s.emuleDest), user: s.nasUser, password: decryptSecret(s.nasPasswordEnc), roots: [s.emuleDest] });
    if (!r.ok) throw new Error('NAS: ' + r.error);
  }
});
/** Ruta del servidor (/media/Series/X) → la misma carpeta desde Windows (\\NAS\Multimedia\Series\X) */
function uncPathOf(serverPath) {
  const base = (serverSettings.libraryPath || '/media').replace(/\/+$/, '');
  const dest = settings.data.emuleDest;
  if (!dest || !serverPath?.startsWith(base + '/')) return null;
  return path.join(dest, ...serverPath.slice(base.length + 1).split('/'));
}
emuleService.on('update', snap => send('emule:update', snap));
emuleService.on('completed', ({ name, moved, problem }) => {
  const text = moved ? `Descarga terminada: ${name}\nCopiada al NAS; aparecerá en la biblioteca en unos segundos`
    : problem ? `Descarga terminada: ${name}\nNo se pudo copiar al NAS: ${problem}` : `Descarga terminada: ${name}`;
  send('toast', { type: problem ? 'error' : 'ok', text });
  // Si se ha copiado, el aviso de "Nuevo en CineLocal" llega del servidor; si no, avisar aquí
  if (!moved && Notification.isSupported() && win && !win.isFocused()) {
    new Notification({ title: 'Descarga terminada', body: name, icon: path.join(__dirname, '..', '..', 'build', 'icon.png') }).show();
  }
});
/** Como ipcMain.handle, pero sólo para administradores de CineLocal */
function adminHandle(ch, fn) {
  ipcMain.handle(ch, (...a) => {
    if (!isAdmin()) throw new Error('Sólo un administrador de CineLocal puede usar eMule');
    return fn(...a);
  });
}

// ---------- Letterboxd ----------
// Las búsquedas en TMDB para emparejar las películas pasan por el servidor (la clave de TMDB está allí)
const serverTmdb = () => ({
  enabled: remote.ready,
  language: serverSettings.metaLang || 'es-ES',
  search: (type, query, year) => remote.post('/api/meta/search', { type, query, year }),
  // sólo se usa para el póster y el título de una película por su id
  get: async (p) => {
    const id = +(p.match(/^\/movie\/(\d+)/)?.[1] || 0);
    if (!id) return null;
    const d = await remote.get('/api/title/movie/' + id);
    return { title: d.title, poster_path: d.poster ? d.poster.replace(/^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+/, '') : null };
  }
});
const letterboxd = new LetterboxdService({
  store: lbStore,
  tmdb: serverTmdb,
  // título+año de las películas de la biblioteca -> id de TMDB (evita búsquedas para lo que ya tienes)
  libraryIndex: () => {
    const m = new Map();
    for (const it of view().items) {
      const meta = it.type === 'movie' && it.meta;
      if (!meta?.tmdbId) continue;
      for (const t of [meta.title, meta.originalTitle, it.title]) if (t) m.set(lbKey(t, meta.year), meta.tmdbId);
    }
    return m;
  }
});
letterboxd.on('status', st => send('letterboxd:status', st));
letterboxd.on('updated', () => send('letterboxd:update', letterboxd.snapshot()));

/** Al abrir: sincronización completa si hace más de 3 días; si no, sólo lo último (RSS) */
function autoSyncLetterboxd() {
  const user = settings.data.lbUser;
  if (!user) return;
  const full = lbStore.data.user !== user || Date.now() - (lbStore.data.fullAt || 0) > 3 * 864e5;
  letterboxd.sync(user, { full }).catch(e => console.error('Letterboxd:', e.message));
}

function emuleTemplatePath() {
  try { return emule.installTemplate(DATA); } catch (e) { console.error('Plantilla de eMule:', e); return null; }
}

// ---------- actualizaciones ----------
const updater = new Updater({
  getSettings: () => settings.data,
  send,
  getWindow: () => win,
  icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
  dataDir: DATA
});

// ---------- IPC ----------
ipcMain.handle('settings:get', () => publicSettings());
ipcMain.handle('settings:set', async (_e, patch) => {
  const before = { ...settings.data };
  patch = { ...patch };
  if ('nasPassword' in patch) { patch.nasPasswordEnc = encryptSecret(patch.nasPassword); delete patch.nasPassword; }
  for (const k of ['nasHasPassword', 'remoteTokenEnc', 'loggedIn', 'remoteUrl', 'remoteUser']) delete patch[k];
  // lo del servidor, al servidor (cada usuario sus preferencias; un administrador, también la biblioteca)
  const toServer = Object.fromEntries(Object.entries(patch).filter(([k]) => SERVER_KEYS.has(k)));
  if (Object.keys(toServer).length) serverSettings = await remote.post('/api/settings', toServer);
  const local = Object.fromEntries(Object.entries(patch).filter(([k]) => !SERVER_KEYS.has(k)));
  settings.data = { ...settings.data, ...local };
  const s = settings.data;
  if (['nasUser', 'nasPasswordEnc', 'emuleDest'].some(k => before[k] !== s[k])) await nas.disconnect();
  if (['emuleEnabled', 'emulePort', 'emulePassword'].some(k => before[k] !== s[k])) emuleService.restart();
  if (before.lbUser !== s.lbUser) {
    if (lbStore.data.user && lbStore.data.user !== s.lbUser) letterboxd.reset();
    if (s.lbUser) letterboxd.sync(s.lbUser, { full: true }).catch(() => {});
  }
  if (['discordEnabled', 'discordClientId', 'discordDiscreet'].some(k => before[k] !== s[k])) discord.configure(discordConfig(s));
  return publicSettings();
});
// Carpeta del NAS para eMule: inicia sesión con el usuario escrito (contraseña vacía = la guardada) y comprueba que se ve
adminHandle('nas:test', async (_e, { dest, user, password }) => {
  const host = cleanHost(dest);
  if (!/^\\\\[^\\]+\\[^\\]+/.test(dest || '')) return { ok: false, error: 'Escribe la carpeta como \\\\NAS\\Multimedia' };
  await nas.disconnect();
  if (user) {
    const r = await nas.connect(host, { host, user, password: password || decryptSecret(settings.data.nasPasswordEnc), roots: [dest] });
    if (!r.ok) return r;
  }
  if (!fs.existsSync(dest)) return { ok: false, error: `No se puede abrir ${dest}. ¿Estás en casa o con la VPN conectada?` };
  return { ok: true };
});
ipcMain.handle('tmdb:test', async (_e, key) => remote.post('/api/tmdb/test', { key }));

// ---------- sesión en CineLocal Server ----------
ipcMain.handle('session:get', () => ({ loggedIn: remote.ready, url: settings.data.remoteUrl, user: settings.data.remoteUser }));
// Iniciar sesión: se guarda el token (cifrado), nunca la contraseña
ipcMain.handle('remote:login', async (_e, { url, user, password, otp }) => {
  const r = await remote.login(url, { user: String(user || '').trim(), password, otp });
  if (!r.ok) return { ok: false, error: r.error, otp: !!r.otp };
  settings.data = { ...settings.data, remoteUrl: normUrl(url), remoteUser: r.user, remoteTokenEnc: encryptSecret(r.token) };
  configureRemote();
  remoteView = null;
  await startSession();
  return { ok: true, user: r.user, admin: r.admin, settings: publicSettings() };
});
ipcMain.handle('remote:logout', async () => {
  if (remote.ready) await remote.post('/api/logout').catch(() => {});
  settings.data = { ...settings.data, remoteTokenEnc: '' };
  configureRemote();
  await startSession();
  return publicSettings();
});
ipcMain.handle('remote:me', () => me);

// ---------- biblioteca (del servidor) ----------
ipcMain.handle('library:get', async () => (remote.ready && !remoteView ? remoteFetch() : view()));
ipcMain.handle('library:scan', () => (isAdmin() ? remoteFetch('/api/scan', 'POST') : remoteFetch()));
ipcMain.handle('library:item', (_e, id) => remote.get('/api/item/' + encodeURIComponent(id)));
ipcMain.handle('library:refreshMeta', () => remote.post('/api/meta/refresh'));
ipcMain.handle('meta:person', (_e, id) => remote.get('/api/person/' + encodeURIComponent(id)).catch(() => null));
ipcMain.handle('meta:providerList', () => remote.get('/api/providers'));
ipcMain.handle('meta:providers', (_e, movieId) => remote.get('/api/providers/' + encodeURIComponent(movieId)));
ipcMain.handle('meta:search', (_e, { type, query, year }) => remote.post('/api/meta/search', { type, query, year }));
// ficha de TMDB de un título que no está en la biblioteca (para entrar igualmente a verla)
ipcMain.handle('meta:title', (_e, { type, id }) => remote.get(`/api/title/${type === 'series' ? 'series' : 'movie'}/${+id}`));
ipcMain.handle('meta:identify', async (_e, { itemId, tmdbId }) => {
  const it = await remote.post('/api/meta/identify', { itemId, tmdbId });
  send('library:updated', await remoteFetch());
  return it;
});

ipcMain.handle('play', async (_e, { itemId, episodeId, fromStart }) => {
  const it = view().items.find(i => i.id === itemId);
  if (!it) throw new Error('Elemento no encontrado');
  const mpv = findMpv(settings.data.mpvPath, process.resourcesPath);
  if (!mpv) return { ok: false, error: 'mpv-missing' };
  let playlist;
  try { playlist = await remotePlaylist(it, { itemId, episodeId, fromStart }); }
  catch (e) { return { ok: false, error: e.message }; }
  const uiDir = playerUiDir();
  if (embeddedMode()) {
    playEmbedded({ mpv, playlist, uiDir });
  } else {
    player.play({ mpv, playlist, settings: playSettings(), uiDir });
    if (settings.data.minimizeOnPlay && win) setTimeout(() => win.minimize(), 1200);
  }
  return { ok: true };
});

/**
 * Lista de reproducción de CineLocal Server: el servidor da el punto de reanudación (su progreso) y enlaces
 * firmados al archivo y a los subtítulos externos, que mpv (y sus miniaturas) abren sin más
 */
async function remotePlaylist(it, q) {
  const r = await remote.post('/api/play', { ...q, client: 'app' });
  if (!r?.playlist?.length) throw new Error('No se encuentra el vídeo en el servidor');
  if (r.prefs) serverSettings = { ...serverSettings, ...r.prefs };
  return r.playlist.map(e => {
    const ep = e.episodeId ? it.episodes.find(x => x.id === e.episodeId) : null;
    return {
      path: remote.abs(e.url),
      title: e.title,
      start: e.start,
      subs: (e.subs || []).map(s => ({ path: remote.abs(s.url), lang: s.lang, title: s.title })),
      discord: mediaInfo(it, ep, ep ? null : lbSlugOf(it)),
      skip: e.skip,
      remoteId: e.id
    };
  });
}

ipcMain.handle('progress:mark', async (_e, { paths, watched }) => {
  const p = await remote.post('/api/progress/mark', { paths, watched });
  if (remoteView) remoteView.progress = p;
  return p;
});
ipcMain.handle('requests:get', () => remote.get('/api/requests'));
ipcMain.handle('requests:op', (_e, q) => remote.post('/api/requests', q));
ipcMain.handle('access:list', (_e, q) => remote.get('/api/access?' + new URLSearchParams(q)));
ipcMain.handle('log:error', (_e, e) => remote.post('/api/log', e).catch(() => null));
// Listas propias (además de Mi lista): crear, renombrar, borrar y añadir o quitar títulos
ipcMain.handle('lists:op', async (_e, q) => {
  const lists = await remote.post('/api/lists', q);
  if (remoteView) remoteView.lists = lists;
  return lists;
});
ipcMain.handle('favorites:toggle', async (_e, id) => {
  const f = await remote.post('/api/favorites/toggle', { id });
  if (remoteView) remoteView.favorites = f;
  return f;
});

ipcMain.handle('window:toggleFullscreen', () => { win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
ipcMain.handle('window:setFullscreen', (_e, v) => { win.setFullScreen(!!v); return win.isFullScreen(); });
ipcMain.handle('window:isFullscreen', () => win.isFullScreen());

ipcMain.handle('dialog:pickMpv', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: process.platform === 'win32' ? [{ name: 'mpv', extensions: ['exe'] }] : []
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:open', (_e, url) => {
  if (/^https:\/\//.test(url)) shell.openExternal(url);
});
ipcMain.handle('shell:showItem', (_e, p) => shell.showItemInFolder(p));
ipcMain.handle('clipboard:write', (_e, text) => clipboard.writeText(String(text)));

ipcMain.handle('update:status', () => updater.status());
ipcMain.handle('update:check', () => updater.check());
ipcMain.handle('update:install', () => updater.install());
ipcMain.handle('update:open', () => updater.openRelease());

ipcMain.handle('discord:status', () => discord.status);
ipcMain.handle('discord:test', (_e, clientId) => discord.test(clientId));

ipcMain.handle('letterboxd:get', () => letterboxd.snapshot());
ipcMain.handle('letterboxd:sync', async (_e, full = true) => {
  try { await letterboxd.sync(settings.data.lbUser, { full }); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('letterboxd:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Exportación de Letterboxd', properties: ['openFile'], filters: [{ name: 'Exportación de Letterboxd (.zip)', extensions: ['zip'] }] });
  if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
  try { await letterboxd.importExport(fs.readFileSync(r.filePaths[0]), settings.data.lbUser); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('letterboxd:clear', () => { letterboxd.reset(); return letterboxd.snapshot(); });

ipcMain.handle('emule:get', () => emuleService.snapshot);
adminHandle('emule:info', async () => ({ ...(await emule.inspect(settings.data.emulePath)), templatePath: emuleTemplatePath() }));
adminHandle('emule:test', async (_e, { port, password }) => {
  try { await new emule.EmuleClient({ port, password }).transfers(); return { ok: true }; }
  catch (e) { return { ok: false, code: e.code, error: e.message }; }
});
adminHandle('emule:launch', async () => {
  const inst = await emule.findInstall(settings.data.emulePath);
  if (!inst) return { ok: false, error: 'No se encuentra emule.exe. Selecciónalo en Ajustes.' };
  if (!(await emule.isRunning())) emule.startEmule(inst.exe);
  setTimeout(() => emuleService.tick(), 4000);
  return { ok: true };
});
adminHandle('emule:refresh', () => emuleService.refresh().catch(() => emuleService.snapshot));
adminHandle('emule:connect', () => emuleService.run(c => c.connect()).then(() => true));
adminHandle('emule:servers', () => emuleService.query(c => c.servers()));
adminHandle('emule:connectServer', (_e, a = {}) => emuleService.run(c => c.connectServer(a.ip, a.port)));
adminHandle('emule:disconnect', () => emuleService.run(c => c.disconnectServer()));
adminHandle('emule:kad', (_e, a = {}) => emuleService.run(c => c.kad(a.op, a.ip, a.port)));
adminHandle('emule:updateServerMet', (_e, url) => emuleService.run(c => c.updateServerMet(url)));
adminHandle('emule:search', (_e, q) => emuleService.run(c => c.search({ method: settings.data.emuleSearchMethod, ...q })));
adminHandle('emule:results', () => emuleService.run(c => c.searchResults()));
adminHandle('emule:download', (_e, hash) => emuleService.run(c => c.download(hash)).then(() => true));
adminHandle('emule:addLink', (_e, link) => emuleService.run(c => c.addLink(link)).then(() => true));
adminHandle('emule:op', (_e, { hash, op }) => emuleService.run(c => c.fileOp(hash, op)).then(() => true));
ipcMain.handle('dialog:pickEmule', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'eMule', extensions: ['exe'] }] });
  return r.canceled ? null : r.filePaths[0];
});
