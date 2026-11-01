// Letterboxd de cada usuario en el servidor, para verlo igual en la web y en el escritorio.
// El servidor no puede leer letterboxd.com (Cloudflare pide un navegador): lo sube la app de escritorio al
// sincronizar, o se importa desde la web la exportación ZIP de Letterboxd. Las películas de la biblioteca vistas en
// Letterboxd se marcan como vistas en el progreso del usuario (cada archivo una vez: lo desmarcado no se vuelve a marcar).
const path = require('path');
const EventEmitter = require('events');
const { LetterboxdService, keyOf } = require('../src/main/letterboxd');
const { store } = require('./store');

class LetterboxdUsers extends EventEmitter {
  /** library: la de server/library.js (fichas, progreso y preferencias de cada usuario) */
  constructor(dataDir, library) {
    super();
    this.dir = path.join(dataDir, 'users');
    this.library = library;
    this.services = new Map();
  }

  service(userName) {
    const key = String(userName).toLowerCase();
    if (!this.services.has(key)) {
      const safe = key.replace(/[^a-z0-9._-]/g, '_');
      const st = store(this.dir, safe + '.letterboxd.json', { films: {}, ids: {}, user: '', syncedAt: 0, fullAt: 0, source: null, marked: [] });
      const svc = new LetterboxdService({
        store: st,
        tmdb: () => this.library.tmdb(this.library.langOf(userName)),
        libraryIndex: () => this.index()
      });
      // sin navegador no hay ficha de Letterboxd que consultar: lo que TMDB no empareje se queda sin emparejar
      svc.fetcher = { get: async () => { throw new Error('El servidor no puede abrir letterboxd.com'); }, close() {} };
      svc.on('status', s => this.emit('status', key, s));
      svc.on('updated', () => this.emit('updated', key));
      this.services.set(key, svc);
    }
    return this.services.get(key);
  }

  /** título+año de las películas de la biblioteca -> id de TMDB (como en src/main/main.js) */
  index() {
    const m = new Map();
    for (const it of this.library.library.data.items) {
      const meta = it.type === 'movie' && this.library.metaOf(it.id);
      if (!meta?.tmdbId) continue;
      for (const t of [meta.title, meta.originalTitle, it.title]) if (t) m.set(keyOf(t, meta.year), meta.tmdbId);
    }
    return m;
  }

  snapshot(userName) { return this.service(userName).snapshot(); }

  /** Lo guardado tal cual, para que la app de escritorio se ponga al día */
  raw(userName) {
    const { user, films, ids, syncedAt, fullAt, source } = this.service(userName).store.data;
    return { user, films, ids, syncedAt, fullAt, source };
  }

  /** La app de escritorio ha sincronizado (o importado) y sube el resultado */
  upload(userName, d) {
    const svc = this.service(userName);
    const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    svc.store.data = {
      ...svc.store.data,
      user: String(d?.user || '').slice(0, 60), films: obj(d?.films), ids: obj(d?.ids),
      syncedAt: +d?.syncedAt || Date.now(), fullAt: +d?.fullAt || 0, source: d?.source === 'export' ? 'export' : 'profile'
    };
    svc.emit('updated');
    return svc.snapshot();
  }

  /** Exportación ZIP de Letterboxd subida desde la web (tarda: empareja con TMDB; el final llega por «updated») */
  import(userName, buf) {
    const svc = this.service(userName);
    return svc.importExport(buf, svc.store.data.user || '');
  }

  clear(userName) {
    const svc = this.service(userName);
    svc.reset();
    return svc.snapshot();
  }

  /** Vistas en Letterboxd -> vistas en CineLocal (salvo que el usuario lo haya desactivado); devuelve cuántas */
  markWatched(userName) {
    if (this.library.prefs(userName).lbMarkWatched === false) return 0;
    const svc = this.service(userName);
    const seen = new Set(svc.snapshot().films.filter(f => f.watched && f.tmdbId).map(f => f.tmdbId));
    if (!seen.size) return 0;
    const done = new Set(svc.store.data.marked || []);
    const prog = this.library.user(userName).data.progress;
    const paths = this.library.library.data.items
      .filter(it => it.type === 'movie' && seen.has(this.library.metaOf(it.id)?.tmdbId) && !prog[it.path] && !done.has(it.path))
      .map(it => it.path);
    if (!paths.length) return 0;
    this.library.markProgress(userName, { paths, watched: true });
    svc.store.data = { ...svc.store.data, marked: [...done, ...paths] };
    return paths.length;
  }
}

module.exports = { LetterboxdUsers };
