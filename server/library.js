// Biblioteca del servidor: escaneo, metadatos de TMDB y estado de cada usuario.
// Misma lógica que src/main/main.js (escaneo, needsFetch, fetchItem…), pero sin Electron y con
// el progreso, la lista y lo último visto guardados por usuario de DSM.
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { scanLibraries } = require('../src/main/scanner');
const { TMDB } = require('../src/main/metadata');
const { LibraryWatcher, isStable } = require('../src/main/watcher');
const { GENERIC_EPISODE } = require('../src/main/discord');
const { applyListOp, withWatchlist, WATCHLIST } = require('../src/main/lists');
const { store } = require('./store');

const DEFAULT_SETTINGS = {
  libraryPath: process.env.CINELOCAL_LIBRARY || '/media',
  extraLibraryPaths: [],
  tmdbKey: '',
  metaLang: 'es-ES',          // idioma principal de las fichas: el de quien no elige otro (y con el que se empareja)
  metaLangs: ['es-ES', 'en-US'],   // idiomas que se tienen descargados además del principal (y los que elija alguien)
  audioLang: 'spa',
  subLang: 'spa',
  subMode: 'foreign',          // always | foreign | off
  autoplayNext: true,
  autoWatch: true,
  singleFileFolderAsMovie: false,
  // cómo está organizada cada carpeta de la biblioteca: { [ruta]: { mode: 'categories', movies, series, folderMovie, ignore } }
  libraryLayouts: {},
  myProviders: [],
  region: 'ES',
  discordClientId: ''         // aplicación de Discord (Rich Presence) para todos: cada uno lo activa en su app
};
// lo único que se puede cambiar desde la web (el resto de ajustes de la app de escritorio no aplican aquí)
const EDITABLE = new Set(Object.keys(DEFAULT_SETTINGS));
// preferencias de cada usuario: las suyas pisan las del servidor (que quedan como valor por defecto)
// (userMetaLang: el idioma de las fichas de cada uno; sin él, el principal del servidor)
const PREF_KEYS = new Set(['audioLang', 'subLang', 'subMode', 'autoplayNext', 'myProviders', 'userMetaLang', 'lbMarkWatched']);
const LANG_RE = /^[a-z]{2}-[A-Z]{2}$/;

// al cambiar cómo se elige la ficha de TMDB (findBest / rankResults en metadata.js) se sube y se empareja todo de nuevo
const MATCHER_VERSION = 3;

const cut = (s, n) => s && s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;

/** Organización de cada carpeta de biblioteca, sólo con lo que entiende el escáner */
function cleanLayouts(v) {
  const words = a => (Array.isArray(a) ? a : String(a || '').split(',')).map(s => String(s).trim()).filter(Boolean).slice(0, 30).map(s => s.slice(0, 80));
  const out = {};
  for (const [root, l] of Object.entries(v && typeof v === 'object' ? v : {})) {
    if (!root || l?.mode !== 'categories') continue;
    out[root] = { mode: 'categories', movies: words(l.movies), series: words(l.series), folderMovie: l.folderMovie !== false, ignore: words(l.ignore) };
  }
  return out;
}

/** Ficha reducida para la lista (ver Library.view) */
function slimMeta(m) {
  const out = {
    slim: true, tmdbId: m.tmdbId, title: m.title, originalTitle: m.originalTitle, year: m.year, endYear: m.endYear,
    runtime: m.runtime, rating: m.rating, certification: m.certification, genres: m.genres,
    poster: m.poster, backdrop: m.backdrop, logo: m.logo, overview: cut(m.overview, 260),
    directors: m.directors, director: m.director, creators: m.creators, people: (m.cast || []).slice(0, 8).map(c => c.name),
    collection: m.collection ? { id: m.collection.id, name: m.collection.name, poster: m.collection.poster, backdrop: m.collection.backdrop } : null,
    recs: m.recs
  };
  // series: nombres y fotogramas de los episodios (Continuar viendo), sin sinopsis
  if (m.seasons) {
    out.seasons = Object.fromEntries(Object.entries(m.seasons).map(([n, s]) => [n, {
      name: s.name, episodes: Object.fromEntries(Object.entries(s.episodes || {}).map(([k, e]) => [k, { name: e.name, still: e.still }]))
    }]));
  }
  return out;
}

