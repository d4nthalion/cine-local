// Letterboxd no tiene API pública: se lee el perfil público (películas vistas con nota, "me gusta",
// watchlist y RSS del diario) o se importa el ZIP que Letterboxd permite exportar.
// Las páginas se piden desde una ventana oculta de Chromium para superar la comprobación de Cloudflare.
const zlib = require('zlib');
const { EventEmitter } = require('events');

const BASE = 'https://letterboxd.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const keyOf = (title, year) => norm(title) + '|' + (year || '');

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/ig, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// ---------- lectura de páginas ----------
/** "Título (2024)" -> { title, year } */
function splitName(name) {
  const m = decodeHtml(name).match(/^(.*\S)\s+\((\d{4})\)$/);
  return m ? { title: m[1], year: +m[2] } : { title: decodeHtml(name), year: null };
}

/** Películas de una cuadrícula de pósteres (/films/, /watchlist/, /likes/films/) */
function parseGrid(html) {
  const out = [];
  for (const chunk of String(html).split(/<li class="(?:griditem|poster-container)/).slice(1)) {
    const slug = chunk.match(/data-(?:item|film)-slug="([^"]+)"/)?.[1];
    if (!slug) continue;
    const name = chunk.match(/data-item-(?:full-display-)?name="([^"]+)"/)?.[1];
    const { title, year } = name ? splitName(name) : { title: decodeHtml(chunk.match(/alt="([^"]*)"/)?.[1] || slug), year: null };
    const rated = chunk.match(/\brated-(\d+)\b/);
    out.push({ slug, title, year, rating: rated ? +rated[1] / 2 : null, liked: /icon-liked/.test(chunk) });
  }
  return out;
}

