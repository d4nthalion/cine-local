// Biblioteca del servidor: escaneo, metadatos de TMDB y estado de cada usuario.
// Misma lógica que src/main/main.js (escaneo, needsFetch, fetchItem…), pero sin Electron y con
// el progreso, la lista y lo último visto guardados por usuario de DSM.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const { scanLibraries, hashId } = require('../src/main/scanner');
const { TMDB } = require('../src/main/metadata');
const { LibraryWatcher, isStable } = require('../src/main/watcher');
const { GENERIC_EPISODE } = require('../src/main/discord');
const { applyListOp, withWatchlist, WATCHLIST } = require('../src/main/lists');
const { store } = require('./store');

const DEFAULT_SETTINGS = {
  libraryPath: process.env.CINELOCAL_LIBRARY || '/media',
  // nombre de cada NAS (las carpetas de la biblioteca agrupadas por su primera carpeta: /media, /nas2…)
  sourceLabels: {},
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
// imagen de una colección subida al servidor (setCollectionImage)
const COLL_IMG = /^\/api\/collection-image\/([a-f0-9]{24}\.(?:jpg|png|webp))$/;

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

/** ¿Está p dentro de la carpeta dir (no la propia carpeta)? */
function isInside(dir, p) {
  if (!dir || !p) return false;
  const rel = path.relative(dir, p);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
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
    // colecciones hechas a mano por los administradores (las de TMDB salen solas de las fichas):
    // { items: [{ id, name, description, items: [ids de títulos], createdAt, createdBy, updatedAt }] }
    this.collections = store(dataDir, 'collections.json', { items: [] });
    // qué puede ver cada usuario y si puede entrar; por defecto, todo. Lo cambian los administradores:
    // { users: { [nombre en minúsculas]: { mode: 'except' | 'only', items: [ids de títulos], blocked, mod } }, seen: { [nombre]: ms },
    //   folders: [{ path, users: [nombres] }] (carpetas privadas: sólo las ven esos usuarios y los administradores) }
    this.rules = store(dataDir, 'access.json', { users: {}, seen: {}, folders: [] });
    this.rulesVer = 0;
    // avisos que mandan los administradores (una película o serie recomendada, una colección o un mensaje):
    // { items: [{ id, kind: 'title' | 'collection' | 'message', target, name, items, title, text, popup, to: [nombres], createdAt, createdBy }] }
    this.announcements = store(dataDir, 'announcements.json', { items: [] });
    this.annVer = 0;
    this.visCache = new Map();
    // lo pone el servidor: a los administradores no se les limita nada
    this.isAdmin = () => false;
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

  // ---------- qué puede ver cada usuario ----------
  /** Su regla ({ mode, items, blocked }), o null si no tiene (o es administrador): lo ve todo */
  ruleOf(userName) {
    if (!userName || this.isAdmin(userName)) return null;
    return this.rules.data.users[String(userName).toLowerCase()] || null;
  }

  /** Ids de los títulos que puede ver, o null si puede verlo todo */
  visibleIds(userName) {
    if (!userName || this.isAdmin(userName)) return null;
    const key = String(userName).toLowerCase();
    const r = this.ruleOf(userName);
    // las carpetas privadas en las que no está
    const hidden = this.privateFolders().filter(f => !f.users.includes(key)).map(f => f.path);
    if (!r?.mode && !hidden.length) return null;
    const ver = this.gen + '|' + this.rulesVer;
    const c = this.visCache.get(key);
    if (c?.ver === ver) return c.ids;
    const picked = new Set(r?.items || []);
    const ids = new Set(this.library.data.items.filter(i => {
      if (r?.mode && picked.has(i.id) !== (r.mode === 'only')) return false;
      // lo que se le ha elegido uno a uno («Sólo…») lo ve aunque esté en una carpeta privada
      return !hidden.some(f => isInside(f, i.path)) || (r?.mode === 'only' && picked.has(i.id));
    }).map(i => i.id));
    this.visCache.set(key, { ver, ids });
    return ids;
  }

  /** ¿Puede ver este título (o el episodio o la película de este archivo)? */
  canSee(userName, id) {
    const ids = this.visibleIds(userName);
    return !ids || ids.has(this.index.get(id)?.item.id || id);
  }

  // ---------- carpetas privadas: sólo las ven los usuarios elegidos (y los administradores) ----------
  privateFolders() {
    return this.rules.data.folders || [];
  }

  /** Hace privada una carpeta (de una de las de la biblioteca) con quién puede verla, o deja de serlo (remove) */
  setFolder({ path: dir, users, remove } = {}) {
    dir = String(dir || '').trim().replace(/[\\/]+$/, '');
    if (!this.roots().some(r => isInside(r, dir))) throw new Error('La carpeta tiene que estar dentro de la biblioteca');
    const all = this.rules.data.folders || (this.rules.data.folders = []);
    const i = all.findIndex(f => f.path === dir);
    if (remove) { if (i >= 0) all.splice(i, 1); }
    else {
      const list = Array.isArray(users) ? [...new Set(users.filter(u => typeof u === 'string').map(u => u.toLowerCase().trim()).filter(Boolean))] : (all[i]?.users || []);
      if (i >= 0) all[i] = { path: dir, users: list }; else all.push({ path: dir, users: list });
    }
    this.rulesVer++;
    this.rules.save();
    this.emit('rules', null);
  }

  /** Las carpetas de la biblioteca (uno o dos niveles por debajo de cada raíz) que tienen títulos, para elegir cuál hacer privada */
  folderChoices() {
    const out = new Set();
    for (const it of this.library.data.items) {
      const r = this.roots().find(x => isInside(x, it.path));
      if (!r) continue;
      const parts = path.relative(r, it.path).split(/[\\/]/).slice(0, -1).slice(0, 2);
      for (let n = 1; n <= parts.length; n++) out.add(path.join(r, ...parts.slice(0, n)).replace(/\\/g, '/'));
    }
    return [...out].sort((a, b) => a.localeCompare(b, 'es'));
  }

  /** «danthalion-nas › Peticiones»: el nombre del NAS y la carpeta dentro de él */
  folderLabel(dir) {
    const s = this.sources().find(x => x.roots.some(r => r === dir || isInside(r, dir)));
    const r = s?.roots.find(x => x === dir || isInside(x, dir));
    const rel = r ? path.relative(s.key, dir).replace(/\\/g, '/') : dir;
    return s ? `${s.label} › ${rel || '/'}` : dir;
  }

  /** Un administrador le ha quitado el acceso (a los administradores no se les puede quitar: lo comprueba auth.role()) */
  isBlocked(userName) {
    return !!userName && !!this.rules.data.users[String(userName).toLowerCase()]?.blocked;
  }

  /**
   * Cambia lo que puede ver: mode 'all' (todo), 'except' (todo menos items) u 'only' (sólo items), y si puede entrar.
   * Lo que no se envía se queda como estaba.
   */
  setRule(userName, { mode, items, blocked, mod, folders } = {}) {
    const key = String(userName || '').toLowerCase().trim();
    if (!key) throw new Error('Falta el usuario');
    const r = { ...(this.rules.data.users[key] || {}) };
    if (mode !== undefined) {
      if (!['all', 'except', 'only'].includes(mode)) throw new Error('Modo no válido');
      if (mode === 'all') delete r.mode; else r.mode = mode;
    }
    if (items !== undefined) {
      if (!Array.isArray(items)) throw new Error('Lista de títulos no válida');
      const known = new Set(this.library.data.items.map(i => i.id));
      r.items = [...new Set(items.filter(id => typeof id === 'string' && known.has(id)))].slice(0, 20000);
    }
    if (blocked !== undefined) { if (blocked) r.blocked = true; else delete r.blocked; }
    if (mod !== undefined) {
      if (!Array.isArray(mod)) throw new Error('Permisos no válidos');
      const keys = new Set(this.sources().map(s => s.key));
      r.mod = [...new Set(mod.filter(k => keys.has(k)))];
      if (!r.mod.length) delete r.mod;
    }
    // las carpetas privadas que puede ver (las demás, no)
    if (Array.isArray(folders)) {
      for (const f of this.privateFolders()) {
        const has = f.users.includes(key), want = folders.includes(f.path);
        if (want && !has) f.users.push(key);
        if (!want && has) f.users = f.users.filter(u => u !== key);
      }
    }
    if (!r.mode) r.items = r.items || [];
    if (!r.mode && !r.blocked && !r.items.length && !r.mod) delete this.rules.data.users[key];
    else this.rules.data.users[key] = r;
    this.rulesVer++;
    this.rules.save();
    this.emit('rules', key);
    return this.ruleView(key);
  }

  /** Lo que ve un administrador de la regla de un usuario */
  ruleView(userName) {
    const key = String(userName).toLowerCase();
    const r = this.rules.data.users[key] || {};
    return {
      name: key, mode: r.mode || 'all', items: r.items || [], blocked: !!r.blocked, mod: r.mod || [],
      folders: this.privateFolders().filter(f => f.users.includes(key)).map(f => f.path), seenAt: this.rules.data.seen?.[key] || null
    };
  }

  /** Apunta cuándo se le vio por última vez (como mucho una vez cada 10 minutos) */
  seen(userName) {
    const key = String(userName).toLowerCase();
    const seen = this.rules.data.seen || (this.rules.data.seen = {});
    if (Date.now() - (seen[key] || 0) < 10 * 60e3) return;
    seen[key] = Date.now();
    this.rules.save();
  }

  // ---------- permisos de moderador: corregir las coincidencias de los títulos de un NAS ----------
  /** Los NAS de la biblioteca: sus carpetas agrupadas por la primera (/media, /nas2…), con el nombre que se les dé */
  sources() {
    const labels = this.settings.data.sourceLabels || {};
    const groups = new Map();
    for (const r of this.roots()) {
      const key = '/' + (r.replace(/\\/g, '/').split('/').filter(Boolean)[0] || '');
      if (!groups.has(key)) groups.set(key, { key, label: labels[key] || key.slice(1) || key, roots: [] });
      groups.get(key).roots.push(r);
    }
    return [...groups.values()];
  }

  /** El NAS de un título (por la carpeta de la película o de su primer episodio) */
  sourceOf(id) {
    const it = this.library.data.items.find(i => i.id === id);
    const p = it && (it.type === 'movie' ? it.path : it.episodes?.[0]?.path);
    if (!p) return null;
    const inside = r => { const rel = path.relative(r, p); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); };
    return this.sources().find(s => s.roots.some(inside))?.key || null;
  }

  /** ¿Puede corregir la coincidencia de este título? Los administradores, siempre; un moderador, en sus NAS */
  canModerate(userName, id) {
    if (this.isAdmin(userName)) return true;
    const mod = this.rules.data.users[String(userName).toLowerCase()]?.mod || [];
    return mod.length > 0 && mod.includes(this.sourceOf(id));
  }

  /** Las carpetas de los NAS que modera (la app enseña «Corregir coincidencia» en sus títulos) */
  modRoots(userName) {
    const mod = this.isAdmin(userName) ? [] : this.rules.data.users[String(userName).toLowerCase()]?.mod || [];
    return this.sources().filter(s => mod.includes(s.key)).flatMap(s => s.roots);
  }

  /** Nombres de los usuarios con datos guardados (progreso, listas…) o con regla */
  knownUsers() {
    let files = [];
    try { files = fs.readdirSync(path.join(this.dir, 'users')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)); } catch {}
    return [...new Set([...files, ...Object.keys(this.rules.data.users), ...Object.keys(this.rules.data.seen || {})])];
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
  notifications(userName, requests = [], watch = [], { announcements = false } = {}) {
    const u = this.user(userName);
    const prefs = u.data.prefs || (u.data.prefs = {});
    if (!prefs.notifSeenAt) { prefs.notifSeenAt = Date.now(); u.save(); }
    const cleared = new Set(prefs.notifCleared || []), clearedAt = prefs.notifClearedAt || 0;
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
      if (!(it.added > since) || !this.canSee(userName, it.id)) continue;
      const m = this.metaOf(it.id, lang);
      const tmdb = this.metadata.data[it.id]?.tmdbId;
      out.push({ kind: tmdb && wanted.has(`${it.type}:${tmdb}`) ? 'watchlist' : 'new', id: it.id, at: Math.round(it.added), type: it.type, title: m?.title || it.title, year: m?.year || it.year || null, poster: small(this.custom.data[it.id]?.poster?.startsWith('https:') ? this.custom.data[it.id].poster : m?.poster) });
    }
    for (const c of this.collectionsView(userName)) {
      if (!(c.createdAt > since) || c.createdBy?.toLowerCase() === String(userName).toLowerCase()) continue;
      const first = c.items.map(id => this.metaOf(id, lang)).find(m => m?.poster);
      out.push({ kind: 'collection', id: c.id, at: c.createdAt, title: c.name, year: null, poster: small(c.poster || first?.poster) });
    }
    // los avisos de los administradores, sólo a las apps que saben mostrarlos (las de antes los tomarían por títulos)
    if (announcements) out.push(...this.announcementsFor(userName));
    const kept = out.filter(n => n.at > clearedAt && !cleared.has(n.kind + ':' + n.id));
    kept.sort((a, b) => b.at - a.at);
    return { items: kept.slice(0, 40), seenAt: prefs.notifSeenAt };
  }

  /** Borra de la campana una notificación («kind:id») o todas las que hay hasta ahora */
  notificationsDismiss(userName, { key, all } = {}) {
    const u = this.user(userName);
    const prefs = u.data.prefs || (u.data.prefs = {});
    if (all) { prefs.notifClearedAt = Date.now(); prefs.notifCleared = []; }
    else if (typeof key === 'string' && key.length < 200) prefs.notifCleared = [...(prefs.notifCleared || []), key].slice(-500);
    u.save();
    return { ok: true };
  }

  // ---------- avisos de los administradores ----------
  /** Los avisos de los últimos 60 días que le tocan, con lo que puede ver (sin los de títulos que tiene ocultos) */
  announcementsFor(userName) {
    const me = String(userName).toLowerCase(), lang = this.langOf(userName);
    const since = Date.now() - 60 * 864e5;
    const small = p => p ? p.replace(/\/w\d+\//, '/w185/') : null;
    const byId = new Map(this.library.data.items.map(i => [i.id, i]));
    const vis = this.visibleIds(userName);
    const out = [];
    for (const a of this.announcements.data.items) {
      if (!(a.createdAt > since) || (a.to?.length && !a.to.includes(me))) continue;
      const base = { kind: 'admin', sub: a.kind, id: a.id, target: a.target || null, at: a.createdAt, text: a.text || '', popup: !!a.popup, by: a.createdBy || null };
      if (a.kind === 'title') {
        const it = byId.get(a.target);
        if (!it || (vis && !vis.has(it.id))) continue;
        const m = this.metaOf(it.id, lang);
        const custom = this.custom.data[it.id]?.poster;
        out.push({ ...base, type: it.type, title: m?.title || it.title, year: m?.year || it.year || null,
          poster: small(custom?.startsWith('https:') ? custom : m?.poster), backdrop: m?.backdrop?.replace('/original/', '/w1280/') || null });
      } else if (a.kind === 'collection') {
        const items = (a.items || []).filter(id => byId.has(id) && (!vis || vis.has(id)));
        if (!items.length) continue;
        const c = this.collections.data.items.find(x => x.id === a.target);
        const first = items.map(id => this.metaOf(id, lang)).find(m => m?.poster);
        out.push({ ...base, title: c?.name || a.name, items, poster: small(c?.poster || first?.poster),
          backdrop: c?.backdrop || items.map(id => this.metaOf(id, lang)?.backdrop).find(Boolean)?.replace('/original/', '/w1280/') || null });
      } else out.push({ ...base, title: a.title || 'Aviso' });
    }
    return out;
  }

  /**
   * create: { kind: 'title' (target: id de un título) | 'collection' (target, name, items) | 'message' (title), text, popup,
   * to: [nombres] (vacío: todos) } · delete: { id } · clear: todos. Sólo administradores (lo comprueba la ruta)
   */
  announcementOp(userName, q = {}) {
    const all = this.announcements.data.items;
    const str = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
    if (q.op === 'delete') {
      const i = all.findIndex(a => a.id === q.id);
      if (i < 0) throw new Error('Aviso no encontrado');
      all.splice(i, 1);
    } else if (q.op === 'clear') all.length = 0;
    else if (q.op === 'create') {
      const a = { id: 'a' + crypto.randomBytes(6).toString('hex'), kind: q.kind, text: str(q.text, 600), popup: !!q.popup,
        to: Array.isArray(q.to) ? [...new Set(q.to.filter(n => typeof n === 'string').map(n => n.toLowerCase().trim()).filter(Boolean))].slice(0, 200) : [],
        createdAt: Date.now(), createdBy: userName };
      const known = new Set(this.library.data.items.map(i => i.id));
      if (q.kind === 'title') {
        if (!known.has(q.target)) throw new Error('Ese título no está en la biblioteca');
        a.target = q.target;
      } else if (q.kind === 'collection') {
        a.target = str(q.target, 80);
        a.name = str(q.name, 120);
        a.items = Array.isArray(q.items) ? [...new Set(q.items.filter(id => known.has(id)))] : [];
        if (!a.name || !a.items.length) throw new Error('Elige una colección con títulos');
      } else if (q.kind === 'message') {
        a.title = str(q.title, 100);
        if (!a.title) throw new Error('Escribe el título del aviso');
      } else throw new Error('Tipo de aviso no válido');
      all.unshift(a);
      all.splice(300);
      this.announcements.save();
      this.annVer++;
      this.emit('announce', a);
      return a;
    } else throw new Error('Operación no válida');
    this.announcements.save();
    this.annVer++;
    this.emit('announce', null);
    return null;
  }

  // ---------- colecciones de los administradores ----------
  /**
   * Las colecciones con los títulos que siguen en la biblioteca, las más nuevas primero. Con userName, sólo con los
   * títulos que puede ver (y sin las que se quedan vacías)
   */
  collectionsView(userName) {
    const ids = (userName && this.visibleIds(userName)) || new Set(this.library.data.items.map(i => i.id));
    return this.collections.data.items
      .map(c => ({ ...c, items: c.items.filter(id => ids.has(id)) }))
      .filter(c => !userName || c.items.length)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Hasta cuándo ha visto el aviso de colecciones nuevas (la primera vez, ahora: no se estrena con todas) */
  collectionsSeenAt(userName) {
    const u = this.user(userName);
    const prefs = u.data.prefs || (u.data.prefs = {});
    // la primera vez, las de las dos últimas semanas: quien abre la app de tarde en tarde también se entera
    if (!prefs.collectionsSeenAt) { prefs.collectionsSeenAt = Date.now() - 14 * 864e5; u.save(); }
    return prefs.collectionsSeenAt;
  }

  collectionsSeen(userName) {
    const u = this.user(userName);
    u.data.prefs = { ...(u.data.prefs || {}), collectionsSeenAt: Date.now() };
    u.save();
    return u.data.prefs.collectionsSeenAt;
  }

  /** create (name, description, items, poster, backdrop) · update (id, …) · delete (id). Sólo administradores (lo comprueba la ruta) */
  collectionOp(userName, q = {}) {
    const all = this.collections.data.items;
    const known = new Set(this.library.data.items.map(i => i.id));
    const name = typeof q.name === 'string' ? q.name.trim().slice(0, 80) : null;
    const description = typeof q.description === 'string' ? q.description.trim().slice(0, 600) : null;
    const items = Array.isArray(q.items) ? [...new Set(q.items.filter(id => typeof id === 'string' && known.has(id)))].slice(0, 300) : null;
    // portada (vertical) y fondo (horizontal) elegidos a mano: imágenes de TMDB, o null para la automática
    const img = v => v === undefined ? undefined : typeof v === 'string' && (/^https:\/\/image\.tmdb\.org\/t\/p\/\w+\/[\w.-]+$/.test(v) || COLL_IMG.test(v)) ? v : null;
    const poster = img(q.poster), backdrop = img(q.backdrop);
    let c;
    if (q.op === 'create') {
      if (!name) throw new Error('Ponle un nombre a la colección');
      if (!items || items.length < 2) throw new Error('Una colección necesita al menos dos títulos');
      c = { id: 'c' + crypto.randomBytes(5).toString('hex'), name, description: description || '', items, poster: poster || null, backdrop: backdrop || null, createdAt: Date.now(), createdBy: userName, updatedAt: Date.now() };
      all.push(c);
    } else if (q.op === 'update') {
      c = all.find(x => x.id === q.id);
      if (!c) throw new Error('Colección no encontrada');
      if (name !== null) { if (!name) throw new Error('Ponle un nombre a la colección'); c.name = name; }
      if (description !== null) c.description = description;
      if (items !== null) { if (items.length < 2) throw new Error('Una colección necesita al menos dos títulos'); c.items = items; }
      // la imagen subida que se deja de usar, fuera
      if (poster !== undefined) { if (poster !== c.poster) this.removeCollectionImage(c.poster); c.poster = poster; }
      if (backdrop !== undefined) { if (backdrop !== c.backdrop) this.removeCollectionImage(c.backdrop); c.backdrop = backdrop; }
      c.updatedAt = Date.now();
    } else if (q.op === 'delete') {
      c = all.find(x => x.id === q.id);
      if (!c) throw new Error('Colección no encontrada');
      this.collections.data.items = all.filter(x => x !== c);
      this.removeCollectionImage(c.poster);
      this.removeCollectionImage(c.backdrop);
    } else throw new Error('Operación de colecciones no válida');
    this.collections.save();
    // cambia lo que lleva la biblioteca de todos: se rehace y las apps la vuelven a pedir
    this.emit('library');
    return c;
  }

  /**
   * Imagen subida para una colección (ya encuadrada en la app): portada o fondo. Se guarda en collection-images/ con un
   * nombre al azar (la sirve /api/collection-image/ sin sesión: el nombre no se puede adivinar)
   */
  setCollectionImage(id, kind, buf, ext) {
    const c = this.collections.data.items.find(x => x.id === id);
    if (!c) throw new Error('Colección no encontrada');
    if (!['poster', 'backdrop'].includes(kind)) throw new Error('Imagen no válida');
    const dir = path.join(this.dir, 'collection-images');
    fs.mkdirSync(dir, { recursive: true });
    const file = crypto.randomBytes(12).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(dir, file), buf);
    this.removeCollectionImage(c[kind]);
    c[kind] = '/api/collection-image/' + file;
    c.updatedAt = Date.now();
    this.collections.save();
    this.emit('library');
    return c;
  }

  /** Archivo de una imagen subida (null si el nombre no es de una) */
  collectionImagePath(file) {
    return /^[a-f0-9]{24}\.(jpg|png|webp)$/.test(file) ? path.join(this.dir, 'collection-images', file) : null;
  }

  removeCollectionImage(url) {
    const m = typeof url === 'string' && url.match(COLL_IMG);
    if (m) fs.rm(this.collectionImagePath(m[1]), { force: true }, () => {});
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
    const all = this.items(this.langOf(userName), slim);
    const vis = this.visibleIds(userName);
    const items = vis ? all.filter(i => vis.has(i.id)) : all;
    return {
      items,
      scannedAt: this.library.data.scannedAt,
      error: this.library.data.error,
      nas: null,
      progress: u.progress,
      favorites: this.favoritesOf(u),
      lists: u.lists || [],
      collections: this.collectionsView(userName),
      // colecciones nuevas desde la última vez (el aviso al estilo de las novedades de Steam)
      collectionsSeenAt: this.collectionsSeenAt(userName),
      // avisos de los administradores que salen al abrir la app (con el mismo «visto» que las colecciones)
      news: this.announcementsFor(userName).filter(a => a.popup),
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
    const vis = this.visibleIds(userName);
    if (vis) return JSON.stringify(c.list.filter(i => vis.has(i.id)));
    return c.json || (c.json = JSON.stringify(c.list));
  }

  /** Cambia si cambia algo de lo que lleva su /api/library: la biblioteca, su idioma o sus datos */
  cacheKey(userName) {
    return `${this.gen}|${this.langOf(userName)}|${this.user(userName).ver}|${this.rulesVer}|${this.annVer}`;
  }

  /** Títulos de la biblioteca con su ficha (para dar por conseguidas las peticiones) */
  withMeta() {
    return this.library.data.items.map(it => ({ type: it.type, meta: this.metadata.data[it.id]?.meta || null }));
  }

  /** Carpeta y ficha de cada serie: para dejar los episodios descargados junto a los demás */
  seriesFolders() {
    return this.library.data.items.filter(it => it.type === 'series')
      .map(it => ({ type: 'series', path: it.path, meta: { tmdbId: this.metadata.data[it.id]?.tmdbId || null } }));
  }

  /** Un título con su ficha completa, en el idioma del usuario */
  item(id, userName) {
    if (userName && !this.canSee(userName, id)) return null;
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

  /**
   * Ficha ya sabida de una película (su archivo) o una serie (su carpeta) que va a aparecer en el próximo escaneo,
   * como si se hubiera corregido a mano: lo que descarga aMule no se empareja por el nombre. No toca una que ya tenga.
   */
  pinMatch(type, p, tmdbId) {
    const id = hashId((type === 'movie' ? 'movie:' : 'series:') + p);
    if (this.metadata.data[id]?.tmdbId) return;
    this.metadata.data[id] = { tmdbId, manual: true, at: 0 };
    this.metadata.save();
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
