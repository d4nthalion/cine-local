/* CineLocal — interfaz */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm1 7v6h-2v-6zm0-4v2h-2V7z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M13 5v6h6v2h-6v6h-2v-6H5v-2h6V5z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.2-.6L12 2 9.2 8.7 2 9.3l5.4 4.7-1.6 7z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>',
  more: '<svg viewBox="0 0 24 24"><path d="M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/></svg>',
  film: '<svg viewBox="0 0 24 24"><path d="M4 3h2v2h12V3h2v18h-2v-2H6v2H4zm2 4v2h2V7zm10 0v2h2V7zM6 11v2h2v-2zm10 0v2h2v-2zM6 15v2h2v-2zm10 0v2h2v-2zM10 7v10h4V7z"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 5h7l2 2h9v12H3zm2 4v8h14V9z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24-1.4 1.4-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>',
  yt: '<svg viewBox="0 0 24 24"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 3h8l10 10-8 8L3 11zm4 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><path d="M3 4h18v16H3zm2 2v9.6l4-4 4 4 2.5-2.5L19 16.6V6zm11 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.2L6 21zm2 2v12.2l4-2.8 4 2.8V5z"/></svg>',
  bookmarkOn: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.2L6 21z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3zM4 18h16v2H4z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm4 5h10v2H7zm3 5h4v2h-4z"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10.6 13.4a1 1 0 0 0 1.4 0l4-4a3 3 0 0 0-4.2-4.3l-1.3 1.3 1.4 1.4 1.3-1.3a1 1 0 0 1 1.4 1.5l-4 4a1 1 0 0 0 0 1.4zm2.8-2.8a1 1 0 0 0-1.4 0l-4 4a3 3 0 0 0 4.2 4.3l1.3-1.3-1.4-1.4-1.3 1.3a1 1 0 0 1-1.4-1.5l4-4a1 1 0 0 0 0-1.4z"/></svg>'
};

const AUDIO_LANGS = [
  ['original', 'Original del archivo (sin preferencia)'], ['spa', 'Español'], ['eng', 'Inglés'], ['fre', 'Francés'],
  ['ger', 'Alemán'], ['ita', 'Italiano'], ['por', 'Portugués'], ['cat', 'Catalán'], ['baq', 'Euskera'], ['glg', 'Gallego'],
  ['jpn', 'Japonés'], ['kor', 'Coreano'], ['chi', 'Chino'], ['rus', 'Ruso'], ['dut', 'Neerlandés'], ['swe', 'Sueco'],
  ['dan', 'Danés'], ['nor', 'Noruego'], ['pol', 'Polaco'], ['tur', 'Turco'], ['ara', 'Árabe'], ['hin', 'Hindi']
];
const SUB_LANGS = [['none', 'Sin subtítulos'], ...AUDIO_LANGS.slice(1)];
const META_LANGS = [
  ['es-ES', 'Español (España)'], ['es-MX', 'Español (Latinoamérica)'], ['en-US', 'Inglés'], ['ca-ES', 'Catalán'],
  ['fr-FR', 'Francés'], ['de-DE', 'Alemán'], ['it-IT', 'Italiano'], ['pt-PT', 'Portugués'], ['pt-BR', 'Portugués (Brasil)']
];

// CineLocal Server (server/): la misma interfaz en el navegador, sin mpv, eMule, Discord ni actualizaciones
const WEB = window.api.platform === 'web';

const S = {
  lib: { items: [], progress: {}, favorites: [] },
  settings: {},
  route: { name: 'home' },
  history: [],
  heroIdx: 0,
  heroTimer: null,
  heroList: [],
  filters: { movies: { cat: null, sort: 'added', seen: 'all', shown: 0, seed: Math.random() }, series: { cat: null, sort: 'added', seen: 'all', shown: 0, seed: Math.random() }, directors: { sort: 'count', q: '' }, filmo: 'all', filmoSort: 'year', watchlist: 'all' },
  lb: { films: [], status: {} },   // Letterboxd: películas vistas, notas y watchlist
  update: { state: 'idle' },       // actualizaciones de CineLocal (estado que envía el proceso principal)
  discord: { state: 'off' },       // Discord Rich Presence: estado de la conexión
  updDismissed: null,              // versión cuyo aviso se ha cerrado con «Más tarde»
  lbById: new Map(),
  people: {},
  season: {},
  query: '',
  tmdbSearch: { q: '', busy: false, movies: [], series: [], error: null },   // películas y series de TMDB cuando la biblioteca no tiene nada
  requests: { items: [], pending: 0 },                             // peticiones (las mías; un administrador, todas)
  reqSearch: { q: '', type: 'movie', busy: false, results: [], error: null },
  access: { days: 7, user: '', type: '', q: '', items: null, total: 0, users: [], busy: false, error: null },   // registro de actividad (administradores)
  titles: {},                                                      // fichas de TMDB de lo que no está en la biblioteca
  emule: {
    snap: { ok: false, code: 'disabled', downloads: [] },
    info: null,
    search: { query: '', results: [], message: '', busy: false, error: null, run: 0 },
    // servidores: list null = sin cargar · open null = decidir según la conexión · busy: 'srv' | 'kad'
    srv: { list: null, kad: null, outdated: false, error: null, at: 0, loading: false, open: null, sort: 'users', dir: -1, busy: null }
  }
};

// ---------------------------------------------------------------- utilidades de datos
function setLb(snap) {
  S.lb = snap || { films: [], status: {} };
  S.lbById = new Map(S.lb.films.filter(f => f.tmdbId).map(f => [f.tmdbId, f]));
}
/** Datos de Letterboxd de una película de la biblioteca (o de un id de TMDB) */
const lbOf = (x) => typeof x === 'number' ? S.lbById.get(x) || null : (x?.type === 'movie' && x.meta?.tmdbId ? S.lbById.get(x.meta.tmdbId) || null : null);
const lbStars = (r) => r ? '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') : '';
const hasLb = () => S.lb.films.length > 0;
/** Watchlist de Letterboxd en su orden, con la película de la biblioteca si ya la tienes */
function watchlistEntries() {
  const owned = new Map(S.lib.items.filter(i => i.type === 'movie' && i.meta?.tmdbId).map(i => [i.meta.tmdbId, i]));
  return S.lb.films.filter(f => f.watchlist).sort((a, b) => (a.wlOrder ?? 1e9) - (b.wlOrder ?? 1e9))
    .map(f => ({ f, it: f.tmdbId ? owned.get(f.tmdbId) || null : null }));
}

const byId = (id) => S.lib.items.find(i => i.id === id);

// La biblioteca llega «ligera» (carátula, título, año, duración, géneros…); la ficha completa (sinopsis, reparto,
// episodios…) se pide al abrir el título y se guarda aquí, para no perderla cuando la biblioteca se vuelve a recibir.
const fullMeta = new Map();   // id → ficha completa
function setLib(lib) {
  for (const it of lib.items || []) {
    const f = fullMeta.get(it.id);
    if (!f) continue;
    if (it.meta?.tmdbId === f.tmdbId) it.meta = f; else fullMeta.delete(it.id);   // otra ficha (corregida): se vuelve a pedir
  }
  S.lib = lib;
}
const loadingFull = new Set();
async function ensureFull(id) {
  const it = byId(id);
  if (!it?.meta?.slim || loadingFull.has(id) || !window.api.getItem) return;
  loadingFull.add(id);
  try {
    const full = await window.api.getItem(id);
    if (full?.meta) {
      fullMeta.set(id, full.meta);
      const cur = byId(id);
      if (cur && cur.meta?.tmdbId === full.meta.tmdbId) cur.meta = full.meta;
      if (S.route.name === 'detail' && S.route.id === id) render(true);
    }
  } catch {}
  loadingFull.delete(id);
}
/** «Nuevo»: añadido en las últimas 24 horas */
const isNewItem = it => Date.now() - (it.added || 0) < DAY;
const T = (it) => it.meta?.title || it.title;
const Y = (it) => it.meta?.year || it.year;
const prog = (p) => S.lib.progress[p];

// ---------------------------------------------------------------- listas (src/main/lists.js)
// La Watchlist (id «watchlist», siempre la primera) sustituye a «Mi lista»; las propias van detrás.
const WL = 'watchlist';
const watchlistOf = () => (S.lib.lists || []).find(l => l.id === WL) || { id: WL, name: 'Watchlist', items: [] };
const inWatchlist = (key) => watchlistOf().items.some(x => x.key === key);
/** Las listas propias (sin la Watchlist) */
const listsOf = () => (S.lib.lists || []).filter(l => l.id !== WL);
/** Entrada de lista de un título de la biblioteca: por su ficha de TMDB, que vale aunque el archivo cambie */
function entryOf(it) {
  const t = it.meta?.tmdbId;
  return t ? { key: `${it.type}:${t}`, tmdb: t, type: it.type, title: T(it), year: Y(it), poster: it.meta?.poster || null }
    : { key: 'id:' + it.id, id: it.id, type: it.type, title: T(it), year: Y(it) };
}
/** Cómo puede estar un título de la biblioteca en una lista: por su ficha o, si se guardó antes de tenerla, por su id */
const itemKeys = (it) => [entryOf(it).key, 'id:' + it.id];
/** La entrada con la que está un título en una lista, o la nueva si no está */
const entryIn = (list, it) => list.items.find(x => itemKeys(it).includes(x.key)) || entryOf(it);
/** El título de la biblioteca de una entrada, si lo tienes */
const ownedOf = (e) => e.tmdb ? S.lib.items.find(i => i.type === e.type && i.meta?.tmdbId === e.tmdb) : byId(e.id);
const inAnyList = (key) => (S.lib.lists || []).some(l => l.items.some(x => x.key === key));
/** Tarjeta de una entrada: la tuya si la tienes; si no, la de «Dónde verla» */
function listEntryCard(e) {
  const it = ownedOf(e);
  if (it) return card(it);
  return missingCard({ id: e.type === 'movie' ? e.tmdb : null, title: e.title, year: e.year, poster: e.poster },
    { sub: [e.year, 'No la tienes'].filter(Boolean).join(' · '), entry: e });
}
const DAY = 864e5;

function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
function placeholder(it, wide) {
  const h = hue(T(it));
  return `<div class="placeholder" style="background:linear-gradient(160deg,hsl(${h} 45% 28%),hsl(${(h + 50) % 360} 50% 12%))">
    ${esc(T(it))}<small>${[Y(it), wide ? null : (it.type === 'movie' ? 'Película' : 'Serie')].filter(Boolean).join(' · ')}</small></div>`;
}
function fmtRuntime(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m ? m + ' min' : ''}`.trim() : `${m} min`;
}
function fmtLeft(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `Quedan ${Math.floor(m / 60)} h ${m % 60} min` : `Quedan ${Math.max(1, m)} min`;
}
function fmtSize(b) {
  if (!b) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i > 2 ? 2 : 0)} ${u[i]}`;
}
function pct(p) { return p && p.dur ? Math.min(100, (p.pos / p.dur) * 100) : 0; }
function epLabel(e) { return `T${e.season}:E${e.episode}${e.episodeEnd ? '-' + e.episodeEnd : ''}`; }
function epMeta(it, e) { return it.meta?.seasons?.[e.season]?.episodes?.[e.episode] || null; }
// TMDB devuelve el nombre genérico en inglés ("Season 1", "Episode 3", "Specials") cuando no está traducido
const GENERIC_SEASON = /^(season|series|temporada|staffel|saison|stagione)\s*\d+$|^(specials|especiales)$/i;
const GENERIC_EPISODE = /^(episode|episodio|capítulo|capitulo|folge|épisode|episodio)\s*\d+$/i;
const seasonLabel = (it, n) => { const name = it.meta?.seasons?.[n]?.name; return name && !GENERIC_SEASON.test(name.trim()) ? name : (n === 0 ? 'Especiales' : `Temporada ${n}`); };
const episodeLabel = (em, n) => em?.name && !GENERIC_EPISODE.test(em.name.trim()) ? em.name : `Episodio ${n}`;

/**
 * Episodios vistos de una serie, por temporada y número: un episodio cuenta como visto si se ha visto cualquiera de
 * sus versiones (dos archivos del mismo episodio, p. ej. en distinta calidad). Se calcula una vez por cada progreso.
 */
const seenCache = new WeakMap();
function seenKeys(it) {
  let c = seenCache.get(it);
  if (!c || c.p !== S.lib.progress) {
    c = { p: S.lib.progress, keys: new Set(it.episodes.filter(e => prog(e.path)?.watched).map(e => e.season + 'x' + e.episode)) };
    seenCache.set(it, c);
  }
  return c.keys;
}
const epSeen = (it, e) => seenKeys(it).has(e.season + 'x' + e.episode);
/** Los archivos de un episodio (todas sus versiones) */
const epPaths = (it, e) => it.episodes.filter(o => o.season === e.season && o.episode === e.episode).map(o => o.path);

/** Para una serie: episodio a reproducir y estado */
function seriesState(it) {
  const eps = it.episodes;
  let last = null, lastAt = 0;
  for (const e of eps) {
    const p = prog(e.path);
    if (p && p.at > lastAt) { lastAt = p.at; last = e; }
  }
  if (!last) return { ep: eps[0], mode: 'start', at: 0 };
  const p = prog(last.path);
  if (!p.watched && p.pos > 0) return { ep: last, mode: 'resume', at: lastAt, p };
  const idx = eps.indexOf(last);
  const next = eps.slice(idx + 1).find(e => !epSeen(it, e));
  if (next) return { ep: next, mode: 'next', at: lastAt };
  return { ep: eps[0], mode: 'done', at: lastAt };
}

