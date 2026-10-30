// Biblioteca local: carpetas de este PC o del NAS por SMB (\\NAS\Carpeta), sin CineLocal Server.
// Usa la misma biblioteca que el servidor (server/library.js) con un único usuario y responde a las mismas
// rutas /api/… que CineLocal Server, así main.js trata igual los dos modos (ver RemoteServer en remote.js).
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { Library } = require('../../server/library');
const { TMDB } = require('./metadata');
const { findExternalSubs } = require('./subs');

const USER = 'local';

class LocalServer extends EventEmitter {
  /** dataDir: carpeta de sus datos · oldDir: la de la biblioteca local de antes de la 1.16 (se importa la primera vez) */
  constructor({ dataDir, oldDir, fetch, prepare, version }) {
    super();
    this.dataDir = dataDir;
    this.oldDir = oldDir;
    this.fetchFn = fetch;
    this.prepare = prepare;
    this.version = version;
    this.library = null;
    this.timer = null;
    this.routes = this.buildRoutes();
  }

  get ready() { return !!this.library; }

  start() {
    if (this.library) return;
    importOld(this.oldDir, this.dataDir);
    const lib = new Library(this.dataDir, { defaults: { libraryPath: '' }, fetch: this.fetchFn, prepare: this.prepare });
    this.library = lib;
    const ev = (name, data) => { if (this.library === lib) this.emit('event', name, data); };
    lib.on('library', () => {
      // varias actualizaciones seguidas (metadatos) se juntan en una, como en el servidor
      clearTimeout(this.timer);
      this.timer = setTimeout(() => ev('library:changed', {}), 250);
    });
    lib.on('meta:progress', p => ev('meta:progress', p));
    lib.on('toast', t => ev('toast', t));
    lib.on('new', l => ev('library:new', l));
    lib.on('scan:failed', f => this.emit('scan:failed', f));
    lib.start();
  }

  stop() {
    const lib = this.library;
    if (!lib) return;
    this.library = null;
    clearTimeout(this.timer);
    lib.watcher.stop();
    this.flush(lib);
  }

  flush(lib = this.library) {
    if (!lib) return;
    for (const s of [lib.settings, lib.library, lib.metadata, lib.people, lib.custom]) s.flushSync();
    for (const u of lib.users.values()) u.flushSync();
  }

  /** Carpetas de la biblioteca (para iniciar sesión en el NAS antes de escanear) */
  roots() { return this.library ? this.library.roots() : []; }

