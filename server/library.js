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
const { store } = require('./store');

const DEFAULT_SETTINGS = {
  libraryPath: process.env.CINELOCAL_LIBRARY || '/media',
  extraLibraryPaths: [],
  tmdbKey: '',
  metaLang: 'es-ES',
  audioLang: 'spa',
  subLang: 'spa',
  subMode: 'foreign',          // always | foreign | off
  autoplayNext: true,
  autoWatch: true,
  singleFileFolderAsMovie: false,
  myProviders: [],
  region: 'ES'
};
// lo único que se puede cambiar desde la web (el resto de ajustes de la app de escritorio no aplican aquí)
const EDITABLE = new Set(Object.keys(DEFAULT_SETTINGS));

const MATCHER_VERSION = 2;

class Library extends EventEmitter {
  constructor(dataDir) {
    super();
    this.dir = dataDir;
    this.settings = store(dataDir, 'settings.json', DEFAULT_SETTINGS);
    this.library = store(dataDir, 'library.json', { items: [], scannedAt: 0, error: null });
    this.metadata = store(dataDir, 'metadata.json', {});
    this.people = store(dataDir, 'people.json', {});
    this.users = new Map();
    this.fetching = false;
    this.fetchAgain = false;
    this.scanning = null;
    this.rescan = false;
    this.providersCache = new Map();
    this.providerListCache = null;
    this.watcher = new LibraryWatcher();
    this.watcher.on('change', () => this.scan());
    this.index = new Map();
    this.reindex();
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
      this.users.set(key, store(path.join(this.dir, 'users'), safe + '.json', { progress: {}, favorites: [], lastPlayed: {} }));
    }
    return this.users.get(key);
  }

  // ---------- ajustes ----------
  publicSettings(isAdmin) {
    const s = { ...this.settings.data };
    if (!isAdmin) s.tmdbKey = s.tmdbKey ? '••••••••' : '';
    return s;
  }

  async setSettings(patch) {
    const before = { ...this.settings.data };
    const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => EDITABLE.has(k)));
    this.settings.data = { ...this.settings.data, ...clean };
    const s = this.settings.data;
    const roots = x => this.roots(x).join('|');
    if (roots(before) !== roots(s) || before.autoWatch !== s.autoWatch) this.restartWatcher();
    if (roots(before) !== roots(s) || before.singleFileFolderAsMovie !== s.singleFileFolderAsMovie) await this.scan();
    else if (before.tmdbKey !== s.tmdbKey || before.metaLang !== s.metaLang) this.fetchMissingMetadata();
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

  tmdb() {
    const s = this.settings.data;
    return new TMDB(s.tmdbKey, s.metaLang || 'es-ES', globalThis.fetch, s.region || 'ES');
  }

  // ---------- vista ----------
  view(userName) {
    const u = this.user(userName).data;
    const items = this.library.data.items.map(it => {
      const m = this.metadata.data[it.id];
      return { ...it, meta: m && !m.failed ? m.meta : null, metaFailed: !!m?.failed };
    });
    return {
      items,
      scannedAt: this.library.data.scannedAt,
      error: this.library.data.error,
      nas: null,
      progress: u.progress,
      favorites: u.favorites,
      mpv: 'web',            // en la web no hace falta mpv: no mostrar el aviso
      hasKey: !!this.settings.data.tmdbKey,
      fetching: this.fetching
    };
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

    const r = roots.length
      ? scanLibraries(roots, { singleFileFolderAsMovie: this.settings.data.singleFileFolderAsMovie })
      : { ok: false, items: [], failed: [{ root: '', error: 'No hay ninguna carpeta de biblioteca configurada' }] };
    if (r.ok && r.failed.length) {
      const ids = new Set(r.items.map(i => i.id));
      for (const it of prevItems) if (!ids.has(it.id) && r.failed.some(f => isUnder(it.path, f.root))) r.items.push(it);
      r.items.sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true }));
    }
    r.error = r.failed.map(f => f.error).join(' · ') || null;

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
    if (m.failed) return Date.now() - (m.at || 0) > 1000 * 60 * 60 * 24 * 3;
    if (it.type === 'series') {
      const have = Object.keys(m.meta?.seasons || {}).map(Number);
      if (it.seasons.some(s => !have.includes(s)) && Date.now() - (m.at || 0) > 1000 * 60 * 60 * 6) return true;
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
      } else {
        const meta = it.type === 'movie' ? await api.movie(id) : await api.tv(id, it.seasons);
        this.metadata.data[it.id] = { tmdbId: id, meta, at: Date.now(), lang, matcher: MATCHER_VERSION, manual: !!forcedId || !!prev?.manual };
      }
    } catch (e) {
      if (/no válida/.test(e.message)) throw e;
      console.warn('Metadatos:', it.title, e.message);
    }
    this.metadata.save();
  }

  async fetchMissingMetadata(force = false) {
    const api = this.tmdb();
    if (!api.enabled) return;
    if (this.fetching) { this.fetchAgain = true; return; }
    this.fetching = true;
    try {
      const lang = this.settings.data.metaLang;
      const todo = this.library.data.items.filter(it => force || this.needsFetch(it, lang));
      let done = 0;
      this.emit('meta:progress', { done, total: todo.length });
      const queue = [...todo];
      const worker = async () => {
        while (queue.length) {
          const it = queue.shift();
          await this.fetchItem(api, it);
          done++;
          this.emit('meta:progress', { done, total: todo.length, title: it.title });
          if (done % 6 === 0) this.emit('library');
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

  async person(id) {
    const s = this.settings.data;
    const c = this.people.data[id];
    if (c && Date.now() - c.at < 1000 * 60 * 60 * 24 * 30 && c.lang === s.metaLang && Array.isArray(c.data?.films) && c.data.films.every(f => 'popularity' in f)) return c.data;
    const api = this.tmdb();
    if (!api.enabled) return null;
    try {
      const data = await api.person(id);
      this.people.data[id] = { data, at: Date.now(), lang: s.metaLang };
      this.people.save();
      return data;
    } catch { return c?.data || null; }
  }

  async providerList() {
    const s = this.settings.data;
    const k = (s.region || 'ES') + ':' + s.metaLang;
    if (this.providerListCache?.k === k && Date.now() - this.providerListCache.at < 864e5) return this.providerListCache.data;
    const api = this.requireTmdb();
    const data = await api.providerList();
    this.providerListCache = { k, data, at: Date.now() };
    return data;
  }

  async providers(movieId) {
    const k = movieId + ':' + (this.settings.data.region || 'ES');
    const c = this.providersCache.get(k);
    if (c && Date.now() - c.at < 432e5) return c.data;
    const data = await this.requireTmdb().watchProviders(movieId);
    this.providersCache.set(k, { data, at: Date.now() });
    return data;
  }

  search({ type, query, year }) {
    return this.requireTmdb().search(type, query, year);
  }

  async identify({ itemId, tmdbId }, userName) {
    const it = this.library.data.items.find(i => i.id === itemId);
    if (!it) throw new Error('Elemento no encontrado');
    await this.fetchItem(this.tmdb(), it, tmdbId);
    this.emit('library');
    return this.view(userName).items.find(i => i.id === itemId);
  }

  requireTmdb() {
    const api = this.tmdb();
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

  toggleFavorite(userName, id) {
    const u = this.user(userName);
    const f = new Set(u.data.favorites);
    f.has(id) ? f.delete(id) : f.add(id);
    u.data.favorites = [...f];
    u.save();
    return u.data.favorites;
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
    const list = this.settings.data.autoplayNext ? eps.slice(idx) : [eps[idx]];
    const series = it.meta?.title || it.title;
    return list.map((e, i) => {
      const em = it.meta?.seasons?.[e.season]?.episodes?.[e.episode];
      const name = em?.name && !GENERIC_EPISODE.test(em.name.trim()) ? ' · ' + em.name : '';
      return { id: e.id, itemId, episodeId: e.id, title: `${series} · T${e.season}:E${e.episode}${name}`, start: i === 0 ? startOf(e.path) : 0, skip: skip('tv', e) };
    });
  }
}

module.exports = { Library, DEFAULT_SETTINGS };
