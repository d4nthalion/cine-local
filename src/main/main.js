const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, net, Notification, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanLibrary } = require('./scanner');
const { TMDB } = require('./metadata');
const { Player, findMpv } = require('./player');
const { WinEmbed } = require('./winembed');
const { findExternalSubs } = require('./subs');
const { LibraryWatcher, isStable } = require('./watcher');
const emule = require('./emule');
const { EmuleService } = require('./emule/service');

app.setAppUserModelId('com.cinelocal.app');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const DATA = app.getPath('userData');
const DEFAULT_LIBRARY = process.platform === 'win32' ? 'D:\\Películas y Series' : path.join(app.getPath('videos'));

const DEFAULT_SETTINGS = {
  libraryPath: DEFAULT_LIBRARY,
  tmdbKey: '',
  metaLang: 'es-ES',
  audioLang: 'spa',
  subLang: 'spa',
  subMode: 'foreign',          // always | foreign | off
  playerFullscreen: true,
  playerUi: 'modern',          // modern (uosc) | classic (OSC de mpv)
  playerMode: 'embedded',      // embedded (dentro de CineLocal) | window (ventana propia de mpv)
  startFullscreen: false,
  minimizeOnPlay: false,
  autoplayNext: true,
  autoWatch: true,               // detectar archivos nuevos automáticamente
  singleFileFolderAsMovie: false,
  mpvPath: '',
  extraMpvArgs: '',
  emuleEnabled: false,
  emulePort: 4711,
  emulePassword: '',
  emulePath: '',
  emuleMoveToLibrary: true,      // mover los vídeos terminados a la biblioteca
  emuleSearchMethod: 'global',
  myProviders: [],               // plataformas contratadas: [{ id, name }] (ids de TMDB)
  region: 'ES'                    // país de las plataformas (independiente del idioma de los metadatos)
};

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
const library = store('library.json', { items: [], scannedAt: 0, error: null });
const metadata = store('metadata.json', {});
const progress = store('progress.json', {});
const userState = store('state.json', { favorites: [], lastPlayed: {} });
const emuleState = store('emule.json', { tracked: {} });

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
  win.once('ready-to-show', () => win.show());

  win.on('enter-full-screen', () => { send('window:fullscreen', true); syncEmbeddedFullscreen(true); });
  win.on('leave-full-screen', () => { send('window:fullscreen', false); syncEmbeddedFullscreen(false); });
  win.on('maximize', () => { if (embedded && player.playing) player.setMaximized(true); });
  win.on('unmaximize', () => { if (embedded && player.playing) player.setMaximized(false); });
  // al restaurar desde la barra de tareas, volver a poner el vídeo delante
  win.on('restore', () => { if (embedded && player.playing) winEmbed.raise(embedded.hwnd); });
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

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { createWindow(); restartWatcher(); emuleService.restart(); if (embeddedMode()) winEmbed.start(); });
app.on('window-all-closed', () => {
  player.stop();
  winEmbed.stop();
  watcher.stop();
  emuleService.stop();
  for (const s of [settings, library, metadata, progress, userState, emuleState]) s.flushSync();
  app.quit();
});

// ---------- biblioteca ----------
function tmdb() {
  return new TMDB(settings.data.tmdbKey, settings.data.metaLang || 'es-ES', (u, o) => net.fetch(u, o), settings.data.region || 'ES');
}

function view() {
  const items = library.data.items.map(it => {
    const m = metadata.data[it.id];
    return { ...it, meta: m && !m.failed ? m.meta : null, metaFailed: !!m?.failed };
  });
  return {
    items,
    scannedAt: library.data.scannedAt,
    error: library.data.error,
    progress: progress.data,
    favorites: userState.data.favorites,
    mpv: findMpv(settings.data.mpvPath, process.resourcesPath),
    hasKey: !!settings.data.tmdbKey,
    fetching
  };
}

// ---------- escaneo + detección de novedades ----------
const watcher = new LibraryWatcher();
watcher.on('change', () => scan());

function restartWatcher() {
  watcher.stop();
  if (settings.data.autoWatch !== false) watcher.start(settings.data.libraryPath);
}

let scanning = null;
let rescan = false;