  // ---------- como RemoteServer ----------
  async request(method, url, body) {
    if (!this.library) throw new Error('La biblioteca local no está activada');
    const u = new URL(url, 'http://local');
    const pathname = decodeURIComponent(u.pathname);
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(pathname);
      if (m) return r.handler({ p: m.groups || {}, q: u.searchParams, b: body || {} });
    }
    throw new Error('No disponible sin CineLocal Server');
  }

  get(p) { return this.request('GET', p); }
  post(p, body) { return this.request('POST', p, body); }
  /** Los vídeos son rutas de este PC o del NAS: mpv las abre tal cual */
  abs(p) { return p; }

  buildRoutes() {
    const routes = [];
    const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });
    const lib = () => this.library;
    const view = slim => lib().view(USER, { slim });

    route('GET', '/api/me', () => ({ user: USER, role: 'admin', admin: true, local: true, version: this.version }));
    route('GET', '/api/settings', () => lib().publicSettings(true, USER));
    route('POST', '/api/settings', async ({ b }) => {
      lib().setPrefs(USER, b);
      await lib().setSettings(b);
      return lib().publicSettings(true, USER);
    });
    route('POST', '/api/tmdb/test', async ({ b }) => {
      try { await new TMDB(b.key, 'es-ES', this.fetchFn).test(); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    });
    route('GET', '/api/library', ({ q }) => view(q.get('slim') === '1'));
    route('GET', '/api/item/:id', ({ p }) => {
      const it = lib().item(p.id);
      if (!it) throw new Error('Elemento no encontrado');
      return it;
    });
    route('POST', '/api/scan', async () => { await lib().scan(); return view(true); });
    route('POST', '/api/meta/refresh', () => { lib().fetchMissingMetadata(true); return true; });
    route('GET', '/api/person/:id', ({ p }) => lib().person(+p.id));
    route('GET', '/api/providers', () => lib().providerList());
    route('GET', '/api/providers/:id', ({ p }) => lib().providers(+p.id));
    route('GET', '/api/title/:type/:id', ({ p }) => lib().title(p.type === 'series' ? 'series' : 'movie', +p.id));
    route('POST', '/api/meta/search', ({ b }) => lib().search(b));
    route('POST', '/api/meta/identify', ({ b }) => lib().identify(b, USER));
    route('GET', '/api/item/:id/posters', ({ p }) => lib().posters(p.id));
    route('POST', '/api/item/:id/poster', ({ p, b }) => lib().setPoster(p.id, b.poster || null));

    // lista de reproducción con las rutas de los archivos (y los subtítulos externos de las películas)
    route('POST', '/api/play', ({ b }) => {
      const playlist = lib().playlist(USER, b);
      if (!playlist?.length) throw new Error('Elemento no encontrado');
      if (!fs.existsSync(lib().file(playlist[0].id)?.path || '')) throw new Error('No se encuentra el archivo de vídeo. ¿Está conectado el disco, o el PC llega al NAS?');
      lib().setLastPlayed(USER, b.itemId, b.episodeId);
      for (const e of playlist) {
        const f = lib().file(e.id);
        e.url = f.path;
        e.subs = f.episode ? [] : findExternalSubs(this.rootOf(f.path), lib().item(f.item.id));
      }
      const s = lib().publicSettings(true, USER);
      return { ok: true, playlist, prefs: { audioLang: s.audioLang, subLang: s.subLang, subMode: s.subMode, autoplayNext: s.autoplayNext } };
    });
    route('POST', '/api/progress', ({ b }) => {
      const prog = lib().reportProgress(USER, b.id, +b.pos, +b.dur);
      if (prog) this.emit('event', 'progress:updated', prog);
      return { ok: !!prog };
    });
    route('POST', '/api/progress/mark', ({ b }) => lib().markProgress(USER, b));
    route('POST', '/api/favorites/toggle', ({ b }) => lib().toggleFavorite(USER, b.id));
    route('POST', '/api/lists', ({ b }) => lib().listOp(USER, b));
    // peticiones y registro de actividad: sólo existen en CineLocal Server
    route('GET', '/api/requests', () => ({ items: [], pending: 0 }));
    route('GET', '/api/access', () => ({ items: [], total: 0, users: [] }));
    route('POST', '/api/log', () => ({ ok: true }));
    route('POST', '/api/logout', () => ({ ok: true }));
    return routes;
  }

  rootOf(p) {
    const roots = this.roots();
    return roots.find(r => { const rel = path.relative(r, p); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); }) || roots[0];
  }
}

/**
 * Hasta la 1.16 la biblioteca local guardaba sus datos sueltos en la carpeta de la app: se importan (fichas,
 * correcciones, progreso y Mi lista) la primera vez que se activa, para no volver a descargarlo todo.
 */
function importOld(oldDir, dataDir) {
  if (!oldDir || fs.existsSync(dataDir) || !fs.existsSync(path.join(oldDir, 'metadata.json'))) return;
  const read = name => { try { return JSON.parse(fs.readFileSync(path.join(oldDir, name), 'utf8')); } catch { return null; } };
  try {
    fs.mkdirSync(path.join(dataDir, 'users'), { recursive: true });
    for (const name of ['library.json', 'metadata.json', 'people.json']) {
      if (fs.existsSync(path.join(oldDir, name))) fs.copyFileSync(path.join(oldDir, name), path.join(dataDir, name));
    }
    const state = read('state.json') || {};
    const user = { progress: read('progress.json') || {}, favorites: state.favorites || [], lists: [], lastPlayed: state.lastPlayed || {}, prefs: {} };
    fs.writeFileSync(path.join(dataDir, 'users', USER + '.json'), JSON.stringify(user));
  } catch (e) { console.error('No se pudo importar la biblioteca local anterior:', e.message); }
}

module.exports = { LocalServer };