class Library extends EventEmitter {
  /**
   * La usan CineLocal Server y, en modo local, la app de escritorio (src/main/local.js).
   * defaults: ajustes iniciales propios · fetch: el de Electron en la app · prepare(roots): antes de cada escaneo
   * (la app inicia sesión en el NAS); si devuelve { ok: false, error }, el error se muestra con los del escaneo.
   */
  constructor(dataDir, { defaults = {}, fetch = globalThis.fetch, prepare = null } = {}) {
    super();
    this.dir = dataDir;
    this.fetch = fetch;
    this.prepare = prepare;
    this.settings = store(dataDir, 'settings.json', { ...DEFAULT_SETTINGS, ...defaults });
    this.library = store(dataDir, 'library.json', { items: [], scannedAt: 0, error: null });
    this.metadata = store(dataDir, 'metadata.json', {});
    // fichas en los otros idiomas: metadata-en-US.json… { [id]: { tmdbId, meta, at } }, siempre de la misma película
    // que la ficha principal (el emparejamiento y las correcciones van sólo en metadata.json)
    this.langStores = new Map();
    this.people = store(dataDir, 'people.json', {});
    // carátulas elegidas a mano: { [id del título]: { poster } }; aparte de metadata.json para que no las borre recargar las fichas
    this.custom = store(dataDir, 'custom.json', {});
    this.users = new Map();
    this.fetching = false;
    this.fetchAgain = false;
    this.scanning = null;
    this.rescan = false;
    this.watcher = new LibraryWatcher();
    this.watcher.on('change', () => this.scan());
    this.index = new Map();
    this.reindex();
    // lista de títulos ya preparada (por idioma y ligera o completa): se rehace sólo cuando cambia la biblioteca
    this.gen = 0;
    this.itemsCache = new Map();
    this.on('library', () => { this.gen++; this.itemsCache.clear(); });
  }

  start() {
    this.restartWatcher();
    this.scan();
  }

  // ---------- usuarios ----------
  /** Progreso, lista y último visto de un usuario de DSM (un archivo por usuario) */
  user(name) {
    const key = String(name).toLowerCase();
    if (!this.users.has(key)) {
      const safe = key.replace(/[^a-z0-9._-]/g, '_');
      const raw = store(path.join(this.dir, 'users'), safe + '.json', { progress: {}, favorites: [], lists: [], lastPlayed: {}, prefs: {} });
      // ver: sube con cada cambio (progreso, listas, preferencias), para saber si su biblioteca guardada sigue valiendo
      let ver = 0;
      const u = {
        get data() { return raw.data; }, set data(v) { ver++; raw.data = v; },
        save() { ver++; raw.save(); }, flushSync: () => raw.flushSync(), get ver() { return ver; }
      };
      this.users.set(key, u);
      // la Watchlist sustituye a «Mi lista»: la primera vez se crea con lo que había en ella
      if (!(u.data.lists || []).some(l => l.id === WATCHLIST)) {
        u.data.lists = withWatchlist(u.data.lists || [], (u.data.favorites || []).map(id => this.entryOf(id)).filter(Boolean));
        u.data.favorites = [];
        u.save();
      }
    }
    return this.users.get(key);
  }

  /** Entrada de lista de un título de la biblioteca (por su ficha de TMDB; sin ficha, por su id). Como entryOf() de app.js */
  entryOf(id) {
    const it = this.library.data.items.find(i => i.id === id);
    if (!it) return null;
    const m = this.metadata.data[id]?.meta;
    const base = { type: it.type, title: m?.title || it.title, year: m?.year || it.year || null };
    return m?.tmdbId ? { key: `${it.type}:${m.tmdbId}`, tmdb: m.tmdbId, ...base, poster: m.poster || null } : { key: 'id:' + id, id, ...base };
  }

  /**
   * Para las apps de antes de la Watchlist («Mi lista» = favorites): los títulos de la biblioteca que están en ella,
   * en su orden
   */
  favoritesOf(u) {
    const wl = (u.lists || []).find(l => l.id === WATCHLIST);
    if (!wl?.items.length) return [];
    // por su ficha o, si se guardó antes de tenerla, por su id
    const byKey = new Map();
    for (const it of this.library.data.items) {
      const t = this.metadata.data[it.id]?.meta?.tmdbId;
      if (t) byKey.set(`${it.type}:${t}`, it.id);
      byKey.set('id:' + it.id, it.id);
    }
    return [...new Set(wl.items.map(e => byKey.get(e.key)).filter(Boolean))];
  }