function scan() {
  if (scanning) { rescan = true; return scanning; }
  scanning = doScan().finally(() => {
    scanning = null;
    if (rescan) { rescan = false; scan(); }
  });
  return scanning;
}

async function doScan() {
  const prevItems = library.data.items || [];
  const hadLibrary = prevItems.length > 0;
  const known = new Set();
  for (const it of prevItems) {
    if (it.type === 'movie') known.add(it.path);
    else for (const e of it.episodes) known.add(e.path);
  }
  const prevIds = new Set(prevItems.map(i => i.id));

  const r = scanLibrary(settings.data.libraryPath, { singleFileFolderAsMovie: settings.data.singleFileFolderAsMovie });

  // Los archivos nuevos que aún se están copiando/descargando se dejan para más tarde
  let pending = false;
  const items = [];
  for (const it of r.items) {
    if (it.type === 'movie') {
      if (known.has(it.path) || isStable(it.path)) items.push(it); else pending = true;
    } else {
      const eps = it.episodes.filter(e => known.has(e.path) || isStable(e.path));
      if (eps.length < it.episodes.length) pending = true;
      if (eps.length) items.push({ ...it, episodes: eps, seasons: [...new Set(eps.map(e => e.season))].sort((a, b) => a - b) });
    }
  }
  if (pending) watcher.schedule(8000);

  // Novedades respecto al último escaneo (no en la primera ejecución)
  const added = [];
  if (hadLibrary && r.ok) {
    for (const it of items) {
      if (it.type === 'movie') { if (!known.has(it.path)) added.push({ it, eps: null, newShow: false }); }
      else {
        const eps = it.episodes.filter(e => !known.has(e.path));
        if (eps.length) added.push({ it, eps, newShow: !prevIds.has(it.id) });
      }
    }
  }

  // Si el disco no está, no borrar la biblioteca conocida
  if (!r.ok && hadLibrary) {
    library.data = { ...library.data, error: r.error };
  } else {
    library.data = { items, scannedAt: Date.now(), error: r.ok ? null : r.error };
  }
  send('library:updated', view());
  if (added.length) announceNew(added);
  fetchMissingMetadata();
  return view();
}

async function announceNew(added) {
  const api = tmdb();
  if (api.enabled) {
    for (const a of added) if (needsFetch(a.it, settings.data.metaLang)) await fetchItem(api, a.it).catch(() => {});
  }
  const list = added.map(({ it, eps, newShow }) => {
    const m = metadata.data[it.id]?.meta;
    const title = m?.title || it.title;
    let sub = it.type === 'movie' ? 'Película' : 'Serie nueva';
    if (it.type === 'series' && !newShow) {
      sub = eps.length === 1 ? `Nuevo episodio · T${eps[0].season}:E${eps[0].episode}` : `${eps.length} episodios nuevos`;
    }
    return { id: it.id, title, sub, poster: m?.poster ? m.poster.replace('/w500/', '/w185/') : null };
  });
  send('library:new', list);

  if (Notification.isSupported() && win && !win.isFocused()) {
    const n = new Notification({
      title: list.length === 1 ? 'Nuevo en CineLocal' : `${list.length} novedades en CineLocal`,
      body: list.slice(0, 4).map(x => `${x.title} — ${x.sub}`).join('\n') + (list.length > 4 ? '\n…' : ''),
      icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
      silent: false
    });
    n.on('click', () => {
      if (!win) return;
      if (win.isMinimized()) win.restore();
      win.show(); win.focus();
      send('open-item', list[0].id);
    });
    n.show();
  }
}

let fetching = false;
let fetchAgain = false;

const MATCHER_VERSION = 2;

function needsFetch(it, lang) {
  const m = metadata.data[it.id];
  if (!m) return true;
  if (!m.manual && m.matcher !== MATCHER_VERSION) return true;
  if (m.lang !== lang && !m.failed) return true;
  // fichas antiguas sin datos de dirección (foto/id): recargar detalles (no se vuelve a buscar)
  if (it.type === 'movie' && !m.failed && m.meta && !Array.isArray(m.meta.directors)) return true;
  if (m.failed) return Date.now() - (m.at || 0) > 1000 * 60 * 60 * 24 * 3; // reintenta a los 3 días
  if (it.type === 'series') {
    const have = Object.keys(m.meta?.seasons || {}).map(Number);
    if (it.seasons.some(s => !have.includes(s)) && Date.now() - (m.at || 0) > 1000 * 60 * 60 * 6) return true;
  }
  return false;
}