function lastPage(html) {
  let n = 1;
  for (const m of String(html).matchAll(/\/page\/(\d+)\/"/g)) n = Math.max(n, +m[1]);
  return n;
}

/** RSS del diario: trae el id de TMDB, la nota y la fecha de las últimas entradas */
function parseRss(xml) {
  const out = [];
  for (const it of String(xml).split('<item>').slice(1)) {
    const tag = t => it.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1]?.trim() || null;
    const tmdb = tag('tmdb:movieId');
    const title = tag('letterboxd:filmTitle');
    if (!title) continue;   // listas y otras entradas
    const slug = (tag('link') || '').match(/\/film\/([^/]+)\//)?.[1] || null;
    const rating = tag('letterboxd:memberRating');
    out.push({
      slug, title: decodeHtml(title), year: +tag('letterboxd:filmYear') || null,
      tmdbId: tmdb ? +tmdb : null,
      rating: rating ? +rating : null,
      liked: tag('letterboxd:memberLike') === 'Yes',
      date: tag('letterboxd:watchedDate')
    });
  }
  return out;
}

// ---------- ZIP de exportación ----------
/** Lector mínimo de ZIP (directorio central + deflate) */
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('El archivo no es un ZIP válido');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (!name.endsWith('/')) files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  text = String(text).replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head = [], ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

/** Convierte el ZIP exportado de Letterboxd en la misma lista de películas que la lectura del perfil */
function parseExport(buf) {
  const files = readZip(buf);
  const find = re => { const k = Object.keys(files).find(n => re.test(n)); return k ? parseCsv(files[k].toString('utf8')) : []; };
  if (!Object.keys(files).some(n => /(^|\/)(watched|ratings|watchlist)\.csv$/.test(n))) {
    throw new Error('Ese ZIP no parece una exportación de Letterboxd (faltan watched.csv / ratings.csv / watchlist.csv)');
  }
  const films = new Map();
  const get = (r) => {
    const k = keyOf(r.Name, r.Year);
    if (!films.has(k)) films.set(k, { title: r.Name, year: +r.Year || null, slug: null, rating: null, liked: false, watched: false, watchlist: false, date: null });
    return films.get(k);
  };
  for (const r of find(/(^|\/)watched\.csv$/)) get(r).watched = true;
  for (const r of find(/(^|\/)diary\.csv$/)) {
    const f = get(r); f.watched = true;
    const d = r['Watched Date'] || r.Date;
    if (d && (!f.date || d > f.date)) f.date = d;
  }
  for (const r of find(/(^|\/)ratings\.csv$/)) { const f = get(r); f.watched = true; f.rating = +r.Rating || null; }
  for (const r of find(/(^|\/)likes\/films\.csv$/)) get(r).liked = true;
  find(/(^|\/)watchlist\.csv$/).forEach((r, i) => { const f = get(r); f.watchlist = true; f.wlOrder = i; });
  return films;
}

// ---------- descarga de páginas ----------
class PageFetcher {
  constructor() { this.win = null; this.ready = false; this.last = 0; }

  ensureWindow() {
    if (this.win && !this.win.isDestroyed()) return;
    const { BrowserWindow, session } = require('electron');
    const ses = session.fromPartition('persist:letterboxd');
    // sin "Electron/…" ni "CineLocal/…" en el user-agent: Cloudflare desconfía de ellos
    ses.setUserAgent(ses.getUserAgent().replace(/ (Electron|cinelocal|CineLocal)\/\S+/g, ''));
    this.win = new BrowserWindow({ show: false, width: 1100, height: 800, webPreferences: { session: ses, images: false, backgroundThrottling: false, sandbox: true } });
    this.win.webContents.setAudioMuted(true);
    this.win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.ready = false;
  }

  /** Abre una página y espera a que pase la comprobación de Cloudflare ("Just a moment…") */
  async open(url) {
    this.ensureWindow();
    await this.win.loadURL(url).catch(() => {});   // el desafío recarga la página: ERR_ABORTED es normal
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const title = await this.win.webContents.executeJavaScript('document.title').catch(() => '');
      if (title && !/just a moment|un momento|attention required|checking your browser/i.test(title) && /letterboxd\.com$/.test(new URL(this.win.webContents.getURL() || url).host)) return;
      await sleep(700);
    }
    throw new Error('Letterboxd no ha dejado pasar la comprobación de seguridad (Cloudflare). Prueba más tarde o importa la exportación en ZIP.');
  }

  async get(path) {
    const wait = this.last + 1500 - Date.now();   // una página cada segundo y medio, como mucho
    if (wait > 0) await sleep(wait);
    this.ensureWindow();
    if (!this.ready) { await this.open(BASE + '/'); this.ready = true; }
    const fetchJs = `fetch(${JSON.stringify(BASE + path)}, { credentials: 'include' }).then(async r => ({ status: r.status, text: await r.text() }))`;
    let r;
    // Cloudflare corta a veces tras muchas páginas seguidas: esperar, volver a pasar la comprobación y reintentar
    for (const pause of [0, 15, 40, 90]) {
      if (pause) {
        this.onWait?.(pause);
        await sleep(pause * 1000);
        await this.open(BASE + path).catch(() => {});
      }
      r = await this.win.webContents.executeJavaScript(fetchJs).catch(() => ({ status: 0, text: '' }));
      if (![0, 403, 429, 503].includes(r.status)) break;
    }
    this.last = Date.now();
    if (r.status === 404) { const e = new Error('No encontrado'); e.code = 404; throw e; }
    if (r.status !== 200) throw new Error(r.status ? `Letterboxd respondió ${r.status}. Prueba más tarde o importa la exportación en ZIP.` : 'No se pudo conectar con Letterboxd');
    return r.text;
  }

  close() { if (this.win && !this.win.isDestroyed()) this.win.destroy(); this.win = null; this.ready = false; }
}

// ---------- servicio ----------
/**
 * store: { films: { [key]: {title, year, slug, rating, liked, watched, watchlist, date, wlOrder} },
 *          ids: { [key]: { id, poster, title } }, user, syncedAt, fullAt, source }
 */
class LetterboxdService extends EventEmitter {
  constructor({ store, tmdb, libraryIndex }) {
    super();
    this.store = store;
    this.tmdb = tmdb;                 // () => TMDB
    this.libraryIndex = libraryIndex; // () => Map(keyOf(title, year) -> tmdbId)
    this.fetcher = new PageFetcher();
    this.fetcher.onWait = (sec) => this.setStatus({ text: `Letterboxd pide ir más despacio · reintentando en ${sec} s…` });
    this.status = { running: false, text: '', error: null };
    this.job = null;
  }

  setStatus(patch) { this.status = { ...this.status, ...patch }; this.emit('status', this.status); }

  snapshot() {
    const d = this.store.data;
    const films = Object.entries(d.films || {}).map(([k, f]) => {
      const m = d.ids?.[k] || {};
      return { k, ...f, tmdbId: m.id || null, poster: m.poster || null, localTitle: m.title || null };
    });
    return { user: d.user || '', syncedAt: d.syncedAt || 0, fullAt: d.fullAt || 0, source: d.source || null, films, status: this.status };
  }

  reset() {
    this.store.data = { films: {}, ids: this.store.data.ids || {}, user: '', syncedAt: 0, fullAt: 0, source: null };
    this.setStatus({ running: false, text: '', error: null });
    this.emit('updated');
  }

  /** Sincroniza con el perfil: completa (todas las páginas) o rápida (sólo el RSS de las últimas entradas) */
  sync(user, { full = true } = {}) {
    if (this.job) return this.job;
    this.job = this._sync(String(user || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?letterboxd\.com\//, '').replace(/\/.*$/, ''), full)
      .finally(() => { this.job = null; this.fetcher.close(); });
    return this.job;
  }

  async _sync(user, full) {
    if (!user) throw new Error('Indica tu usuario de Letterboxd');
    this.setStatus({ running: true, error: null, text: 'Conectando con Letterboxd…' });
    try {
      const prev = this.store.data.user === user ? this.store.data.films || {} : {};
      let films;
      let rss = [];
      try { rss = parseRss(await this.fetcher.get(`/${user}/rss/`)); }
      catch (e) { if (e.code === 404) throw new Error(`No existe el usuario «${user}» en Letterboxd (o su perfil es privado)`); if (!full) throw e; }

      if (full) {
        films = new Map();
        const add = (f, patch) => {
          const k = keyOf(f.title, f.year);
          const cur = films.get(k) || { title: f.title, year: f.year, slug: f.slug, rating: null, liked: false, watched: false, watchlist: false, date: prev[k]?.date || null };
          films.set(k, { ...cur, ...patch(cur) });
        };
        const pages = async (base, label, each) => {
          let html;
          try { html = await this.fetcher.get(`/${user}/${base}/`); }
          catch (e) { if (e.code === 404) return 0; throw e; }
          const total = lastPage(html);
          let n = 0;
          for (let p = 1; p <= total; p++) {
            if (p > 1) html = await this.fetcher.get(`/${user}/${base}/page/${p}/`);
            this.setStatus({ text: `${label} · página ${p} de ${total}` });
            for (const f of parseGrid(html)) each(f, n++);
          }
          return n;
        };
        const seen = await pages('films', 'Leyendo tus películas vistas', f => add(f, () => ({ watched: true, rating: f.rating, liked: f.liked })));
        if (!seen && !rss.length) throw new Error(`No existe el usuario «${user}» en Letterboxd (o su perfil es privado)`);
        await pages('watchlist', 'Leyendo tu watchlist', (f, i) => add(f, () => ({ watchlist: true, wlOrder: i })));
      } else {
        films = new Map(Object.entries(prev));
      }

      // el RSS aporta fechas e ids de TMDB exactos (y, en la sincronización rápida, lo último que has visto)
      const ids = this.store.data.ids || (this.store.data.ids = {});
      for (const r of rss) {
        const k = keyOf(r.title, r.year);
        const cur = films.get(k) || { title: r.title, year: r.year, slug: r.slug, rating: null, liked: false, watched: true, watchlist: false, date: null };
        const newer = !cur.date || (r.date && r.date >= cur.date);
        films.set(k, {
          ...cur, watched: true, watchlist: full ? cur.watchlist : false, slug: cur.slug || r.slug,
          rating: full ? cur.rating ?? r.rating : (newer && r.rating != null ? r.rating : cur.rating),
          liked: cur.liked || r.liked,
          date: r.date && (!cur.date || r.date > cur.date) ? r.date : cur.date
        });
        if (r.tmdbId && ids[k]?.id !== r.tmdbId) ids[k] = { id: r.tmdbId, poster: null, title: null };
      }

      await this.resolve(films);
      this.store.data = { ...this.store.data, user, films: Object.fromEntries(films), syncedAt: Date.now(), source: 'profile', ...(full ? { fullAt: Date.now() } : {}) };
      this.setStatus({ running: false, text: '', error: null });
      this.emit('updated');
      return this.snapshot();
    } catch (e) {
      this.setStatus({ running: false, text: '', error: e.message });
      throw e;
    }
  }

  async importExport(buf, user = '') {
    if (this.job) throw new Error('Ya hay una sincronización en curso');
    this.job = (async () => {
      this.setStatus({ running: true, error: null, text: 'Leyendo la exportación…' });
      try {
        const films = parseExport(buf);
        await this.resolve(films);
        // cuenta como sincronización completa: la próxima automática sólo añadirá lo último del RSS
        this.store.data = { ...this.store.data, user, films: Object.fromEntries(films), syncedAt: Date.now(), fullAt: Date.now(), source: 'export' };
        this.setStatus({ running: false, text: '', error: null });
        this.emit('updated');
        return this.snapshot();
      } catch (e) { this.setStatus({ running: false, text: '', error: e.message }); throw e; }
    })().finally(() => { this.job = null; });
    return this.job;
  }

  /** Asigna a cada película su id de TMDB: biblioteca local, luego búsqueda en TMDB y, como último recurso, la ficha de Letterboxd */
  async resolve(films) {
    const ids = this.store.data.ids || (this.store.data.ids = {});
    const local = this.libraryIndex();
    const pending = [];
    for (const [k, f] of films) {
      if (ids[k]?.id && ids[k].poster !== null) continue;
      const lid = local.get(k) || (f.year && (local.get(keyOf(f.title, f.year - 1)) || local.get(keyOf(f.title, f.year + 1))));
      if (lid && !ids[k]?.id) ids[k] = { id: lid, poster: null, title: null };
      if (!ids[k]?.id && ids[k]?.miss && Date.now() - ids[k].miss < 7 * 864e5) continue;   // sin coincidencia hace poco: no repetir
      if (ids[k]?.id && !f.watchlist) continue;   // el póster sólo hace falta para la watchlist
      pending.push([k, f]);
    }
    const api = this.tmdb();
    let done = 0, misses = [];
    const work = async ([k, f]) => {
      try {
        if (ids[k]?.id) {   // ya sabemos el id: sólo falta el póster para la watchlist
          if (f.watchlist && api.enabled && !ids[k].poster) {
            const m = await api.get(`/movie/${ids[k].id}`, { language: api.language }).catch(() => null);
            if (m) ids[k] = { id: ids[k].id, poster: m.poster_path ? 'https://image.tmdb.org/t/p/w342' + m.poster_path : null, title: m.title };
          }
          return;
        }
        if (!api.enabled) return;
        const results = await api.search('movie', f.title, f.year).catch(() => []);
        const t = norm(f.title);
        const near = r => !f.year || !r.year || Math.abs(+r.year - f.year) <= 1;
        const hit = results.find(r => (norm(r.title) === t || norm(r.originalTitle) === t) && near(r))
          || (f.year ? results.find(r => +r.year === f.year) : null);
        if (hit) ids[k] = { id: hit.id, poster: hit.poster || null, title: hit.title };
        else misses.push([k, f]);
      } finally {
        done++;
        if (done % 10 === 0 || done === pending.length) this.setStatus({ text: `Emparejando con TMDB · ${done} de ${pending.length}` });
      }
    };
    const queue = [...pending];
    await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await work(queue.shift()); }));

    // sin coincidencia clara: la ficha de Letterboxd lleva el id de TMDB (pocas, para no cargar su web)
    for (const [k, f] of misses.filter(([, f]) => f.slug).slice(0, 40)) {
      this.setStatus({ text: `Comprobando «${f.title}» en Letterboxd…` });
      try {
        const html = await this.fetcher.get(`/film/${f.slug}/`);
        const id = +(html.match(/data-tmdb-id="(\d+)"/)?.[1] || 0);
        const type = html.match(/data-tmdb-type="(\w+)"/)?.[1];
        if (id && type !== 'tv') {
          const m = api.enabled ? await api.get(`/movie/${id}`, { language: api.language }).catch(() => null) : null;
          ids[k] = { id, poster: m?.poster_path ? 'https://image.tmdb.org/t/p/w342' + m.poster_path : null, title: m?.title || null };
        }
      } catch { /* se queda sin emparejar */ }
    }
    if (api.enabled) for (const [k] of misses) if (!ids[k]?.id) ids[k] = { id: null, miss: Date.now() };
    this.store.save();
  }
}

module.exports = { LetterboxdService, parseGrid, parseRss, parseExport, parseCsv, readZip, lastPage, keyOf, norm };