  // ---------- ajustes ----------
  /** Ajustes del servidor con las preferencias del usuario encima */
  publicSettings(isAdmin, userName) {
    const s = { ...this.settings.data, ...(userName ? this.prefs(userName) : {}) };
    if (!isAdmin) s.tmdbKey = s.tmdbKey ? '••••••••' : '';
    return s;
  }

  prefs(userName) {
    return this.user(userName).data.prefs || {};
  }

  /** Preferencias propias (cualquier usuario); el resto de claves se ignoran */
  setPrefs(userName, patch) {
    const u = this.user(userName);
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => PREF_KEYS.has(k)));
    if (clean.userMetaLang && !LANG_RE.test(clean.userMetaLang)) delete clean.userMetaLang;
    u.data.prefs = { ...(u.data.prefs || {}), ...clean };
    u.save();
    // un idioma que no tiene nadie: se descarga
    const l = clean.userMetaLang, s = this.settings.data;
    if (l && l !== s.metaLang && !(s.metaLangs || []).includes(l)) {
      this.settings.data = { ...s, metaLangs: [...(s.metaLangs || []), l] };
      this.fetchMissingMetadata();
    }
  }

  /**
   * Notificaciones de la campana: sus peticiones resueltas y lo añadido a la biblioteca (los últimos 30 días), lo
   * más nuevo primero; `seenAt` es hasta cuándo las ha visto (la primera vez, ahora: no se estrena con todo sin leer).
   * requests: las suyas (server/requests.js list()), o [] sin servidor · watch: claves «movie:id» de su watchlist de
   * Letterboxd: lo nuevo que estaba en una de sus watchlists se avisa aparte («De tu watchlist»)
   */
  notifications(userName, requests = [], watch = []) {
    const u = this.user(userName);
    const prefs = u.data.prefs || (u.data.prefs = {});
    if (!prefs.notifSeenAt) { prefs.notifSeenAt = Date.now(); u.save(); }
    const since = Date.now() - 30 * 864e5;
    const lang = this.langOf(userName);
    const small = p => p ? p.replace(/\/w\d+\//, '/w185/') : null;
    const out = [];
    for (const r of requests) {
      if (!r.mine || r.status === 'pending' || !(r.resolvedAt > since)) continue;
      out.push({ kind: 'request', id: r.id, at: r.resolvedAt, status: r.status, title: r.title, year: r.year || null, reply: r.reply || null, poster: small(r.poster) });
    }
    const wl = (u.data.lists || []).find(l => l.id === WATCHLIST);
    const wanted = new Set([...(wl?.items || []).map(e => e.key), ...watch]);
    for (const it of this.library.data.items) {
      if (!(it.added > since)) continue;
      const m = this.metaOf(it.id, lang);
      const tmdb = this.metadata.data[it.id]?.tmdbId;
      out.push({ kind: tmdb && wanted.has(`${it.type}:${tmdb}`) ? 'watchlist' : 'new', id: it.id, at: Math.round(it.added), type: it.type, title: m?.title || it.title, year: m?.year || it.year || null, poster: small(this.custom.data[it.id]?.poster?.startsWith('https:') ? this.custom.data[it.id].poster : m?.poster) });
    }
    out.sort((a, b) => b.at - a.at);
    return { items: out.slice(0, 40), seenAt: prefs.notifSeenAt };
  }

  /** La campana abierta: todo lo de hasta ahora queda visto */
  notificationsSeen(userName) {
    const u = this.user(userName);
    u.data.prefs = { ...(u.data.prefs || {}), notifSeenAt: Date.now() };
    u.save();
    return u.data.prefs.notifSeenAt;
  }

  /** Idioma de las fichas de un usuario (sin usuario o sin elegir, el principal) */
  langOf(userName) {
    const l = userName ? this.prefs(userName).userMetaLang : null;
    return l && LANG_RE.test(l) ? l : this.settings.data.metaLang;
  }

  /** Idiomas descargados además del principal */
  extraLangs() {
    const s = this.settings.data;
    return [...new Set((s.metaLangs || []).filter(l => LANG_RE.test(l) && l !== s.metaLang))];
  }

  langStore(lang) {
    if (!this.langStores.has(lang)) this.langStores.set(lang, store(this.dir, `metadata-${lang}.json`, {}));
    return this.langStores.get(lang);
  }

  /** Ficha de un título en un idioma; mientras no esté descargada, la del idioma principal */
  metaOf(id, lang) {
    const m = this.metadata.data[id];
    if (!m || m.failed) return null;
    if (!lang || lang === this.settings.data.metaLang) return m.meta;
    const x = this.langStore(lang).data[id];
    return x && x.tmdbId === m.tmdbId ? x.meta : m.meta;
  }

  async setSettings(patch) {
    const before = { ...this.settings.data };
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => EDITABLE.has(k) && !PREF_KEYS.has(k)));
    if (clean.libraryLayouts) clean.libraryLayouts = cleanLayouts(clean.libraryLayouts);
    if ('discordClientId' in clean) clean.discordClientId = /^\d{17,20}$/.test(String(clean.discordClientId).trim()) ? String(clean.discordClientId).trim() : '';
    if (!Object.keys(clean).length) return this.settings.data;
    this.settings.data = { ...this.settings.data, ...clean };
    const s = this.settings.data;
    const roots = x => this.roots(x).join('|');
    if (roots(before) !== roots(s) || before.autoWatch !== s.autoWatch) this.restartWatcher();
    if (roots(before) !== roots(s) || before.singleFileFolderAsMovie !== s.singleFileFolderAsMovie
      || JSON.stringify(before.libraryLayouts || {}) !== JSON.stringify(s.libraryLayouts || {})) await this.scan();
    else if (before.tmdbKey !== s.tmdbKey || before.metaLang !== s.metaLang
      || JSON.stringify(before.metaLangs) !== JSON.stringify(s.metaLangs)) this.fetchMissingMetadata();
    return s;
  }

  roots(s = this.settings.data) {
    const seen = new Set();
    return [s.libraryPath, ...(s.extraLibraryPaths || [])]
      .map(p => (p || '').trim()).filter(Boolean)
      .filter(p => { const k = path.resolve(p); return !seen.has(k) && seen.add(k); });
  }

  restartWatcher() {
    this.watcher.stop();
    if (this.settings.data.autoWatch !== false) this.watcher.start(this.roots());
  }

  tmdb(lang) {
    const s = this.settings.data;
    return new TMDB(s.tmdbKey, lang || s.metaLang || 'es-ES', this.fetch, s.region || 'ES');
  }

  // ---------- vista ----------
  /**
   * Biblioteca para un usuario. slim: sólo lo que hace falta para carátulas, filas, filtros y búsqueda
   * (la ficha completa se pide al abrir el título con item()); con miles de títulos la completa pesa varios MB.
   */
  view(userName, { slim = false } = {}) {
    const u = this.user(userName).data;
    const items = this.items(this.langOf(userName), slim);
    return {
      items,
      scannedAt: this.library.data.scannedAt,
      error: this.library.data.error,
      nas: null,
      progress: u.progress,
      favorites: this.favoritesOf(u),
      lists: u.lists || [],
      mpv: 'web',            // en la web no hace falta mpv: no mostrar el aviso
      hasKey: !!this.settings.data.tmdbKey,
      fetching: this.fetching
    };
  }

  /** Los títulos con su ficha en un idioma (la misma lista para todos los que lo usan; no se modifica) */
  items(lang, slim) {
    const k = lang + '|' + slim;
    let c = this.itemsCache.get(k);
    if (!c) {
      const list = this.library.data.items.map(it => {
        const meta = this.metaOf(it.id, lang);
        return this.withCustom({ ...it, meta: slim && meta ? slimMeta(meta) : meta, metaFailed: !!this.metadata.data[it.id]?.failed });
      });
      c = { list, json: null };
      this.itemsCache.set(k, c);
    }
    return c.list;
  }

  /** La misma lista ya en JSON (para montar la respuesta de /api/library sin volver a convertirla) */
  itemsJson(userName, slim) {
    const lang = this.langOf(userName);
    this.items(lang, slim);
    const c = this.itemsCache.get(lang + '|' + slim);
    return c.json || (c.json = JSON.stringify(c.list));
  }

  /** Cambia si cambia algo de lo que lleva su /api/library: la biblioteca, su idioma o sus datos */
  cacheKey(userName) {
    return `${this.gen}|${this.langOf(userName)}|${this.user(userName).ver}`;
  }

  /** Títulos de la biblioteca con su ficha (para dar por conseguidas las peticiones) */
  withMeta() {
    return this.library.data.items.map(it => ({ type: it.type, meta: this.metadata.data[it.id]?.meta || null }));
  }

  /** Un título con su ficha completa, en el idioma del usuario */
  item(id, userName) {
    const it = this.library.data.items.find(i => i.id === id);
    if (!it) return null;
    const m = this.metadata.data[it.id];
    return this.withCustom({ ...it, meta: this.metaOf(it.id, this.langOf(userName)), metaFailed: !!m?.failed });
  }

  /**
   * Carátula elegida a mano: va en `poster` (también sin ficha de TMDB). Si es otra de TMDB, además sustituye a la
   * de la ficha, y así la ven también las apps que sólo miran meta.poster (Android, Discord); una imagen subida
   * (data:) sólo va en `poster`, para no copiarla en las listas.
   */
  withCustom(it) {
    const poster = this.custom.data[it.id]?.poster;
    if (!poster) return it;
    const meta = it.meta && /^https:/.test(poster) ? { ...it.meta, poster } : it.meta;
    return { ...it, meta, poster };
  }

  /** Carátulas de TMDB para elegir, con la que se usa ahora */
  async posters(id) {
    const it = this.item(id);
    if (!it) throw new Error('Elemento no encontrado');
    const tmdbId = this.metadata.data[id]?.meta?.tmdbId;
    const list = tmdbId ? await this.requireTmdb().posters(it.type, tmdbId) : [];
    return { posters: list, current: it.poster || it.meta?.poster || null, custom: !!it.poster, tmdb: this.metadata.data[id]?.meta?.poster || null };
  }

  /** Cambia la carátula: una de TMDB, una imagen subida (data:image/…, ya reducida) o null para volver a la de la ficha */
  setPoster(id, poster) {
    if (!this.library.data.items.some(i => i.id === id)) throw new Error('Elemento no encontrado');
    if (poster == null || poster === '') delete this.custom.data[id];
    else {
      const tmdb = /^https:\/\/image\.tmdb\.org\/t\/p\/\w+\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(poster);
      const upload = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(poster);
      if (!tmdb && !upload) throw new Error('Imagen no válida');
      if (upload && poster.length > 400 * 1024) throw new Error('La imagen es demasiado grande');
      this.custom.data[id] = { poster, at: Date.now() };
    }
    this.custom.save();
    this.emit('library');
    return this.item(id);
  }

  /** Archivo de vídeo por su id (el de la película o el del episodio); nunca por ruta */
  file(id) {
    return this.index.get(id) || null;
  }

  reindex() {
    this.index.clear();
    for (const it of this.library.data.items) {
      if (it.type === 'movie') this.index.set(it.id, { path: it.path, item: it });
      else for (const e of it.episodes) this.index.set(e.id, { path: e.path, item: it, episode: e });
    }
  }

  // ---------- escaneo ----------
  scan() {
    if (this.scanning) { this.rescan = true; return this.scanning; }
    this.scanning = this.doScan().catch(e => console.error('Escaneo:', e)).finally(() => {
      this.scanning = null;
      if (this.rescan) { this.rescan = false; this.scan(); }
    });
    return this.scanning;
  }

  async doScan() {
    const prevItems = this.library.data.items || [];
    const hadLibrary = prevItems.length > 0;
    const known = new Set();
    for (const it of prevItems) {
      if (it.type === 'movie') known.add(it.path);
      else for (const e of it.episodes) known.add(e.path);
    }
    const prevIds = new Set(prevItems.map(i => i.id));
    const roots = this.roots();
    const isUnder = (p, root) => { const rel = path.relative(root, p); return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel); };
    const prep = this.prepare ? await Promise.resolve(this.prepare(roots)).catch(e => ({ ok: false, error: e.message })) : null;

    const r = roots.length
      ? scanLibraries(roots, { singleFileFolderAsMovie: this.settings.data.singleFileFolderAsMovie, layouts: this.settings.data.libraryLayouts || {} })
      : { ok: false, items: [], failed: [{ root: '', error: 'No hay ninguna carpeta de biblioteca configurada' }] };
    if (r.ok && r.failed.length) {
      const ids = new Set(r.items.map(i => i.id));
      for (const it of prevItems) if (!ids.has(it.id) && r.failed.some(f => isUnder(it.path, f.root))) r.items.push(it);
      r.items.sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true }));
    }
    r.error = r.failed.map(f => f.error).join(' · ') || null;
    if (prep && !prep.ok) r.error = 'NAS: ' + prep.error + (r.error ? ' · ' + r.error : '');
    // alguna carpeta no se ha podido leer (quizá se cerró la sesión en el NAS): la app la vuelve a abrir la próxima vez
    else if (r.failed.length) this.emit('scan:failed', r.failed);

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
    if (pending) this.watcher.schedule(8000);

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

    if (!r.ok && hadLibrary) this.library.data = { ...this.library.data, error: r.error };
    else this.library.data = { items, scannedAt: Date.now(), error: r.error };
    this.reindex();
    this.emit('library');
    if (added.length) this.announceNew(added);
    this.fetchMissingMetadata();
  }

  async announceNew(added) {
    const api = this.tmdb();
    if (api.enabled) {
      for (const a of added) if (this.needsFetch(a.it, this.settings.data.metaLang)) await this.fetchItem(api, a.it).catch(() => {});
    }
    this.emit('new', added.map(({ it, eps, newShow }) => {
      const m = this.metadata.data[it.id]?.meta;
      let sub = it.type === 'movie' ? 'Película' : 'Serie nueva';
      if (it.type === 'series' && !newShow) {
        sub = eps.length === 1 ? `Nuevo episodio · T${eps[0].season}:E${eps[0].episode}` : `${eps.length} episodios nuevos`;
      }
      return { id: it.id, title: m?.title || it.title, sub, poster: m?.poster ? m.poster.replace('/w500/', '/w185/') : null };
    }));
  }

  // ---------- metadatos ----------
  needsFetch(it, lang) {
    const m = this.metadata.data[it.id];
    if (!m) return true;
    if (!m.manual && m.matcher !== MATCHER_VERSION) return true;
    if (m.lang !== lang && !m.failed) return true;
    if (it.type === 'movie' && !m.failed && m.meta && !Array.isArray(m.meta.directors)) return true;
    // fichas de antes de las sagas y las recomendaciones
    if (!m.failed && m.meta && !Array.isArray(m.meta.recs)) return true;
    if (m.failed) return Date.now() - (m.at || 0) > 1000 * 60 * 60 * 24 * 3;
    if (it.type === 'series') {
      const have = Object.keys(m.meta?.seasons || {}).map(Number);
      // temporada nueva en disco (p. ej. se está copiando la serie): se pide ya; si TMDB no la tiene, se reintenta a las 6 h
      const missing = it.seasons.filter(s => !have.includes(s));
      if (missing.some(s => !(m.asked || []).includes(s))) return true;
      if (missing.length && Date.now() - (m.at || 0) > 1000 * 60 * 60 * 6) return true;
    }
    return false;
  }

  async fetchItem(api, it, forcedId) {
    const lang = this.settings.data.metaLang;
    try {
      const prev = this.metadata.data[it.id];
      let id = forcedId || (prev?.manual || prev?.matcher === MATCHER_VERSION ? prev?.tmdbId : null);
      if (!id) id = await api.findBest(it.type, it.title, it.year);
      if (!id) {
        this.metadata.data[it.id] = { failed: true, at: Date.now(), lang, matcher: MATCHER_VERSION };
      } else if (!forcedId && id === prev?.tmdbId && prev.meta && prev.lang === lang && prev.matcher !== MATCHER_VERSION
        && (it.type === 'movie' || it.seasons.every(s => prev.meta.seasons?.[s]))) {
        // el emparejador nuevo da la misma película: vale la ficha que había
        prev.matcher = MATCHER_VERSION;
      } else {
        const meta = it.type === 'movie' ? await api.movie(id) : await api.tv(id, it.seasons);
        this.metadata.data[it.id] = { tmdbId: id, meta, at: Date.now(), lang, matcher: MATCHER_VERSION, manual: !!forcedId || !!prev?.manual, asked: it.type === 'series' ? it.seasons : undefined };
        for (const l of this.extraLangs()) await this.fetchLang(it, l);
      }
    } catch (e) {
      if (/no válida/.test(e.message)) throw e;
      console.warn('Metadatos:', it.title, e.message);
    }
    this.metadata.save();
  }

  /** ¿Falta la ficha de un título en otro idioma (o es de antes que la principal)? */
  needsLangFetch(it, lang) {
    const m = this.metadata.data[it.id];
    if (!m || m.failed || !m.tmdbId || !m.meta) return false;
    const x = this.langStore(lang).data[it.id];
    if (!x || x.tmdbId !== m.tmdbId || x.at < m.at) return true;
    return it.type === 'series' && Object.keys(m.meta.seasons || {}).some(n => !x.meta?.seasons?.[n]);
  }

  /** La ficha de un título en otro idioma, de la misma película o serie que la principal */
  async fetchLang(it, lang) {
    const m = this.metadata.data[it.id];
    if (!m?.tmdbId) return;
    try {
      const api = this.tmdb(lang);
      const seasons = Object.keys(m.meta?.seasons || {}).map(Number);
      const meta = it.type === 'movie' ? await api.movie(m.tmdbId) : await api.tv(m.tmdbId, seasons.length ? seasons : it.seasons);
      const st = this.langStore(lang);
      st.data[it.id] = { tmdbId: m.tmdbId, meta, at: Date.now() };
      st.save();
    } catch (e) {
      if (/no válida/.test(e.message)) throw e;
      console.warn(`Metadatos (${lang}):`, it.title, e.message);
    }
  }

  async fetchMissingMetadata(force = false) {
    const api = this.tmdb();
    if (!api.enabled) return;
    if (this.fetching) { this.fetchAgain = true; return; }
    this.fetching = true;
    try {
      const lang = this.settings.data.metaLang;
      const todo = this.library.data.items.filter(it => force || this.needsFetch(it, lang)).map(it => ({ it }));
      let done = 0;
      this.emit('meta:progress', { done, total: todo.length });
      const queue = [...todo];
      // cuando se acaban, lo que falte en los otros idiomas (de lo que acaba de pedir ya los trae fetchItem)
      let langsQueued = false;
      const worker = async () => {
        for (;;) {
          if (!queue.length && !langsQueued) {
            langsQueued = true;
            const more = this.extraLangs().flatMap(l => this.library.data.items.filter(it => this.needsLangFetch(it, l)).map(it => ({ it, l })));
            todo.push(...more);
            queue.push(...more);
          }
          if (!queue.length) break;
          const { it, l } = queue.shift();
          if (l) await this.fetchLang(it, l); else await this.fetchItem(api, it);
          done++;
          this.emit('meta:progress', { done, total: todo.length, title: it.title });
          if (done % 25 === 0) this.emit('library');
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    } catch (e) {
      this.emit('toast', { type: 'error', text: e.message });
    } finally {
      this.fetching = false;
      this.emit('meta:progress', null);
      this.emit('library');
      if (this.fetchAgain) { this.fetchAgain = false; this.fetchMissingMetadata(); }
    }
  }

  async person(id, userName) {
    const lang = this.langOf(userName);
    // en el idioma principal con su id, como siempre; en los otros, aparte
    const key = lang === this.settings.data.metaLang ? id : `${id}:${lang}`;
    const c = this.people.data[key];
    if (c && Date.now() - c.at < 1000 * 60 * 60 * 24 * 30 && c.lang === lang && Array.isArray(c.data?.films) && c.data.films.every(f => 'popularity' in f)) return c.data;
    const api = this.tmdb(lang);
    if (!api.enabled) return null;
    try {
      const data = await api.person(id);
      this.people.data[key] = { data, at: Date.now(), lang };
      this.people.save();
      return data;
    } catch { return c?.data || null; }
  }

  /** Ficha de TMDB de un título que no está en la biblioteca (película o serie, sin temporadas) */
  async title(type, id, userName) {
    this.titleCache ||= new Map();
    const lang = this.langOf(userName);
    const k = `${type}:${id}:${lang}`;
    const c = this.titleCache.get(k);
    if (c && Date.now() - c.at < 1000 * 60 * 60 * 12) return c.data;
    const api = this.requireTmdb(lang);
    const data = type === 'series' ? await api.tv(id) : await api.movie(id);
    if (this.titleCache.size > 500) this.titleCache.clear();
    this.titleCache.set(k, { data, at: Date.now() });
    return data;
  }

  search({ type, query, year }, userName) {
    return this.requireTmdb(this.langOf(userName)).search(type, query, year);
  }

  async identify({ itemId, tmdbId }, userName) {
    const it = this.library.data.items.find(i => i.id === itemId);
    if (!it) throw new Error('Elemento no encontrado');
    await this.fetchItem(this.tmdb(), it, tmdbId);
    this.emit('library');
    return this.view(userName).items.find(i => i.id === itemId);
  }

  requireTmdb(lang) {
    const api = this.tmdb(lang);
    if (!api.enabled) throw new Error('Falta la API key de TMDB en Ajustes');
    return api;
  }

  // ---------- estado del usuario ----------
  /** Progreso que envía el reproductor web (ruta del archivo como clave, igual que en la app de escritorio) */
  reportProgress(userName, id, pos, dur) {
    const f = this.file(id);
    if (!f || !(dur > 0)) return null;
    const u = this.user(userName);
    const prev = u.data.progress[f.path] || {};
    const watched = pos / dur >= 0.92 || (dur - pos < 120 && dur > 600);
    u.data.progress[f.path] = { pos: watched ? 0 : pos, dur, watched: watched || (prev.watched && pos < 30), at: Date.now() };
    u.save();
    return u.data.progress;
  }

  markProgress(userName, { paths, watched }) {
    const u = this.user(userName);
    const valid = new Set([...this.index.values()].map(f => f.path));
    for (const p of paths || []) {
      if (!valid.has(p)) continue;
      if (watched) u.data.progress[p] = { pos: 0, dur: u.data.progress[p]?.dur || 0, watched: true, at: Date.now() };
      else delete u.data.progress[p];
    }
    u.save();
    return u.data.progress;
  }

  /** Listas propias del usuario (src/main/lists.js): create · rename · delete · toggle */
  listOp(userName, q) {
    const u = this.user(userName);
    u.data.lists = applyListOp(u.data.lists, q);
    u.save();
    return u.data.lists;
  }

  /** «Mi lista» de las apps de antes de la Watchlist: añade o quita el título de la Watchlist */
  toggleFavorite(userName, id) {
    const u = this.user(userName);
    const fresh = this.entryOf(id);
    // si ya está (por su ficha o, guardado antes de tenerla, por su id), se quita esa entrada
    const wl = u.data.lists.find(l => l.id === WATCHLIST);
    const entry = fresh && (wl?.items.find(x => x.key === fresh.key || x.key === 'id:' + id) || fresh);
    if (entry) {
      u.data.lists = applyListOp(u.data.lists, { op: 'toggle', id: WATCHLIST, entry });
      u.save();
    }
    return this.favoritesOf(u.data);
  }

  setLastPlayed(userName, itemId, episodeId) {
    const u = this.user(userName);
    u.data.lastPlayed[itemId] = { episodeId: episodeId || null, at: Date.now() };
    u.save();
  }

  /** Lista de reproducción como la de la app de escritorio, con ids en vez de rutas */
  playlist(userName, { itemId, episodeId, fromStart }) {
    const it = this.view(userName).items.find(i => i.id === itemId);
    if (!it) return null;
    const prog = this.user(userName).data.progress;
    const startOf = p => {
      const pr = prog[p];
      if (fromStart || !pr || pr.watched) return 0;
      return pr.pos > 10 && pr.dur - pr.pos > 30 ? pr.pos : 0;
    };
    const skip = (type, e) => it.meta?.tmdbId ? { type, tmdbId: it.meta.tmdbId, ...(e && { season: e.season, episode: e.episode }) } : null;
    if (it.type === 'movie') return [{ id: it.id, itemId, title: it.meta?.title || it.title, start: startOf(it.path), skip: skip('movie') }];
    const eps = it.episodes;
    const idx = Math.max(0, eps.findIndex(e => e.id === episodeId));
    const list = { ...this.settings.data, ...this.prefs(userName) }.autoplayNext ? eps.slice(idx) : [eps[idx]];
    const series = it.meta?.title || it.title;
    return list.map((e, i) => {
      const em = it.meta?.seasons?.[e.season]?.episodes?.[e.episode];
      const name = em?.name && !GENERIC_EPISODE.test(em.name.trim()) ? ' · ' + em.name : '';
      return { id: e.id, itemId, episodeId: e.id, title: `${series} · T${e.season}:E${e.episode}${name}`, start: i === 0 ? startOf(e.path) : 0, skip: skip('tv', e) };
    });
  }
}

module.exports = { Library, DEFAULT_SETTINGS };