function continueList() {
  const out = [];
  for (const it of S.lib.items) {
    if (it.type === 'movie') {
      const p = prog(it.path);
      if (p && !p.watched && p.pos > 30) out.push({ it, at: p.at, p });
    } else {
      const st = seriesState(it);
      if (st.mode === 'resume' || st.mode === 'next') out.push({ it, at: st.at, p: st.p, ep: st.ep });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Números pseudoaleatorios repetibles: el mismo orden «al azar» mientras no se cambie la semilla */
function seeded(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
/** Barajar con semilla (filas de Inicio que cambian cada día, orden «al azar») */
function shuffled(items, seed) {
  const r = seeded(seed);
  return items.map(it => [r(), it]).sort((x, y) => x[0] - y[0]).map(([, it]) => it);
}

function sortItems(items, sort, seed = 0) {
  if (sort === 'random') return shuffled(items, seed);
  const a = [...items];
  if (sort === 'title') a.sort((x, y) => T(x).localeCompare(T(y), 'es', { numeric: true }));
  else if (sort === 'year') a.sort((x, y) => (Y(y) || 0) - (Y(x) || 0));
  else if (sort === 'rating') a.sort((x, y) => (y.meta?.rating || 0) - (x.meta?.rating || 0));
  else if (sort === 'mine') a.sort((x, y) => (lbOf(y)?.rating || 0) - (lbOf(x)?.rating || 0) || (y.meta?.rating || 0) - (x.meta?.rating || 0));
  else a.sort((x, y) => (y.added || 0) - (x.added || 0));
  return a;
}

// ---------------------------------------------------------------- componentes
function metaLine(it, extra = '') {
  const m = it.meta || {};
  const parts = [];
  if (m.rating) parts.push(`<span class="rating">${I.star}${m.rating.toFixed(1)}</span>`);
  const y = Y(it);
  if (y) parts.push(`<span>${y}${m.endYear && m.endYear !== y ? '–' + m.endYear : ''}</span>`);
  if (m.certification) parts.push(`<span class="badge">${esc(m.certification)}</span>`);
  if (it.type === 'movie' && m.runtime) parts.push(`<span>${fmtRuntime(m.runtime)}</span>`);
  if (it.type === 'series') {
    const n = it.seasons.length;
    parts.push(`<span>${n} ${n === 1 ? 'temporada' : 'temporadas'}</span>`);
    parts.push(`<span>${it.episodes.length} episodios</span>`);
  }
  if (extra) parts.push(extra);
  return `<div class="meta-line">${parts.join('<i class="dot"></i>')}</div>`;
}

/** Carátula de un título: la elegida a mano (también sin ficha de TMDB) o la de la ficha */
const posterOf = it => it.poster || it.meta?.poster || null;

function card(it) {
  const poster = posterOf(it);
  const isNew = isNewItem(it);
  let watched = false, bar = '';
  if (it.type === 'movie') {
    const p = prog(it.path);
    watched = !!p?.watched;
    if (p && !p.watched && p.pos > 30) bar = `<div class="progress"><i style="width:${pct(p)}%"></i></div>`;
  } else {
    watched = it.episodes.every(e => epSeen(it, e));
  }
  const sub = [Y(it), it.type === 'movie' ? (it.meta?.runtime ? fmtRuntime(it.meta.runtime) : 'Película')
    : `${it.seasons.length} temp.`].filter(Boolean).join(' · ');
  return `<div class="card" tabindex="0" data-open="${it.id}">
    <div class="art">
      ${poster ? `<img loading="lazy" src="${esc(poster)}" alt="">` : placeholder(it)}
      ${isNew && !watched ? '<span class="tag new">Nuevo</span>' : ''}
      ${watched ? `<span class="watched-mark" title="Visto">${I.check}</span>` : ''}
      ${lbBadge(lbOf(it))}
      ${bar}
    </div>
    <div class="cap"><div class="t">${esc(T(it))}</div><div class="s">${esc(sub)}</div></div>
  </div>`;
}
function lbBadge(lb) {
  if (!lb?.rating && !lb?.liked) return '';
  return `<span class="lb-badge" title="Tu nota en Letterboxd">${lb.rating ? `<b>${lbStars(lb.rating)}</b>` : ''}${lb.liked ? '<i>♥</i>' : ''}</span>`;
}
/** Película que no está en la biblioteca: "Dónde verla" y, si eMule está activo, buscarla */
function missingCard(f, { tag = '', sub, entry } = {}) {
  const ph = { title: f.title, year: f.year, type: 'movie', meta: null };
  const lb = lbOf(f.id);
  const tmdbE = entry?.tmdb ? entry : f.id ? { tmdb: f.id, type: 'movie' } : null;
  const open = tmdbE ? `data-title-type="${tmdbE.type}" data-title-id="${tmdbE.tmdb}"` : (f.url ? `data-lb-url="${esc(f.url)}"` : '');
  const line = sub ?? [f.year, lb?.watched ? 'Vista' : '', f.rating ? '★ ' + f.rating.toFixed(1) : ''].filter(Boolean).join(' · ');
  // también se puede guardar en una lista aunque no la tengas
  const e = entry || (f.id ? { key: `movie:${f.id}`, tmdb: f.id, type: 'movie', title: f.title, year: f.year || null, poster: f.poster || null } : null);
  const saved = e && inAnyList(e.key);
  return `<div class="card missing" tabindex="0" ${open}>
    <div class="art">${f.poster ? `<img loading="lazy" src="${esc(f.poster)}" alt="">` : placeholder(ph)}
      ${tag}${lbBadge(lb)}
      ${saved ? `<span class="watched-mark in-list" title="En una de tus listas">${I.check}</span>` : ''}
      <div class="missing-hover">${tmdbE || f.url ? `<span>${I.info}${tmdbE ? 'Ver ficha' : 'Ver en Letterboxd'}</span>` : ''}${requestButton(e)}${e ? `<button class="mh-emule" data-action="wl-toggle" data-entry="${esc(JSON.stringify(e))}">${inWatchlist(e.key) ? I.bookmarkOn : I.bookmark}${inWatchlist(e.key) ? 'En tu Watchlist' : 'Watchlist'}</button>` : ''}${e ? `<button class="mh-emule" data-action="lists-pick" data-entry="${esc(JSON.stringify(e))}">${saved ? I.check : I.plus}${saved ? 'En tus listas' : 'Guardar en lista'}</button>` : ''}${emuleOn() ? `<button class="mh-emule" data-action="emule-find" data-q="${esc(f.title)}" data-alt="${esc(f.originalTitle || '')}">${I.download}Buscar en eMule</button>` : ''}</div>
    </div>
    <div class="cap"><div class="t">${esc(f.title)}</div><div class="s">${esc(line || 'Sin fecha')}</div></div>
  </div>`;
}
/** Tarjeta de la watchlist: la tuya si la tienes, si no, la de "Dónde verla" */
function watchlistCard({ f, it }) {
  if (it) return card(it);
  return missingCard({ id: f.tmdbId, title: f.localTitle || f.title, originalTitle: f.localTitle && f.localTitle !== f.title ? f.title : '', year: f.year, poster: f.poster,
    url: f.slug ? `https://letterboxd.com/film/${f.slug}/` : null }, { sub: [f.year, 'No la tienes'].filter(Boolean).join(' · ') });
}

function wideCard({ it, p, ep }) {
  const em = ep ? epMeta(it, ep) : null;
  const img = em?.still && !it.meta?.backdrop ? em.still : (it.meta?.backdrop ? it.meta.backdrop.replace('/original/', '/w780/') : em?.still);
  const named = em?.name && !GENERIC_EPISODE.test(em.name.trim()) ? em.name : '';
  const sub = ep ? `${epLabel(ep)}${named ? ' · ' + named : ''}` : (p ? fmtLeft(p.dur - p.pos) : '');
  const bar = p ? `<div class="progress"><i style="width:${pct(p)}%"></i></div>` : '';
  const label = ep && !p ? `<span class="tag">Siguiente episodio</span>` : '';
  return `<div class="card wide" tabindex="0" data-play="${it.id}" ${ep ? `data-ep="${ep.id}"` : ''}>
    <div class="art">
      ${img ? `<img loading="lazy" src="${esc(img)}" alt="">` : placeholder(it, true)}
      ${img ? (it.meta?.logo ? `<img class="wide-logo" src="${esc(it.meta.logo)}" alt="">` : `<div class="wide-title">${esc(T(it))}</div>`) : ''}
      ${label}
      <div class="play-hint"><span>${I.play}</span></div>
      ${bar}
    </div>
    <div class="cap"><div class="t">${esc(T(it))}</div><div class="s">${esc(sub)}</div></div>
  </div>`;
}

function row(title, inner, key, more) {
  if (!inner) return '';
  return `<section class="row" data-row="${esc(key)}">
    <div class="row-head"><h2 class="row-title">${esc(title)}</h2>${more ? `<span class="row-more" data-nav="${more}">Ver todo ›</span>` : ''}</div>
    <div class="row-track-wrap">
      <button class="row-arrow left" data-scroll="-1" disabled>${I.left}</button>
      <div class="row-track">${inner}</div>
      <button class="row-arrow right" data-scroll="1">${I.right}</button>
    </div>
  </section>`;
}

function playButtonFor(it) {
  if (it.type === 'movie') {
    const p = prog(it.path);
    if (p && !p.watched && p.pos > 30)
      return `<button class="btn btn-primary" data-play="${it.id}">${I.play}<span class="btn-progress">Continuar<small>${fmtLeft(p.dur - p.pos)}</small></span></button>`;
    return `<button class="btn btn-primary" data-play="${it.id}">${I.play}Reproducir</button>`;
  }
  const st = seriesState(it);
  const label = st.mode === 'resume' ? 'Continuar' : st.mode === 'next' ? 'Siguiente' : 'Reproducir';
  return `<button class="btn btn-primary" data-play="${it.id}" data-ep="${st.ep.id}">${I.play}<span class="btn-progress">${label}<small>${epLabel(st.ep)}</small></span></button>`;
}

// ---------------------------------------------------------------- vistas

// ---------------------------------------------------------------- directores
const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function dirKey(d) { return d.id ? 'p' + d.id : 'n-' + normName(d.name).replace(/ /g, '-'); }
function directorsOf(it) {
  if (it.type !== 'movie' || !it.meta) return [];
  if (it.meta.directors?.length) return it.meta.directors;
  if (it.meta.director) return it.meta.director.split(/\s*,\s*/).filter(Boolean).map(name => ({ id: null, name, photo: null }));
  return [];
}
function allDirectors() {
  const map = new Map();
  for (const it of S.lib.items) {
    for (const d of directorsOf(it)) {
      const k = dirKey(d);
      let e = map.get(k);
      if (!e) map.set(k, e = { key: k, id: d.id, name: d.name, photo: d.photo, films: [] });
      if (!e.photo && d.photo) e.photo = d.photo;
      e.films.push(it);
    }
  }
  for (const e of map.values()) {
    e.films.sort((a, b) => (Y(a) || 0) - (Y(b) || 0));
    const ys = e.films.map(Y).filter(Boolean);
    e.from = ys.length ? Math.min(...ys) : null;
    e.to = ys.length ? Math.max(...ys) : null;
    e.watched = e.films.filter(f => prog(f.path)?.watched).length;
  }
  return [...map.values()];
}
function sortDirectors(list, sort) {
  const byName = (a, b) => a.name.localeCompare(b.name, 'es');
  if (sort === 'name') return list.sort(byName);
  if (sort === 'surname') {
    const sur = d => d.name.split(' ').slice(-1)[0];
    return list.sort((a, b) => sur(a).localeCompare(sur(b), 'es') || byName(a, b));
  }
  return list.sort((a, b) => b.films.length - a.films.length || byName(a, b));
}
function avatar(d, cls = '') {
  const initials = d.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const h = hue(d.name);
  return `<div class="avatar ${cls}" style="--h:${h}">${d.photo ? `<img loading="lazy" src="${esc(d.photo)}" alt="">` : `<span>${esc(initials)}</span>`}</div>`;
}
const filmsLabel = n => `${n} ${n === 1 ? 'película' : 'películas'}`;
function yearsLabel(d) { return d.from ? (d.from === d.to ? `${d.from}` : `${d.from}–${d.to}`) : ''; }

function directorCard(d) {
  return `<div class="dir-card" tabindex="0" data-director="${esc(d.key)}">
    ${avatar(d)}
    <div class="dir-name">${esc(d.name)}</div>
    <div class="dir-sub">${filmsLabel(d.films.length)}${yearsLabel(d) ? ' · ' + yearsLabel(d) : ''}</div>
  </div>`;
}
function directorChip(d) {
  return `<div class="dir-chip" tabindex="0" data-director="${esc(d.key)}">${avatar(d)}<div class="dir-name">${esc(d.name)}</div><div class="dir-sub">${filmsLabel(d.films.length)}</div></div>`;
}

function viewDirectors() {
  const f = S.filters.directors;
  const all = allDirectors();
  const q = normName(f.q);
  const list = sortDirectors(all.filter(d => !q || normName(d.name).includes(q) || d.films.some(x => normName(T(x)).includes(q))), f.sort);
  if (!all.length) {
    return `<div class="page"><h1 class="page-title">Directores</h1><div class="empty"><div class="big-ico">${I.film}</div>
      <h2>Todavía no hay directores</h2><p>Se obtienen de los metadatos de TMDB. ${S.lib.hasKey ? 'Espera a que terminen de descargarse.' : 'Añade tu API key en Ajustes.'}</p>
      ${S.lib.hasKey ? '' : '<button class="btn btn-accent" data-nav="settings">Ir a Ajustes</button>'}</div></div>`;
  }
  return `<div class="page">
    <h1 class="page-title">Directores<span class="count">${all.length}</span></h1>
    <div class="toolbar">
      <div class="chips">
        ${[['count', 'Más películas'], ['name', 'Nombre'], ['surname', 'Apellido']].map(([v, l]) => `<button class="chip ${f.sort === v ? 'on' : ''}" data-dir-sort="${v}">${l}</button>`).join('')}
      </div>
      <div class="spacer"></div>
      <div class="search inline"><svg viewBox="0 0 24 24"><path d="M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24-1.4 1.4-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/></svg>
        <input id="dirFilter" type="search" placeholder="Filtrar directores o películas" value="${esc(f.q)}" spellcheck="false"></div>
    </div>
    ${list.length ? `<div class="dir-grid">${list.map(directorCard).join('')}</div>` : '<div class="empty"><p>Ningún director coincide.</p></div>'}
  </div>`;
}

function viewDirector(key) {
  const d = allDirectors().find(x => x.key === key);
  if (!d) return `<div class="page"><div class="empty"><h2>No encontrado</h2><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const p = d.id ? S.people[d.id] : null;
  const bgFilm = [...d.films].filter(f => f.meta?.backdrop).sort((a, b) => (b.meta.rating || 0) - (a.meta.rating || 0))[0];
  const next = d.films.find(f => !prog(f.path)?.watched);
  const life = p ? [p.birthday ? `${p.deathday ? '' : 'Nacido el '}${fmtDate(p.birthday)}${p.place ? ' en ' + esc(p.place) : ''}` : '', p.deathday ? `Fallecido el ${fmtDate(p.deathday)}` : ''].filter(Boolean).join(' · ') : '';
  return `<div class="detail director-page">
    <button class="back-btn" data-action="back">${I.back}Volver</button>
    <section class="detail-hero dir-hero">
      <div class="bg ${bgFilm ? '' : 'noimg'}">${bgFilm ? `<img src="${esc(bgFilm.meta.backdrop)}" alt="">` : ''}</div>
      <div class="content dir-hero-content">
        ${avatar({ ...d, photo: p?.photo || d.photo }, 'xl')}
        <div class="dir-info">
          <div class="kicker">Director</div>
          <h1 class="title-text">${esc(d.name)}</h1>
          <div class="meta-line">
            <span>${filmsLabel(d.films.length)} en tu biblioteca</span>
            ${yearsLabel(d) ? `<i class="dot"></i><span>${yearsLabel(d)}</span>` : ''}
            <i class="dot"></i><span>${d.watched === d.films.length ? 'Todas vistas' : `Vistas ${d.watched} de ${d.films.length}`}</span>
          </div>
          ${life ? `<div class="credits-line" style="margin:0 0 14px">${life}</div>` : ''}
          <p class="overview dir-bio" id="dirBio">${p?.bio ? esc(p.bio) : (d.id && S.lib.hasKey && !p ? '<span class="shimmer"></span><span class="shimmer short"></span>' : '')}</p>
          <div class="actions">
            ${next ? `<button class="btn btn-primary" data-play="${next.id}">${I.play}<span class="btn-progress">${prog(next.path)?.pos > 30 ? 'Continuar' : 'Reproducir'}<small>${esc(T(next))}</small></span></button>` : ''}
            ${p?.bio && p.bio.length > 420 ? `<button class="btn btn-ghost" data-action="bio-more">${I.info}Biografía completa</button>` : ''}
          </div>
        </div>
      </div>
    </section>
    <div class="detail-body">
      ${filmographyHTML(d, p)}
    </div>
  </div>`;
}
/** Filmografía completa (TMDB) con las disponibles resaltadas; sin TMDB, sólo las de la biblioteca */
function filmographyHTML(d, p) {
  if (!p?.films?.length) {
    const loading = d.id && S.lib.hasKey && !p;
    return `<h2 class="section-title">Filmografía en tu biblioteca</h2>
      <div class="grid">${d.films.map(card).join('')}</div>
      ${loading ? '<p class="filmo-note">Cargando filmografía completa…</p>' : ''}`;
  }
  const owned = new Map(d.films.filter(f => f.meta?.tmdbId).map(f => [f.meta.tmdbId, f]));
  const entries = p.films.map(f => ({ f, it: owned.get(f.id) || null }));
  // películas de la biblioteca que TMDB no lista como dirigidas por esta persona (por si acaso)
  for (const it of d.films) if (!p.films.some(f => f.id === it.meta?.tmdbId)) entries.push({ f: { id: null, year: Y(it), date: String(Y(it) || '') }, it });
  const titleOf = e => e.it ? T(e.it) : e.f.title || '';
  const yearOf = e => e.f.year || (e.it && Y(e.it)) || 9999;
  const byYear = (a, b) => yearOf(a) - yearOf(b);
  const sorters = {
    year: byYear,
    recent: (a, b) => byYear(b, a),
    popular: (a, b) => (b.f.votes || 0) - (a.f.votes || 0) || (b.f.popularity || 0) - (a.f.popularity || 0) || byYear(a, b),
    rating: (a, b) => (b.f.rating || b.it?.meta?.rating || 0) - (a.f.rating || a.it?.meta?.rating || 0) || byYear(a, b),
    title: (a, b) => titleOf(a).localeCompare(titleOf(b), 'es', { numeric: true }),
    owned: (a, b) => (b.it ? 1 : 0) - (a.it ? 1 : 0) || byYear(a, b),
    mine: (a, b) => (lbOf(b.f.id || b.it?.meta?.tmdbId)?.rating || 0) - (lbOf(a.f.id || a.it?.meta?.tmdbId)?.rating || 0) || byYear(a, b)
  };
  entries.sort(sorters[S.filters.filmoSort] || byYear);
  const have = entries.filter(e => e.it).length;
  const mode = S.filters.filmo;
  const seenOf = e => lbOf(e.f.id || e.it?.meta?.tmdbId)?.watched;
  const seenLb = entries.filter(seenOf).length;
  const list = mode === 'owned' ? entries.filter(e => e.it) : mode === 'missing' ? entries.filter(e => !e.it) : mode === 'seen' ? entries.filter(seenOf) : entries;
  const now = new Date().toISOString().slice(0, 10);
  return `<div class="section-title filmo-head">
      <span>Filmografía</span>
      <div class="chips">
        <button class="chip ${mode === 'all' ? 'on' : ''}" data-filmo="all">Todas · ${entries.length}</button>
        <button class="chip ${mode === 'owned' ? 'on' : ''}" data-filmo="owned"><i class="dot-own"></i>En tu biblioteca · ${have}</button>
        <button class="chip ${mode === 'missing' ? 'on' : ''}" data-filmo="missing">No disponibles · ${entries.length - have}</button>
        ${seenLb ? `<button class="chip ${mode === 'seen' ? 'on' : ''}" data-filmo="seen">Vistas en Letterboxd · ${seenLb}</button>` : ''}
      </div>
      <select class="select filmo-sort" data-filmo-sort title="Ordenar">
        ${[['year', 'Año (más antiguas)'], ['recent', 'Año (más recientes)'], ['popular', 'Popularidad'], ['rating', 'Valoración'], ...(hasLb() ? [['mine', 'Mi nota (Letterboxd)']] : []), ['title', 'Título (A-Z)'], ['owned', 'Disponibles primero']]
          .map(([v, l]) => `<option value="${v}" ${S.filters.filmoSort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="grid filmo">${list.map(({ f, it }) => {
      if (it) return card(it).replace('class="card"', 'class="card owned"').replace('<div class="cap">', '<div class="cap"><div class="own-badge">' + I.check + 'En tu biblioteca</div>');
      const upcoming = f.date && f.date > now;
      return missingCard(f, { tag: upcoming ? '<span class="tag">Próximamente</span>' : '' });
    }).join('')}</div>`;
}

// ---------------------------------------------------------------- plataformas
/** ¿Es una de las plataformas que tengo? Mismo id, o variante del mismo servicio ("Netflix Standard with Ads") */
function ownsProvider(p) {
  const mine = S.settings.myProviders || [];
  const n = normName(p.name);
  // sólo variantes con anuncios del mismo servicio; "Apple TV Store" o "HBO Max Amazon Channel" son otra cosa
  return mine.some(m => m.id === p.id || n === normName(m.name) || /^(standard |basic )?with ads$/.test(n.slice(normName(m.name).length + 1)) && n.startsWith(normName(m.name) + ' '));
}
// TMDB no da enlaces directos a cada plataforma; se abre su buscador con el título (o la ficha de JustWatch).
// Sólo plataformas con buscador público comprobado (Disney+ no tiene: exige iniciar sesión)
const PROVIDER_SEARCH = [
  [/^netflix/, q => `https://www.netflix.com/search?q=${q}`],
  [/^amazon prime video/, q => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`],
  [/^(hbo )?max\b|^hbo max/, q => `https://play.hbomax.com/search?q=${q}`],
  [/^apple tv/, q => `https://tv.apple.com/es/search?term=${q}`],
  [/^filmin/, q => `https://www.filmin.es/busqueda/texto/${q}`],
  [/^google play/, q => `https://play.google.com/store/search?q=${q}&c=movies`],
  [/^youtube/, q => `https://www.youtube.com/results?search_query=${q}`],
  [/^rakuten/, q => `https://www.rakuten.tv/es/search?q=${q}`],
  [/^mubi/, q => `https://mubi.com/es/search/films?query=${q}`]
];
function providerLink(p, title, fallback) {
  const n = normName(p.name);
  const hit = PROVIDER_SEARCH.find(([re]) => re.test(n));
  return hit ? hit[1](encodeURIComponent(title)) : fallback;
}

function providersHTML(r, title) {
  if (!r.groups.length) return '<p class="filmo-note">Ahora mismo no está en ninguna plataforma de tu país.</p>';
  // primero, dónde puedes verla ya con lo que tienes contratado
  const mine = [];
  for (const g of r.groups) for (const p of g.providers) if (ownsProvider(p) && !mine.some(m => m.p.id === p.id)) mine.push({ p, g });
  const top = mine.length ? `<div class="prov-mine"><h4>En tus plataformas</h4>${mine.map(({ p, g }) => {
    const url = providerLink(p, title, r.link);
    return `<button class="prov-watch" ${url ? `data-url="${esc(url)}"` : ''}>${p.logo ? `<img src="${esc(p.logo)}" alt="">` : ''}<span><b>Ver en ${esc(p.name)}</b><small>${esc(g.label)}</small></span>${I.right}</button>`;
  }).join('')}</div>` : (S.settings.myProviders?.length ? '' : '<p class="filmo-note prov-tip">Indica en <a data-nav="settings">Ajustes → Mis plataformas</a> cuáles tienes y aquí aparecerá el enlace para verla.</p>');
  return top + r.groups.map(g => `<div class="prov-group"><h4>${esc(g.label)}</h4><div class="prov-list">${g.providers.map(x => {
    const own = ownsProvider(x);
    const url = own ? providerLink(x, title, r.link) : null;
    return `<div class="prov ${own ? 'own' : ''}" ${url ? `data-url="${esc(url)}" title="Abrir en ${esc(x.name)}"` : ''}>${x.logo ? `<img src="${esc(x.logo)}" alt="">` : `<i class="prov-ph">${esc(x.name[0])}</i>`}<span>${esc(x.name)}</span>${own ? '<em>La tienes</em>' : ''}</div>`;
  }).join('')}</div></div>`).join('')
    + (r.link ? `<button class="btn btn-ghost btn-sm" style="margin:6px 12px 4px" data-url="${esc(r.link)}">Ver todas las opciones</button>` : '');
}

async function showProviders(movieId, title, alt) {
  const m = modal(`<div class="modal-head"><h2>Dónde ver “${esc(title)}”</h2><p>Disponibilidad en plataformas de tu país</p></div>
    <div class="modal-list prov-body"><p class="filmo-note">Consultando…</p></div>
    <div class="modal-foot prov-foot"><span class="prov-credit">Datos de JustWatch vía TMDB</span>${emuleOn() ? `<button class="btn btn-accent btn-sm" data-action="emule-find" data-q="${esc(title)}" data-alt="${esc(alt || '')}">${I.download}Buscar en eMule</button>` : ''}<button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button></div>`);
  const body = $('.prov-body', m);
  try {
    const r = await window.api.getProviders(movieId);
    body.innerHTML = providersHTML(r, title);
  } catch (e) {
    body.innerHTML = `<p class="filmo-note" style="color:#f87171">${esc(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))}</p>`;
  }
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
}
async function loadPerson(key) {
  const d = allDirectors().find(x => x.key === key);
  if (!d?.id || S.people[d.id] || !S.lib.hasKey) return;
  const p = await window.api.getPerson(d.id).catch(() => null);
  S.people[d.id] = p || { bio: '' };
  if (S.route.name === 'director' && S.route.id === key) render(true);
}

function viewHome() {
  const items = S.lib.items;
  if (!items.length) return viewEmpty();

  const withArt = items.filter(i => i.meta?.backdrop);
  if (!S.heroList.length || S.heroList.some(id => !byId(id)?.meta?.backdrop)) {
    const pool = withArt;
    // prioriza lo añadido recientemente y lo que se está viendo
    const recent = sortItems(pool, 'added').slice(0, 10);
    S.heroList = recent.sort(() => Math.random() - .5).slice(0, 6).map(i => i.id);
    S.heroIdx = 0;
  }
  const hero = heroHTML();

  const cont = continueList();
  const recent = sortItems(items, 'added').slice(0, 24);
  const series = sortItems(items.filter(i => i.type === 'series'), 'added');
  const movies = sortItems(items.filter(i => i.type === 'movie'), 'added');
  const wlist = watchlistOf().items;
  const today = new Date().toDateString();   // las filas «al azar» cambian cada día, no en cada visita

  let rows = '';
  rows += row('Continuar viendo', cont.map(wideCard).join(''), 'cont');
  rows += row('Añadido recientemente', recent.map(card).join(''), 'recent');
  if (wlist.length) rows += row('Watchlist', wlist.slice(0, 30).map(listEntryCard).join(''), 'wl', 'list:' + WL);
  for (const l of listsOf()) if (l.items.length) rows += row(l.name, l.items.slice(0, 30).map(listEntryCard).join(''), 'list-' + l.id, 'list:' + l.id);
  const wl = watchlistEntries();
  if (wl.length) {
    // primero las que ya puedes ver
    const sorted = [...wl.filter(e => e.it), ...wl.filter(e => !e.it)].slice(0, 30);
    rows += row('Tu watchlist de Letterboxd', sorted.map(watchlistCard).join(''), 'lbwl', 'watchlist');
  }
  for (const b of becauseYouWatched().slice(0, 2)) rows += row(`Porque viste «${T(b.from)}»`, b.items.map(card).join(''), 'because-' + b.from.id);
  const gems = shuffled(items.filter(i => (i.meta?.rating || 0) >= 7.5 && !isSeen(i)), today + 'gems').slice(0, 24);
  if (gems.length >= 4) rows += row('Joyas sin ver', gems.map(card).join(''), 'gems');
  rows += row('Series', series.slice(0, 30).map(card).join(''), 'series', 'series');
  rows += row('Películas', movies.slice(0, 30).map(card).join(''), 'movies', 'movies');
  const sagas = allSagas();
  if (sagas.length) rows += row('Sagas', sagas.slice(0, 24).map(sagaCard).join(''), 'sagas', sagas.length > 24 ? 'sagas' : null);
  const dirs = sortDirectors(allDirectors(), 'count');
  if (dirs.length >= 3) rows += row('Directores', dirs.slice(0, 24).map(directorChip).join(''), 'directors', 'directors');
  // tres categorías cada día, con títulos al azar (con miles de títulos, una fila por género sería interminable)
  for (const [c] of shuffled(categoriesOf(items, 6), today + 'cats').slice(0, 3)) {
    rows += row(c, shuffled(items.filter(i => inCategory(i, c)), today + c).slice(0, 24).map(card).join(''), 'cat-' + c);
  }

  return `${hero}<div class="rows ${hero ? '' : 'no-hero'}">${banners()}${rows}</div>`;
}

/**
 * «Porque viste…»: lo que TMDB recomienda a partir de lo último que has visto, sólo entre lo que hay en la biblioteca
 * y que no hayas visto. Una fila por título visto (los más recientes primero).
 */
function becauseYouWatched() {
  const byPath = new Map();
  for (const it of S.lib.items) {
    if (it.type === 'movie') byPath.set(it.path, it);
    else for (const e of it.episodes) byPath.set(e.path, it);
  }
  const recent = [];
  const seenIds = new Set();
  for (const [p, pr] of Object.entries(S.lib.progress || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))) {
    const it = byPath.get(p);
    if (!it || seenIds.has(it.id) || !(pr.watched || pr.pos > 600)) continue;
    seenIds.add(it.id);
    if (it.meta?.recs?.length) recent.push(it);
    if (recent.length >= 6) break;
  }
  const byTmdb = new Map(S.lib.items.filter(i => i.meta?.tmdbId).map(i => [i.type + ':' + i.meta.tmdbId, i]));
  const used = new Set();
  const out = [];
  for (const from of recent) {
    const items = from.meta.recs.map(id => byTmdb.get(from.type + ':' + id)).filter(i => i && !isSeen(i) && !used.has(i.id) && i.id !== from.id);
    if (items.length < 3) continue;
    items.forEach(i => used.add(i.id));
    out.push({ from, items });
  }
  return out;
}

/** Sagas (colecciones de TMDB) con al menos dos películas en la biblioteca, las más completas primero */
function allSagas() {
  const map = new Map();
  for (const it of S.lib.items) {
    const c = it.type === 'movie' && it.meta?.collection;
    if (!c) continue;
    if (!map.has(c.id)) map.set(c.id, { ...c, films: [] });
    map.get(c.id).films.push(it);
  }
  return [...map.values()].filter(s => s.films.length >= 2)
    .map(s => ({ ...s, films: s.films.sort((a, b) => (Y(a) || 0) - (Y(b) || 0)) }))
    .sort((a, b) => b.films.length - a.films.length || a.name.localeCompare(b.name, 'es'));
}
const sagaName = s => s.name.replace(/\s*[-–:]?\s*(Colecci[oó]n|Collection|Saga)$/i, '').replace(/^(Colecci[oó]n|Saga)\s*:?\s*/i, '') || s.name;
function sagaCard(s) {
  const poster = s.poster || posterOf(s.films.find(posterOf) || {});
  const seen = s.films.filter(isSeen).length;
  return `<div class="card" tabindex="0" data-saga="${s.id}">
    <div class="art">${poster ? `<img loading="lazy" src="${esc(poster)}" alt="">` : placeholder({ title: sagaName(s), type: 'movie' })}
      ${seen === s.films.length ? `<span class="watched-mark" title="Todas vistas">${I.check}</span>` : ''}</div>
    <div class="cap"><div class="t">${esc(sagaName(s))}</div><div class="s">${s.films.length} películas${seen && seen < s.films.length ? ` · ${seen} vistas` : ''}</div></div>
  </div>`;
}
function viewSagas() {
  const sagas = allSagas();
  return `<div class="page"><h1 class="page-title">Sagas<span class="count">${sagas.length}</span></h1>
    ${sagas.length ? `<div class="grid">${sagas.map(sagaCard).join('')}</div>` : '<div class="empty"><p>No hay ninguna saga con dos o más películas en la biblioteca.</p></div>'}</div>`;
}
function viewSaga(id) {
  const s = allSagas().find(x => String(x.id) === String(id));
  if (!s) return `<div class="page"><div class="empty"><h2>No encontrada</h2><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const bg = s.backdrop || s.films.find(f => f.meta?.backdrop)?.meta.backdrop?.replace('/original/', '/w1280/');
  const years = [Y(s.films[0]), Y(s.films[s.films.length - 1])].filter(Boolean);
  return `<div class="page saga-page">
    ${bg ? `<div class="saga-bg" style="background-image:url('${esc(bg)}')"></div>` : ''}
    <button class="btn btn-ghost btn-sm saga-back" data-action="back">${I.left}Volver</button>
    <h1 class="page-title">${esc(sagaName(s))}<span class="count">${s.films.length}</span></h1>
    <p class="req-intro">${years.length ? (years[0] === years[1] ? years[0] : `${years[0]} – ${years[1]}`) + ' · ' : ''}${s.films.filter(isSeen).length} de ${s.films.length} vistas · en orden de estreno</p>
    <div class="grid">${s.films.map(card).join('')}</div>
  </div>`;
}

function heroHTML() {
  const it = byId(S.heroList[S.heroIdx]);
  if (!it) return '';
  const imgs = S.heroList.map((id, i) => {
    const b = byId(id)?.meta?.backdrop;
    return b ? `<img src="${esc(b)}" class="${i === S.heroIdx ? 'on' : ''}" data-hero="${i}" alt="">` : '';
  }).join('');
  return `<section class="hero" id="hero">
    <div class="hero-bg">${imgs}</div>
    <div class="hero-content" id="heroContent">${heroContent(it)}</div>
    ${S.heroList.length > 1 ? `<div class="hero-dots">${S.heroList.map((_, i) => `<i data-hero-dot="${i}" class="${i === S.heroIdx ? 'on' : ''}"></i>`).join('')}</div>` : ''}
  </section>`;
}

function heroContent(it) {
  const m = it.meta || {};
  return `<div class="kicker">${it.type === 'movie' ? 'Película' : 'Serie'}${isNewItem(it) ? ' · Nuevo' : ''}</div>
    ${m.logo ? `<img class="title-logo" src="${esc(m.logo)}" alt="${esc(T(it))}">` : `<h1 class="title-text">${esc(T(it))}</h1>`}
    ${metaLine(it)}
    ${m.overview ? `<p class="overview">${esc(m.overview)}</p>` : ''}
    <div class="actions">
      ${playButtonFor(it)}
      <button class="btn btn-ghost" data-open="${it.id}">${I.info}Más información</button>
    </div>`;
}

function startHeroTimer() {
  clearInterval(S.heroTimer);
  if (S.route.name !== 'home' || S.heroList.length < 2) return;
  S.heroTimer = setInterval(() => setHero((S.heroIdx + 1) % S.heroList.length), 10000);
}
function setHero(i) {
  S.heroIdx = i;
  const it = byId(S.heroList[i]);
  if (!it || !$('#hero')) return;
  $$('#hero .hero-bg img').forEach(img => img.classList.toggle('on', +img.dataset.hero === i));
  $$('#hero .hero-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
  const c = $('#heroContent');
  c.classList.remove('swap'); void c.offsetWidth;
  c.innerHTML = heroContent(it);
  c.classList.add('swap');
}

function banners() {
  let out = '';
  if (S.lib.error) {
    out += LOCAL()
      ? `<div class="banner"><div class="txt"><b>Biblioteca.</b> ${esc(S.lib.error)}.${S.lib.items.length ? ' Se muestra lo último que se encontró.' : ''}</div></div>`
      : `<div class="banner"><div class="txt"><b>CineLocal Server.</b> ${esc(S.lib.error)}.${S.lib.items.length ? ' Se muestra lo último que se recibió.' : ''}</div></div>`;
  }
  if (!S.lib.hasKey && isAdmin()) {
    out += `<div class="banner"><div class="txt"><b>Añade tu API key de TMDB</b> para ver carátulas, sinopsis, reparto y nombres de episodios. Es gratuita.</div>
      <button class="btn btn-accent btn-sm" data-nav="settings">Configurar</button></div>`;
  }
  if (!S.lib.mpv) {
    out += `<div class="banner"><div class="txt"><b>Falta el reproductor mpv.</b> CineLocal lo usa para reproducir cualquier formato y elegir audio y subtítulos automáticamente.</div>
      <button class="btn btn-ghost btn-sm" data-action="mpv-help">Cómo instalarlo</button></div>`;
  }
  return out;
}

function viewEmpty() {
  return `<div class="page">${banners()}<div class="empty">
    <div class="big-ico">${I.film}</div>
    <h2>Tu biblioteca está vacía</h2>
    <p>${isAdmin() ? `${LOCAL() ? 'CineLocal' : 'CineLocal Server'} busca en ${libPaths().filter(Boolean).map(p => `<b>${esc(p)}</b>`).join(', ') || 'ninguna carpeta'}.<br>Los archivos de vídeo sueltos se muestran como películas y cada carpeta como una serie.` : 'Todavía no hay nada en la biblioteca del servidor.'}</p>
    ${canManage() ? `<div class="actions" style="justify-content:center">
      <button class="btn btn-primary" data-action="scan">Escanear ahora</button>
      <button class="btn btn-ghost" data-nav="settings">Cambiar carpeta</button>
    </div>` : ''}</div></div>`;
}

const isSeen = it => it.type === 'movie' ? !!prog(it.path)?.watched : it.episodes.every(e => epSeen(it, e));

// Categorías: unos pocos géneros de TMDB, con sus nombres en inglés y en español (según el idioma de las fichas)
const CATEGORIES = [
  ['Acción', ['Acción', 'Action', 'Aventura', 'Adventure', 'Action & Adventure', 'Acción y Aventura', 'Acción & Aventura']],
  ['Comedia', ['Comedia', 'Comedy']],
  ['Drama', ['Drama']],
  ['Terror', ['Terror', 'Horror']],
  ['Suspense', ['Suspense', 'Thriller', 'Misterio', 'Mystery']],
  ['Ciencia ficción', ['Ciencia ficción', 'Science Fiction', 'Sci-Fi & Fantasy', 'Ciencia ficción y fantasía', 'Sci-Fi & Fantasía']],
  ['Fantasía', ['Fantasía', 'Fantasy', 'Sci-Fi & Fantasy', 'Ciencia ficción y fantasía', 'Sci-Fi & Fantasía']],
  ['Crimen', ['Crimen', 'Crime']],
  ['Animación', ['Animación', 'Animation']],
  ['Romance', ['Romance']],
  ['Western', ['Western']],
  ['Bélica', ['Bélica', 'War', 'War & Politics', 'Bélica y Política', 'Guerra y política']],
  ['Documental', ['Documental', 'Documentary']],
  ['Familia', ['Familia', 'Family', 'Kids', 'Infantil']]
].map(([name, genres]) => ({ name, keys: new Set(genres.map(g => normName(g))) }));
const inCategory = (it, name) => { const c = CATEGORIES.find(x => x.name === name); return !!c && (it.meta?.genres || []).some(g => c.keys.has(normName(g))); };
/** Categorías con al menos `min` títulos, con cuántos tiene cada una */
const categoriesOf = (items, min = 3) => CATEGORIES.map(c => [c.name, items.filter(it => inCategory(it, c.name)).length]).filter(([, n]) => n >= min);

const GRID_PAGE = 60;   // carátulas que se pintan de cada vez; el resto, al bajar
function gridList(kind) {
  const f = S.filters[kind];
  const base = S.lib.items.filter(i => i.type === (kind === 'movies' ? 'movie' : 'series'));
  const byCat = f.cat ? base.filter(i => inCategory(i, f.cat)) : base;
  const list = f.seen === 'seen' ? byCat.filter(isSeen) : f.seen === 'unseen' ? byCat.filter(i => !isSeen(i)) : byCat;
  return { base, byCat, list: sortItems(list, f.sort, f.seed) };
}

function viewGrid(kind) {
  const f = S.filters[kind];
  const { base, byCat, list } = gridList(kind);
  const cats = categoriesOf(base);
  if (f.cat && !cats.some(([c]) => c === f.cat)) cats.push([f.cat, byCat.length]);
  const seen = byCat.filter(isSeen).length;
  const title = kind === 'movies' ? 'Películas' : 'Series';
  const shown = Math.max(GRID_PAGE, f.shown || 0);
  return `<div class="page">
    <h1 class="page-title">${title}<span class="count">${list.length}</span></h1>
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${f.seen === 'all' ? 'on' : ''}" data-seen="all">Todas · ${byCat.length}</button>
        <button class="chip ${f.seen === 'seen' ? 'on' : ''}" data-seen="seen">Vistas · ${seen}</button>
        <button class="chip ${f.seen === 'unseen' ? 'on' : ''}" data-seen="unseen">Sin ver · ${byCat.length - seen}</button>
      </div>
      <div class="spacer"></div>
      <select class="select" data-sort="${kind}">
        ${[['added', 'Añadidas recientemente'], ['title', 'Título (A-Z)'], ['year', 'Año'], ['rating', 'Valoración'], ['random', 'Al azar'], ...(kind === 'movies' && hasLb() ? [['mine', 'Mi nota (Letterboxd)']] : [])]
          .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    ${cats.length ? `<div class="cat-chips">
        <button class="gchip ${!f.cat ? 'on' : ''}" data-cat="">Todas</button>
        ${cats.map(([c, n]) => `<button class="gchip ${f.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <span class="n">${n}</span></button>`).join('')}
      </div>` : ''}
    ${list.length ? `<div class="grid" id="grid" data-kind="${kind}">${list.slice(0, shown).map(card).join('')}</div>
        ${list.length > shown ? `<div class="grid-more" id="gridMore"><span class="spinner sm"></span></div>` : ''}`
      : `<div class="empty"><p>${base.length ? 'No hay ninguna con estos filtros.' : `No hay ${title.toLowerCase()} en tu biblioteca.`}</p></div>`}
  </div>`;
}

/** Al acercarse al final de la cuadrícula se añade la siguiente tanda (sin volver a pintar lo que ya está) */
function growGrid() {
  const grid = $('#grid'), more = $('#gridMore');
  if (!grid || !more) return;
  const v = $('#view');
  if (v.scrollTop + v.clientHeight < more.offsetTop - 900) return;
  const kind = grid.dataset.kind, f = S.filters[kind];
  const { list } = gridList(kind);
  const from = grid.children.length;
  f.shown = from + GRID_PAGE;
  grid.insertAdjacentHTML('beforeend', list.slice(from, f.shown).map(card).join(''));
  if (f.shown >= list.length) more.remove();
}

function viewWatchlist() {
  return `<div class="page"><h1 class="page-title">Watchlist de Letterboxd<span class="count">${watchlistEntries().length}</span></h1>${watchlistBody()}</div>`;
}
/** La watchlist de Letterboxd (su página y su pestaña en Listas) */
function watchlistBody() {
  const all = watchlistEntries();
  const mode = S.filters.watchlist;
  const have = all.filter(e => e.it).length;
  const list = mode === 'owned' ? all.filter(e => e.it) : mode === 'missing' ? all.filter(e => !e.it) : all;
  return `${all.length ? `<div class="toolbar"><div class="chips">
        <button class="chip ${mode === 'all' ? 'on' : ''}" data-wl="all">Todas · ${all.length}</button>
        <button class="chip ${mode === 'owned' ? 'on' : ''}" data-wl="owned"><i class="dot-own"></i>En tu biblioteca · ${have}</button>
        <button class="chip ${mode === 'missing' ? 'on' : ''}" data-wl="missing">No las tienes · ${all.length - have}</button>
      </div></div>
      <div class="grid filmo">${list.map(e => e.it ? card(e.it).replace('class="card"', 'class="card owned"').replace('<div class="cap">', '<div class="cap"><div class="own-badge">' + I.check + 'En tu biblioteca</div>') : watchlistCard(e)).join('')}</div>`
      : `<div class="empty"><h2>Tu watchlist de Letterboxd está vacía</h2><p>${S.settings.lbUser ? 'Sincroniza tu perfil desde Ajustes.' : 'Conecta tu perfil de Letterboxd en Ajustes.'}</p><button class="btn btn-ghost" data-nav="settings">Ajustes</button></div>`}`;
}

/** Listas: la Watchlist, las propias y, con Letterboxd, su watchlist; una por pestaña */
function viewList() {
  const lists = [watchlistOf(), ...listsOf()];
  const lbOn = !WEB && (!!S.settings.lbUser || watchlistEntries().length > 0);
  const tab = S.listTab === 'lb' && lbOn ? 'lb' : (lists.find(x => x.id === S.listTab) || lists[0]).id;
  const l = lists.find(x => x.id === tab);
  const tabs = `<div class="list-tabs">
      ${lists.map(x => `<button class="gchip ${x.id === tab ? 'on' : ''}" data-list-tab="${esc(x.id)}">${x.id === WL ? I.bookmark : ''}${esc(x.name)} <span class="n">${x.items.length}</span></button>`).join('')}
      ${lbOn ? `<button class="gchip ${tab === 'lb' ? 'on' : ''}" data-list-tab="lb"><span class="lb-logo sm"><i></i><i></i><i></i></span>Watchlist de Letterboxd <span class="n">${watchlistEntries().length}</span></button>` : ''}
      <button class="gchip add" data-action="list-new">${I.plus}Nueva lista</button>
    </div>`;
  if (tab === 'lb') return `<div class="page"><h1 class="page-title">Listas</h1>${tabs}${watchlistBody()}</div>`;
  const owned = l.items.filter(ownedOf).length;
  const isWl = l.id === WL;
  return `<div class="page"><h1 class="page-title">Listas</h1>${tabs}
    <div class="list-head"><div><h2>${esc(l.name)}</h2><p>${l.items.length} ${l.items.length === 1 ? 'título' : 'títulos'}${l.items.length ? ` · ${owned} en tu biblioteca` : ''}</p></div>
      ${isWl ? '' : `<div class="list-actions"><button class="btn btn-ghost btn-sm" data-action="list-rename" data-list="${esc(l.id)}">Renombrar</button>
      <button class="btn btn-ghost btn-sm" data-action="list-delete" data-list="${esc(l.id)}">Eliminar</button></div>`}</div>
    ${l.items.length ? `<div class="grid filmo">${l.items.map(listEntryCard).join('')}</div>`
      : isWl ? `<div class="empty"><div class="big-ico">${I.bookmark}</div><h2>Tu Watchlist está vacía</h2><p>Pulsa «Watchlist» en cualquier película o serie, también en las que no tienes (en la filmografía de un director o al buscar), para apuntarla aquí.</p></div>`
      : `<div class="empty"><div class="big-ico">${I.plus}</div><h2>Lista vacía</h2><p>Pulsa + en una película o serie, o «Guardar en lista» en una película que no tengas (en la filmografía de un director o al buscar), y elige esta lista.</p></div>`}
  </div>`;
}

// ---------------------------------------------------------------- elegir listas para un título
/** Ventana «Guardar en una lista» (la Watchlist y las propias). itemId: el título, si está en la biblioteca */
function openListPicker(entry, itemId) {
  S.picker = { entry, itemId };
  modal(`<div class="modal-head"><h2>Guardar en una lista</h2><p>${esc(entry.title)}${entry.year ? ` (${entry.year})` : ''}</p></div>
    <div class="modal-list" id="listPicker"></div>
    <div class="modal-foot lp-foot">
      <input class="input" data-list-new-name maxlength="60" placeholder="Nueva lista…" spellcheck="false">
      <button class="btn btn-accent btn-sm" data-action="list-create">Crear</button>
      <button class="btn btn-ghost btn-sm" data-action="close-modal">Hecho</button>
    </div>`);
  paintListPicker();
  $('[data-list-new-name]').addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-action="list-create"]').click(); });
}

function paintListPicker() {
  const box = $('#listPicker');
  if (!box || !S.picker) return;
  const { entry, itemId } = S.picker;
  const row = (on, attrs, name, n) => `<button class="lp-row ${on ? 'on' : ''}" ${attrs}><span class="lp-check">${on ? I.check : ''}</span><span class="lp-name">${esc(name)}</span><span class="lp-n">${n}</span></button>`;
  const it = itemId ? byId(itemId) : null;
  const keys = it ? itemKeys(it) : [entry.key];
  box.innerHTML = [watchlistOf(), ...listsOf()].map(l => row(l.items.some(x => keys.includes(x.key)), `data-action="pick-list" data-list="${esc(l.id)}"`, l.name, l.items.length)).join('')
    + (!listsOf().length ? '<p class="filmo-note">Para crear una lista, escribe un nombre abajo y pulsa Crear.</p>' : '');
}

/**
 * Operación de listas. Añadir o quitar un título se ve al momento (sin esperar al servidor); si el servidor falla,
 * se deshace. after(): repintar, al aplicarlo y al llegar la respuesta.
 */
let listSeq = 0;
async function listOp(q, after = () => {}) {
  const before = S.lib.lists;
  if (q.op === 'toggle') {
    S.lib.lists = (before || []).map(l => {
      if (l.id !== q.id) return l;
      const has = l.items.some(x => x.key === q.entry.key);
      return { ...l, items: has ? l.items.filter(x => x.key !== q.entry.key) : [q.entry, ...l.items] };
    });
    after();
  }
  const seq = ++listSeq;
  try {
    const lists = await window.api.lists.op(q);
    // con varios cambios seguidos, sólo la última respuesta (las anteriores no traen los cambios que vinieron después)
    if (seq === listSeq && JSON.stringify(lists) !== JSON.stringify(S.lib.lists)) { S.lib.lists = lists; after(); }
    return true;
  } catch (e) {
    if (seq === listSeq) S.lib.lists = before;
    after();
    toast(errText(e), 'error');
    return false;
  }
}
/**
 * Marcar como vistos (o no) unos archivos: se ve al momento y el servidor se entera después; si falla, se deshace.
 * Con varios clics seguidos, sólo la última respuesta del servidor sustituye al progreso.
 */
let markSeq = 0;
async function markPaths(paths, watched) {
  const before = S.lib.progress;
  const next = { ...before };
  for (const p of paths) {
    if (watched) next[p] = { pos: 0, dur: before[p]?.dur || 0, watched: true, at: Date.now() };
    else delete next[p];
  }
  S.lib.progress = next;
  render(true);
  const seq = ++markSeq;
  try {
    const p = await window.api.markProgress({ paths, watched });
    if (seq === markSeq) S.lib.progress = p;
  } catch (e) {
    S.lib.progress = { ...S.lib.progress };
    for (const p of paths) { if (before[p]) S.lib.progress[p] = before[p]; else delete S.lib.progress[p]; }
    render(true);
    toast(errText(e), 'error');
  }
}

/** Añadir o quitar de la Watchlist */
function toggleWatchlist(entry, after = () => render(true)) {
  return listOp({ op: 'toggle', id: WL, entry }, after);
}

/** Nombre para una lista nueva o para renombrar */
function askListName(title, value = '', placeholder = 'Nombre de la lista') {
  return new Promise(resolve => {
    const m = modal(`<div class="modal-head"><h2>${esc(title)}</h2></div>
      <div class="modal-list" style="padding:0 24px 8px"><input class="input" data-list-name maxlength="300" value="${esc(value)}" placeholder="${esc(placeholder)}" style="width:100%"></div>
      <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Cancelar</button><button class="btn btn-accent btn-sm" data-r="1">Guardar</button></div>`);
    const input = $('[data-list-name]', m);
    const done = ok => { const v = input.value.trim(); closeModal(); resolve(ok && v ? v : null); };
    m.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

// ---------------------------------------------------------------- peticiones (CineLocal Server)
/** Hay peticiones cuando la biblioteca es la del servidor */
const hasRequests = () => !!window.api.requests && !!S.me && !S.me.local;
const isAdmin = () => !!S.me?.admin;
/** Escritorio sin CineLocal Server: carpetas de este PC o del NAS por SMB (todo lo de administrador, para ti) */
const LOCAL = () => !WEB && !!S.me?.local;
/** Corregir fichas, escanear, carpetas y TMDB: en el servidor, sólo un administrador */
const canManage = () => isAdmin();
/** eMule: sólo en el escritorio y sólo para administradores */
const emuleOn = () => !WEB && !!S.settings.emuleEnabled && isAdmin();

/** Quién soy en CineLocal Server (web, o escritorio conectado al servidor): rol, peticiones y botones de administrador */
async function refreshMe() {
  S.me = WEB ? await window.api.me() : await window.api.remote.me().catch(() => null);
  $('#btnScan').classList.toggle('hidden', !canManage());
  $('#navRequests').classList.toggle('hidden', !hasRequests());
  $('#navAccess').classList.toggle('hidden', !(hasRequests() && isAdmin() && window.api.accessLog));
  if (hasRequests()) await loadRequests(); else setRequests(null);
}
const REQ_STATUS = { pending: 'Pendiente', done: 'Conseguida', rejected: 'Rechazada' };
/** Mi petición de un título («movie:438631»), o null */
const myRequest = (key) => S.requests.items.find(r => r.key === key && r.mine) || null;

async function loadRequests() {
  if (!hasRequests()) return;
  try { setRequests(await window.api.requests.get()); } catch {}
}
function setRequests(v) {
  S.requests = v || { items: [], pending: 0 };
  const b = $('#reqBadge');
  if (b) { b.textContent = S.requests.pending || ''; b.classList.toggle('hidden', !S.requests.pending); }
}

async function requestOp(q) {
  try {
    setRequests(await window.api.requests.op(q));
    return true;
  } catch (e) {
    toast(errText(e), 'error');
    return false;
  }
}

/** Botón de pedir (o «Pedida», que lleva a Peticiones) para un título que no está en la biblioteca */
function requestButton(e, cls = 'mh-emule') {
  if (!hasRequests() || !e?.tmdb) return '';
  const r = myRequest(e.key);
  if (r) return `<button class="${cls}" data-nav="requests">${I.check}${r.status === 'pending' ? 'Pedida' : REQ_STATUS[r.status]}</button>`;
  return `<button class="${cls}" data-action="request" data-entry="${esc(JSON.stringify(e))}">${I.download}Pedir</button>`;
}

function viewRequests() {
  const all = S.requests.items;
  const tab = S.reqTab || 'pending';
  const pending = all.filter(r => r.status === 'pending');
  const list = tab === 'pending' ? pending : all.filter(r => r.status !== 'pending');
  const admin = isAdmin();
  const t = S.reqSearch;
  return `<div class="page requests"><h1 class="page-title">Peticiones${pending.length ? `<span class="count">${pending.length}</span>` : ''}</h1>
    <p class="req-intro">${admin ? 'Lo que piden los usuarios y no está en la biblioteca. Al añadirlo a la biblioteca se marca solo como conseguido.' : 'Pide películas y series que no estén en la biblioteca; te avisaremos cuando estén.'}</p>
    <div class="req-search">
      <div class="chips">
        <button class="chip ${t.type === 'movie' ? 'on' : ''}" data-req-type="movie">Película</button>
        <button class="chip ${t.type === 'series' ? 'on' : ''}" data-req-type="series">Serie</button>
      </div>
      <input class="input" id="reqQuery" value="${esc(t.q)}" placeholder="${t.type === 'movie' ? 'Busca una película para pedirla…' : 'Busca una serie para pedirla…'}" spellcheck="false">
    </div>
    <div id="reqResults">${reqResultsHTML()}</div>
    <div class="list-tabs">
      <button class="gchip ${tab === 'pending' ? 'on' : ''}" data-req-tab="pending">Pendientes <span class="n">${pending.length}</span></button>
      <button class="gchip ${tab === 'resolved' ? 'on' : ''}" data-req-tab="resolved">Resueltas <span class="n">${all.length - pending.length}</span></button>
    </div>
    ${list.length ? `<div class="req-list">${list.map(requestRow).join('')}</div>`
      : `<div class="empty"><div class="big-ico">${I.download}</div><h2>${tab === 'pending' ? 'No hay peticiones pendientes' : 'Nada resuelto todavía'}</h2>
        <p>${tab === 'pending' ? 'Busca arriba una película o serie, o pulsa «Pedir» en una que no tengas (al buscar, en la filmografía de un director o en tus listas).' : 'Aquí aparecen las peticiones conseguidas y rechazadas de los últimos 60 días.'}</p></div>`}
  </div>`;
}

function reqResultsHTML() {
  const t = S.reqSearch;
  if (!t.q.trim()) return '';
  if (t.busy) return '<p class="filmo-note" style="padding-left:0">Buscando en TMDB…</p>';
  if (t.error) return `<p class="filmo-note" style="padding-left:0;color:#f87171">${esc(t.error)}</p>`;
  if (!t.results.length) return '<p class="filmo-note" style="padding-left:0">Nada en TMDB con ese nombre.</p>';
  return `<div class="grid filmo req-results">${t.results.map(r => {
    const owned = S.lib.items.find(i => i.type === t.type && i.meta?.tmdbId === r.id);
    if (owned) return card(owned).replace('<div class="cap">', '<div class="cap"><div class="own-badge">' + I.check + 'Ya está en la biblioteca</div>');
    const e = { key: `${t.type}:${r.id}`, tmdb: r.id, type: t.type, title: r.title, year: r.year ? +r.year : null, poster: r.poster || null };
    return missingCard({ ...r, id: t.type === 'movie' ? r.id : null, year: r.year ? +r.year : null }, { entry: e, sub: [r.year, t.type === 'series' ? 'Serie' : ''].filter(Boolean).join(' · ') });
  }).join('')}</div>`;
}

let reqSearchTimer = null;
function searchRequests(q) {
  S.reqSearch.q = q;
  clearTimeout(reqSearchTimer);
  if (!q.trim()) { S.reqSearch.results = []; paintReqResults(); return; }
  reqSearchTimer = setTimeout(async () => {
    const { type } = S.reqSearch;
    S.reqSearch.busy = true; S.reqSearch.error = null; paintReqResults();
    try {
      const res = await window.api.searchMeta({ type, query: q.trim() });
      if (S.reqSearch.q === q && S.reqSearch.type === type) S.reqSearch.results = res.slice(0, 18);
    } catch (e) { S.reqSearch.error = errText(e); }
    S.reqSearch.busy = false;
    paintReqResults();
  }, 400);
}
function paintReqResults() { const box = $('#reqResults'); if (box) box.innerHTML = reqResultsHTML(); }

function requestRow(r) {
  const admin = isAdmin();
  const date = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const who = admin
    ? r.users.map(u => `<b>${esc(u.user)}</b>${u.note ? ` <i>«${esc(u.note)}»</i>` : ''}`).join(', ') + ` · ${date(r.at)}`
    : `Pedida el ${date(r.users.find(u => u.name === S.me?.user?.toLowerCase())?.at || r.at)}${r.users.length > 1 ? ` · también la piden ${r.users.length - 1} más` : ''}`;
  const owned = S.lib.items.find(i => i.type === r.type && i.meta?.tmdbId === r.tmdb);
  const resolved = r.status !== 'pending'
    ? `<div class="req-reply">${REQ_STATUS[r.status]}${r.resolvedAt ? ' el ' + date(r.resolvedAt) : ''}${r.resolvedBy ? ` por ${esc(r.resolvedBy)}` : r.status === 'done' ? ' (al llegar a la biblioteca)' : ''}${r.reply ? ` · «${esc(r.reply)}»` : ''}</div>` : '';
  const actions = admin
    ? (r.status === 'pending'
      ? `${emuleOn() ? `<button class="btn btn-ghost btn-sm" data-action="emule-find" data-q="${esc(r.title)}">${I.download}Buscar en eMule</button>` : ''}
         <button class="btn btn-accent btn-sm" data-action="req-resolve" data-id="${r.id}" data-status="done">Conseguida</button>
         <button class="btn btn-ghost btn-sm" data-action="req-resolve" data-id="${r.id}" data-status="rejected">Rechazar</button>`
      : `<button class="btn btn-ghost btn-sm" data-action="req-resolve" data-id="${r.id}" data-status="pending">Volver a pendiente</button>`)
      + `<button class="btn btn-ghost btn-sm" data-action="req-remove" data-id="${r.id}">Borrar</button>`
    : (r.mine && r.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-action="req-cancel" data-id="${r.id}">Cancelar</button>` : '');
  return `<div class="req-row ${r.status}">
    <div class="req-poster" ${owned ? `data-open="${owned.id}"` : `data-title-type="${r.type}" data-title-id="${r.tmdb}"`}>${r.poster ? `<img loading="lazy" src="${esc(r.poster.replace('/w500/', '/w185/').replace('/w342/', '/w185/'))}" alt="">` : placeholder({ title: r.title, type: r.type })}</div>
    <div class="req-info">
      <div class="req-title">${esc(r.title)}${r.year ? ` <span>(${r.year})</span>` : ''} <span class="req-type">${r.type === 'series' ? 'Serie' : 'Película'}</span></div>
      <div class="req-who">${who}</div>
      ${resolved}
      ${owned ? `<button class="link-btn" data-open="${owned.id}">Ver en la biblioteca</button>` : ''}
    </div>
    <span class="status-pill ${r.status === 'done' ? 'ok' : r.status === 'rejected' ? 'bad' : ''}">${REQ_STATUS[r.status]}</span>
    <div class="req-actions">${actions}</div>
  </div>`;
}

// ---------------------------------------------------------------- registro de actividad (administradores)
const ACCESS_KIND = {
  play: 'Reproducción', remux: 'Reproducción (reempaquetado)', transcode: 'Reproducción (convertido)', download: 'Descarga',
  login: 'Inicio de sesión', 'login-failed': 'Intento fallido', logout: 'Cierre de sesión',
  open: 'Abrir reproductor', watched: 'Marcado como visto', unwatched: 'Marcado como no visto',
  'fav-add': 'Añadido a la Watchlist', 'fav-remove': 'Quitado de la Watchlist',
  'list-create': 'Lista creada', 'list-rename': 'Lista renombrada', 'list-delete': 'Lista borrada', 'list-add': 'Añadido a una lista', 'list-remove': 'Quitado de una lista',
  'request-create': 'Petición', 'request-cancel': 'Petición cancelada', 'request-resolve': 'Petición resuelta', 'request-remove': 'Petición borrada',
  settings: 'Ajustes', scan: 'Escaneo', 'meta-refresh': 'Buscar fichas', identify: 'Ficha corregida', poster: 'Carátula cambiada',
  error: 'Error', 'client-error': 'Error en la app'
};
const ACCESS_TYPES = [['', 'Todo'], ['video', 'Vídeo'], ['action', 'Acciones'], ['session', 'Sesiones'], ['error', 'Errores']];

async function loadAccess() {
  const a = S.access;
  a.busy = true; a.error = null; paintAccess();
  try {
    const r = await window.api.accessLog({ days: a.days, user: a.user, type: a.type, q: a.q.trim() });
    Object.assign(a, { items: r.items, total: r.total, users: r.users });
  } catch (e) { a.error = errText(e); }
  a.busy = false;
  paintAccess();
}
function paintAccess() { const box = $('#accessList'); if (box) box.innerHTML = accessListHTML(); }

function viewAccess() {
  const a = S.access;
  const users = [...new Set([...a.users, a.user].filter(Boolean))];
  return `<div class="page access"><h1 class="page-title">Registro de actividad</h1>
    <p class="req-intro">Qué ha visto o descargado cada usuario, desde dónde y cuánto, lo que ha hecho en la app y los errores que ha tenido. Una reproducción con varios saltos cuenta como un solo acceso.</p>
    <div class="access-filters">
      <div class="list-tabs">${ACCESS_TYPES.map(([k, l]) => `<button class="gchip ${a.type === k ? 'on' : ''}" data-access-type="${k}">${l}</button>`).join('')}</div>
      <select class="input" id="accessDays">${[[1, 'Hoy y ayer'], [7, '7 días'], [30, '30 días'], [90, '90 días'], [365, 'Último año']].map(([d, l]) => `<option value="${d}" ${a.days === d ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input" id="accessUser"><option value="">Todos los usuarios</option>${users.map(u => `<option ${u === a.user ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
      <input class="input" id="accessQuery" value="${esc(a.q)}" placeholder="Filtrar por título, archivo, IP o error…" spellcheck="false">
    </div>
    <div id="accessList">${accessListHTML()}</div>
  </div>`;
}

function accessListHTML() {
  const a = S.access;
  if (a.error) return `<p class="filmo-note" style="padding-left:0;color:#f87171">${esc(a.error)}</p>`;
  if (!a.items) return '<p class="filmo-note" style="padding-left:0">Cargando…</p>';
  if (!a.items.length) return `<div class="empty"><div class="big-ico">${I.check}</div><h2>Nada en este periodo</h2><p>Prueba con más días o quita los filtros.</p></div>`;
  const day = ts => new Date(ts).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = ts => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const size = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' GB' : Math.max(1, Math.round(n / 1e6)) + ' MB';
  const span = (from, to) => { const m = Math.round((to - from) / 60000); return m < 1 ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
  const video = new Set(['play', 'remux', 'transcode', 'download']);
  let last = '';
  const rows = a.items.map(e => {
    const d = day(e.at);
    const head = d !== last ? `<h3 class="access-day">${d}</h3>` : '';
    last = d;
    const isVideo = video.has(e.kind);
    const bad = e.kind === 'login-failed' || e.kind === 'error' || e.kind === 'client-error';
    const what = [
      e.title ? `<span class="access-title">${esc(e.title)}</span>` : '',
      isVideo && e.file ? `<span class="access-file" title="${esc(e.file)}">${esc(e.file.split(/[\\/]/).pop())}</span>` : '',
      e.detail ? `<span class="access-detail ${bad ? 'bad' : ''}" title="${esc(e.detail)}">${esc(e.detail.split('\n')[0])}</span>` : ''
    ].join('');
    const facts = [e.client, e.ip, isVideo && span(e.at, e.end), isVideo && e.bytes ? size(e.bytes) : ''].filter(Boolean).map(esc).join(' · ');
    const pill = e.live ? `<span class="status-pill ok">${ACCESS_KIND[e.kind]} · en curso</span>`
      : `<span class="status-pill ${bad ? 'bad' : e.kind === 'download' ? 'warn' : isVideo ? 'ok' : ''}">${ACCESS_KIND[e.kind] || esc(e.kind)}</span>`;
    return `${head}<div class="access-row ${bad ? 'bad' : ''}">
      <span class="access-time">${time(e.at)}</span>
      <span class="access-user">${esc(e.user || '—')}</span>
      <div class="access-what">${what}<span class="access-facts">${facts}</span></div>
      ${pill}
    </div>`;
  }).join('');
  return `${a.total > a.items.length ? `<p class="filmo-note" style="padding-left:0">Se muestran los ${a.items.length} más recientes de ${a.total}.</p>` : ''}${rows}`;
}

/** Pedir un título: con una nota opcional («la versión extendida», «en español»…) */
function askRequest(e) {
  return new Promise(resolve => {
    const m = modal(`<div class="modal-head"><h2>Pedir «${esc(e.title)}»${e.year ? ` (${e.year})` : ''}</h2>
        <p>${isAdmin() ? 'Quedará en Peticiones como pendiente.' : 'Los administradores recibirán el aviso; te avisaremos cuando esté en la biblioteca.'}</p></div>
      <div class="modal-list" style="padding:0 24px 8px"><input class="input" data-req-note maxlength="300" placeholder="Nota (opcional): versión, idioma, calidad…" style="width:100%"></div>
      <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Cancelar</button><button class="btn btn-accent btn-sm" data-r="1">Pedir</button></div>`);
    const input = $('[data-req-note]', m);
    const done = ok => { const v = input.value.trim(); closeModal(); resolve(ok ? { note: v } : null); };
    m.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); });
    setTimeout(() => input.focus(), 30);
  });
}

/** Respuesta del administrador al rechazar (opcional) */
function askReply(title) {
  return new Promise(resolve => {
    const m = modal(`<div class="modal-head"><h2>Rechazar «${esc(title)}»</h2><p>Quien la pidió verá el motivo.</p></div>
      <div class="modal-list" style="padding:0 24px 8px"><input class="input" data-req-reply maxlength="300" placeholder="Motivo (opcional)" style="width:100%"></div>
      <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Cancelar</button><button class="btn btn-accent btn-sm" data-r="1">Rechazar</button></div>`);
    const input = $('[data-req-reply]', m);
    const done = ok => { const v = input.value.trim(); closeModal(); resolve(ok ? v : null); };
    m.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
    input.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); });
    setTimeout(() => input.focus(), 30);
  });
}

function viewSearch() {
  const q = S.query.trim().toLowerCase();
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q);
  const scored = S.lib.items.map(it => {
    const m = it.meta || {};
    let score = 0;
    if (norm(T(it)).startsWith(nq)) score += 10;
    else if (norm(T(it)).includes(nq)) score += 6;
    if (norm(it.title).includes(nq) || norm(m.originalTitle).includes(nq)) score += 4;
    if ((m.genres || []).some(g => norm(g).includes(nq))) score += 3;
    if ((m.cast?.map(c => c.name) || m.people || []).some(n => norm(n).includes(nq))) score += 2;
    if (norm(m.director || m.creators).includes(nq)) score += 2;
    if (String(Y(it)) === q) score += 3;
    return { it, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const dmatch = allDirectors().filter(d => norm(d.name).includes(nq)).slice(0, 12);
  // siempre se busca también en TMDB: lo que coincide en la biblioteca (otra película con esa palabra, un actor…)
  // no quiere decir que esté lo que buscas, y desde ahí se ve su ficha y se pide
  const local = scored.length > 0 || dmatch.length > 0;
  const online = tmdbSearchHTML(S.query.trim(), local);
  return `<div class="page"><h1 class="page-title">Resultados para “${esc(S.query)}”<span class="count">${scored.length}</span></h1>
    ${dmatch.length ? `<h2 class="section-title" style="margin-top:0">Directores</h2><div class="dir-strip">${dmatch.map(directorChip).join('')}</div><h2 class="section-title">Títulos</h2>` : ''}
    ${scored.length ? `<div class="grid">${scored.map(x => card(x.it)).join('')}</div>` : ''}
    ${online || (local ? '' : `<div class="empty"><div class="big-ico">${I.search}</div><h2>Sin resultados</h2><p>Prueba con otro título, un actor o un género.</p></div>`)}</div>`;
}

/**
 * Películas y series de TMDB que coinciden con la búsqueda y no están en la biblioteca ('' si no hay clave de TMDB).
 * local: la biblioteca ya ha dado resultados (entonces van debajo, como «Fuera de tu biblioteca»)
 */
function tmdbSearchHTML(q, local = false) {
  if (!S.lib.hasKey || q.length < 2) return '';
  const t = S.tmdbSearch;
  const head = local ? `<h2 class="section-title">Fuera de tu biblioteca</h2>` : '';
  const pending = `${head}<p class="filmo-note" style="padding-left:0">${local ? '' : 'No está en tu biblioteca. '}Buscando en TMDB…</p>`;
  if (t.q !== q) { searchTmdb(q); return pending; }
  if (t.busy) return pending;
  if (t.error) return local ? '' : `<div class="empty"><div class="big-ico">${I.search}</div><h2>Sin resultados</h2><p>No está en tu biblioteca y no se ha podido buscar en TMDB: ${esc(t.error)}</p></div>`;
  // lo que ya tienes no se repite
  const owned = (type, id) => S.lib.items.some(i => i.type === type && i.meta?.tmdbId === id);
  const movies = t.movies.filter(r => !owned('movie', r.id));
  const series = t.series.filter(r => !owned('series', r.id));
  if (!movies.length && !series.length) return local ? '' : `<div class="empty"><div class="big-ico">${I.search}</div><h2>Sin resultados</h2><p>Ni en tu biblioteca ni en TMDB. Prueba con otro título, un actor o un género.</p></div>`;
  // películas y series de TMDB: pulsa para ver su ficha y pedirla
  const cards = (list, type) => list.map(r => {
    const e = { key: `${type}:${r.id}`, tmdb: r.id, type, title: r.title, year: r.year ? +r.year : null, poster: r.poster || null };
    return missingCard({ ...r, id: type === 'movie' ? r.id : null, year: r.year ? +r.year : null }, { entry: e, sub: [r.year, type === 'series' ? 'Serie' : ''].filter(Boolean).join(' · ') || null });
  }).join('');
  const section = (title, list, type) => list.length ? `<h3 class="tmdb-sub">${title}</h3><div class="grid filmo">${cards(list, type)}</div>` : '';
  // las series primero si coinciden mejor (p. ej. «breaking bad»)
  const seriesFirst = series.length && (!movies.length || normName(series[0].title) === normName(q) && normName(movies[0].title) !== normName(q));
  const parts = [section('Películas', movies, 'movie'), section('Series', series, 'series')];
  return `${head}<p class="filmo-note" style="padding-left:0">${local ? 'En TMDB' : 'No está en tu biblioteca. Esto es lo que hay en TMDB'}: pulsa un título para ver su ficha${hasRequests() ? ' y pedirlo' : ''}.</p>
    ${(seriesFirst ? parts.reverse() : parts).join('')}`;
}

async function searchTmdb(q) {
  S.tmdbSearch = { q, busy: true, movies: [], series: [], error: null };
  // "dune 2021": el año del final afina la búsqueda (uno del futuro es parte del título: "Blade Runner 2049")
  const y = q.match(/^(.*\S)\s+((?:19|20)\d{2})$/);
  const m = y && +y[2] <= new Date().getFullYear() + 1 ? y : null;
  try {
    const query = m ? m[1] : q, year = m ? m[2] : null;
    const [movies, series] = await Promise.all([
      window.api.searchMeta({ type: 'movie', query, year }),
      window.api.searchMeta({ type: 'series', query, year })
    ]);
    if (S.tmdbSearch.q === q) S.tmdbSearch = { q, busy: false, movies: movies.slice(0, 18), series: series.slice(0, 12), error: null };
  } catch (e) {
    if (S.tmdbSearch.q === q) S.tmdbSearch = { q, busy: false, movies: [], series: [], error: errText(e) };
  }
  if (S.route.name === 'search' && S.query.trim() === q) render(true);
}

function viewDetail(id) {
  const it = byId(id);
  if (!it) return `<div class="page"><div class="empty"><h2>No encontrado</h2><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const m = it.meta || {};
  const keys = itemKeys(it);
  const wl = watchlistOf().items.some(x => keys.includes(x.key));
  const saved = listsOf().some(l => l.items.some(x => keys.includes(x.key)));
  const credit = it.type === 'movie' ? (directorsOf(it).length ? `<b>Dirección</b>${directorsOf(it).map(d => `<a class="credit-link" data-director="${esc(dirKey(d))}">${esc(d.name)}</a>`).join(', ')}` : '')
    : (m.creators ? `<b>Creada por</b>${esc(m.creators)}` : '') + (m.networks?.length ? `&nbsp;&nbsp;·&nbsp;&nbsp;<b>Cadena</b>${esc(m.networks.join(', '))}` : '');
  let restart = '';
  if (it.type === 'movie') {
    const p = prog(it.path);
    if (p && !p.watched && p.pos > 30) restart = `<button class="round-btn" title="Desde el principio" data-play="${it.id}" data-from-start="1">${I.restart}</button>`;
  }
  const watchedAll = it.type === 'movie' ? !!prog(it.path)?.watched : it.episodes.every(e => epSeen(it, e));

  let body = '';
  if (it.type === 'series') body += seasonSection(it);
  if (m.cast?.length) {
    body += `<h2 class="section-title">Reparto</h2><div class="cast">${m.cast.map(c => `
      <div class="person"><div class="ph">${c.photo ? `<img loading="lazy" src="${esc(c.photo)}" alt="">` : esc((c.name || '?')[0])}</div>
      <div class="n">${esc(c.name)}</div><div class="c">${esc(c.character || '')}</div></div>`).join('')}</div>`;
  }
  body += `<h2 class="section-title">Información</h2><div class="file-info">
    ${m.originalTitle && m.originalTitle !== m.title ? `<b>Título original</b><span>${esc(m.originalTitle)}</span>` : ''}
    ${it.type === 'movie' ? `<b>Archivo</b><span>${esc(it.path)}</span><b>Tamaño</b><span>${fmtSize(it.size)}</span>`
      : `<b>Carpeta</b><span>${esc(it.path)}</span><b>Tamaño</b><span>${fmtSize(it.episodes.reduce((a, e) => a + e.size, 0))}</span>`}
    <b>Metadatos</b><span>${it.meta ? `TMDB #${m.tmdbId}${canManage() ? ` · <button class="link-btn" data-action="identify" data-id="${it.id}">Corregir coincidencia</button>` : ''}`
      : `${it.metaFailed ? 'No se encontró en TMDB' : 'Sin metadatos'}${canManage() ? ` · <button class="link-btn" data-action="identify" data-id="${it.id}">Identificar manualmente</button>` : ''}`}</span>
    ${canManage() || it.poster ? `<b>Carátula</b><span>${it.poster ? 'Elegida a mano' : posterOf(it) ? 'La de TMDB' : 'Sin carátula'}${canManage() ? ` · <button class="link-btn" data-action="poster" data-id="${it.id}">Cambiar</button>` : ''}</span>` : ''}
  </div>`;

  return `<div class="detail">
    <button class="back-btn" data-action="back">${I.back}Volver</button>
    <section class="detail-hero">
      <div class="bg ${m.backdrop ? '' : 'noimg'}">${m.backdrop ? `<img src="${esc(m.backdrop)}" alt="">` : ''}</div>
      <div class="content">
        <div class="kicker">${it.type === 'movie' ? 'Película' : 'Serie'}</div>
        ${m.logo ? `<img class="title-logo" src="${esc(m.logo)}" alt="${esc(T(it))}">` : `<h1 class="title-text">${esc(T(it))}</h1>`}
        ${metaLine(it)}
        ${m.genres?.length ? `<div class="genres">${m.genres.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
        ${m.tagline ? `<p class="tagline">${esc(m.tagline)}</p>` : ''}
        ${m.overview ? `<p class="overview">${esc(m.overview)}</p>` : ''}
        ${credit ? `<div class="credits-line">${credit}</div>` : ''}
        ${lbLine(lbOf(it))}
        <div class="actions">
          ${playButtonFor(it)}
          ${restart}
          <button class="round-btn ${wl ? 'on' : ''}" title="${wl ? 'Quitar de la Watchlist' : 'Añadir a la Watchlist'}" data-action="wl-toggle" data-id="${it.id}">${wl ? I.bookmarkOn : I.bookmark}</button>
          <button class="round-btn ${saved ? 'on' : ''}" title="Guardar en una lista" data-action="lists-pick" data-id="${it.id}">${saved ? I.check : I.plus}</button>
          ${m.trailer ? `<button class="round-btn" title="Ver tráiler" data-action="trailer" data-url="${esc(m.trailer)}">${I.yt}</button>` : ''}
          <div class="menu-wrap">
            <button class="round-btn" title="Más opciones" data-action="menu">${I.more}</button>
            <div class="menu hidden" id="detailMenu">
              <button data-action="mark-all" data-id="${it.id}" data-watched="${watchedAll ? 0 : 1}">${watchedAll ? I.restart : I.eye}${watchedAll ? 'Marcar como no visto' : 'Marcar como visto'}</button>
              ${canManage() ? `<button data-action="identify" data-id="${it.id}">${I.tag}Corregir coincidencia</button>
              <button data-action="poster" data-id="${it.id}">${I.image}Cambiar carátula</button>` : ''}
              ${emuleOn() ? `<button data-action="emule-find" data-q="${esc(T(it))}">${I.download}Buscar en eMule</button>` : ''}
              ${WEB ? '' : `<button data-action="reveal" data-path="${esc(it.type === 'movie' ? it.path : it.episodes[0].path)}">${I.folder}Abrir ubicación</button>`}
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="detail-body">${body}</div>
  </div>`;
}

// ---------------------------------------------------------------- ficha de un título que no está en la biblioteca
async function loadTitle(type, id) {
  const k = `${type}:${id}`;
  if (S.titles[k] && !S.titles[k].error) return;
  S.titles[k] = { loading: true };
  try { S.titles[k] = { data: await window.api.getTitle({ type, id }) }; }
  catch (e) { S.titles[k] = { error: errText(e) }; }
  if (S.route.name === 'title' && S.route.type === type && S.route.id === id) render(true);
}

function viewTitle(type, id) {
  // si resulta que sí está en la biblioteca, su ficha de siempre
  const owned = S.lib.items.find(i => i.type === type && i.meta?.tmdbId === id);
  if (owned) return viewDetail(owned.id);
  const st = S.titles[`${type}:${id}`];
  const backBtn = `<button class="back-btn" data-action="back">${I.back}Volver</button>`;
  if (!st || st.loading) { if (!st) loadTitle(type, id); return `<div class="page">${backBtn}<div class="empty"><div class="spinner"></div></div></div>`; }
  if (st.error) return `<div class="page">${backBtn}<div class="empty"><h2>No se ha podido cargar la ficha</h2><p>${esc(st.error)}</p><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const m = st.data;
  const e = { key: `${type}:${id}`, tmdb: id, type, title: m.title, year: m.year || null, poster: m.poster || null };
  const saved = inAnyList(e.key);
  const req = myRequest(e.key);
  const lb = type === 'movie' ? lbOf(id) : null;
  const years = type === 'series' && m.year ? (m.endYear && m.endYear !== m.year ? `${m.year}–${m.endYear}` : m.endYear ? `${m.year}` : `${m.year}–`) : m.year;
  const line = [
    m.rating ? `<span class="rating">${I.star}${m.rating.toFixed(1)}</span>` : '',
    years ? `<span>${years}</span>` : '',
    m.certification ? `<span class="badge">${esc(m.certification)}</span>` : '',
    type === 'movie' && m.runtime ? `<span>${fmtRuntime(m.runtime)}</span>` : '',
    type === 'series' && m.numberOfSeasons ? `<span>${m.numberOfSeasons} ${m.numberOfSeasons === 1 ? 'temporada' : 'temporadas'}</span>` : ''
  ].filter(Boolean);
  // sólo se enlaza al director si tiene alguna película en la biblioteca (su página sale de ahí)
  const known = new Set(type === 'movie' ? allDirectors().map(d => d.key) : []);
  const credit = type === 'movie'
    ? (m.directors?.length ? `<b>Dirección</b>${m.directors.map(d => known.has('p' + d.id) ? `<a class="credit-link" data-director="p${d.id}">${esc(d.name)}</a>` : esc(d.name)).join(', ')}` : '')
    : (m.creators ? `<b>Creada por</b>${esc(m.creators)}` : '') + (m.networks?.length ? `&nbsp;&nbsp;·&nbsp;&nbsp;<b>Cadena</b>${esc(m.networks.join(', '))}` : '');
  let body = '';
  if (m.cast?.length) {
    body += `<h2 class="section-title">Reparto</h2><div class="cast">${m.cast.map(c => `
      <div class="person"><div class="ph">${c.photo ? `<img loading="lazy" src="${esc(c.photo)}" alt="">` : esc((c.name || '?')[0])}</div>
      <div class="n">${esc(c.name)}</div><div class="c">${esc(c.character || '')}</div></div>`).join('')}</div>`;
  }
  body += `<h2 class="section-title">Información</h2><div class="file-info">
    ${m.originalTitle && m.originalTitle !== m.title ? `<b>Título original</b><span>${esc(m.originalTitle)}</span>` : ''}
    ${m.releaseDate ? `<b>Estreno</b><span>${esc(fmtDate(m.releaseDate))}</span>` : ''}
    <b>En la biblioteca</b><span>No está${req ? ` · ${req.status === 'pending' ? 'la has pedido' : 'petición ' + REQ_STATUS[req.status].toLowerCase()}` : ''}</span>
    <b>Metadatos</b><span>TMDB #${id}</span>
  </div>`;
  return `<div class="detail">
    ${backBtn}
    <section class="detail-hero">
      <div class="bg ${m.backdrop ? '' : 'noimg'}">${m.backdrop ? `<img src="${esc(m.backdrop)}" alt="">` : ''}</div>
      <div class="content">
        <div class="kicker">${type === 'movie' ? 'Película' : 'Serie'} · No está en la biblioteca</div>
        ${m.logo ? `<img class="title-logo" src="${esc(m.logo)}" alt="${esc(m.title)}">` : `<h1 class="title-text">${esc(m.title)}</h1>`}
        ${line.length ? `<div class="meta-line">${line.join('<i class="dot"></i>')}</div>` : ''}
        ${m.genres?.length ? `<div class="genres">${m.genres.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
        ${m.tagline ? `<p class="tagline">${esc(m.tagline)}</p>` : ''}
        ${m.overview ? `<p class="overview">${esc(m.overview)}</p>` : ''}
        ${credit ? `<div class="credits-line">${credit}</div>` : ''}
        ${lbLine(lb)}
        <div class="actions">
          ${hasRequests() ? (req ? `<button class="btn btn-ghost" data-nav="requests">${I.check}${req.status === 'pending' ? 'Pedida' : REQ_STATUS[req.status]}</button>`
            : `<button class="btn btn-primary" data-action="request" data-entry="${esc(JSON.stringify(e))}">${I.download}Pedir</button>`) : ''}
          ${type === 'movie' ? `<button class="btn btn-ghost" data-providers="${id}" data-ptitle="${esc(m.title)}" data-palt="${esc(m.originalTitle || '')}">${I.eye}Dónde verla</button>` : ''}
          <button class="round-btn ${inWatchlist(e.key) ? 'on' : ''}" title="${inWatchlist(e.key) ? 'Quitar de la Watchlist' : 'Añadir a la Watchlist'}" data-action="wl-toggle" data-entry="${esc(JSON.stringify(e))}">${inWatchlist(e.key) ? I.bookmarkOn : I.bookmark}</button>
          <button class="round-btn ${saved ? 'on' : ''}" title="Guardar en una lista" data-action="lists-pick" data-entry="${esc(JSON.stringify(e))}">${saved ? I.check : I.plus}</button>
          ${m.trailer ? `<button class="round-btn" title="Ver tráiler" data-action="trailer" data-url="${esc(m.trailer)}">${I.yt}</button>` : ''}
          ${emuleOn() ? `<button class="round-btn" title="Buscar en eMule" data-action="emule-find" data-q="${esc(m.title)}" data-alt="${esc(m.originalTitle || '')}">${I.download}</button>` : ''}
        </div>
      </div>
    </section>
    <div class="detail-body">${body}</div>
  </div>`;
}

function lbLine(lb) {
  if (!lb) return '';
  const parts = [];
  if (lb.rating) parts.push(`Tu nota <b class="lb-stars">${lbStars(lb.rating)}</b>`);
  if (lb.liked) parts.push('<span class="lb-heart">♥</span> Te gustó');
  if (lb.watched && lb.date) parts.push(`Vista el ${fmtDate(lb.date)}`);
  else if (lb.watched) parts.push('Vista');
  if (lb.watchlist) parts.push('En tu watchlist');
  if (!parts.length) return '';
  const url = lb.slug ? `https://letterboxd.com/film/${lb.slug}/` : null;
  return `<div class="lb-line" ${url ? `data-url="${esc(url)}" title="Abrir en Letterboxd"` : ''}><span class="lb-logo"><i></i><i></i><i></i></span>${parts.join('<i class="dot"></i>')}</div>`;
}

function seasonSection(it) {
  const st = seriesState(it);
  const season = S.season[it.id] ?? st.ep.season;
  const eps = it.episodes.filter(e => e.season === season);
  const sm = it.meta?.seasons?.[season];
  const seasonName = n => seasonLabel(it, n);
  const tabs = it.seasons.length > 6
    ? `<select class="select" data-season-select="${it.id}">${it.seasons.map(n => `<option value="${n}" ${n === season ? 'selected' : ''}>${esc(seasonName(n))}</option>`).join('')}</select>`
    : `<div class="season-tabs">${it.seasons.map(n => `<button class="${n === season ? 'on' : ''}" data-season="${n}" data-id="${it.id}">${esc(seasonName(n))}</button>`).join('')}</div>`;
  const seasonSeen = eps.length > 0 && eps.every(e => epSeen(it, e));
  const markSeason = `<button class="btn btn-ghost btn-sm season-mark ${seasonSeen ? 'on' : ''}" data-action="mark-season" data-id="${it.id}" data-season="${season}" data-watched="${seasonSeen ? 0 : 1}">${seasonSeen ? I.restart : I.check}${seasonSeen ? 'Marcar temporada como no vista' : 'Marcar temporada como vista'}</button>`;
  return `<h2 class="section-title">Episodios</h2>
    <div class="season-bar">${tabs}${markSeason}</div>
    ${sm?.overview ? `<p class="overview" style="max-width:900px;font-size:14px;margin-bottom:18px">${esc(sm.overview)}</p>` : ''}
    <div class="episodes">${eps.map(e => {
      const em = epMeta(it, e) || {};
      const p = prog(e.path);
      const current = e.id === st.ep.id && st.mode !== 'done' && st.mode !== 'start';
      return `<div class="episode ${current ? 'current' : ''}" data-play="${it.id}" data-ep="${e.id}">
        <div class="num">${e.episode}</div>
        <div class="still">
          ${em.still ? `<img loading="lazy" src="${esc(em.still)}" alt="">` : (it.meta?.backdrop ? `<img loading="lazy" src="${esc(it.meta.backdrop.replace('/original/', '/w500/'))}" alt="" style="filter:brightness(.55)">` : placeholder(it, true))}
          <div class="play-hint">${I.play}</div>
          ${p && !p.watched && p.pos > 0 ? `<div class="progress"><i style="width:${pct(p)}%"></i></div>` : ''}
        </div>
        <div class="info">
          <div class="t">${esc(episodeLabel(em, e.episode))}<small>${[em.runtime ? em.runtime + ' min' : (p?.dur ? Math.round(p.dur / 60) + ' min' : ''), em.airDate ? new Date(em.airDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : ''].filter(Boolean).join(' · ')}</small></div>
          ${em.overview ? `<p>${esc(em.overview)}</p>` : ''}
          <div class="file">${esc(e.fileName)}</div>
        </div>
        <div class="side"><button class="check-btn ${epSeen(it, e) ? 'on' : ''}" title="${epSeen(it, e) ? 'Marcar como no visto' : 'Marcar como visto'}" data-action="mark" data-id="${it.id}" data-ep="${e.id}" data-watched="${epSeen(it, e) ? 0 : 1}">${I.check}</button></div>
      </div>`;
    }).join('')}</div>`;
}

function viewSettings() {
  const s = S.settings;
  const opt = (list, v) => list.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const sw = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><span></span></label>`;
  return `<div class="page settings">
    <h1 class="page-title">Ajustes</h1>
    ${accountHTML()}

    ${isAdmin() ? `<div class="set-group"><h3>${LOCAL() ? 'Biblioteca' : 'Biblioteca del servidor'}</h3>
      <div class="set-row lib-paths"><div class="lbl"><div class="t">Carpetas de películas y series</div>
        <div class="d">${LOCAL() ? 'De este PC o del NAS: <code>\\\\NAS\\Carpeta</code>. Cada una, «Automática» o «Por categorías». Una serie repartida en varias se junta en una.' : 'Carpetas dentro del contenedor de CineLocal Server. Archivos de vídeo sueltos = películas · cada carpeta = una serie (admite subcarpetas por temporada). Una serie repartida en varias carpetas se junta en una sola.'}</div></div>
        <div class="ctl">
          ${libPaths().map((p, i, all) => `<div class="lib-path">
            <input class="input" data-lib-path="${i}" value="${esc(p)}" placeholder="${LOCAL() ? 'D:\\Películas o \\\\NAS\\video' : 'Carpeta en el servidor, p. ej. /media'}" spellcheck="false">
            ${LOCAL() ? `<button class="btn btn-ghost btn-sm" data-action="pick-folder" data-idx="${i}">Examinar</button>` : ''}
            ${p ? `<button class="btn btn-ghost btn-sm layout-btn ${layoutOf(p) ? 'on' : ''}" data-action="lib-layout" data-path="${esc(p)}" title="Cómo están organizadas las carpetas">${layoutOf(p) ? 'Por categorías' : 'Automática'}</button>` : ''}
            ${all.length > 1 ? `<button class="icon-btn sm" data-action="remove-lib-path" data-idx="${i}" title="Quitar esta carpeta">${I.close}</button>` : ''}
          </div>`).join('')}
          <button class="btn btn-ghost btn-sm add-path" data-action="add-lib-path">${I.plus}Añadir nueva ruta</button>
        </div></div>
      ${LOCAL() && libPaths().some(isUncPath) ? nasLoginHTML(s) : ''}
      <div class="set-row"><div class="lbl"><div class="t">Escanear de nuevo</div><div class="d">${S.lib.items.length} títulos · último escaneo ${S.lib.scannedAt ? new Date(S.lib.scannedAt).toLocaleString('es-ES') : 'nunca'}</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="scan">Escanear ahora</button></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Detectar archivos nuevos automáticamente</div><div class="d">${LOCAL() ? 'CineLocal vigila las carpetas mientras está abierto y añade lo nuevo en cuanto termine de copiarse, con aviso.' : 'El servidor vigila la carpeta y añade lo nuevo en cuanto termine de copiarse, con aviso a todos.'}</div></div>
        <div class="ctl">${sw('autoWatch', s.autoWatch !== false)}</div></div>
      <div class="set-row"><div class="lbl"><div class="t">Carpetas con un solo vídeo como película</div><div class="d">Si una carpeta contiene un único vídeo sin numeración de episodio, se trata como película en vez de serie.</div></div>
        <div class="ctl">${sw('singleFileFolderAsMovie', s.singleFileFolderAsMovie)}</div></div>
    </div>

    <div class="set-group"><h3>Metadatos (TMDB)</h3>
      <div class="set-row"><div class="lbl"><div class="t">API key de TMDB</div>
        <div class="d">Gratis en <a data-url="https://www.themoviedb.org/settings/api">themoviedb.org/settings/api</a>. Sirve la “Clave de la API” (v3) o el “Token de acceso de lectura” (v4).</div></div>
        <div class="ctl"><input class="input" type="password" data-set-text="tmdbKey" value="${esc(s.tmdbKey)}" placeholder="Pega aquí tu clave" style="min-width:260px">
        <button class="btn btn-ghost btn-sm" data-action="test-key">Probar</button><span id="keyStatus"></span></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de los metadatos</div><div class="d">Títulos, sinopsis y nombres de episodios, para todos los usuarios.</div></div>
        <div class="ctl"><select class="select" data-set="metaLang">${opt(META_LANGS, s.metaLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Volver a descargar todos los metadatos</div><div class="d">Útil si cambias de idioma o TMDB ha actualizado información. Se conservan las correcciones manuales.</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="refresh-meta">Actualizar</button></div></div>
    </div>` : ''}

    <div class="set-group"><h3>Audio y subtítulos</h3>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de audio preferido</div><div class="d">Se selecciona automáticamente si el archivo tiene esa pista; si no, se usa la pista por defecto.</div></div>
        <div class="ctl"><select class="select" data-set="audioLang">${opt(AUDIO_LANGS, s.audioLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de subtítulos preferido</div><div class="d">Incluye subtítulos internos y archivos .srt/.ass junto al vídeo.</div></div>
        <div class="ctl"><select class="select" data-set="subLang">${opt(SUB_LANGS, s.subLang)}</select></div></div>
      <div class="set-row ${s.subLang === 'none' ? 'hidden' : ''}"><div class="lbl"><div class="t">Mostrar subtítulos</div><div class="d">“Sólo si el audio está en otro idioma” evita subtítulos en español cuando ya escuchas en español.</div></div>
        <div class="ctl"><select class="select" data-set="subMode">${opt([['always', 'Siempre'], ['foreign', 'Sólo si el audio está en otro idioma'], ['off', 'Nunca (activables durante la reproducción)']], s.subMode)}</select></div></div>
    </div>

    ${WEB ? `<div class="set-group"><h3>Reproducción</h3>
      <div class="set-row"><div class="lbl"><div class="t">Reproducir el siguiente episodio automáticamente</div></div><div class="ctl">${sw('autoplayNext', s.autoplayNext)}</div></div>
    </div>` : `<div class="set-group"><h3>Reproducción</h3>
      ${window.api.platform === 'win32' ? `<div class="set-row"><div class="lbl"><div class="t">Dónde se reproduce</div><div class="d">Dentro de CineLocal, el vídeo ocupa la ventana de la app y al terminar vuelves a la ficha. En ventana aparte, mpv abre su propia ventana.</div></div>
        <div class="ctl"><select class="select" data-set="playerMode">${opt([['embedded', 'Dentro de CineLocal'], ['window', 'En ventana aparte']], s.playerMode || 'embedded')}</select></div></div>` : ''}
      <div class="set-row"><div class="lbl"><div class="t">Interfaz del reproductor</div><div class="d">La moderna es al estilo de Netflix: al mover el ratón aparecen el botón grande de pausa, la barra de tiempo con miniaturas y los controles de audio, subtítulos y episodios. La clásica usa tu propia configuración de mpv.</div></div>
        <div class="ctl"><select class="select" data-set="playerUi">${opt([['modern', 'Moderna'], ['classic', 'Clásica de mpv']], s.playerUi || 'modern')}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Reproductor a pantalla completa</div></div><div class="ctl">${sw('playerFullscreen', s.playerFullscreen)}</div></div>
      <div class="set-row"><div class="lbl"><div class="t">Reproducir el siguiente episodio automáticamente</div></div><div class="ctl">${sw('autoplayNext', s.autoplayNext)}</div></div>
      ${window.api.platform !== 'win32' || s.playerMode === 'window' ? `<div class="set-row"><div class="lbl"><div class="t">Minimizar CineLocal al reproducir</div></div><div class="ctl">${sw('minimizeOnPlay', s.minimizeOnPlay)}</div></div>` : ''}
      <div class="set-row"><div class="lbl"><div class="t">Reproductor mpv</div>
        <div class="d">${S.lib.mpv ? `Detectado: ${esc(S.lib.mpv)}` : 'No encontrado. <a data-action="mpv-help">Cómo instalarlo</a>'}</div></div>
        <div class="ctl"><span class="status-pill ${S.lib.mpv ? 'ok' : 'bad'}">${S.lib.mpv ? 'Listo' : 'No encontrado'}</span><button class="btn btn-ghost btn-sm" data-action="pick-mpv">Seleccionar mpv.exe</button></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Argumentos extra de mpv</div><div class="d">Avanzado. Ej.: <code>--volume=80 --sub-scale=1.1</code></div></div>
        <div class="ctl"><input class="input" data-set-text="extraMpvArgs" value="${esc(s.extraMpvArgs)}" placeholder="--opcion=valor"></div></div>
    </div>`}

    <div class="set-group" id="platforms"><h3>Mis plataformas</h3>
      ${platformsSettingsHTML()}
    </div>

    ${WEB ? '' : `<div class="set-group" id="letterboxd"><h3>Letterboxd</h3>
      ${letterboxdSettingsHTML(s, sw)}
    </div>`}

    ${!WEB && isAdmin() ? `<div class="set-group"><h3>Descargas (eMule)</h3>
      ${emuleSettingsHTML(s, sw)}
    </div>` : ''}

    ${window.api.platform === 'win32' ? `<div class="set-group" id="discord"><h3>Discord</h3>
      ${discordSettingsHTML(s, sw)}
    </div>

    ` : ''}${WEB ? '' : `<div class="set-group"><h3>Aplicación</h3>
      <div class="set-row"><div class="lbl"><div class="t">Iniciar en pantalla completa</div><div class="d">Pulsa F11 en cualquier momento para entrar o salir.</div></div><div class="ctl">${sw('startFullscreen', s.startFullscreen)}</div></div>
      <div class="set-row"><div class="lbl"><div class="t">Pantalla completa ahora</div></div><div class="ctl"><button class="btn btn-ghost btn-sm" data-action="fullscreen">Alternar (F11)</button></div></div>
    </div>

    <div class="set-group" id="updates"><h3>Actualizaciones</h3>
      ${updateSettingsHTML(s, sw)}
    </div>`}
  </div>`;
}

/** Quién ha iniciado sesión, en qué servidor, y cerrar sesión (o la biblioteca local, y volver al servidor) */
function accountHTML() {
  const me = S.me || {};
  if (LOCAL()) {
    return `<div class="set-group" id="account"><h3>Origen de la biblioteca</h3>
      <div class="set-row"><div class="lbl"><div class="t">Carpetas de este PC o del NAS</div>
        <div class="d">Sin CineLocal Server: CineLocal lee las carpetas directamente (las del NAS, por SMB) y guarda en este PC las fichas, el progreso y tus listas. Las peticiones y el registro de actividad sólo existen con el servidor.</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="use-server">Usar CineLocal Server</button></div></div>
    </div>`;
  }
  return `<div class="set-group" id="account"><h3>Cuenta</h3>
      <div class="set-row"><div class="lbl"><div class="t">${esc(me.user || '')} · ${me.admin ? 'CineLocal Admin' : 'CineLocal User'}</div>
        <div class="d">CineLocal Server ${esc(me.version || '')}${WEB ? '' : ' en ' + esc(S.settings.remoteUrl || '')} · conversión de vídeo con ${me.hwaccel === 'vaapi' ? 'la gráfica del NAS' : 'el procesador del NAS'}.${me.admin ? ' Puedes corregir fichas, gestionar las peticiones y cambiar los ajustes del servidor.' : ' Tu progreso, tus listas, tus peticiones y estos ajustes de audio, subtítulos y plataformas son sólo tuyos.'}${me.groups ? '' : ' (Todavía no se usan los grupos de DSM: el acceso lo decide la configuración del servidor.)'}</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="logout">Cerrar sesión</button></div></div>
      ${WEB ? '' : `<div class="set-row"><div class="lbl"><div class="t">Usar sin CineLocal Server</div>
        <div class="d">Leer directamente las carpetas de este PC o del NAS por SMB (<code>\\\\NAS\\Carpeta</code>), con su propia biblioteca en este PC. La sesión del servidor se guarda para volver a él.</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="use-local">Usar carpetas</button></div></div>`}
    </div>`;
}

const isUncPath = p => /^\\\\[^\\]+\\[^\\]+/.test(p || '');

/** Biblioteca local en el NAS: usuario propio para leer las carpetas \\NAS\… (opcional) */
function nasLoginHTML(s) {
  return `<div class="set-row nas-row"><div class="lbl"><div class="t">Inicio de sesión en el NAS</div>
      <div class="d">Opcional: un usuario del NAS con permiso de lectura en esas carpetas (de escritura si eMule copia ahí las descargas), sin depender de las credenciales guardadas en el Explorador de Windows. Vacío = la sesión que tenga Windows. La contraseña se guarda cifrada con tu cuenta de Windows.</div></div>
      <div class="ctl">
        <input class="input" data-lnas="user" value="${esc(s.nasUser)}" placeholder="Usuario del NAS" spellcheck="false">
        <input class="input" type="password" data-lnas="password" placeholder="${s.nasHasPassword ? 'Contraseña guardada' : 'Contraseña'}">
        <button class="btn btn-ghost btn-sm" data-action="nas-login">Conectar</button>
      </div>
      <div class="nas-status" id="nasStatus">${nasStatePill()}</div></div>`;
}

// ---------------------------------------------------------------- descargas (eMule)
const DL_STATES = {
  downloading: 'Descargando', waiting: 'En espera', stalled: 'Sin fuentes', paused: 'En pausa', stopped: 'Detenida',
  complete: 'Completada', completing: 'Completando…', hashing: 'Comprobando…', waitinghash: 'Comprobando…', error: 'Error'
};
const EMULE_ERRORS = {
  offline: ['eMule no está abierto', 'O su servidor web está desactivado (Opciones → Servidor Web). Cuando responda, aquí podrás elegir servidor y conectar Kad.'],
  auth: ['eMule ha rechazado la contraseña', 'Escribe en Ajustes la misma contraseña que pusiste en eMule → Opciones → Servidor Web.'],
  template: ['eMule no está usando la plantilla de CineLocal', 'Indícala en eMule → Opciones → Servidor Web → Plantilla y pulsa «Recargar». La ruta está en Ajustes.'],
  unconfigured: ['Falta configurar eMule', 'Sigue los pasos de Ajustes → Descargas (eMule).']
};

function fmtRate(bps) {
  if (!bps) return '';
  return bps >= 1048576 ? `${(bps / 1048576).toFixed(1)} MB/s` : `${Math.max(1, Math.round(bps / 1024))} KB/s`;
}
function fmtEta(d) {
  if (d.state !== 'downloading' || !d.speed || d.size <= d.done) return '';
  const m = Math.round((d.size - d.done) / d.speed / 60);
  if (m < 1) return 'menos de 1 min';
  if (m < 60) return `${m} min`;
  if (m < 60 * 48) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.round(m / 1440)} días`;
}
const errText = (e) => String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** Etiquetas útiles a partir del nombre del archivo */
function releaseTags(name) {
  const n = name.toLowerCase();
  const t = [];
  if (/2160p|\b4k\b|\buhd\b/.test(n)) t.push('4K'); else if (/1080p/.test(n)) t.push('1080p'); else if (/720p/.test(n)) t.push('720p');
  if (/x265|hevc|h\.?265/.test(n)) t.push('HEVC');
  if (/castellano|español|espanol|spanish|\bspa\b|\besp\b/.test(n)) t.push('Castellano');
  if (/latino/.test(n)) t.push('Latino');
  if (/\bdual\b/.test(n)) t.push('Dual');
  if (/vose|subtitulad/.test(n)) t.push('VOSE');
  return t;
}

function activeDownloads() { return (S.emule.snap.downloads || []).filter(d => d.state !== 'complete'); }

function emuleStatusHTML() {
  const sn = S.emule.snap;
  if (!sn.ok) {
    const [t, d] = EMULE_ERRORS[sn.code] || ['No se puede conectar con eMule', sn.error || ''];
    return `<div class="banner"><div class="txt"><b>${esc(t)}.</b> ${esc(d)}</div>
      ${sn.code === 'offline' ? '<button class="btn btn-accent btn-sm" data-action="emule-launch">Abrir eMule</button>' : ''}
      <button class="btn btn-ghost btn-sm" data-nav="settings">Ajustes</button></div>`;
  }
  const st = sn.status;
  const srv = S.emule.srv;
  const server = { high: ['ok', 'ID alta'], low: ['warn', 'ID baja'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.server];
  const kad = { ok: ['ok', 'Abierto'], firewalled: ['warn', 'Tras cortafuegos'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.kad];
  const busy = (k) => srv.busy === k ? ' disabled' : '';
  const n = srv.list?.length;
  return `<div class="dl-status">
    <span><small>Servidor</small><span class="status-pill ${server[0]}">${server[1]}</span>${(st.server === 'high' || st.server === 'low') && st.serverName ? `<em title="${esc(st.serverName)}">${esc(st.serverName)}</em>` : ''}</span>
    <span><small>Kad</small><span class="status-pill ${kad[0]}">${kad[1]}</span>${srv.kad && st.kad !== 'off' && !srvOutdated() ? `<em>${srv.kad.contacts} contactos</em>` : ''}</span>
    <span><small>Bajada</small><b>${fmtRate(st.down) || '0 KB/s'}</b></span>
    <span><small>Subida</small><b>${fmtRate(st.up) || '0 KB/s'}</b></span>
    <span class="dl-conn-btns">
      ${st.server === 'off'
        ? `<button class="btn btn-accent btn-sm" data-action="emule-srv-any"${busy('srv')}>Conectar</button>`
        : `<button class="btn btn-ghost btn-sm" data-action="emule-srv-off"${busy('srv')}>${st.server === 'connecting' ? 'Cancelar' : 'Desconectar'}</button>`}
      ${st.kad === 'off'
        ? `<button class="btn btn-accent btn-sm" data-action="emule-kad" data-op="connect"${busy('kad')}>Conectar Kad</button>`
        : `<button class="btn btn-ghost btn-sm" data-action="emule-kad" data-op="disconnect"${busy('kad')}>Desconectar Kad</button>`}
      ${srvOutdated() ? '' : `<button class="btn btn-ghost btn-sm srv-toggle${srvOpen() ? ' on' : ''}" data-action="emule-srv-toggle" aria-expanded="${srvOpen()}">Servidores${n ? `<span class="srv-n">${n}</span>` : ''}${I.right}</button>`}
    </span>
  </div>`;
}

// ---- conexión: lista de servidores y Kad
/** eMule sigue con una plantilla anterior en memoria: no sabe devolver la lista de servidores */
function srvOutdated() {
  const sn = S.emule.snap;
  return !!(sn.ok && ((sn.status?.template || 1) < 2 || S.emule.srv.outdated));
}
/** Abierta por defecto mientras no haya servidor conectado; después, lo que elija el usuario */
function srvOpen() {
  const srv = S.emule.srv, st = S.emule.snap.status;
  if (srv.open === null && st) srv.open = st.server !== 'high' && st.server !== 'low';
  return !!srv.open;
}

const fmtCount = (n) => n ? new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : '—';
const SRV_SORTS = { users: -1, files: -1, ping: 1, name: 1 };   // sentido inicial de cada columna

function sortedServers() {
  const { list, sort, dir } = S.emule.srv;
  const val = (s) => sort === 'ping' ? (s.ping || Infinity) : sort === 'name' ? s.name.toLowerCase() : s[sort];
  return [...list].sort((a, b) => (b.connected - a.connected)
    || (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0)
    || b.users - a.users);
}

function serversHintHTML() {
  if (!srvOutdated()) return '';
  const p = S.emule.info?.templatePath;
  return `<div class="banner warn"><div class="txt"><b>eMule sigue usando la versión anterior de la plantilla de CineLocal.</b>
    Para ver y elegir servidores desde aquí, en eMule abre <b>Opciones → Servidor Web</b>, pulsa <b>Recargar</b> junto a la plantilla y después <b>Aplicar</b>. No hace falta cerrar eMule.${p ? `<br><small>Plantilla: <code>${esc(p)}</code></small>` : ''}</div>
    <button class="btn btn-ghost btn-sm" data-action="emule-srv-refresh">Comprobar</button></div>`;
}

function serversBodyHTML() {
  const srv = S.emule.srv;
  if (srv.error) return `<p class="dl-empty err">${esc(srv.error)}</p>`;
  if (!srv.list) return '<div class="srv-empty"><div class="spinner"></div>Cargando la lista de servidores de eMule…</div>';
  if (!srv.list.length) return `<div class="srv-empty">eMule no tiene servidores en su lista. Añade los de un <b>server.met</b> aquí abajo o conéctate sólo a Kad.</div>`;
  const st = S.emule.snap.status || {};
  const arrow = (k) => srv.sort === k ? `<i class="srv-arrow">${srv.dir < 0 ? '▼' : '▲'}</i>` : '';
  const th = (k, label, cls = '') => `<th class="sortable ${cls}${srv.sort === k ? ' on' : ''}" data-action="emule-srv-sort" data-k="${k}" title="Ordenar por ${label.toLowerCase()}">${label}${arrow(k)}</th>`;
  const rows = sortedServers().map(s => {
    const action = s.connected
      ? `<span class="status-pill ${s.state === 'high' ? 'ok' : 'warn'}">Conectado · ID ${s.state === 'high' ? 'alta' : 'baja'}</span>`
      : `<button class="btn btn-ghost btn-sm" data-action="emule-srv-connect" data-ip="${esc(s.ip)}" data-port="${s.port}" data-name="${esc(s.name)}"${srv.busy === 'srv' ? ' disabled' : ''}>Conectar</button>`;
    return `<tr class="${s.connected ? 'on' : ''}${s.failed ? ' failed' : ''}">
      <td class="srv-main"><div class="srv-name" title="${esc(s.name)}">${esc(s.name)}${s.static ? '<span class="badge">Estático</span>' : ''}${s.priority === 'high' ? '<span class="badge">Prioridad alta</span>' : ''}</div>
        ${s.description ? `<div class="srv-desc" title="${esc(s.description)}">${esc(s.description)}</div>` : ''}</td>
      <td class="srv-addr">${esc(s.ip)}:${s.port}</td>
      <td class="num" title="${s.users ? `${s.users.toLocaleString('es-ES')} usuarios${s.maxUsers ? ` (máx. ${s.maxUsers.toLocaleString('es-ES')})` : ''}` : 'Sin datos'}">${fmtCount(s.users)}</td>
      <td class="num">${fmtCount(s.files)}</td>
      <td class="num">${s.ping ? `${s.ping} ms` : '—'}${s.failed ? `<small class="srv-fail">${s.failed} ${s.failed === 1 ? 'fallo' : 'fallos'}</small>` : ''}</td>
      <td class="srv-act">${action}</td>
    </tr>`;
  }).join('');
  return `<div class="srv-wrap"><table class="srv">
    <thead><tr>${th('name', 'Servidor')}<th>Dirección</th>${th('users', 'Usuarios', 'num')}${th('files', 'Archivos', 'num')}${th('ping', 'Ping', 'num')}<th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    ${st.server === 'connecting' ? '<p class="srv-note"><span class="spinner sm"></span>eMule está probando servidores. Si tarda, elige uno de la lista o pulsa Cancelar.</p>' : ''}`;
}

function serversPanelHTML() {
  const kadIdle = S.emule.snap.status?.kad === 'off' || S.emule.snap.status?.kad === 'connecting';
  return `<div id="dlSrvHint">${serversHintHTML()}</div>
    <div class="srv-panel${S.emule.snap.ok && srvOpen() && !srvOutdated() ? '' : ' hidden'}" id="dlServers">
      <div id="dlSrvBody">${serversBodyHTML()}</div>
      <div class="srv-foot">
        <form id="srvMet" class="srv-form"><label for="srvMetUrl">Añadir servidores de un server.met</label>
          <input class="input" id="srvMetUrl" name="url" placeholder="http://…/server.met" spellcheck="false" autocomplete="off">
          <button class="btn btn-ghost btn-sm">Añadir</button></form>
        <form id="kadBoot" class="srv-form${kadIdle ? '' : ' hidden'}"><label for="kadBootAddr">Conectar Kad desde un nodo</label>
          <input class="input" id="kadBootAddr" name="addr" placeholder="IP:puerto" spellcheck="false" autocomplete="off">
          <button class="btn btn-ghost btn-sm">Conectar</button></form>
      </div>
    </div>`;
}

function paintServers() {
  if (S.route.name !== 'downloads' || !$('#dlServers')) return;
  $('#dlSrvHint').innerHTML = serversHintHTML();
  $('#dlServers').classList.toggle('hidden', !(S.emule.snap.ok && srvOpen() && !srvOutdated()));
  $('#dlSrvBody').innerHTML = serversBodyHTML();
  const st = S.emule.snap.status;
  $('#kadBoot').classList.toggle('hidden', !(st && (st.kad === 'off' || st.kad === 'connecting')));
}

/** Aplica la respuesta de servers()/connectServer()/disconnect()/updateServerMet() */
function setServers(r) {
  const srv = S.emule.srv;
  srv.at = Date.now();
  srv.error = null;
  srv.outdated = r.outdated;
  if (!r.outdated) srv.list = r.servers;
  srv.kad = r.kad;
}

/** Se pide al abrir Descargas y, con la lista visible, cada 5 s como mucho (al ritmo del sondeo de eMule) */
async function loadServers(force = false) {
  const srv = S.emule.srv;
  if (S.route.name !== 'downloads' || !emuleOn() || !S.emule.snap.ok || document.hidden) return;
  // con la plantilla antigua sólo se vuelve a mirar si lo pide el usuario o si la cabecera ya trae la nueva
  if (!force && ((S.emule.snap.status?.template || 1) < 2 || (!srvOpen() && srv.list))) return;
  if (srv.loading || (!force && Date.now() - srv.at < 5000)) return;
  srv.loading = true;
  try { setServers(await window.api.emule.servers()); }
  catch (e) { srv.error = errText(e); srv.at = Date.now(); }
  finally { srv.loading = false; }
  paintServers();
  if ($('#dlStatus')) $('#dlStatus').innerHTML = emuleStatusHTML();
}

function downloadRow(d) {
  const pc = Math.floor(d.progress * 1000) / 10;
  const active = !['complete', 'completing', 'hashing', 'waitinghash', 'error'].includes(d.state);
  const paused = d.state === 'paused' || d.state === 'stopped';
  const sub = [
    `<b class="st-${esc(d.state)}">${DL_STATES[d.state] || esc(d.state)}</b>`,
    d.state === 'complete' ? fmtSize(d.size) : `${pc.toFixed(1)}% · ${d.done ? fmtSize(d.done) : '0 MB'} de ${fmtSize(d.size)}`,
    fmtRate(d.speed),
    active && !paused ? `${d.sources} ${d.sources === 1 ? 'fuente' : 'fuentes'}` : '',
    fmtEta(d) ? `quedan ${fmtEta(d)}` : ''
  ].filter(Boolean).join('<i class="dot"></i>');
  return `<div class="dl ${esc(d.state)}">
    <div class="dl-main">
      <div class="dl-name" title="${esc(d.name)}">${esc(d.name)}</div>
      <div class="dl-bar"><i style="width:${pc}%"></i></div>
      <div class="dl-sub">${sub}</div>
    </div>
    <div class="dl-actions">
      ${active ? (paused
        ? `<button class="round-btn sm" title="Reanudar" data-action="dl-op" data-op="resume" data-hash="${d.hash}">${I.play}</button>`
        : `<button class="round-btn sm" title="Pausar" data-action="dl-op" data-op="pause" data-hash="${d.hash}">${I.pause}</button>`) : ''}
      ${d.link ? `<button class="round-btn sm" title="Copiar enlace ed2k" data-action="dl-copy" data-link="${esc(d.link)}">${I.link}</button>` : ''}
      ${d.state === 'complete'
        ? `<button class="round-btn sm" title="Quitar de la lista" data-action="dl-op" data-op="clear" data-hash="${d.hash}">${I.check}</button>`
        : active ? `<button class="round-btn sm" title="Cancelar descarga" data-action="dl-cancel" data-hash="${d.hash}" data-name="${esc(d.name)}">${I.close}</button>` : ''}
    </div>
  </div>`;
}

function downloadsListHTML() {
  const list = [...(S.emule.snap.downloads || [])].sort((a, b) => (a.state === 'complete') - (b.state === 'complete'));
  if (!S.emule.snap.ok) return '';
  if (!list.length) return '<p class="dl-empty">No hay descargas en eMule. Busca arriba o pega un enlace ed2k.</p>';
  return list.map(downloadRow).join('');
}

function searchResultsHTML() {
  const s = S.emule.search;
  if (s.error) return `<p class="dl-empty err">${esc(s.error)}</p>`;
  if (!s.run || s.hidden) return '';
  const inList = new Set((S.emule.snap.downloads || []).map(d => d.hash));
  const res = [...s.results].sort((a, b) => b.sources - a.sources);
  const head = `<div class="dl-res-head">${s.busy ? '<div class="spinner"></div>' : ''}
    <span>${res.length ? `${res.length} resultados` : s.busy ? 'Buscando en la red eD2k…' : 'Sin resultados. Prueba con menos palabras o con el título original.'}</span>
    ${s.message && !s.busy ? `<small>${esc(s.message)}</small>` : ''}
    <span class="spacer"></span>${s.alt && !s.busy ? `<button class="btn btn-ghost btn-sm" data-action="emule-alt">${I.search}Buscar «${esc(s.alt)}»</button>` : ''}
    ${res.length || !s.busy ? '<button class="link-btn" data-action="dl-clear-results">Cerrar</button>' : ''}</div>`;
  return head + (res.length ? `<div class="dl-results">${res.slice(0, 200).map(r => {
    return `<div class="dl-res">
      <div class="dl-res-main"><div class="dl-name" title="${esc(r.name)}">${esc(r.name)}</div>
        <div class="dl-sub">${fmtSize(r.size)}<i class="dot"></i>${r.sources} ${r.sources === 1 ? 'fuente' : 'fuentes'}${r.complete ? ` (${r.complete} ${r.complete === 1 ? 'completa' : 'completas'})` : ''}
        ${releaseTags(r.name).map(t => `<span class="badge">${t}</span>`).join('')}</div></div>
      ${inList.has(r.hash) ? '<span class="status-pill ok">En descargas</span>'
        : `<button class="btn btn-ghost btn-sm" data-action="dl-get" data-hash="${r.hash}">${I.download}Descargar</button>`}
    </div>`;
  }).join('')}</div>` : '');
}

function viewDownloads() {
  const s = S.emule.search;
  const method = S.settings.emuleSearchMethod || 'global';
  return `<div class="page downloads">
    <h1 class="page-title">Descargas<span class="count" id="dlCount"></span></h1>
    <div id="dlStatus">${emuleStatusHTML()}</div>
    ${serversPanelHTML()}
    <form class="dl-search" id="dlSearch">
      <div class="search big">${I.search}<input name="q" value="${esc(s.query)}" placeholder="Buscar en eMule: título, año, calidad…" spellcheck="false" autocomplete="off"></div>
      <select class="select" name="method" data-set="emuleSearchMethod" title="Dónde buscar">
        <option value="global" ${method === 'global' ? 'selected' : ''}>Servidores</option>
        <option value="kademlia" ${method === 'kademlia' ? 'selected' : ''}>Kad</option>
      </select>
      <button class="btn btn-primary btn-sm">Buscar</button>
    </form>
    <div id="dlResults">${searchResultsHTML()}</div>
    <h2 class="section-title">En eMule</h2>
    <div class="dl-list" id="dlList">${downloadsListHTML()}</div>
    <form class="dl-link" id="dlLink">
      <input class="input" name="link" placeholder="Pega un enlace ed2k://|file|…" spellcheck="false" autocomplete="off">
      <button class="btn btn-ghost btn-sm">Añadir</button>
    </form>
  </div>`;
}

/** Actualiza sólo las partes vivas, sin tocar el buscador (foco, texto) */
function paintEmule() {
  const n = activeDownloads().length;
  const badge = $('#dlBadge');
  badge.textContent = n;
  badge.classList.toggle('hidden', !n);
  $('#navDownloads').classList.toggle('hidden', !emuleOn());
  if (S.route.name === 'downloads') {
    $('#dlStatus').innerHTML = emuleStatusHTML();
    $('#dlList').innerHTML = downloadsListHTML();
    $('#dlCount').textContent = S.emule.snap.downloads?.length || '';
    if (!S.emule.snap.ok) S.emule.srv.list = S.emule.srv.kad = null;   // eMule cerrado: no enseñar datos viejos
    paintServers();
    loadServers();
  }
  if (S.route.name === 'settings' && $('#emuleState')) $('#emuleState').innerHTML = emuleStatePill();
}
function paintResults() { if (S.route.name === 'downloads') $('#dlResults').innerHTML = searchResultsHTML(); }

/** alt: otra forma de buscar lo mismo (p. ej. el título original), ofrecida con un clic en los resultados */
async function emuleSearch(query, alt) {
  query = query.trim();
  if (!query) return;
  alt = alt && normName(alt) !== normName(query) ? alt.trim() : null;
  const s = S.emule.search = { query, alt, results: [], message: '', busy: true, error: null, run: S.emule.search.run + 1 };
  const input = $('#dlSearch')?.q;
  if (input && input.value !== query) input.value = query;
  const run = s.run;
  paintResults();
  try {
    let r = await window.api.emule.search({ query });
    // eMule va recibiendo resultados: consultar hasta que dejen de llegar
    let stable = 0;
    for (let i = 0; i < 20 && run === S.emule.search.run; i++) {
      s.results = r.results; s.message = r.message;
      paintResults();
      await new Promise(res => setTimeout(res, 2500));
      if (run !== S.emule.search.run) return;
      const prev = s.results.length;
      r = await window.api.emule.results();
      stable = r.results.length === prev ? stable + 1 : 0;
      if (i >= 4 && stable >= 3) break;
    }
    s.results = r.results; s.message = r.message;
  } catch (e) {
    s.error = errText(e);
  }
  if (run === S.emule.search.run) { s.busy = false; paintResults(); }
}

function confirmModal(title, text, okLabel) {
  return new Promise(resolve => {
    const m = modal(`<div class="modal-head"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>
      <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Volver</button><button class="btn btn-accent btn-sm" data-r="1">${esc(okLabel)}</button></div>`);
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) { closeModal(); resolve(b.dataset.r === '1'); }
    });
  });
}

function emuleStatePill() {
  const sn = S.emule.snap;
  if (sn.ok) return '<span class="status-pill ok">Conectado con eMule</span>';
  if (sn.code === 'disabled') return '';
  return `<span class="status-pill bad">${esc((EMULE_ERRORS[sn.code] || [sn.error || 'Sin conexión'])[0])}</span>`;
}

function emuleSettingsHTML(s, sw) {
  const info = S.emule.info;
  if (!s.emuleEnabled) {
    return `<div class="set-row"><div class="lbl"><div class="t">Buscar y descargar con eMule</div>
      <div class="d">Usa el servidor web de eMule de este PC para buscar, descargar y seguir el progreso desde CineLocal. Lo descargado se copia ${LOCAL() ? 'a la biblioteca' : 'al NAS'} al terminar.${LOCAL() ? '' : ' Sólo para administradores.'}</div></div>
      <div class="ctl">${sw('emuleEnabled', false)}</div></div>`;
  }
  const tmpl = info?.templatePath || '…';
  return `<div class="set-row"><div class="lbl"><div class="t">Buscar y descargar con eMule</div><div class="d">Aparece la sección <b>Descargas</b> en la barra superior.</div></div>
      <div class="ctl"><span id="emuleState">${emuleStatePill()}</span>${sw('emuleEnabled', true)}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Cómo conectarlo</div>
      <ol class="steps">
        <li>En eMule abre <b>Opciones → Servidor Web</b> y marca <b>Activado</b>.</li>
        <li>Escribe una <b>contraseña</b> (sólo para CineLocal) y deja el puerto en ${esc(s.emulePort || 4711)}.</li>
        <li>En <b>Plantilla</b> pon esta ruta y pulsa <b>Recargar</b>:<br>
          <code class="path">${esc(tmpl)}</code> <button class="link-btn" data-action="copy" data-text="${esc(tmpl)}">Copiar</button></li>
        <li>Pulsa <b>Aplicar</b> en eMule y escribe aquí abajo la misma contraseña.</li>
      </ol>
      <div class="d">La plantilla hace que el servidor web de eMule hable con CineLocal en vez de mostrar su página; si algún día quieres volver a la interfaz web original, elige <code>eMule.tmpl</code>. No abras el puerto ${esc(s.emulePort || 4711)} en el router.</div></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Contraseña del servidor web</div><div class="d">La que pusiste en eMule → Opciones → Servidor Web.</div></div>
      <div class="ctl"><input class="input" type="password" data-set-text="emulePassword" value="${esc(s.emulePassword)}" placeholder="Contraseña" style="min-width:200px">
      <button class="btn btn-ghost btn-sm" data-action="emule-test">Probar</button><span id="emuleTest"></span></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Puerto</div></div>
      <div class="ctl"><input class="input" data-set-text="emulePort" value="${esc(s.emulePort)}" style="min-width:0;width:100px"></div></div>
    <div class="set-row"><div class="lbl"><div class="t">${LOCAL() ? 'Copiar a la biblioteca al terminar' : 'Copiar al NAS al terminar'}</div>
      <div class="d">Las películas van a la carpeta «Películas» de la biblioteca${LOCAL() ? ` (la primera: <code>${esc(libPaths()[0] || '…')}</code>)` : ''} y los episodios (S01E02, 1x02, Cap.102) a la carpeta de su serie; ${LOCAL() ? 'CineLocal' : 'CineLocal Server'} los añade solo. Sólo se copian las descargas que CineLocal ha visto en curso${info?.incoming?.length ? `, desde <code>${esc(info.incoming.join(', '))}</code>` : ''}.${LOCAL() ? '' : ' El PC tiene que llegar al NAS (en casa o con la VPN).'}</div></div>
      <div class="ctl">${sw('emuleMoveToLibrary', s.emuleMoveToLibrary !== false)}</div></div>
    ${s.emuleMoveToLibrary !== false && !LOCAL() ? `<div class="set-row nas-row"><div class="lbl"><div class="t">Carpeta de la biblioteca en el NAS</div>
      <div class="d">La misma carpeta que usa CineLocal Server, vista desde Windows: <code>\\\\NAS\\Multimedia</code> (o <code>\\\\10.8.0.1\\Multimedia</code> por la VPN). Usuario del NAS con permiso de escritura en ella; si lo dejas vacío, se usa la sesión que tenga Windows. La contraseña se guarda cifrada con tu cuenta de Windows.</div></div>
      <div class="ctl">
        <input class="input" data-nas="dest" value="${esc(s.emuleDest)}" placeholder="\\\\NAS\\Multimedia" spellcheck="false">
        <input class="input" data-nas="user" value="${esc(s.nasUser)}" placeholder="Usuario del NAS" spellcheck="false">
        <input class="input" type="password" data-nas="password" placeholder="${s.nasHasPassword ? 'Contraseña guardada' : 'Contraseña'}">
        <button class="btn btn-ghost btn-sm" data-action="nas-test">Comprobar y guardar</button>
      </div>
      <div class="nas-status" id="nasStatus">${nasStatePill()}</div></div>` : ''}
    <div class="set-row"><div class="lbl"><div class="t">Programa eMule</div>
      <div class="d">${info?.exe ? `Detectado: ${esc(info.exe)}` : info ? 'No encontrado.' : 'Buscando…'}</div></div>
      <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="emule-launch">Abrir eMule</button><button class="btn btn-ghost btn-sm" data-action="pick-emule">Seleccionar emule.exe</button></div></div>`;
}

function platformsSettingsHTML() {
  const mine = S.settings.myProviders || [];
  const countries = [['ES', 'España'], ['MX', 'México'], ['AR', 'Argentina'], ['CO', 'Colombia'], ['CL', 'Chile'], ['PE', 'Perú'], ['US', 'Estados Unidos'], ['GB', 'Reino Unido'], ['FR', 'Francia'], ['DE', 'Alemania'], ['IT', 'Italia'], ['PT', 'Portugal']];
  const region = S.settings.region || 'ES';
  const head = `<div class="set-row"><div class="lbl"><div class="t">País</div><div class="d">Las plataformas y su catálogo cambian según el país.</div></div>
      <div class="ctl"><select class="select" data-set="region">${countries.map(([k, l]) => `<option value="${k}" ${k === region ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Plataformas que tienes contratadas</div>
    <div class="d">En “Dónde verla” se destacarán y tendrán un enlace para abrir la película en ellas.${mine.length ? ` Seleccionadas: ${mine.map(m => esc(m.name)).join(', ')}.` : ''}</div></div></div>`;
  if (!S.lib.hasKey) return head + '<p class="filmo-note" style="margin:0 0 16px">Necesita la API key de TMDB.</p>';
  if (!S.providerList) { loadProviderList(); return head + '<p class="filmo-note" style="margin:0 0 16px">Cargando plataformas…</p>'; }
  if (S.providerList.error) return head + `<p class="filmo-note" style="margin:0 0 16px;color:#f87171">${esc(S.providerList.error)}</p>`;
  const all = S.providerList.list;
  const ids = new Set(mine.map(m => m.id));
  const shown = S.allProviders ? all : all.filter((p, i) => i < 24 || ids.has(p.id));
  return head + `<div class="plat-grid">${shown.map(p => `<button class="plat ${ids.has(p.id) ? 'on' : ''}" data-action="toggle-provider" data-id="${p.id}" data-name="${esc(p.name)}" title="${esc(p.name)}">
      ${p.logo ? `<img loading="lazy" src="${esc(p.logo)}" alt="">` : `<i class="prov-ph">${esc(p.name[0])}</i>`}<span>${esc(p.name)}</span><i class="plat-check">${I.check}</i></button>`).join('')}</div>
    ${all.length > shown.length || S.allProviders ? `<button class="link-btn plat-more" data-action="all-providers">${S.allProviders ? 'Mostrar sólo las principales' : `Ver todas (${all.length})`}</button>` : ''}`;
}
function lbStatusHTML() {
  const lb = S.lb, st = lb.status || {};
  if (st.running) return `<span class="status-pill"><span class="spinner sm"></span>${esc(st.text || 'Sincronizando…')}</span>`;
  if (st.error) return `<span class="status-pill bad">${esc(st.error)}</span>`;
  if (!lb.syncedAt) return S.settings.lbUser ? 'Aún no se ha sincronizado.' : 'Sin conectar.';
  const n = f => lb.films.filter(f).length;
  return `${n(f => f.watched)} vistas · ${n(f => f.rating)} con nota · ${n(f => f.watchlist)} en la watchlist · ${lb.source === 'export' ? 'importado' : 'sincronizado'} el ${new Date(lb.syncedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`
    + (n(f => !f.tmdbId) ? ` · ${n(f => !f.tmdbId)} sin identificar` : '');
}
function letterboxdSettingsHTML(s, sw) {
  return `<div class="set-row"><div class="lbl"><div class="t">Usuario de Letterboxd</div>
      <div class="d">Se lee tu perfil público: películas vistas, tus notas, los “me gusta” y la watchlist. Al abrir CineLocal se añade lo último que hayas visto.</div></div>
      <div class="ctl"><input class="input" data-set-text="lbUser" value="${esc(s.lbUser || '')}" placeholder="tu_usuario" spellcheck="false" style="min-width:200px">
      <button class="btn btn-ghost btn-sm" data-action="lb-sync" ${s.lbUser && !S.lb.status?.running ? '' : 'disabled'}>Sincronizar ahora</button></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Marcar como vistas las que has visto en Letterboxd</div>
      <div class="d">Las películas de la biblioteca que tienes vistas en Letterboxd se marcan como vistas en CineLocal (en tu usuario), sin tocar las que tienen progreso. Si desmarcas una, no se vuelve a marcar.</div></div>
      <div class="ctl">${sw('lbMarkWatched', s.lbMarkWatched !== false)}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Estado</div><div class="d" id="lbStatus">${lbStatusHTML()}</div></div>
      <div class="ctl">${S.lb.syncedAt ? '<button class="btn btn-ghost btn-sm" data-action="lb-clear">Borrar datos</button>' : ''}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Importar la exportación de Letterboxd</div>
      <div class="d">Alternativa si la lectura del perfil falla: en Letterboxd, <a data-url="https://letterboxd.com/settings/data/">Settings → Data → Export your data</a>, y elige aquí el .zip descargado.</div></div>
      <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="lb-import" ${S.lb.status?.running ? 'disabled' : ''}>Elegir .zip</button></div></div>`;
}
function paintLbStatus() {
  if (S.route.name !== 'settings') return;
  const el = $('#lbStatus');
  if (el) el.innerHTML = lbStatusHTML();
  $$('[data-action="lb-sync"],[data-action="lb-import"]').forEach(b => { b.disabled = !!S.lb.status?.running || (b.dataset.action === 'lb-sync' && !S.settings.lbUser); });
}

// ---------------------------------------------------------------- Discord
const DISCORD_ID = /^\d{17,20}$/;
function discordStatusHTML() {
  const d = S.discord || {};
  if (S.discordTest === 'running') return '<span class="status-pill"><span class="spinner sm"></span>Probando…</span>';
  if (S.discordTest?.ok) return '<span class="status-pill ok">Prueba enviada</span> · mira tu perfil de Discord durante 15 s';
  if (S.discordTest?.error) return `<span class="status-pill bad">${esc(S.discordTest.error)}</span>`;
  switch (d.state) {
    case 'connected': return '<span class="status-pill ok">Conectado a Discord</span>';
    case 'connecting': return '<span class="status-pill"><span class="spinner sm"></span>Conectando con Discord…</span>';
    case 'not-running': return '<span class="status-pill warn">Discord no está abierto</span> · se volverá a intentar solo';
    case 'error': return `<span class="status-pill bad">${esc(d.error || 'Error de Discord')}</span>`;
    case 'unconfigured': return 'Falta el ID de la aplicación de Discord.';
    case 'idle': return 'Se conecta a Discord al empezar a reproducir.';
    default: return 'Desactivado.';
  }
}
function discordSettingsHTML(s, sw) {
  const id = s.discordClientId || '';
  return `<div class="set-row"><div class="lbl"><div class="t">Mostrar en Discord lo que estoy viendo</div>
      <div class="d">Mientras reproduces, tu perfil de Discord muestra «Viendo CineLocal» con el título, el póster y el tiempo que queda. Discord tiene que estar abierto en este PC.</div></div>
      <div class="ctl">${sw('discordEnabled', s.discordEnabled)}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">ID de la aplicación de Discord</div>
      <div class="d">Crea una aplicación llamada «CineLocal» en <a data-url="https://discord.com/developers/applications">discord.com/developers/applications</a> y copia aquí su <i>Application ID</i> (General Information). El nombre de la aplicación es lo que aparece después de «Viendo».</div></div>
      <div class="ctl"><input class="input" data-discord-id value="${esc(id)}" placeholder="123456789012345678" inputmode="numeric" spellcheck="false" style="min-width:220px">
      <button class="btn btn-ghost btn-sm" data-action="discord-test">Probar</button></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Modo discreto</div>
      <div class="d">Sólo «Viendo una película» o «Viendo una serie»: sin título, póster ni enlaces.</div></div>
      <div class="ctl">${sw('discordDiscreet', s.discordDiscreet)}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Estado</div><div class="d" id="discordStatus">${discordStatusHTML()}</div></div></div>`;
}
/** CineLocal Server como origen de la biblioteca: el NAS por internet, sin VPN */
function nasStatePill() {
  const t = S.nasTest, n = S.lib.nas;
  if (t === 'running') return '<span class="status-pill"><span class="spinner sm"></span>Conectando…</span>';
  if (t?.ok === false || n?.ok === false) return `<span class="status-pill bad">${esc((t || n).error)}</span>`;
  if (t?.missing?.length) return `<span class="status-pill bad">Conectado, pero no se encuentra ${esc(t.missing.join(', '))}</span>`;
  if (t?.ok || n?.ok) return `<span class="status-pill ok">Conectado</span>${(t || n).note ? ' · ' + esc((t || n).note) : ''}`;
  return '';
}

function paintDiscord() {
  if (S.route.name !== 'settings') return;
  const el = $('#discordStatus');
  if (el) el.innerHTML = discordStatusHTML();
}

// ---------------------------------------------------------------- actualizaciones
const updTime = t => t ? new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
function updStatusHTML() {
  const u = S.update, v = esc(u.version || '');
  const when = u.checkedAt ? ` · comprobado a las ${updTime(u.checkedAt)}` : '';
  switch (u.state) {
    case 'disabled': return 'Sólo funcionan en la versión instalada (ahora se está ejecutando desde el código).';
    case 'checking': return '<span class="status-pill"><span class="spinner sm"></span>Buscando actualizaciones…</span>';
    case 'not-available': return `<span class="status-pill ok">Tienes la última versión</span>${when}`;
    case 'available': return u.mode === 'portable'
      ? `<span class="status-pill warn">CineLocal ${v} disponible</span> · la versión portable no se actualiza sola: descárgala desde GitHub`
      : `<span class="status-pill"><span class="spinner sm"></span>CineLocal ${v} disponible · preparando la descarga…</span>`;
    case 'downloading': return `<span class="status-pill"><span class="spinner sm"></span>Descargando CineLocal ${v} · ${u.percent || 0} %</span>
      <div class="upd-bar"><i style="width:${u.percent || 0}%"></i></div>`;
    case 'downloaded': return `<span class="status-pill ok">CineLocal ${v} lista</span> · se instalará al cerrar CineLocal`;
    case 'error': return `<span class="status-pill bad">${esc(u.error || 'No se pudo comprobar')}</span>${when}`;
    default: return S.settings.autoUpdate !== false ? 'Se comprueba al abrir CineLocal.' : 'Aún no se ha comprobado.';
  }
}
function updInfoHTML() {
  const u = S.update;
  const busy = u.state === 'checking' || u.state === 'disabled' || (['available', 'downloading'].includes(u.state) && u.mode !== 'portable');
  const ctl = u.state === 'downloaded' ? '<button class="btn btn-primary btn-sm" data-action="upd-install">Reiniciar ahora</button>'
    : u.state === 'available' && u.mode === 'portable' ? `<button class="btn btn-accent btn-sm" data-action="upd-open">Descargar</button>`
    : `<button class="btn btn-ghost btn-sm" data-action="upd-check" ${busy ? 'disabled' : ''}>Comprobar ahora</button>`;
  const notes = u.notes && ['available', 'downloading', 'downloaded'].includes(u.state)
    ? `<div class="upd-notes"><b>Novedades de la ${esc(u.version)}</b>${esc(u.notes)}</div>` : '';
  return `<div class="set-row"><div class="lbl"><div class="t">Versión ${esc(u.current || '')}${u.mode === 'portable' ? ' · portable' : ''}</div>
      <div class="d" id="updStatus">${updStatusHTML()}</div>${notes}</div>
      <div class="ctl">${ctl}</div></div>`;
}
function updateSettingsHTML(s, sw) {
  const portable = S.update.mode === 'portable';
  return `<div class="set-row"><div class="lbl"><div class="t">Buscar actualizaciones al abrir</div>
      <div class="d">${portable ? 'La versión portable no se actualiza sola: avisa cuando hay una nueva y abre la página de descarga.'
        : 'Las versiones nuevas se descargan de GitHub en segundo plano y se instalan al cerrar CineLocal.'}</div></div>
      <div class="ctl">${sw('autoUpdate', s.autoUpdate !== false)}</div></div>
    <div id="updInfo">${updInfoHTML()}</div>`;
}
/** Aviso discreto abajo a la derecha: versión descargada (o, en la portable, disponible) */
function paintUpdToast() {
  const u = S.update;
  const show = (u.state === 'downloaded' || (u.state === 'available' && u.mode === 'portable')) && S.updDismissed !== u.version;
  let el = $('#updToast');
  if (!show) { el?.remove(); return; }
  const ready = u.state === 'downloaded';
  if (!el) {
    el = document.createElement('div');
    el.id = 'updToast';
    el.className = 'toast new-item upd-toast';
    $('#toasts').appendChild(el);
  }
  if (el.dataset.key === u.state + u.version) return;
  el.dataset.key = u.state + u.version;
  el.innerHTML = `<div class="ni-poster">${I.download}</div>
    <div class="ni-txt"><small>Actualización</small><b>CineLocal ${esc(u.version)} ${ready ? 'está lista' : 'disponible'}</b>
      <span>${ready ? 'Se instalará al cerrar' : 'Descárgala desde GitHub'}</span></div>
    ${ready ? '<button class="btn btn-primary btn-sm" data-action="upd-install">Reiniciar ahora</button>' : '<button class="btn btn-accent btn-sm" data-action="upd-open">Descargar</button>'}
    <button class="icon-btn sm" data-action="upd-dismiss" title="Más tarde">${I.close}</button>`;
}
function paintUpdate() {
  paintUpdToast();
  if (S.route.name !== 'settings') return;
  const el = $('#updInfo');
  if (el) el.innerHTML = updInfoHTML();
}

async function loadProviderList() {
  if (S.providerListLoading) return;
  S.providerListLoading = true;
  try { S.providerList = { list: await window.api.getProviderList() }; }
  catch (e) { S.providerList = { error: errText(e) }; }
  S.providerListLoading = false;
  if (S.route.name === 'settings' && !/INPUT|SELECT/.test(document.activeElement?.tagName)) render(true);
}

async function loadEmuleInfo() {
  S.emule.info = await window.api.emule.info();
  if (S.route.name === 'settings' && !/INPUT|SELECT/.test(document.activeElement?.tagName)) render(true);
}

// ---------------------------------------------------------------- render y navegación
function render(keepScroll = false) {
  const view = $('#view');
  const scroll = view.scrollTop;
  const rowScroll = {};
  if (keepScroll) $$('.row', view).forEach(r => { rowScroll[r.dataset.row] = $('.row-track', r).scrollLeft; });

  const r = S.route;
  let html;
  switch (r.name) {
    case 'movies': html = viewGrid('movies'); break;
    case 'series': html = viewGrid('series'); break;
    case 'list': html = viewList(); break;
    case 'watchlist': html = viewWatchlist(); break;
    case 'search': html = viewSearch(); break;
    case 'detail': html = viewDetail(r.id); break;
    case 'directors': html = viewDirectors(); break;
    case 'director': html = viewDirector(r.id); break;
    case 'settings': html = viewSettings(); break;
    case 'downloads': html = viewDownloads(); break;
    case 'requests': html = viewRequests(); break;
    case 'access': html = viewAccess(); break;
    case 'title': html = viewTitle(r.type, r.id); break;
    case 'sagas': html = viewSagas(); break;
    case 'saga': html = viewSaga(r.id); break;
    default: html = viewHome();
  }
  view.innerHTML = html;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === r.name || (r.name === 'director' && a.dataset.nav === 'directors')));
  if (r.name === 'director') loadPerson(r.id);
  if (r.name === 'detail') ensureFull(r.id);
  if (r.name === 'downloads') loadServers(true);
  if (r.name === 'access' && !keepScroll) loadAccess();
  if (r.name !== 'director') S.filters.filmo = 'all';

  view.style.scrollBehavior = 'auto';
  view.scrollTop = keepScroll ? scroll : 0;
  view.style.scrollBehavior = '';
  $$('.row', view).forEach(rw => {
    const t = $('.row-track', rw);
    if (keepScroll && rowScroll[rw.dataset.row]) t.scrollLeft = rowScroll[rw.dataset.row];
    updateArrows(rw);
    t.addEventListener('scroll', () => updateArrows(rw), { passive: true });
  });
  onScroll();
  startHeroTimer();
}

function updateArrows(rw) {
  const t = $('.row-track', rw);
  $('.row-arrow.left', rw).disabled = t.scrollLeft < 5;
  $('.row-arrow.right', rw).disabled = t.scrollLeft + t.clientWidth >= t.scrollWidth - 5;
}

function go(name, extra = {}) {
  if (S.route.name === name && !extra.id && name !== 'search') { $('#view').scrollTo({ top: 0, behavior: 'smooth' }); return; }
  S.history.push({ route: S.route, scroll: $('#view').scrollTop });
  S.route = { name, ...extra };
  if (S.filters[name]?.shown) S.filters[name].shown = 0;   // al entrar de nuevo, desde la primera tanda
  if (name !== 'search') { S.query = ''; $('#searchInput').value = ''; }
  render();
}

function back() {
  const prev = S.history.pop();
  if (!prev) { if (S.route.name !== 'home') { S.route = { name: 'home' }; render(); } return; }
  S.route = prev.route;
  render();
  const v = $('#view');
  v.style.scrollBehavior = 'auto'; v.scrollTop = prev.scroll; v.style.scrollBehavior = '';
}

function onScroll() {
  growGrid();
  $('#topbar').classList.toggle('solid', $('#view').scrollTop > 40 || ['settings', 'downloads'].includes(S.route.name));
}

// ---------------------------------------------------------------- acciones
async function play(itemId, episodeId, fromStart) {
  const r = await window.api.play({ itemId, episodeId, fromStart: !!fromStart });
  if (!r.ok) {
    if (r.error === 'mpv-missing') mpvHelp();
    else toast(r.error, 'error');
  } else if (!r.web) {
    toast('Abriendo reproductor…');
  }
}

function toast(text, type = '', onClick = null) {
  const el = document.createElement('div');
  el.className = 'toast ' + type + (onClick ? ' clickable' : '');
  el.textContent = text;
  if (onClick) el.addEventListener('click', () => { el.remove(); onClick(); });
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 7000 : 3000);
}

function modal(html) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-back"><div class="modal">${html}</div></div>`;
  const backEl = $('.modal-back', root);
  backEl.addEventListener('mousedown', e => { if (e.target === backEl) closeModal(); });
  return $('.modal', root);
}
function closeModal() { $('#modalRoot').innerHTML = ''; }

function mpvHelp() {
  const m = modal(`<div class="modal-head"><h2>Instalar el reproductor mpv</h2>
    <p>CineLocal reproduce con mpv: abre MKV, MP4, HEVC, DTS, Atmos… y selecciona automáticamente tus pistas de audio y subtítulos.</p></div>
    <div style="padding:0 24px 10px;line-height:1.7;color:var(--text-2);font-size:14px">
      <b style="color:var(--text)">Opción 1 — winget</b> (abre PowerShell y ejecuta):<br>
      <code style="display:inline-block;background:var(--bg-3);padding:6px 10px;border-radius:6px;margin:6px 0 12px;user-select:text">winget install --id=shinchiro.mpv -e</code><br>
      <b style="color:var(--text)">Opción 2 — manual:</b> descarga mpv para Windows desde
      <a class="link-btn" data-url="https://mpv.io/installation/">mpv.io/installation</a>, descomprímelo
      (por ejemplo en <code>C:\\mpv</code>) y selecciona <code>mpv.exe</code> aquí abajo.<br><br>
      También puedes copiar la carpeta de mpv dentro de la carpeta de CineLocal como <code>mpv\\mpv.exe</code>.
    </div>
    <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button>
    <button class="btn btn-primary btn-sm" data-action="pick-mpv">Seleccionar mpv.exe</button></div>`);
  return m;
}

async function identify(id) {
  const it = byId(id);
  if (!it) return;
  const m = modal(`<div class="modal-head"><h2>Corregir coincidencia</h2><p>${esc(it.type === 'movie' ? it.fileName : it.path)}</p></div>
    <form class="modal-search" id="idForm">
      <input class="input" name="q" value="${esc(it.title)}" placeholder="Título">
      <input class="input year" name="y" value="${esc(it.year || '')}" placeholder="Año">
      <select class="select" name="t"><option value="movie" ${it.type === 'movie' ? 'selected' : ''}>Película</option><option value="series" ${it.type === 'series' ? 'selected' : ''}>Serie</option></select>
      <button class="btn btn-primary btn-sm">Buscar</button>
    </form>
    <div class="modal-list" id="idList"></div>`);
  const form = $('#idForm', m);
  const list = $('#idList', m);
  const search = async () => {
    list.innerHTML = '<p style="color:var(--text-3);padding:12px">Buscando…</p>';
    try {
      const res = await window.api.searchMeta({ type: it.type, query: form.q.value.trim(), year: form.y.value.trim() || null });
      list.innerHTML = res.length ? res.map(r => `<div class="result" data-tmdb="${r.id}">
        <div class="p">${r.poster ? `<img src="${esc(r.poster)}" alt="">` : ''}</div>
        <div><div class="t">${esc(r.title)}<small>${r.year || ''}${r.originalTitle && r.originalTitle !== r.title ? ' · ' + esc(r.originalTitle) : ''}</small></div>
        <div class="o">${esc(r.overview || '')}</div></div></div>`).join('')
        : '<p style="color:var(--text-3);padding:12px">Sin resultados. Prueba con el título original.</p>';
    } catch (e) {
      list.innerHTML = `<p style="color:#f87171;padding:12px">${esc(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))}</p>`;
    }
  };
  // el tipo (película/serie) lo determina la estructura de carpetas; el selector sólo cambia la búsqueda
  form.t.disabled = true;
  form.addEventListener('submit', e => { e.preventDefault(); search(); });
  list.addEventListener('click', async e => {
    const r = e.target.closest('[data-tmdb]');
    if (!r) return;
    list.innerHTML = '<p style="color:var(--text-3);padding:12px">Descargando metadatos…</p>';
    fullMeta.delete(id);
    await window.api.identify({ itemId: id, tmdbId: +r.dataset.tmdb });
    closeModal();
    toast('Metadatos actualizados', 'ok');
  });
  search();
}

/**
 * Cambiar la carátula: otra de las de TMDB, una imagen propia (se reduce aquí a 500 px de ancho antes de enviarla)
 * o volver a la de la ficha. Se guarda aparte, así que no se pierde al volver a descargar los metadatos.
 */
async function pickPoster(id) {
  const it = byId(id);
  if (!it) return;
  const m = modal(`<div class="modal-head"><h2>Carátula</h2><p>${esc(T(it))}</p></div>
    <div class="pp-top">
      <div class="pp-current" id="ppCurrent">${posterOf(it) ? `<img src="${esc(posterOf(it))}" alt="">` : placeholder(it)}</div>
      <div class="pp-side">
        <label class="btn btn-ghost btn-sm">${I.plus}Subir imagen…<input type="file" id="ppFile" accept="image/jpeg,image/png,image/webp" hidden></label>
        <button class="btn btn-ghost btn-sm ${it.poster ? '' : 'hidden'}" id="ppReset">${I.restart}Volver a la de TMDB</button>
        <p>Elige una de TMDB o sube la tuya (JPG, PNG o WebP; mejor vertical, 2:3). Se guarda aunque vuelvas a descargar los metadatos.</p>
      </div>
    </div>
    <div class="modal-list"><div class="pp-grid" id="ppGrid"><p class="pp-msg">Buscando carátulas en TMDB…</p></div></div>
    <div class="modal-foot"><button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button></div>`);
  const grid = $('#ppGrid', m);
  const save = async (poster, msg) => {
    try {
      grid.style.opacity = '.5';
      await window.api.setPoster(id, poster);
      fullMeta.delete(id);
      closeModal();
      toast(msg, 'ok');
    } catch (e) {
      grid.style.opacity = '';
      toast(errText(e), 'error');
    }
  };
  $('#ppReset', m).addEventListener('click', () => save(null, 'Carátula de TMDB restablecida'));
  $('#ppFile', m).addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { await save(await shrinkImage(f, 500), 'Carátula cambiada'); }
    catch (x) { toast('No se pudo leer la imagen: ' + errText(x), 'error'); }
  });
  grid.addEventListener('click', e => {
    const p = e.target.closest('[data-poster]');
    if (p) save(p.dataset.poster, 'Carátula cambiada');
  });
  try {
    const r = await window.api.getPosters(id);
    const lang = l => l ? l.toUpperCase() : 'Sin texto';
    grid.innerHTML = r.posters.length ? r.posters.map(p => `<button class="pp-item ${p.url === r.current ? 'on' : ''}" data-poster="${esc(p.url)}" title="${p.url === r.tmdb ? 'La de la ficha' : ''}">
        <img loading="lazy" src="${esc(p.thumb)}" alt=""><span>${p.url === r.tmdb ? 'Ficha' : lang(p.lang)}</span></button>`).join('')
      : `<p class="pp-msg">${it.meta ? 'TMDB no tiene más carátulas de este título.' : 'Sin ficha de TMDB: sube una imagen, o identifícalo primero con «Corregir coincidencia».'}</p>`;
  } catch (e) {
    grid.innerHTML = `<p class="pp-msg err">${esc(errText(e))}</p>`;
  }
}

/** Imagen elegida → JPEG de como mucho `width` px de ancho, como data: (para guardarla en la ficha) */
function shrinkImage(file, width) {
  return new Promise((resolve, reject) => {
    // como data: y no blob:, que la política de contenido de la página no deja cargar
    const reader = new FileReader();
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, width / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('formato no válido'));
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Carpetas de la biblioteca: la principal (libraryPath) y las añadidas (extraLibraryPaths) */
function libPaths() {
  return [S.settings.libraryPath || '', ...(S.settings.extraLibraryPaths || [])];
}

/** Organización de una carpeta de la biblioteca (null = automática) */
const layoutOf = p => S.settings.libraryLayouts?.[p] || null;

/** Ventana para elegir cómo está organizada una carpeta de la biblioteca */
function askLayout(root) {
  const l = layoutOf(root) || { movies: ['Peliculas', 'Películas', 'Movies', 'Cine'], series: ['Series', 'TV'], folderMovie: true, ignore: [] };
  const on = !!layoutOf(root);
  const m = modal(`<div class="modal-head"><h2>Organización de la carpeta</h2><p><code>${esc(root)}</code></p></div>
    <div class="layout-form">
      <label class="layout-opt"><input type="radio" name="lmode" value="auto" ${on ? '' : 'checked'}><span><b>Automática</b>Vídeo suelto = película, carpeta = serie. Las carpetas «Películas» y «Series» de la raíz se respetan.</span></label>
      <label class="layout-opt"><input type="radio" name="lmode" value="categories" ${on ? 'checked' : ''}><span><b>Por categorías</b>Cada carpeta de la raíz es una categoría («Peliculas Humor», «Series Sci-Fi»…). En las que no empiezan por ninguno de los prefijos, una carpeta con episodios es una serie y si no, películas.</span></label>
      <div class="layout-fields">
        <label>Las carpetas que empiezan por… sólo tienen películas<input class="input" data-l="movies" value="${esc(l.movies.join(', '))}" placeholder="Peliculas, Películas, Cine"></label>
        <label>Las carpetas que empiezan por… sólo tienen series<input class="input" data-l="series" value="${esc(l.series.join(', '))}" placeholder="Series, TV"></label>
        <label>Carpetas que no se miran<input class="input" data-l="ignore" value="${esc(l.ignore.join(', '))}" placeholder="Descargas, Temporal"></label>
        <label class="layout-check"><input type="checkbox" data-l="folderMovie" ${l.folderMovie !== false ? 'checked' : ''}> Una película sola en su carpeta toma el nombre de la carpeta («Dune (2021)/Dune.mkv»)</label>
      </div>
    </div>
    <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Cancelar</button><button class="btn btn-accent btn-sm" data-r="1">Guardar y escanear</button></div>`);
  const sync = () => m.querySelector('.layout-fields').classList.toggle('off', m.querySelector('[name=lmode]:checked').value !== 'categories');
  sync();
  m.addEventListener('change', sync);
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r !== '1') return closeModal();
    const words = k => m.querySelector(`[data-l=${k}]`).value.split(',').map(s => s.trim()).filter(Boolean);
    const layouts = { ...(S.settings.libraryLayouts || {}) };
    if (m.querySelector('[name=lmode]:checked').value === 'categories') {
      layouts[root] = { mode: 'categories', movies: words('movies'), series: words('series'), ignore: words('ignore'), folderMovie: m.querySelector('[data-l=folderMovie]').checked };
    } else delete layouts[root];
    closeModal();
    toast('Escaneando la carpeta con la nueva organización…');
    S.settings = await window.api.setSettings({ libraryLayouts: layouts });
    setLib(await window.api.getLibrary());
    render(true);
  });
}

async function saveLibPaths(list) {
  list = list.map(p => (p || '').trim()).filter(Boolean);
  S.settings = await window.api.setSettings({ libraryPath: list[0] || '', extraLibraryPaths: list.slice(1) });
  setLib(await window.api.getLibrary());
  render(true);
}

async function saveSetting(key, value) {
  S.settings = await window.api.setSettings({ [key]: value });
  if (key === 'region') S.providerList = null;   // recargar la lista del nuevo país (los ids de TMDB son los mismos en todos)
  if (key === 'subLang' || key === 'emuleEnabled' || key === 'emuleMoveToLibrary' || key === 'playerMode' || key === 'region') render(true);
  if (key === 'lbUser') { setLb(await window.api.letterboxd.get()); paintLbStatus(); }
  if (key.startsWith('emule')) paintEmule();
  if (key === 'emuleEnabled' && value) loadEmuleInfo();
}

async function scanNow() {
  const b = $('#btnScan');
  b.classList.add('spin');
  try {
    setLib(await window.api.scan());
    render(true);
    toast(`Biblioteca actualizada: ${S.lib.items.length} títulos`, 'ok');
  } finally { b.classList.remove('spin'); }
}

// ---------------------------------------------------------------- eventos
async function emuleAction(a, el) {
  const d = el.dataset;
  try {
    if (a === 'copy') { await window.api.copy(d.text); toast('Copiado al portapapeles', 'ok'); }
    else if (a === 'emule-launch') {
      const r = await window.api.emule.launch();
      toast(r.ok ? 'Abriendo eMule…' : r.error, r.ok ? '' : 'error');
    } else if (a === 'emule-connect') { await window.api.emule.connect(); toast('Conectando a la red eD2k y Kad…'); }
    else if (a === 'emule-srv-any' || a === 'emule-srv-connect' || a === 'emule-srv-off') {
      S.emule.srv.busy = 'srv'; paintEmule();
      try {
        if (a === 'emule-srv-off') setServers(await window.api.emule.disconnect());
        else setServers(await window.api.emule.connectServer(d.ip, d.port));
      } finally { S.emule.srv.busy = null; }
      toast(a === 'emule-srv-off' ? 'Desconectado del servidor' : a === 'emule-srv-any' ? 'Conectando al primer servidor disponible…' : `Conectando a ${d.name}…`);
      paintEmule();
    } else if (a === 'emule-kad') {
      S.emule.srv.busy = 'kad'; paintEmule();
      try { const r = await window.api.emule.kad(d.op); if (r.kad) S.emule.srv.kad = r.kad; }
      finally { S.emule.srv.busy = null; }
      toast(d.op === 'connect' ? 'Conectando a Kad…' : 'Kad desconectado');
      paintEmule();
    } else if (a === 'emule-srv-toggle') {
      S.emule.srv.open = !srvOpen();
      paintEmule();
      loadServers(true);
    } else if (a === 'emule-srv-sort') {
      const srv = S.emule.srv;
      srv.dir = srv.sort === d.k ? -srv.dir : SRV_SORTS[d.k];
      srv.sort = d.k;
      paintServers();
    } else if (a === 'emule-srv-refresh') {
      await loadServers(true);
      if (srvOutdated()) toast('eMule todavía no ha recargado la plantilla', 'error');
    }
    else if (a === 'emule-test') {
      const password = $('[data-set-text="emulePassword"]').value;
      const port = +$('[data-set-text="emulePort"]').value || 4711;
      const st = $('#emuleTest');
      st.innerHTML = '<span class="status-pill">Probando…</span>';
      const r = await window.api.emule.test({ port, password });
      st.innerHTML = r.ok ? '<span class="status-pill ok">Conexión correcta</span>' : `<span class="status-pill bad">${esc((EMULE_ERRORS[r.code] || [r.error])[0])}</span>`;
      if (r.ok && (password !== S.settings.emulePassword || port !== +S.settings.emulePort)) {
        S.settings = await window.api.setSettings({ emulePassword: password, emulePort: port });
      }
    } else if (a === 'pick-emule') {
      const p = await window.api.emule.pickExe();
      if (p) { await saveSetting('emulePath', p); await loadEmuleInfo(); }
    } else if (a === 'emule-find') {
      $('#detailMenu')?.classList.add('hidden');
      closeModal();
      S.emule.search.query = d.q;
      go('downloads');
      emuleSearch(d.q, d.alt);
    } else if (a === 'emule-alt') {
      const { alt, query } = S.emule.search;
      if (alt) emuleSearch(alt, query);
    } else if (a === 'dl-get') {
      el.disabled = true;
      await window.api.emule.download(d.hash);
      toast('Añadido a las descargas de eMule', 'ok');
      paintResults();
    } else if (a === 'dl-op') await window.api.emule.op(d.hash, d.op);
    else if (a === 'dl-cancel') {
      if (await confirmModal('¿Cancelar la descarga?', d.name + ' — se borrará lo descargado hasta ahora.', 'Cancelar descarga')) await window.api.emule.op(d.hash, 'cancel');
    } else if (a === 'dl-copy') { await window.api.copy(d.link); toast('Enlace ed2k copiado', 'ok'); }
    else if (a === 'dl-clear-results') {
      S.emule.search = { ...S.emule.search, results: [], message: '', busy: false, error: null, hidden: true, run: S.emule.search.run + 1 };
      paintResults();
    }
  } catch (e) {
    el.disabled = false;
    toast(errText(e), 'error');
  }
}

document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.id === 'dlSearch') { e.preventDefault(); emuleSearch(f.q.value); }
  else if (f.id === 'srvMet' || f.id === 'kadBoot') {
    e.preventDefault();
    const btn = $('button', f);
    btn.disabled = true;
    try {
      if (f.id === 'srvMet') {
        toast('eMule está descargando el server.met…');
        const r = await window.api.emule.updateServerMet(f.url.value.trim());
        setServers(r);
        f.url.value = '';
        toast(r.message || 'Lista de servidores actualizada', 'ok');
      } else {
        const m = /^\s*([^\s:]+):(\d+)\s*$/.exec(f.addr.value);
        if (!m) throw new Error('Escribe la IP y el puerto del nodo, p. ej. 1.2.3.4:4672');
        const r = await window.api.emule.kad('bootstrap', m[1], +m[2]);
        if (r.kad) S.emule.srv.kad = r.kad;
        f.addr.value = '';
        toast('Conectando a Kad desde el nodo…');
      }
      paintEmule();
    } catch (err) { toast(errText(err), 'error'); }
    finally { btn.disabled = false; }
  }
  else if (f.id === 'dlLink') {
    e.preventDefault();
    try {
      await window.api.emule.addLink(f.link.value.trim());
      f.link.value = '';
      toast('Añadido a las descargas de eMule', 'ok');
    } catch (err) { toast(errText(err), 'error'); }
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target;

  // menú contextual abierto: cerrar al hacer clic fuera
  const menu = $('#detailMenu');
  if (menu && !menu.classList.contains('hidden') && !t.closest('.menu-wrap')) menu.classList.add('hidden');

  const urlEl = t.closest('[data-url]');
  if (urlEl) { window.api.openExternal(urlEl.dataset.url); return; }

  const nav = t.closest('[data-nav]');
  if (nav) {
    closeModal();
    // «Ver todo» de la fila de una lista: la página de Listas con esa pestaña
    const [route, listId] = nav.dataset.nav.split(':');
    if (route === 'list' && listId) S.listTab = listId;
    go(route);
    return;
  }

  const lt = t.closest('[data-list-tab]');
  if (lt) { S.listTab = lt.dataset.listTab || null; render(true); return; }
  const rt = t.closest('[data-req-tab]');
  if (rt) { S.reqTab = rt.dataset.reqTab; render(true); return; }
  const at = t.closest('[data-access-type]');
  if (at) { S.access.type = at.dataset.accessType; $$('[data-access-type]').forEach(b => b.classList.toggle('on', b === at)); loadAccess(); return; }
  const rty = t.closest('[data-req-type]');
  if (rty) { S.reqSearch = { ...S.reqSearch, type: rty.dataset.reqType, results: [] }; render(true); searchRequests(S.reqSearch.q); return; }

  const arrow = t.closest('[data-scroll]');
  if (arrow) {
    const track = arrow.parentElement.querySelector('.row-track');
    track.scrollBy({ left: +arrow.dataset.scroll * track.clientWidth * 0.85, behavior: 'smooth' });
    return;
  }

  const action = t.closest('[data-action]');
  if (action) {
    const a = action.dataset.action;
    if (a === 'back') back();
    else if (a === 'bio-more') {
      const d = allDirectors().find(x => x.key === S.route.id);
      const pp = d?.id ? S.people[d.id] : null;
      if (pp) modal(`<div class="modal-head"><h2>${esc(pp.name || d.name)}</h2><p>Biografía</p></div>
        <div class="modal-list" style="padding:0 24px 20px;line-height:1.65;color:var(--text-2);white-space:pre-line;user-select:text">${esc(pp.bio)}</div>
        <div class="modal-foot"><button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button></div>`);
    }
    else if (a === 'scan') scanNow();
    else if (a === 'wl-toggle') {
      const it = action.dataset.id ? byId(action.dataset.id) : null;
      toggleWatchlist(it ? entryIn(watchlistOf(), it) : JSON.parse(action.dataset.entry));
    }
    else if (a === 'lists-pick') {
      const it = action.dataset.id ? byId(action.dataset.id) : null;
      const entry = it ? entryOf(it) : JSON.parse(action.dataset.entry);
      openListPicker(entry, it?.id || null);
    }
    else if (a === 'pick-list') {
      const l = [watchlistOf(), ...listsOf()].find(x => x.id === action.dataset.list);
      const it = S.picker.itemId ? byId(S.picker.itemId) : null;
      listOp({ op: 'toggle', id: action.dataset.list, entry: it && l ? entryIn(l, it) : S.picker.entry }, () => { paintListPicker(); render(true); });
    }
    else if (a === 'list-create') {
      const input = $('[data-list-new-name]');
      if (input.value.trim() && await listOp({ op: 'create', name: input.value, entry: S.picker.entry })) { input.value = ''; paintListPicker(); render(true); }
    }
    else if (a === 'list-new') {
      const name = await askListName('Nueva lista');
      if (name && await listOp({ op: 'create', name })) { S.listTab = listsOf()[listsOf().length - 1].id; render(true); }
    }
    else if (a === 'list-rename') {
      const l = listsOf().find(x => x.id === action.dataset.list);
      const name = l && await askListName('Renombrar lista', l.name);
      if (name && name !== l.name && await listOp({ op: 'rename', id: l.id, name })) render(true);
    }
    else if (a === 'list-delete') {
      const l = listsOf().find(x => x.id === action.dataset.list);
      if (l && await confirmModal(`¿Eliminar «${l.name}»?`, `Se borra la lista y sus ${l.items.length} títulos guardados en ella. Las películas y series de tu biblioteca no se tocan.`, 'Eliminar lista')
        && await listOp({ op: 'delete', id: l.id })) { S.listTab = null; render(true); }
    }
    else if (a === 'request') {
      const e = JSON.parse(action.dataset.entry);
      const q = await askRequest(e);
      if (q && await requestOp({ op: 'create', entry: { ...e, note: q.note } })) { toast(`Pedida: ${e.title}`, 'ok'); render(true); }
    }
    else if (a === 'req-cancel') { if (await requestOp({ op: 'cancel', id: action.dataset.id })) render(true); }
    else if (a === 'req-remove') {
      const r = S.requests.items.find(x => x.id === action.dataset.id);
      if (r && await confirmModal(`¿Borrar la petición de «${r.title}»?`, 'Desaparece para todos los que la pidieron, sin avisarles.', 'Borrar') && await requestOp({ op: 'remove', id: r.id })) render(true);
    }
    else if (a === 'req-resolve') {
      const r = S.requests.items.find(x => x.id === action.dataset.id);
      const status = action.dataset.status;
      const reply = status === 'rejected' ? await askReply(r?.title || '') : '';
      if (r && reply !== null && await requestOp({ op: 'resolve', id: r.id, status, reply })) render(true);
    }
    else if (a === 'trailer') window.api.openExternal(action.dataset.url);
    else if (a === 'menu') $('#detailMenu').classList.toggle('hidden');
    else if (a === 'identify') { $('#detailMenu')?.classList.add('hidden'); identify(action.dataset.id); }
    else if (a === 'poster') { $('#detailMenu')?.classList.add('hidden'); pickPoster(action.dataset.id); }
    else if (a === 'reveal') window.api.showInFolder(action.dataset.path);
    else if (a === 'mark') {
      // un episodio, con todas sus versiones
      e.stopPropagation();
      const it = byId(action.dataset.id);
      const ep = it?.episodes.find(x => x.id === action.dataset.ep);
      if (ep) markPaths(epPaths(it, ep), action.dataset.watched === '1');
    } else if (a === 'mark-season') {
      const it = byId(action.dataset.id);
      markPaths(it.episodes.filter(x => x.season === +action.dataset.season).map(x => x.path), action.dataset.watched === '1');
    } else if (a === 'mark-all') {
      const it = byId(action.dataset.id);
      markPaths(it.type === 'movie' ? [it.path] : it.episodes.map(x => x.path), action.dataset.watched === '1');
    } else if (a === 'fullscreen') window.api.toggleFullscreen();
    else if (a === 'logout') logout();
    else if (a === 'use-local') useLocal();
    else if (a === 'use-server') useServer();
    else if (a === 'pick-folder') {
      const p = await window.api.pickFolder();
      if (p) { const list = libPaths(); list[+action.dataset.idx || 0] = p; await saveLibPaths(list); }
    } else if (a === 'nas-login') {
      // usuario del NAS de la biblioteca local: sólo se guarda lo que conecta; vacío = la sesión de Windows
      const user = $('[data-lnas="user"]').value.trim(), password = $('[data-lnas="password"]').value;
      if (!user) { S.nasTest = null; S.settings = await window.api.setSettings({ nasUser: '', nasPassword: '' }); toast('Se usa la sesión de Windows en el NAS'); render(true); return; }
      S.nasTest = 'running'; $('#nasStatus').innerHTML = nasStatePill();
      const r = await window.api.nasLogin({ user, password }).catch(e => ({ ok: false, error: errText(e) }));
      S.nasTest = r;
      if (r.ok) {
        const patch = { nasUser: user };
        if (password) patch.nasPassword = password;
        S.settings = await window.api.setSettings(patch);
        toast('Conectado al NAS: escaneando…', 'ok');
        render(true);
      } else $('#nasStatus').innerHTML = nasStatePill();
    } else if (a === 'add-lib-path') {
      // carpetas del servidor (dentro del contenedor): se escriben, no se eligen en este PC; en modo local, también \\NAS\…
      const p = LOCAL()
        ? await askListName('Añadir carpeta', '', 'D:\\Documentales o \\\\NAS\\video')
        : await askListName('Añadir carpeta del servidor', '', 'Ruta en el servidor, p. ej. /media/Documentales');
      if (p) {
        if (libPaths().some(x => x.toLowerCase() === p.toLowerCase())) toast('Esa carpeta ya está en la biblioteca');
        else { await saveLibPaths([...libPaths(), p]); toast('Carpeta añadida: escaneando…', 'ok'); }
      }
    } else if (a === 'lib-layout') {
      askLayout(action.dataset.path);
    } else if (a === 'remove-lib-path') {
      const list = libPaths(); list.splice(+action.dataset.idx, 1); await saveLibPaths(list);
    } else if (a === 'pick-mpv') {
      const p = await window.api.pickMpv();
      if (p) { await saveSetting('mpvPath', p); setLib(await window.api.getLibrary()); closeModal(); render(true); toast(S.lib.mpv ? 'mpv configurado' : 'Ese archivo no parece mpv', S.lib.mpv ? 'ok' : 'error'); }
    } else if (a === 'mpv-help') mpvHelp();
    else if (a === 'close-modal') closeModal();
    else if (a === 'discord-test') {
      const input = $('[data-discord-id]');
      const id = input.value.trim();
      if (!DISCORD_ID.test(id)) { S.discordTest = { error: 'El ID tiene que tener entre 17 y 20 cifras' }; paintDiscord(); return; }
      if (id !== (S.settings.discordClientId || '')) await saveSetting('discordClientId', id);
      S.discordTest = 'running'; paintDiscord();
      const r = await window.api.discord.test(id);
      S.discordTest = r; paintDiscord();
      clearTimeout(S.discordTestTimer);
      S.discordTestTimer = setTimeout(() => { S.discordTest = null; paintDiscord(); }, r.ok ? 15000 : 8000);
    }
    else if (a === 'nas-test') {
      // carpeta del NAS donde eMule copia lo descargado: sólo se guarda si se puede abrir
      const val = k => $(`[data-nas="${k}"]`).value.trim();
      const q = { dest: val('dest').replace(/[\\/]+$/, ''), user: val('user'), password: $('[data-nas="password"]').value };
      S.nasTest = 'running'; $('#nasStatus').innerHTML = nasStatePill();
      const r = await window.api.testNas(q).catch(e => ({ ok: false, error: errText(e) }));
      S.nasTest = r;
      if (r.ok) {
        const patch = { emuleDest: q.dest, nasUser: q.user };
        if (q.password) patch.nasPassword = q.password;
        S.settings = await window.api.setSettings(patch);
        render(true);
      } else $('#nasStatus').innerHTML = nasStatePill();
    }
    else if (a === 'test-key') {
      const key = $('[data-set-text="tmdbKey"]').value.trim();
      const st = $('#keyStatus');
      st.innerHTML = '<span class="status-pill">Probando…</span>';
      const r = await window.api.testKey(key);
      st.innerHTML = r.ok ? '<span class="status-pill ok">Clave válida</span>' : `<span class="status-pill bad">${esc(r.error)}</span>`;
      if (r.ok && key !== S.settings.tmdbKey) { await saveSetting('tmdbKey', key); S.lib.hasKey = true; }
    } else if (a === 'refresh-meta') { await window.api.refreshMeta(); toast('Actualizando metadatos…'); }
    else if (a === 'toggle-provider') {
      const id = +action.dataset.id;
      const mine = S.settings.myProviders || [];
      const next = mine.some(m => m.id === id) ? mine.filter(m => m.id !== id) : [...mine, { id, name: action.dataset.name }];
      S.settings = await window.api.setSettings({ myProviders: next });
      render(true);
    } else if (a === 'all-providers') { S.allProviders = !S.allProviders; render(true); }
    else if (a === 'lb-sync') {
      const r = await window.api.letterboxd.sync(true);
      if (r.ok) toast('Letterboxd sincronizado', 'ok'); else toast(r.error, 'error');
    } else if (a === 'lb-import') {
      const r = await window.api.letterboxd.importZip();
      if (r.ok) toast('Exportación de Letterboxd importada', 'ok'); else if (!r.canceled) toast(r.error, 'error');
    } else if (a === 'lb-clear') {
      if (await confirmModal('Borrar datos de Letterboxd', 'Se quitarán tus notas y tu watchlist de CineLocal. Lo que ya está marcado como visto se mantiene.', 'Borrar')) {
        setLb(await window.api.letterboxd.clear()); render(true);
      }
    }
    else if (a === 'upd-check') { S.update = { ...S.update, state: 'checking' }; paintUpdate(); S.update = await window.api.update.check(); paintUpdate(); }
    else if (a === 'upd-install') {
      action.disabled = true;
      if (!(await window.api.update.install())) { action.disabled = false; toast('La actualización aún no está lista', 'error'); }
    } else if (a === 'upd-open') window.api.update.openRelease();
    else if (a === 'upd-dismiss') { S.updDismissed = S.update.version; paintUpdToast(); }
    else if (a.startsWith('emule-') || a.startsWith('dl-') || a === 'pick-emule' || a === 'copy') emuleAction(a, action);
    return;
  }

  const playEl = t.closest('[data-play]');
  if (playEl) { play(playEl.dataset.play, playEl.dataset.ep, playEl.dataset.fromStart); return; }

  const dirEl = t.closest('[data-director]');
  if (dirEl) { go('director', { id: dirEl.dataset.director }); return; }

  const wlc = t.closest('[data-wl]');
  if (wlc) { S.filters.watchlist = wlc.dataset.wl; render(true); return; }

  const fm = t.closest('[data-filmo]');
  if (fm) { S.filters.filmo = fm.dataset.filmo; render(true); return; }

  const lbu = t.closest('[data-lb-url]');
  if (lbu) { window.api.openExternal(lbu.dataset.lbUrl); return; }

  const pv = t.closest('[data-providers]');
  if (pv) { showProviders(+pv.dataset.providers, pv.dataset.ptitle, pv.dataset.palt); return; }

  const ds = t.closest('[data-dir-sort]');
  if (ds) { S.filters.directors.sort = ds.dataset.dirSort; render(); return; }

  const open = t.closest('[data-open]');
  if (open) { go('detail', { id: open.dataset.open }); return; }
  const tt = t.closest('[data-title-id]');
  if (tt) { go('title', { type: tt.dataset.titleType, id: +tt.dataset.titleId }); return; }

  const dot = t.closest('[data-hero-dot]');
  if (dot) { setHero(+dot.dataset.heroDot); startHeroTimer(); return; }

  const sg = t.closest('[data-saga]');
  if (sg) { go('saga', { id: sg.dataset.saga }); return; }
  const cat = t.closest('[data-cat]');
  if (cat) { Object.assign(S.filters[S.route.name], { cat: cat.dataset.cat || null, shown: 0 }); render(true); return; }

  const sn = t.closest('[data-seen]');
  if (sn) { Object.assign(S.filters[S.route.name], { seen: sn.dataset.seen, shown: 0 }); render(true); return; }

  const sb = t.closest('[data-season]');
  if (sb) { S.season[sb.dataset.id] = +sb.dataset.season; render(true); return; }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.sort) { Object.assign(S.filters[t.dataset.sort], { sort: t.value, shown: 0, seed: Math.random() }); render(); }
  else if ('filmoSort' in t.dataset) { S.filters.filmoSort = t.value; render(true); }
  else if (t.dataset.seasonSelect) { S.season[t.dataset.seasonSelect] = +t.value; render(true); }
  else if (t.dataset.set) {
    const v = t.type === 'checkbox' ? t.checked : t.value;
    saveSetting(t.dataset.set, v).then(() => {
      if (t.dataset.set === 'startFullscreen') window.api.setFullscreen(v);
      if (t.dataset.set === 'singleFileFolderAsMovie') window.api.getLibrary().then(l => { setLib(l); });
    });
  } else if ('discordId' in t.dataset) {
    // sólo cifras; un ID mal copiado no se guarda
    const v = t.value.replace(/\s+/g, '');
    if (v && !DISCORD_ID.test(v)) { S.discordTest = { error: 'El ID tiene que tener entre 17 y 20 cifras' }; paintDiscord(); return; }
    S.discordTest = null;
    saveSetting('discordClientId', v).then(paintDiscord);
  } else if (t.dataset.libPath) {
    const list = [...document.querySelectorAll('[data-lib-path]')].map(x => x.value.trim());
    saveLibPaths(list);
  } else if (t.dataset.setText) {
    const key = t.dataset.setText;
    const v = t.value.trim();
    saveSetting(key, v).then(async () => {
      if (key === 'libraryPath' || key === 'tmdbKey') { setLib(await window.api.getLibrary()); render(true); }
    });
  }
});

document.addEventListener('keydown', (e) => {
  const inInput = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    if ($('#modalRoot').innerHTML) { closeModal(); return; }
    if (document.activeElement === $('#searchInput')) { $('#searchInput').blur(); if (!S.query) return; }
    if (S.route.name !== 'home') { back(); return; }
    window.api.isFullscreen().then(fs => fs && window.api.setFullscreen(false));
  } else if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'f')) && !inInput) {
    e.preventDefault(); $('#searchInput').focus();
  } else if (e.key === 'Backspace' && !inInput) {
    back();
  } else if (e.key === 'Enter' && !inInput) {
    const el = document.activeElement;
    if (el?.classList.contains('card') || el?.dataset?.director || el?.dataset?.providers) el.click();
  }
});
window.addEventListener('mouseup', (e) => { if (e.button === 3) { e.preventDefault(); back(); } });

let searchTimer;
// errores de la interfaz: al registro de actividad del servidor, para saber qué le pasó a cada usuario
function reportError(message, stack) {
  if (!S.me || !window.api.logError) return;
  window.api.logError({ where: `${WEB ? 'Web' : 'Escritorio'} · ${S.route?.name || 'inicio'}`, message: String(message || 'Error').slice(0, 500), stack: String(stack || '').slice(0, 3000) }).catch(() => {});
}
window.addEventListener('error', e => reportError(e.message, e.error?.stack || `${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => reportError(e.reason?.message || e.reason, e.reason?.stack));

let accessTimer = null;
document.addEventListener('change', (e) => {
  if (e.target.id === 'accessUser') { S.access.user = e.target.value; loadAccess(); }
  if (e.target.id === 'accessDays') { S.access.days = +e.target.value; loadAccess(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'reqQuery') { searchRequests(e.target.value); return; }
  if (e.target.id === 'accessQuery') { S.access.q = e.target.value; clearTimeout(accessTimer); accessTimer = setTimeout(loadAccess, 350); return; }
  if (e.target.id !== 'dirFilter') return;
  S.filters.directors.q = e.target.value;
  const all = allDirectors();
  const q = normName(e.target.value);
  const list = sortDirectors(all.filter(d => !q || normName(d.name).includes(q) || d.films.some(x => normName(T(x)).includes(q))), S.filters.directors.sort);
  const grid = $('.dir-grid') || $('.page .empty');
  const html = list.length ? `<div class="dir-grid">${list.map(directorCard).join('')}</div>` : '<div class="empty"><p>Ningún director coincide.</p></div>';
  if (grid) grid.outerHTML = html;
});

$('#searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    S.query = e.target.value;
    if (S.query.trim()) {
      if (S.route.name !== 'search') { S.history.push({ route: S.route, scroll: $('#view').scrollTop }); }
      S.route = { name: 'search' };
      render();
    } else if (S.route.name === 'search') back();
  }, 180);
});

$('#view').addEventListener('scroll', onScroll, { passive: true });
$('#btnScan').addEventListener('click', scanNow);
$('#btnFullscreen').addEventListener('click', () => window.api.toggleFullscreen());

// ---------------------------------------------------------------- eventos del proceso principal
window.api.onLibrary((lib) => {
  setLib(lib);
  // no re-renderizar ajustes ni descargas mientras el usuario escribe
  if (['settings', 'downloads'].includes(S.route.name) && /INPUT|SELECT/.test(document.activeElement?.tagName)) return;
  render(true);
});
window.api.onProgress((p) => { S.lib.progress = p; });
window.api.onPlayerClosed(({ error }) => {
  if (error) toast('mpv se cerró con un error:\n' + error, 'error');
  render(true);
});
window.api.onFullscreen((fs) => document.body.classList.toggle('fullscreen', fs));
window.api.onSessionExpired?.(async (msg) => { S.session = await window.api.session.get(); showLogin(msg); });
window.api.onToast(({ type, text, action }) => toast(text, type, action === 'requests' ? () => go('requests') : null));
window.api.onRequests?.((v) => {
  setRequests(v);
  if (S.route.name === 'requests' && !/INPUT/.test(document.activeElement?.tagName)) render(true);
});
window.api.emule.onUpdate((snap) => { S.emule.snap = snap; paintEmule(); });
window.api.letterboxd.onStatus((st) => { S.lb.status = st; paintLbStatus(); });
window.api.letterboxd.onUpdate((snap) => {
  setLb(snap);
  if (S.route.name === 'downloads' || (S.route.name === 'settings' && /INPUT|SELECT/.test(document.activeElement?.tagName))) { paintLbStatus(); return; }
  render(true);
});
window.api.onNewItems((list) => {
  for (const x of list.slice(0, 4)) {
    const el = document.createElement('div');
    el.className = 'toast new-item';
    el.innerHTML = `<div class="ni-poster">${x.poster ? `<img src="${esc(x.poster)}" alt="">` : I.film}</div>
      <div class="ni-txt"><small>Nuevo en tu biblioteca</small><b>${esc(x.title)}</b><span>${esc(x.sub)}</span></div>`;
    el.addEventListener('click', () => { el.remove(); go('detail', { id: x.id }); });
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 9000);
  }
  if (list.length > 4) toast(`…y ${list.length - 4} novedades más`);
});
window.api.update.onStatus((st) => { S.update = st; paintUpdate(); });
window.api.discord.onStatus((st) => { S.discord = st; paintDiscord(); });
window.api.onOpenItem((id) => { closeModal(); go('detail', { id }); });
window.api.onMetaProgress((p) => {
  const el = $('#metaStatus');
  if (!p || !p.total) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = `<div class="spinner"></div><span>Descargando metadatos ${p.done}/${p.total}${p.title ? ' · ' + esc(p.title) : ''}</span>`;
});

// ---------------------------------------------------------------- inicio de sesión (escritorio)
/** Pantalla de entrada: servidor (ya puesto), usuario y contraseña de DSM, y el código si hay verificación en dos pasos */
function showLogin(message = '') {
  closeModal();
  document.body.classList.add('login-mode');
  const root = $('#loginRoot');
  root.classList.remove('hidden');
  root.innerHTML = `<form class="login-card" id="loginForm" autocomplete="on">
      <div class="brand">
        <svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg)"/><path d="M12.5 9.5v13l10-6.5z" fill="#fff"/></svg>
        <span>Cine<b>Local</b></span>
      </div>
      <p class="sub">Entra con tu usuario del NAS</p>
      <div id="lgServerBox" class="${S.session.url ? 'hidden' : ''}">
        <label for="lgServer">Servidor</label>
        <input class="input" id="lgServer" value="${esc(S.session.url || '')}" placeholder="https://cine.tudominio.com" spellcheck="false">
      </div>
      <label for="lgUser">Usuario</label>
      <input class="input" id="lgUser" value="${esc(S.session.user || '')}" autocomplete="username" spellcheck="false" required>
      <label for="lgPass">Contraseña</label>
      <input class="input" id="lgPass" type="password" autocomplete="current-password" required>
      <div id="lgOtpBox" class="hidden">
        <label for="lgOtp">Código de verificación en dos pasos</label>
        <input class="input" id="lgOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="8">
      </div>
      <button class="btn btn-accent" id="lgGo" type="submit">Entrar</button>
      <div id="lgErr" class="err ${message ? '' : 'hidden'}" role="alert">${esc(message)}</div>
      <div class="server-line ${S.session.url ? '' : 'hidden'}">Servidor: ${esc(S.session.url || '')} · <button type="button" id="lgChange">Cambiar</button></div>
      <div class="server-line"><button type="button" id="lgLocal">Usar sin servidor: carpetas de este PC o del NAS</button></div>
    </form>`;
  $('#lgChange')?.addEventListener('click', () => { $('#lgServerBox').classList.remove('hidden'); $('.server-line').classList.add('hidden'); $('#lgServer').focus(); });
  $('#lgLocal').addEventListener('click', () => useLocal());
  setTimeout(() => ($('#lgUser').value ? $('#lgPass') : $('#lgUser')).focus(), 30);
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const go = $('#lgGo'), err = $('#lgErr');
    go.disabled = true; go.textContent = 'Entrando…'; err.classList.add('hidden');
    const r = await window.api.remote.login({ url: $('#lgServer').value.trim(), user: $('#lgUser').value.trim(), password: $('#lgPass').value, otp: $('#lgOtp').value.trim() })
      .catch(x => ({ ok: false, error: errText(x) }));
    go.disabled = false; go.textContent = 'Entrar';
    if (r.ok) { hideLogin(); boot(); return; }
    if (r.otp) { $('#lgOtpBox').classList.remove('hidden'); $('#lgOtp').focus(); }
    err.textContent = r.error || 'No se ha podido iniciar sesión';
    err.classList.remove('hidden');
  });
}
function hideLogin() {
  document.body.classList.remove('login-mode');
  $('#loginRoot').classList.add('hidden');
  $('#loginRoot').innerHTML = '';
}
async function logout() {
  if (WEB) return window.api.logout();
  await window.api.remote.logout();
  S.session = await window.api.session.get();
  resetLibrary();
  showLogin();
}
function resetLibrary(route = 'home') {
  S.lib = { items: [], progress: {}, favorites: [] };
  S.history = []; S.route = { name: route };
  S.nasTest = null;
}
/** Sin CineLocal Server: la biblioteca de las carpetas de este PC o del NAS (la primera vez, a Ajustes para añadirlas) */
async function useLocal() {
  S.settings = await window.api.setSettings({ localMode: true });
  S.session = await window.api.session.get();
  resetLibrary(libPaths().some(Boolean) ? 'home' : 'settings');
  hideLogin();
  await boot();
}
/** Volver a CineLocal Server: con la sesión guardada, directamente; si no, a la pantalla de inicio de sesión */
async function useServer() {
  S.settings = await window.api.setSettings({ localMode: false });
  S.session = await window.api.session.get();
  resetLibrary();
  if (!S.session.loggedIn) { S.me = null; showLogin(); return; }
  await boot();
}

// ---------------------------------------------------------------- arranque
/** Carga todo con la sesión ya abierta (al abrir la app, o al entrar desde la pantalla de inicio de sesión) */
async function boot() {
  S.settings = await window.api.getSettings();
  setLib(await window.api.getLibrary());
  S.emule.snap = await window.api.emule.get();
  setLb(await window.api.letterboxd.get());
  S.update = await window.api.update.status();
  S.discord = await window.api.discord.status();
  await refreshMe();
  render();
  paintUpdToast();
  paintEmule();
  if (emuleOn()) loadEmuleInfo();
}

(async function init() {
  if (window.api.platform === 'win32') document.body.classList.add('win');
  if (WEB) document.body.classList.add('web');
  document.body.classList.toggle('fullscreen', await window.api.isFullscreen());
  // escritorio: sin sesión en CineLocal Server, primero la pantalla de inicio de sesión
  if (!WEB) {
    S.session = await window.api.session.get();
    if (!S.session.loggedIn) { showLogin(); return; }
  }
  await boot();
})();