async function fetchItem(api, it, forcedId) {
  const lang = settings.data.metaLang;
  try {
    const prev = metadata.data[it.id];
    // Las coincidencias automáticas antiguas se recalculan con el buscador mejorado
    let id = forcedId || (prev?.manual || prev?.matcher === MATCHER_VERSION ? prev?.tmdbId : null);
    if (!id) id = await api.findBest(it.type, it.title, it.year);
    if (!id) {
      metadata.data[it.id] = { failed: true, at: Date.now(), lang, matcher: MATCHER_VERSION };
    } else {
      const meta = it.type === 'movie' ? await api.movie(id) : await api.tv(id, it.seasons);
      metadata.data[it.id] = { tmdbId: id, meta, at: Date.now(), lang, matcher: MATCHER_VERSION, manual: !!forcedId || !!prev?.manual };
    }
  } catch (e) {
    if (/no válida/.test(e.message)) throw e;
    console.warn('Metadatos:', it.title, e.message);
  }
  metadata.save();
}

async function fetchMissingMetadata(force = false) {
  const api = tmdb();
  if (!api.enabled) return;
  if (fetching) { fetchAgain = true; return; }
  fetching = true;
  try {
    const lang = settings.data.metaLang;
    const todo = library.data.items.filter(it => force || needsFetch(it, lang));
    let done = 0;
    send('meta:progress', { done, total: todo.length });
    const queue = [...todo];
    const worker = async () => {
      while (queue.length) {
        const it = queue.shift();
        await fetchItem(api, it);
        done++;
        send('meta:progress', { done, total: todo.length, title: it.title });
        if (done % 6 === 0) send('library:updated', view());
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  } catch (e) {
    send('toast', { type: 'error', text: e.message });
  } finally {
    fetching = false;
    send('meta:progress', null);
    send('library:updated', view());
    if (fetchAgain) { fetchAgain = false; fetchMissingMetadata(); }
  }
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

function buildPlaylist(item, episodeId, fromStart) {
  const prog = progress.data;
  const startOf = p => {
    const pr = prog[p];
    if (fromStart || !pr || pr.watched) return 0;
    return pr.pos > 10 && pr.dur - pr.pos > 30 ? pr.pos : 0;
  };
  if (item.type === 'movie') {
    const t = item.meta?.title || item.title;
    return [{ path: item.path, title: t, start: startOf(item.path), subs: findExternalSubs(settings.data.libraryPath, item) }];
  }
  const eps = item.episodes;
  let idx = Math.max(0, eps.findIndex(e => e.id === episodeId));
  const list = settings.data.autoplayNext ? eps.slice(idx) : [eps[idx]];
  const series = item.meta?.title || item.title;
  return list.map((e, i) => {
    const em = item.meta?.seasons?.[e.season]?.episodes?.[e.episode];
    const code = `T${e.season}:E${e.episode}`;
    return {
      path: e.path,
      title: `${series} · ${code}${em?.name ? ' · ' + em.name : ''}`,
      start: i === 0 ? startOf(e.path) : 0
    };
  });
}

player.on('progress', ({ path: p, pos, dur }) => {
  const prev = progress.data[p] || {};
  const watched = dur > 0 && (pos / dur >= 0.92 || dur - pos < 120 && dur > 600);
  progress.data[p] = { pos: watched ? 0 : pos, dur, watched: watched || (prev.watched && pos < 30), at: Date.now() };
  progress.save();
  send('progress:updated', progress.data);
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
  player.play({ mpv, playlist, settings: settings.data, uiDir, wid: hwnd });
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
  player.play({ mpv, playlist, settings: settings.data, uiDir });
  send('toast', { type: 'error', text: 'No se pudo integrar el reproductor en la ventana; se abre en una ventana aparte.' });
}

// ---------- eMule ----------
const emuleService = new EmuleService({
  getSettings: () => settings.data,
  getItems: () => view().items,
  state: emuleState
});
emuleService.on('update', snap => send('emule:update', snap));
emuleService.on('completed', ({ name, moved, problem }) => {
  if (moved) scan();
  const text = moved ? `Descarga terminada: ${name}\nMovida a la biblioteca`
    : problem ? `Descarga terminada: ${name}\nNo se pudo mover a la biblioteca: ${problem}` : `Descarga terminada: ${name}`;
  send('toast', { type: problem ? 'error' : 'ok', text });
  // Si se ha movido, el aviso de "Nuevo en CineLocal" llega con el escaneo; si no, avisar aquí
  if (!moved && Notification.isSupported() && win && !win.isFocused()) {
    new Notification({ title: 'Descarga terminada', body: name, icon: path.join(__dirname, '..', '..', 'build', 'icon.png') }).show();
  }
});

function emuleTemplatePath() {
  try { return emule.installTemplate(DATA); } catch (e) { console.error('Plantilla de eMule:', e); return null; }
}

// ---------- IPC ----------
ipcMain.handle('settings:get', () => ({ ...settings.data, defaults: DEFAULT_SETTINGS }));
ipcMain.handle('settings:set', async (_e, patch) => {
  const before = { ...settings.data };
  settings.data = { ...settings.data, ...patch };
  const s = settings.data;
  if (before.libraryPath !== s.libraryPath || before.autoWatch !== s.autoWatch) restartWatcher();
  if (before.libraryPath !== s.libraryPath) library.data = { items: [], scannedAt: 0, error: null };  // otra biblioteca: no anunciar todo como nuevo
  if (before.libraryPath !== s.libraryPath || before.singleFileFolderAsMovie !== s.singleFileFolderAsMovie) await scan();
  else if (before.tmdbKey !== s.tmdbKey || before.metaLang !== s.metaLang) fetchMissingMetadata();
  if (['emuleEnabled', 'emulePort', 'emulePassword'].some(k => before[k] !== s[k])) emuleService.restart();
  return s;
});
ipcMain.handle('tmdb:test', async (_e, key) => {
  try { await new TMDB(key, 'es-ES', (u, o) => net.fetch(u, o)).test(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('library:get', () => view());
ipcMain.handle('library:scan', () => scan());
ipcMain.handle('library:refreshMeta', () => { fetchMissingMetadata(true); return true; });

const people = store('people.json', {});
ipcMain.handle('meta:person', async (_e, id) => {
  const c = people.data[id];
  // las fichas guardadas antes de añadir la popularidad se vuelven a pedir
  if (c && Date.now() - c.at < 1000 * 60 * 60 * 24 * 30 && c.lang === settings.data.metaLang && Array.isArray(c.data?.films) && c.data.films.every(f => 'popularity' in f)) return c.data;
  const api = tmdb();
  if (!api.enabled) return null;
  try {
    const data = await api.person(id);
    people.data[id] = { data, at: Date.now(), lang: settings.data.metaLang };
    people.save();
    return data;
  } catch { return c?.data || null; }
});
let providerListCache = null;
ipcMain.handle('meta:providerList', async () => {
  const k = (settings.data.region || 'ES') + ':' + settings.data.metaLang;
  if (providerListCache?.k === k && Date.now() - providerListCache.at < 1000 * 60 * 60 * 24) return providerListCache.data;
  const api = tmdb();
  if (!api.enabled) throw new Error('Configura tu API key de TMDB en Ajustes');
  const data = await api.providerList();
  providerListCache = { k, data, at: Date.now() };
  return data;
});
const providersCache = new Map();
ipcMain.handle('meta:providers', async (_e, movieId) => {
  const k = movieId + ':' + (settings.data.region || 'ES');
  const c = providersCache.get(k);
  if (c && Date.now() - c.at < 1000 * 60 * 60 * 12) return c.data;
  const api = tmdb();
  if (!api.enabled) throw new Error('Configura tu API key de TMDB en Ajustes');
  const data = await api.watchProviders(movieId);
  providersCache.set(k, { data, at: Date.now() });
  return data;
});
ipcMain.handle('meta:search', async (_e, { type, query, year }) => {
  const api = tmdb();
  if (!api.enabled) throw new Error('Configura tu API key de TMDB en Ajustes');
  return api.search(type, query, year);
});
ipcMain.handle('meta:identify', async (_e, { itemId, tmdbId }) => {
  const it = library.data.items.find(i => i.id === itemId);
  if (!it) throw new Error('Elemento no encontrado');
  await fetchItem(tmdb(), it, tmdbId);
  const v = view();
  send('library:updated', v);
  return v.items.find(i => i.id === itemId);
});

ipcMain.handle('play', async (_e, { itemId, episodeId, fromStart }) => {
  const it = view().items.find(i => i.id === itemId);
  if (!it) throw new Error('Elemento no encontrado');
  const mpv = findMpv(settings.data.mpvPath, process.resourcesPath);
  if (!mpv) return { ok: false, error: 'mpv-missing' };
  const playlist = buildPlaylist(it, episodeId, fromStart);
  if (!playlist.length || !fs.existsSync(playlist[0].path)) return { ok: false, error: 'No se encuentra el archivo de vídeo. ¿Está conectado el disco?' };
  userState.data.lastPlayed[itemId] = { episodeId: episodeId || null, at: Date.now() };
  userState.save();
  const uiDir = playerUiDir();
  if (embeddedMode()) {
    playEmbedded({ mpv, playlist, uiDir });
  } else {
    player.play({ mpv, playlist, settings: settings.data, uiDir });
    if (settings.data.minimizeOnPlay && win) setTimeout(() => win.minimize(), 1200);
  }
  return { ok: true };
});

ipcMain.handle('progress:mark', (_e, { paths, watched }) => {
  for (const p of paths) {
    if (watched) progress.data[p] = { pos: 0, dur: progress.data[p]?.dur || 0, watched: true, at: Date.now() };
    else delete progress.data[p];
  }
  progress.save();
  return progress.data;
});

ipcMain.handle('favorites:toggle', (_e, id) => {
  const f = new Set(userState.data.favorites);
  f.has(id) ? f.delete(id) : f.add(id);
  userState.data.favorites = [...f];
  userState.save();
  return userState.data.favorites;
});

ipcMain.handle('window:toggleFullscreen', () => { win.setFullScreen(!win.isFullScreen()); return win.isFullScreen(); });
ipcMain.handle('window:setFullscreen', (_e, v) => { win.setFullScreen(!!v); return win.isFullScreen(); });
ipcMain.handle('window:isFullscreen', () => win.isFullScreen());

ipcMain.handle('dialog:pickFolder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], defaultPath: settings.data.libraryPath });
  return r.canceled ? null : r.filePaths[0];
});
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

ipcMain.handle('emule:get', () => emuleService.snapshot);
ipcMain.handle('emule:info', async () => ({ ...(await emule.inspect(settings.data.emulePath)), templatePath: emuleTemplatePath() }));
ipcMain.handle('emule:test', async (_e, { port, password }) => {
  try { await new emule.EmuleClient({ port, password }).transfers(); return { ok: true }; }
  catch (e) { return { ok: false, code: e.code, error: e.message }; }
});
ipcMain.handle('emule:launch', async () => {
  const inst = await emule.findInstall(settings.data.emulePath);
  if (!inst) return { ok: false, error: 'No se encuentra emule.exe. Selecciónalo en Ajustes.' };
  if (!(await emule.isRunning())) emule.startEmule(inst.exe);
  setTimeout(() => emuleService.tick(), 4000);
  return { ok: true };
});
ipcMain.handle('emule:refresh', () => emuleService.refresh().catch(() => emuleService.snapshot));
ipcMain.handle('emule:connect', () => emuleService.run(c => c.connect()).then(() => true));
ipcMain.handle('emule:search', (_e, q) => emuleService.run(c => c.search({ method: settings.data.emuleSearchMethod, ...q })));
ipcMain.handle('emule:results', () => emuleService.run(c => c.searchResults()));
ipcMain.handle('emule:download', (_e, hash) => emuleService.run(c => c.download(hash)).then(() => true));
ipcMain.handle('emule:addLink', (_e, link) => emuleService.run(c => c.addLink(link)).then(() => true));
ipcMain.handle('emule:op', (_e, { hash, op }) => emuleService.run(c => c.fileOp(hash, op)).then(() => true));
ipcMain.handle('dialog:pickEmule', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'eMule', extensions: ['exe'] }] });
  return r.canceled ? null : r.filePaths[0];
});
