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

// CineLocal Server (server/): la misma interfaz en el navegador, sin mpv, Discord ni actualizaciones
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
  users: { users: null, groups: null, error: null },               // usuarios y lo que puede ver cada uno (administradores)
  userEdit: null,                                                  // el usuario que se está cambiando
  ann: { items: null, error: null },                               // avisos enviados (administradores)
  annEdit: null,                                                   // el aviso que se está escribiendo
  titles: {},                                                      // fichas de TMDB de lo que no está en la biblioteca
  emule: {
    snap: { ok: false, code: 'offline', downloads: [], pending: [], placed: [] },
    method: 'global',   // buscar en los servidores eD2k o en Kad
    search: { query: '', results: [], message: '', busy: false, error: null, run: 0 },
    // servidores: list null = sin cargar · open null = decidir según la conexión · busy: 'srv' | 'kad'
    srv: { list: null, kad: null, error: null, at: 0, loading: false, open: null, sort: 'users', dir: -1, busy: null }
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
/** Tarjeta de una entrada: la tuya si la tienes; si no, la de una película que no tienes */
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

/** Carátula de un título; note (texto) sustituye a la línea de debajo: el motivo de una recomendación */
function card(it, note) {
  if (typeof note !== 'string') note = '';   // con .map(card) llega el índice
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
    <div class="cap"><div class="t">${esc(T(it))}</div><div class="s" ${note ? `title="${esc(note)}"` : ''}>${esc(note || sub)}</div></div>
  </div>`;
}
function lbBadge(lb) {
  if (!lb?.rating && !lb?.liked) return '';
  return `<span class="lb-badge" title="Tu nota en Letterboxd">${lb.rating ? `<b>${lbStars(lb.rating)}</b>` : ''}${lb.liked ? '<i>♥</i>' : ''}</span>`;
}
/** Película que no está en la biblioteca: su ficha, pedirla, guardarla y, si hay aMule en el servidor, buscarla */
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
      <div class="missing-hover">${tmdbE || f.url ? `<span>${I.info}${tmdbE ? 'Ver ficha' : 'Ver en Letterboxd'}</span>` : ''}${requestButton(e)}${e ? `<button class="mh-emule" data-action="wl-toggle" data-entry="${esc(JSON.stringify(e))}">${inWatchlist(e.key) ? I.bookmarkOn : I.bookmark}${inWatchlist(e.key) ? 'En tu Watchlist' : 'Watchlist'}</button>` : ''}${e ? `<button class="mh-emule" data-action="lists-pick" data-entry="${esc(JSON.stringify(e))}">${saved ? I.check : I.plus}${saved ? 'En tus listas' : 'Guardar en lista'}</button>` : ''}${emuleOn() ? `<button class="mh-emule" ${emuleFindAttrs(f.title, f.originalTitle, tmdbE && { ...tmdbE, title: f.title, year: f.year })}>${I.download}Buscar en aMule</button>` : ''}</div>
    </div>
    <div class="cap"><div class="t">${esc(f.title)}</div><div class="s">${esc(line || 'Sin fecha')}</div></div>
  </div>`;
}
/** Tarjeta de la watchlist: la tuya si la tienes; si no, la de una película que no tienes */
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

/** Guardar el vídeo en el equipo: sólo en la web, donde el navegador lo descarga con su nombre (id de película o episodio) */
function downloadLink(id, size, cls) {
  if (!WEB) return '';
  const title = `Descargar el vídeo${size ? ` (${fmtSize(size)})` : ''}`;
  return `<a class="${cls} dl-file" href="/api/media/${encodeURIComponent(id)}/file?dl=1" download title="${title}" aria-label="${title}">${I.download}</a>`;
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

/** Películas y Directores, como pestañas de la sección Películas */
const movieTabs = on => `<div class="list-tabs page-tabs">${[['movies', 'Películas'], ['directors', 'Directores']]
  .map(([k, l]) => `<button class="gchip ${on === k ? 'on' : ''}" data-nav="${k}">${l}</button>`).join('')}</div>`;

function viewDirectors() {
  const f = S.filters.directors;
  const all = allDirectors();
  const q = normName(f.q);
  const list = sortDirectors(all.filter(d => !q || normName(d.name).includes(q) || d.films.some(x => normName(T(x)).includes(q))), f.sort);
  if (!all.length) {
    return `<div class="page"><h1 class="page-title">Directores</h1>${movieTabs('directors')}<div class="empty"><div class="big-ico">${I.film}</div>
      <h2>Todavía no hay directores</h2><p>Se obtienen de los metadatos de TMDB. ${S.lib.hasKey ? 'Espera a que terminen de descargarse.' : 'Añade tu API key en Ajustes.'}</p>
      ${S.lib.hasKey ? '' : '<button class="btn btn-accent" data-nav="settings">Ir a Ajustes</button>'}</div></div>`;
  }
  return `<div class="page">
    <h1 class="page-title">Directores<span class="count">${all.length}</span></h1>
    ${movieTabs('directors')}
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
  // lo recomendado con todo lo que has visto y tus notas de Letterboxd; luego, el director y el actor que más te gustan
  const rec = recommendations();
  if (rec.list.length >= 4) rows += row('Recomendado para ti', rec.list.slice(0, 24).map(r => card(r.it, r.why)).join(''), 'for-you');
  for (const r of rec.rows) rows += row(r.title, r.list.map(x => card(x.it, x.why)).join(''), r.key);
  for (const b of becauseYouWatched().slice(0, 1)) rows += row(`Porque viste «${T(b.from)}»`, b.items.map(card).join(''), 'because-' + b.from.id);
  // sólo si encaja con lo que ves (si no, no sale)
  const forYou = recommendedCollections();
  if (forYou.length) rows += row('Colecciones para ti', forYou.map(r => sagaCard(r.c, r.note)).join(''), 'coll-for-you');
  const gems = shuffled(items.filter(i => (i.meta?.rating || 0) >= 7.5 && !isSeen(i)), today + 'gems').slice(0, 24);
  if (gems.length >= 4) rows += row('Joyas sin ver', gems.map(card).join(''), 'gems');
  rows += row('Series', series.slice(0, 30).map(card).join(''), 'series', 'series');
  rows += row('Películas', movies.slice(0, 30).map(card).join(''), 'movies', 'movies');
  const custom = customCollections();
  if (custom.length) rows += row('Colecciones', custom.slice(0, 24).map(c => sagaCard(c)).join(''), 'collections', 'collections');
  const sagas = allSagas();
  if (sagas.length) rows += row('Sagas', sagas.slice(0, 24).map(c => sagaCard(c)).join(''), 'sagas', 'sagas');
  const dirs = sortDirectors(allDirectors(), 'count');
  if (dirs.length >= 3) rows += row('Directores', dirs.slice(0, 24).map(directorChip).join(''), 'directors', 'directors');
  // tres categorías cada día, con títulos al azar (con miles de títulos, una fila por género sería interminable)
  for (const [c] of shuffled(categoriesOf(items, 6), today + 'cats').slice(0, 3)) {
    rows += row(c, shuffled(items.filter(i => inCategory(i, c)), today + c).slice(0, 24).map(card).join(''), 'cat-' + c);
  }

  return `${hero}<div class="rows ${hero ? '' : 'no-hero'}">${banners()}${rows}</div>`;
}

/**
 * Recomendaciones: un perfil de tus gustos hecho con todo lo que has visto (y, con Letterboxd, con tus notas: lo que
 * puntúas alto suma y lo que puntúas bajo resta), y una puntuación para cada título sin ver de la biblioteca:
 * - lo que tiene en común con lo que te gusta: director o creador, reparto, géneros, saga y época. Lo que comparten
 *   muchos títulos (el género «Drama») cuenta menos que lo raro (un director concreto);
 * - las recomendaciones de TMDB en las dos direcciones: lo que recomiendan los títulos que te gustaron y los títulos que
 *   recomiendan algo que te gustó, también de las películas puntuadas en Letterboxd que no están en la biblioteca;
 * - un poco de la nota de TMDB, para desempatar.
 * Cada recomendación lleva su motivo principal («Porque te gusta Christopher Nolan»).
 */
const REC_WEIGHT = { dir: 2.2, crea: 2.2, cast: 0.8, genre: 1.2, coll: 2, decade: 0.4 };
let recsCache = null;

/** Lo que dice de un título: sus rasgos («dir:Christopher Nolan», «genre:Ciencia ficción»…) */
function recFeatures(it) {
  const m = it.meta;
  if (!m) return [];
  const f = [];
  for (const d of m.directors?.length ? m.directors.map(x => x.name) : (m.director || '').split(',').map(s => s.trim()).filter(Boolean)) f.push('dir:' + d);
  // los creadores de una serie vienen en un texto («Vince Gilligan, Peter Gould»)
  for (const c of (Array.isArray(m.creators) ? m.creators.map(x => x.name || x) : String(m.creators || '').split(','))) if (c.trim()) f.push('crea:' + c.trim());
  for (const p of (m.people || []).slice(0, 6)) f.push('cast:' + p);
  for (const g of m.genres || []) f.push('genre:' + g);
  if (m.collection?.id) f.push('coll:' + m.collection.id);
  if (m.year) f.push('decade:' + Math.floor(m.year / 10) * 10);
  return f;
}

/**
 * Cuánto te gustó un título (de -1,5 a 2): tu nota de Letterboxd si la hay (5★ ≈ 1,8; 3★ ≈ 0,2; 1★ ≈ -1,4; con «me
 * gusta», algo más) y si no, haberlo visto (entero, o buena parte de una serie). null: no lo has visto.
 */
function recLiking(it) {
  const lb = lbOf(it);
  if (lb?.rating) return Math.max(-1.5, Math.min(2, (lb.rating - 2.75) / 1.25 + (lb.liked ? 0.4 : 0)));
  if (lb?.liked) return 1.2;
  if (it.type === 'movie') {
    const p = prog(it.path);
    return p?.watched || lb?.watched ? 0.7 : p?.pos > 1200 ? 0.3 : null;
  }
  const seen = it.episodes.filter(e => epSeen(it, e)).length;
  return seen >= Math.min(3, it.episodes.length) ? 0.4 + 0.4 * seen / it.episodes.length : null;
}

/** Cuándo lo viste (para que pese algo más lo reciente) */
function recWhen(it) {
  const paths = it.type === 'movie' ? [it.path] : it.episodes.map(e => e.path);
  const at = Math.max(0, ...paths.map(p => prog(p)?.at || 0));
  const lb = lbOf(it);
  return at || (lb?.date ? Date.parse(lb.date) || 0 : 0);
}

function recommendations() {
  // cambia si cambia la biblioteca, lo visto o Letterboxd
  const pr = Object.values(S.lib.progress || {});
  const key = [S.lib.items.length, S.lib.scannedAt, pr.length, pr.filter(p => p.watched).length, pr.reduce((m, p) => Math.max(m, p.at || 0), 0), S.lb.syncedAt || 0, S.lb.films.length].join('|');
  if (recsCache?.key === key) return recsCache;
  const items = S.lib.items.filter(i => i.meta);
  const now = Date.now();
  // cuántos títulos de la biblioteca tienen cada rasgo: lo común cuenta menos
  const df = new Map();
  for (const it of items) for (const f of new Set(recFeatures(it))) df.set(f, (df.get(f) || 0) + 1);
  const idf = f => Math.log(1 + items.length / (df.get(f) || 1));
  // el perfil: para cada rasgo, cuánto te gusta lo que lo tiene (la media, con más confianza cuantos más títulos)
  const sum = new Map(), cnt = new Map();
  const liked = [];                               // títulos vistos, con cuánto te gustaron
  for (const it of items) {
    const w0 = recLiking(it);
    if (w0 == null) continue;
    const when = recWhen(it);
    const w = w0 * (1 + (when ? 0.4 * Math.exp(-(now - when) / (180 * 864e5)) : 0));
    liked.push({ it, w, f: new Set(recFeatures(it)) });
    for (const f of liked[liked.length - 1].f) { sum.set(f, (sum.get(f) || 0) + w); cnt.set(f, (cnt.get(f) || 0) + 1); }
  }
  if (!liked.length && !S.lb.films.some(f => f.rating || f.liked)) return (recsCache = { key, list: [], rows: [] });
  const affinity = f => { const n = cnt.get(f); return n ? sum.get(f) / (n + 1) * Math.log(1 + n) : 0; };
  // recomendaciones de TMDB: lo que recomiendan los títulos que te gustaron…
  const byTmdb = new Map(items.filter(i => i.meta.tmdbId).map(i => [i.type + ':' + i.meta.tmdbId, i]));
  const tmdbVotes = new Map();   // id del candidato → [{ w, name }]
  const vote = (id, w, name) => (tmdbVotes.get(id) || tmdbVotes.set(id, []).get(id)).push({ w, name });
  for (const { it, w } of liked) for (const r of it.meta.recs || []) { const c = byTmdb.get(it.type + ':' + r); if (c) vote(c.id, w, T(it)); }
  // …y los títulos que recomiendan algo que te gustó (también lo puntuado en Letterboxd que no está en la biblioteca)
  const seenTmdb = new Set(liked.filter(l => l.it.type === 'movie').map(l => l.it.meta.tmdbId));
  const lbScore = new Map();
  for (const f of S.lb.films) {
    if (!f.tmdbId || seenTmdb.has(f.tmdbId) || !(f.rating || f.liked || f.watched)) continue;
    lbScore.set(f.tmdbId, { w: f.rating ? (f.rating - 2.75) / 1.25 + (f.liked ? 0.4 : 0) : f.liked ? 1.2 : 0.5, name: f.localTitle || f.title });
  }
  for (const c of items) {
    if (c.type !== 'movie') continue;
    for (const r of c.meta.recs || []) { const s = lbScore.get(r); if (s) vote(c.id, s.w * 0.8, s.name); }
  }
  const kindOf = f => f.slice(0, f.indexOf(':'));
  const name = f => f.slice(f.indexOf(':') + 1);
  const scored = [];
  const dupes = new Set();
  for (const it of items) {
    if (isSeen(it) || lbOf(it)?.watched || recLiking(it) != null) continue;
    const k = it.type + ':' + (it.meta.tmdbId || it.id);
    if (dupes.has(k)) continue;   // el mismo título dos veces en la biblioteca (dos copias)
    dupes.add(k);
    const feats = new Set(recFeatures(it));
    let feat = 0, best = null;
    for (const f of feats) {
      const a = affinity(f);
      if (!a) continue;
      const s = REC_WEIGHT[kindOf(f)] * a * idf(f);
      feat += s;
      if (s > 0 && ['dir', 'crea', 'cast', 'coll'].includes(kindOf(f)) && (!best || s > best.s)) best = { s, f };
    }
    const votes = tmdbVotes.get(it.id) || [];
    const tm = votes.reduce((a, v) => a + v.w, 0);
    const score = feat + 2 * tm + 0.4 * ((it.meta.rating || 6.5) - 6.5);
    if (score > 1) scored.push({ it, score, feats, votes, tm, best });
  }
  scored.sort((a, b) => b.score - a.score);

  /**
   * El motivo de una recomendación: un director o creador que te gusta si es lo que más pesa; si no, los títulos que te
   * gustaron que más se le parecen (o que TMDB relaciona con él)
   */
  const why = s => {
    if (s.why !== undefined) return s.why;
    const kind = s.best && kindOf(s.best.f);
    if ((kind === 'dir' || kind === 'crea') && s.best.s >= 2 * s.tm) return (s.why = `Porque te gusta ${name(s.best.f)}`);
    if (kind === 'coll' && s.best.s >= 2 * s.tm) return (s.why = 'Sigue una saga que te gusta');
    // los que más se le parecen: rasgos en común (los raros, más) y si TMDB los relaciona
    const voted = new Map(s.votes.filter(v => v.w > 0).map(v => [v.name, v.w]));
    const near = liked.filter(l => l.w > 0.5).map(l => {
      let sim = 0;
      for (const f of l.f) if (s.feats.has(f) && kindOf(f) !== 'decade') sim += REC_WEIGHT[kindOf(f)] * idf(f);
      return { name: T(l.it), sim: sim * l.w + (voted.get(T(l.it)) || 0) * 6 };
    });
    for (const [n, w] of voted) if (!near.some(x => x.name === n)) near.push({ name: n, sim: w * 6 });
    near.sort((a, b) => b.sim - a.sim);
    if (kind === 'cast' && s.best.s > (near[0]?.sim || 0) / 4) return (s.why = `Con ${name(s.best.f)}`);
    const [a, b] = near;
    return (s.why = !a ? '' : b && b.sim > a.sim * 0.6 ? `Por «${a.name}» y «${b.name}»` : `Porque te gustó «${a.name}»`);
  };
  // variedad: el mismo director, saga o actor no copa la lista (cada vez que se repite, pesa menos)
  const used = new Map(), mixed = [], pool = scored.slice(0, 300);
  while (pool.length) {
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < Math.min(pool.length, 60); i++) {
      const v = pool[i].score * Math.pow(0.6, used.get(pool[i].best?.f) || 0);
      if (v > bv) { bv = v; bi = i; }
    }
    const [s] = pool.splice(bi, 1);
    if (s.best) used.set(s.best.f, (used.get(s.best.f) || 0) + 1);
    mixed.push(s);
  }
  const list = [...mixed, ...scored.slice(300)].map(s => ({ it: s.it, score: s.score, get why() { return why(s); } }));
  // filas: el director (o creador) y el actor que más te gustan, con lo que te queda por ver de ellos
  const rows = [];
  const top = kind => [...cnt.keys()].filter(f => kindOf(f) === kind && cnt.get(f) >= 2 && affinity(f) > 0.5).sort((a, b) => affinity(b) - affinity(a));
  const inRow = f => list.filter(x => recFeatures(x.it).includes(f));
  const dir = [...top('dir'), ...top('crea')].sort((a, b) => affinity(b) - affinity(a)).find(f => inRow(f).length >= 2);
  if (dir) rows.push({ key: 'rec-' + dir, title: `Más de ${name(dir)}`, list: inRow(dir).slice(0, 20).map(x => ({ it: x.it, why: `Te gusta ${name(dir)}` })) });
  const actor = top('cast').find(f => inRow(f).length >= 3);
  if (actor) rows.push({ key: 'rec-' + actor, title: `Con ${name(actor)}`, list: inRow(actor).slice(0, 20) });
  return (recsCache = { key, list, rows });
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

// ---------------------------------------------------------------- colecciones
// Dos clases: las que hacen los administradores (en el servidor, con películas y series en el orden que eligen)
// y las sagas de TMDB (salen solas de las fichas, con al menos dos películas en la biblioteca)

/** Sagas de TMDB, las más completas primero */
function allSagas() {
  const map = new Map();
  for (const it of S.lib.items) {
    const c = it.type === 'movie' && it.meta?.collection;
    if (!c) continue;
    if (!map.has(c.id)) map.set(c.id, { ...c, films: [] });
    map.get(c.id).films.push(it);
  }
  return [...map.values()].filter(s => s.films.length >= 2)
    .map(s => ({ ...s, kind: 'saga', films: s.films.sort((a, b) => (Y(a) || 0) - (Y(b) || 0)) }))
    .sort((a, b) => b.films.length - a.films.length || a.name.localeCompare(b.name, 'es'));
}
/** Colecciones de los administradores, las más nuevas primero */
function customCollections() {
  return (S.lib.collections || []).map(c => ({ ...c, kind: 'custom', films: c.items.map(byId).filter(Boolean) })).filter(c => c.films.length);
}
const allCollections = () => [...customCollections(), ...allSagas()];
const collById = id => allCollections().find(c => String(c.id) === String(id));
const sagaName = s => s.kind === 'custom' ? s.name : s.name.replace(/\s*[-–:]?\s*(Colecci[oó]n|Collection|Saga)$/i, '').replace(/^(Colecci[oó]n|Saga)\s*:?\s*/i, '') || s.name;
const collBackdrop = s => imgSrc(s.backdrop) || s.films.find(f => f.meta?.backdrop)?.meta.backdrop?.replace('/original/', '/w1280/') || null;
const filmsLabel2 = (s) => {
  const movies = s.films.filter(f => f.type === 'movie').length, series = s.films.length - movies;
  return [movies && (movies === 1 ? '1 película' : `${movies} películas`), series && (series === 1 ? '1 serie' : `${series} series`)].filter(Boolean).join(' · ');
};
function sagaCard(s, note) {
  const poster = s.poster || posterOf(s.films.find(posterOf) || {});
  const seen = s.films.filter(isSeen).length;
  return `<div class="card coll-card ${s.kind === 'custom' ? 'custom' : ''}" tabindex="0" data-coll="${esc(String(s.id))}">
    <div class="art">${poster ? `<img loading="lazy" src="${esc(imgSrc(poster))}" alt="">` : placeholder({ title: sagaName(s), type: 'movie' }, true)}
      ${s.kind === 'custom' ? '<span class="coll-tag">Colección</span>' : ''}
      ${seen === s.films.length ? `<span class="watched-mark" title="Todo visto">${I.check}</span>` : ''}</div>
    <div class="cap"><div class="t">${esc(sagaName(s))}</div><div class="s">${esc(note || filmsLabel2(s) + (seen && seen < s.films.length ? ` · ${seen} ${seen === 1 ? 'vista' : 'vistas'}` : ''))}</div></div>
  </div>`;
}
/** Colecciones y Sagas, como pestañas de la sección Colecciones (igual que Películas y Directores) */
const collTabs = on => `<div class="list-tabs page-tabs">${[['collections', 'Colecciones'], ['sagas', 'Sagas']]
  .map(([k, l]) => `<button class="gchip ${on === k ? 'on' : ''}" data-nav="${k}">${l}</button>`).join('')}</div>`;
function viewCollections() {
  const custom = customCollections();
  const add = isAdmin() || LOCAL() ? `<button class="btn btn-accent btn-sm" data-action="coll-new">${I.plus}Nueva colección</button>` : '';
  return `<div class="page"><div class="coll-head"><h1 class="page-title">Colecciones${custom.length ? `<span class="count">${custom.length}</span>` : ''}</h1>${add}</div>
    ${collTabs('collections')}
    ${custom.length ? `<div class="grid">${custom.map(c => sagaCard(c)).join('')}</div>`
      : `<div class="empty"><p>Todavía no hay colecciones. ${add ? 'Crea la primera con las películas y series que quieras: la verán todos.' : 'Las preparan los administradores; mientras tanto, mira las Sagas.'}</p></div>`}</div>`;
}
function viewSagas() {
  const sagas = allSagas();
  return `<div class="page"><h1 class="page-title">Colecciones</h1>
    ${collTabs('sagas')}
    ${sagas.length ? `<div class="grid">${sagas.map(c => sagaCard(c)).join('')}</div>` : '<div class="empty"><p>No hay ninguna saga con dos o más películas en la biblioteca.</p></div>'}</div>`;
}
function viewCollection(id) {
  const s = collById(id);
  if (!s) return `<div class="page"><div class="empty"><h2>No encontrada</h2><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const bg = collBackdrop(s);
  const seen = s.films.filter(isSeen).length;
  let info;
  if (s.kind === 'custom') {
    info = [filmsLabel2(s), `${seen} de ${s.films.length} vistos`, s.createdBy ? `por ${s.createdBy}` : ''].filter(Boolean).join(' · ');
  } else {
    const years = [Y(s.films[0]), Y(s.films[s.films.length - 1])].filter(Boolean);
    info = `${years.length ? (years[0] === years[1] ? years[0] : `${years[0]} – ${years[1]}`) + ' · ' : ''}${seen} de ${s.films.length} vistas · en orden de estreno`;
  }
  const admin = s.kind === 'custom' && (isAdmin() || LOCAL()) ? `<div class="coll-admin">
      <button class="btn btn-ghost btn-sm" data-action="coll-edit" data-id="${esc(s.id)}">Editar</button>
      <button class="btn btn-ghost btn-sm danger" data-action="coll-delete" data-id="${esc(s.id)}">Borrar</button></div>` : '';
  return `<div class="page saga-page">
    ${bg ? `<div class="saga-bg" style="background-image:url('${esc(bg)}')"></div>` : ''}
    <button class="btn btn-ghost btn-sm saga-back" data-action="back">${I.left}Volver</button>
    <div class="coll-head"><h1 class="page-title">${esc(sagaName(s))}<span class="count">${s.films.length}</span></h1>${admin}</div>
    ${s.kind === 'custom' && s.description ? `<p class="coll-desc">${esc(s.description)}</p>` : ''}
    <p class="req-intro">${esc(info)}</p>
    <div class="grid">${s.films.map(card).join('')}</div>
  </div>`;
}

/**
 * «Colecciones para ti» en Inicio: primero las que has empezado y no has terminado; luego, de las que no has
 * empezado, las que más se parecen (por géneros) a lo último que has visto. Sin nada que encaje, no sale la fila.
 */
function recommendedCollections() {
  const recent = [];
  const byPath = new Map();
  for (const it of S.lib.items) { if (it.type === 'movie') byPath.set(it.path, it); else for (const e of it.episodes) byPath.set(e.path, it); }
  const seenIds = new Set();
  for (const [p, pr] of Object.entries(S.lib.progress || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))) {
    const it = byPath.get(p);
    if (!it || seenIds.has(it.id) || !(pr.watched || pr.pos > 600)) continue;
    seenIds.add(it.id); recent.push(it);
    if (recent.length >= 20) break;
  }
  if (!recent.length) return [];
  const taste = new Map();
  for (const it of recent) for (const g of it.meta?.genres || []) taste.set(g, (taste.get(g) || 0) + 1);
  const top = Math.max(1, ...taste.values());
  const out = [];
  for (const c of allCollections()) {
    const seen = c.films.filter(isSeen).length;
    if (seen === c.films.length) continue;
    if (seen || c.films.some(f => seenIds.has(f.id))) { out.push({ c, score: 2 + seen / c.films.length, note: `Te ${c.films.length - seen === 1 ? 'falta 1' : `faltan ${c.films.length - seen}`}` }); continue; }
    const genres = c.films.flatMap(f => f.meta?.genres || []);
    if (!genres.length) continue;
    const fit = genres.reduce((n, g) => n + (taste.get(g) || 0), 0) / genres.length / top;
    // las de los administradores, un poco por delante: son las que alguien ha preparado
    const score = fit + (c.kind === 'custom' ? 0.15 : 0);
    if (score >= 0.45) out.push({ c, score, note: c.kind === 'custom' ? filmsLabel2(c) : null });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ---------- crear y editar (administradores)
function viewCollectionEdit() {
  const e = S.collEdit;
  if (!e) return '';
  const q = normName(e.q || '');
  const chosen = new Set(e.items);
  const found = q.length >= 2
    ? S.lib.items.filter(i => !chosen.has(i.id) && (normName(T(i)).includes(q) || normName(i.title).includes(q))).slice(0, 40)
    : [];
  const mini = (it, i) => `<div class="coll-pick">
      <div class="art">${posterOf(it) ? `<img loading="lazy" src="${esc(posterOf(it))}" alt="">` : placeholder(it)}</div>
      <div class="t">${esc(T(it))}${Y(it) ? ` <span>${Y(it)}</span>` : ''}</div>
      ${i === undefined ? `<button class="btn btn-ghost btn-sm" data-coll-add="${esc(it.id)}">${I.plus}Añadir</button>`
        : `<div class="coll-pick-btns"><button class="icon-btn sm" title="Antes" data-coll-move="${i}:-1" ${i === 0 ? 'disabled' : ''}>${I.left}</button>
          <button class="icon-btn sm" title="Después" data-coll-move="${i}:1" ${i === e.items.length - 1 ? 'disabled' : ''}>${I.right}</button>
          <button class="icon-btn sm" title="Quitar" data-coll-remove="${esc(it.id)}">${I.close}</button></div>`}
    </div>`;
  return `<div class="page coll-edit">
    <button class="btn btn-ghost btn-sm saga-back" data-action="back">${I.left}Volver</button>
    <h1 class="page-title">${e.id ? 'Editar colección' : 'Nueva colección'}</h1>
    <div class="coll-form">
      <label>Nombre<input class="input" id="collName" maxlength="80" value="${esc(e.name)}" placeholder="Por ejemplo: Terror de los 80"></label>
      <label><div>Descripción <span>(opcional)</span></div><textarea class="input" id="collDesc" maxlength="600" rows="3" placeholder="De qué va, por qué verlas…">${esc(e.description)}</textarea></label>
    </div>
    ${collImagePicker(e)}
    <h2 class="coll-sec">En la colección <span class="count">${e.items.length}</span></h2>
    ${e.items.length ? `<div class="coll-picks">${e.items.map(byId).filter(Boolean).map((it, i) => mini(it, i)).join('')}</div>` : '<p class="req-intro">Busca abajo y añade al menos dos títulos. Saldrán en este orden.</p>'}
    <h2 class="coll-sec">Añadir títulos</h2>
    <input class="input coll-search" id="collSearch" placeholder="Busca películas o series de la biblioteca" value="${esc(e.q || '')}">
    ${found.length ? `<div class="coll-picks">${found.map(it => mini(it)).join('')}</div>` : q.length >= 2 ? '<p class="coll-hint">Nada en la biblioteca con ese nombre.</p>' : ''}
    <div class="coll-save"><button class="btn btn-ghost" data-action="back">Cancelar</button>
      <button class="btn btn-accent" data-action="coll-save" ${e.items.length < 2 || !e.name.trim() ? 'disabled' : ''}>${e.id ? 'Guardar cambios' : 'Crear colección'}</button></div>
  </div>`;
}
/** Imagen subida al servidor (/api/collection-image/…): en el escritorio hace falta la dirección del servidor */
const imgSrc = u => u && u.startsWith('/api/') && !WEB ? (S.settings.remoteUrl || '').replace(/\/+$/, '') + u : u;

/**
 * Imagen de la colección: la portada (vertical, en la tarjeta) y el fondo (horizontal, en su página y en el aviso),
 * de entre las carátulas e imágenes de sus títulos, una subida (que se encuadra antes) o «Automática»
 */
function collImagePicker(e) {
  const films = e.items.map(byId).filter(Boolean);
  const posters = [...new Set(films.map(posterOf).filter(Boolean))];
  const backs = [...new Set(films.map(f => f.meta?.backdrop?.replace('/original/', '/w1280/')).filter(Boolean))];
  const opt = (kind, url, wide) => `<button class="coll-img ${wide ? 'wide' : ''} ${(e[kind] || '') === url ? 'on' : ''}" data-coll-img="${kind}" data-img="${esc(url)}" title="${url ? '' : 'La del primer título que la tenga'}">
      ${url ? `<img loading="lazy" src="${esc(url === 'upload' ? e[kind + 'Data'] : imgSrc(wide ? url.replace('/w1280/', '/w300/') : url))}" alt="">` : '<span>Automática</span>'}</button>`;
  // la subida (pendiente de guardar, o la que ya tiene la colección) va la primera tras «Automática»
  const own = kind => [e[kind + 'Data'] ? 'upload' : null, /^\/api\/collection-image\//.test(e[kind + 'Saved'] || '') ? e[kind + 'Saved'] : null].filter(Boolean);
  const upload = (kind, wide) => `<button class="coll-img coll-upload ${wide ? 'wide' : ''}" data-coll-upload="${kind}">${I.plus}<span>Subir imagen</span></button>`;
  return `<h2 class="coll-sec">Imagen</h2>
    <div class="coll-imgs-h">Portada <span>· en la tarjeta</span></div>
    <div class="coll-imgs">${upload('poster')}${opt('poster', '')}${own('poster').map(u => opt('poster', u)).join('')}${posters.map(u => opt('poster', u)).join('')}</div>
    <div class="coll-imgs-h">Fondo <span>· en su página y en el aviso de colección nueva</span></div>
    <div class="coll-imgs">${upload('backdrop', true)}${opt('backdrop', '', true)}${own('backdrop').map(u => opt('backdrop', u, true)).join('')}${backs.map(u => opt('backdrop', u, true)).join('')}</div>`;
}

/** Elegir una imagen del equipo y encuadrarla; queda pendiente hasta guardar la colección */
function pickCollectionImage(kind) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const data = await cropImage(file, kind);
    if (!data || !S.collEdit) return;
    S.collEdit[kind + 'Data'] = data;
    S.collEdit[kind] = 'upload';
    paintCollectionEdit();
  };
  input.click();
}

/**
 * Cuadro para encuadrar una imagen en la proporción de portada (2:3) o de fondo (16:9): se arrastra para moverla y se
 * acerca con la rueda o la barra. Devuelve el recorte en JPEG (data:) o null si se cancela.
 */
function cropImage(file, kind) {
  const wide = kind === 'backdrop';
  const OUT = wide ? [1600, 900] : [600, 900];
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onerror = () => { toast('No se ha podido leer la imagen', 'error'); resolve(null); };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => { toast('Ese archivo no es una imagen que se pueda abrir', 'error'); resolve(null); };
      img.onload = () => {
        const m = modal(`<div class="modal-head"><h2>Encuadra ${wide ? 'el fondo' : 'la portada'}</h2>
            <p>Arrastra la imagen para moverla y usa la rueda o la barra para acercarla. Se verá lo que queda dentro del marco.</p></div>
          <div class="crop-wrap"><div class="crop-stage ${wide ? 'wide' : ''}"><img class="crop-img" src="${reader.result}" alt="" draggable="false"></div></div>
          <div class="crop-zoom"><span>−</span><input type="range" class="crop-range" min="1" max="4" step="0.01" value="1"><span>+</span></div>
          <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-crop="0">Cancelar</button><button class="btn btn-accent btn-sm" data-crop="1">Usar esta imagen</button></div>`);
        m.classList.add('crop-modal');
        const stage = $('.crop-stage', m), el = $('.crop-img', m), range = $('.crop-range', m);
        const W = stage.clientWidth, H = stage.clientHeight;
        const base = Math.max(W / img.naturalWidth, H / img.naturalHeight);   // cubre el marco entero
        let zoom = 1, x = 0, y = 0;
        const clamp = () => {
          const w = img.naturalWidth * base * zoom, h = img.naturalHeight * base * zoom;
          x = Math.min(0, Math.max(W - w, x)); y = Math.min(0, Math.max(H - h, y));
        };
        const paint = () => { clamp(); el.style.width = img.naturalWidth * base * zoom + 'px'; el.style.transform = `translate(${x}px, ${y}px)`; };
        // centrada al empezar
        x = (W - img.naturalWidth * base) / 2; y = (H - img.naturalHeight * base) / 2; paint();
        const setZoom = (z, cx = W / 2, cy = H / 2) => {
          z = Math.min(4, Math.max(1, z));
          // acercar hacia el punto indicado (el centro, o el ratón con la rueda)
          x = cx - (cx - x) * z / zoom; y = cy - (cy - y) * z / zoom; zoom = z; range.value = z; paint();
        };
        range.addEventListener('input', () => setZoom(+range.value));
        stage.addEventListener('wheel', ev => { ev.preventDefault(); const r = stage.getBoundingClientRect(); setZoom(zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1), ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
        let drag = null;
        stage.addEventListener('pointerdown', ev => { drag = { px: ev.clientX, py: ev.clientY, x, y }; stage.setPointerCapture(ev.pointerId); stage.classList.add('dragging'); });
        stage.addEventListener('pointermove', ev => { if (!drag) return; x = drag.x + ev.clientX - drag.px; y = drag.y + ev.clientY - drag.py; paint(); });
        const end = () => { drag = null; stage.classList.remove('dragging'); };
        stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
        m.addEventListener('click', ev => {
          const b = ev.target.closest('[data-crop]');
          if (!b) return;
          if (b.dataset.crop === '0') { closeModal(); resolve(null); return; }
          // lo que se ve en el marco, al tamaño final
          const s = base * zoom, c = document.createElement('canvas');
          c.width = OUT[0]; c.height = OUT[1];
          const sw = W / s, sh = H / s;
          const sw2 = Math.min(sw, img.naturalWidth), sh2 = Math.min(sh, img.naturalHeight);
          c.getContext('2d').drawImage(img, -x / s, -y / s, sw2, sh2, 0, 0, OUT[0] * sw2 / sw, OUT[1] * sh2 / sh);
          closeModal();
          resolve(c.toDataURL('image/jpeg', 0.88));
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openCollectionEditor(id) {
  const c = id ? customCollections().find(x => x.id === id) : null;
  S.collEdit = { id: c?.id || null, name: c?.name || '', description: c?.description || '', items: c ? c.films.map(f => f.id) : [], poster: c?.poster || '', backdrop: c?.backdrop || '', posterSaved: c?.poster || '', backdropSaved: c?.backdrop || '', q: '' };
  go('collection-edit');
}
async function saveCollection() {
  const e = S.collEdit;
  try {
    const c = await window.api.collections.op({ op: e.id ? 'update' : 'create', id: e.id, name: e.name, description: e.description, items: e.items,
      // la subida pendiente va después, cuando ya hay colección (undefined: se queda la que tenga)
      poster: e.poster === 'upload' ? undefined : e.poster || null, backdrop: e.backdrop === 'upload' ? undefined : e.backdrop || null });
    for (const kind of ['poster', 'backdrop']) {
      if (e[kind] === 'upload' && e[kind + 'Data']) await window.api.collections.image({ id: c.id, kind, data: e[kind + 'Data'] });
    }
    setLib(await window.api.getLibrary());
    S.collEdit = null;
    S.history.pop();   // no volver al editor con «Atrás»
    S.route = { name: 'collection', id: c.id };
    render();
    toast(e.id ? 'Colección guardada' : 'Colección creada: la verán todos', 'ok');
  } catch (err) { toast(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'error'); }
}
/** Repinta el editor conservando el foco y el cursor del campo en el que se escribe */
function paintCollectionEdit() {
  const a = document.activeElement, id = a?.id, pos = a?.selectionStart;
  render(true);
  const el = id && document.getElementById(id);
  if (el) { el.focus(); if (pos != null) el.setSelectionRange(pos, pos); }
}

// ---------- aviso emergente al estilo de las novedades de Steam: colecciones nuevas y avisos de los administradores
const newsShown = new Set();
/** Una colección nueva o un aviso de un administrador (de la campana o de S.lib.news), listo para el aviso emergente */
function newsEntry(n) {
  if (n.kind !== 'admin') {
    const c = n;
    return { key: 'collection:' + c.id, at: c.createdAt, tag: 'Nueva colección', title: c.name, bg: collBackdrop(c),
      meta: filmsLabel2(c) + (c.createdBy ? ` · creada por ${c.createdBy}` : ''), desc: c.description, films: c.films,
      openLabel: 'Ver colección', open: () => go('collection', { id: c.id }) };
  }
  const base = { key: 'admin:' + n.id, at: n.at, desc: n.text, bg: imgSrc(n.backdrop) };
  const by = n.by ? ` · de ${n.by}` : '';
  if (n.sub === 'title') {
    const it = byId(n.target);
    if (!it) return null;
    return { ...base, tag: 'Recomendación', title: T(it), meta: [Y(it), it.type === 'series' ? 'Serie' : 'Película'].filter(Boolean).join(' · ') + by,
      desc: n.text || it.meta?.overview || '', bg: base.bg || it.meta?.backdrop?.replace('/original/', '/w1280/') || null, films: [it],
      openLabel: 'Ver ficha', open: () => go('detail', { id: it.id }) };
  }
  if (n.sub === 'collection') {
    const c = collById(n.target);
    const films = c ? c.films : (n.items || []).map(byId).filter(Boolean);
    return { ...base, tag: 'Colección recomendada', title: n.title, meta: filmsLabel2({ films }) + by, desc: n.text || c?.description || '',
      bg: base.bg || (c && collBackdrop(c)), films, openLabel: c ? 'Ver colección' : null, open: c ? () => go('collection', { id: c.id }) : null };
  }
  return { ...base, tag: 'Aviso', title: n.title, meta: n.by ? `De ${n.by}` : '', films: [], openLabel: null, open: null };
}

/** Enseña uno o varios avisos (con «anterior / siguiente»); onSeen, al cerrarlo de cualquier forma */
function showNews(list, onSeen = () => {}) {
  if (!list.length) return;
  let i = 0;
  const paint = () => {
    const c = list[i];
    const m = modal(`<div class="news">
      <div class="news-art" ${c.bg ? `style="background-image:url('${esc(c.bg)}')"` : ''}><span class="news-tag">${esc(c.tag)}</span>
        ${list.length > 1 ? `<span class="news-count">${i + 1} de ${list.length}</span>` : ''}</div>
      <div class="news-body">
        <h2>${esc(c.title)}</h2>
        ${c.meta ? `<p class="news-meta">${esc(c.meta)}</p>` : ''}
        ${c.desc ? `<p class="news-desc">${esc(c.desc)}</p>` : ''}
        ${c.films?.length ? `<div class="news-posters">${c.films.slice(0, 6).map(f => `<div class="art">${posterOf(f) ? `<img src="${esc(posterOf(f))}" alt="">` : placeholder(f)}</div>`).join('')}</div>` : ''}
      </div>
      <div class="modal-foot news-foot">
        ${list.length > 1 ? `<button class="btn btn-ghost btn-sm" data-news="prev" ${i === 0 ? 'disabled' : ''}>${I.left}</button><button class="btn btn-ghost btn-sm" data-news="next" ${i === list.length - 1 ? 'disabled' : ''}>${I.right}</button><span style="flex:1"></span>` : ''}
        ${c.open ? `<button class="btn btn-ghost btn-sm" data-news="close">Ahora no</button>
        <button class="btn btn-accent btn-sm" data-news="open">${esc(c.openLabel)}</button>` : '<button class="btn btn-accent btn-sm" data-news="close">Entendido</button>'}
      </div></div>`);
    m.classList.add('news-modal');
    // también si se cierra pinchando fuera: ya está visto
    $('#modalRoot .modal-back').addEventListener('mousedown', e => { if (e.target.classList.contains('modal-back')) onSeen(); });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-news]');
      if (!b) return;
      const a = b.dataset.news;
      if (a === 'prev' || a === 'next') { i += a === 'next' ? 1 : -1; paint(); return; }
      closeModal(); onSeen();
      if (a === 'open') c.open();
    });
  };
  paint();
}

/** Lo nuevo desde la última vez: colecciones de otros y avisos emergentes de los administradores, una sola vez */
function maybeCollectionNews() {
  if (!S.lib.collectionsSeenAt || $('#modalRoot').innerHTML || ['collection-edit', 'announce'].includes(S.route.name)) return;
  const me = (S.me?.user || '').toLowerCase();
  const since = S.lib.collectionsSeenAt;
  const fresh = [
    ...customCollections().filter(c => c.createdAt > since && (c.createdBy || '').toLowerCase() !== me),
    ...(S.lib.news || []).filter(n => n.at > since && (n.by || '').toLowerCase() !== me)
  ].map(newsEntry).filter(n => n && !newsShown.has(n.key)).sort((a, b) => b.at - a.at);
  if (!fresh.length) return;
  fresh.forEach(n => newsShown.add(n.key));
  showNews(fresh, () => window.api.collections?.seen().then(r => { if (r?.seenAt) S.lib.collectionsSeenAt = r.seenAt; }).catch(() => {}));
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
    ${kind === 'movies' ? movieTabs('movies') : ''}
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
/** Corregir la coincidencia de un título: los administradores y los moderadores del NAS en el que está */
const canFix = it => {
  if (canManage()) return true;
  const p = (it?.type === 'movie' ? it.path : it?.episodes?.[0]?.path) || '';
  return (S.me?.mod || []).some(r => p.startsWith(r.replace(/\/+$/, '') + '/'));
};
/** Descargas con el aMule del servidor: sólo administradores, y si el servidor tiene aMule configurado */
const emuleOn = () => !!S.me?.downloads && isAdmin();
/** Botón «Buscar en aMule»: con la ficha, para que al terminar se renombre y se coloque sin preguntar */
const emuleFindAttrs = (q, alt, entry) => `data-action="emule-find" data-q="${esc(q)}" data-alt="${esc(alt || '')}"${entry?.tmdb ? ` data-entry="${esc(JSON.stringify({ tmdb: entry.tmdb, type: entry.type, title: entry.title, year: entry.year || null }))}"` : ''}`;

/** Quién soy en CineLocal Server (web, o escritorio conectado al servidor): rol, peticiones y botones de administrador */
async function refreshMe() {
  S.me = WEB ? await window.api.me() : await window.api.remote.me().catch(() => null);
  // los administradores tienen Peticiones (y Usuarios, Registro y Descargas) dentro de Administración
  $('#navRequests').classList.toggle('hidden', !hasRequests() || isAdmin());
  $('#navAdmin').classList.toggle('hidden', !adminOn());
  loadNotifs();
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
  const ab = $('#adminBadge');
  if (ab) { ab.textContent = S.requests.pending || ''; ab.classList.toggle('hidden', !S.requests.pending || !isAdmin()); }
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
  return `<div class="page requests">${admin ? adminHead('requests') : `<h1 class="page-title">Peticiones${pending.length ? `<span class="count">${pending.length}</span>` : ''}</h1>`}
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
      ? `${emuleOn() ? `<button class="btn btn-ghost btn-sm" ${emuleFindAttrs(r.title, '', r)}>${I.download}Buscar en aMule</button>` : ''}
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
  'collection-create': 'Colección creada', 'collection-update': 'Colección cambiada', 'collection-delete': 'Colección borrada',
  'request-create': 'Petición', 'request-cancel': 'Petición cancelada', 'request-resolve': 'Petición resuelta', 'request-remove': 'Petición borrada',
  settings: 'Ajustes', scan: 'Escaneo', 'meta-refresh': 'Buscar fichas', identify: 'Ficha corregida', poster: 'Carátula cambiada',
  'download-download': 'Descarga en aMule', 'download-cancel': 'Descarga cancelada', 'download-place': 'Descarga colocada', 'download-dismiss': 'Descarga quitada',
  'user-access': 'Acceso de usuario', 'folder-access': 'Carpeta privada', 'announce-create': 'Aviso enviado', 'announce-delete': 'Aviso borrado', 'announce-clear': 'Avisos borrados', error: 'Error', 'client-error': 'Error en la app'
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
function paintAccess() {
  const box = $('#accessList'); if (box) box.innerHTML = accessListHTML();
  const b = $('[data-action="access-refresh"]'); if (b) b.disabled = S.access.busy;
}

function viewAccess() {
  const a = S.access;
  const users = [...new Set([...a.users, a.user].filter(Boolean))];
  return `<div class="page access">${adminHead('access', `<button class="btn btn-ghost btn-sm" data-action="access-refresh" ${a.busy ? 'disabled' : ''}>${I.restart}Refrescar</button>`)}
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

// ---------------------------------------------------------------- administración
/**
 * Administración (sólo administradores): Peticiones, Usuarios, Registro y Descargas son pestañas de una sola sección,
 * para no llenar la barra de arriba
 */
const ADMIN_ROUTES = ['requests', 'users', 'user', 'announce', 'access', 'downloads'];
function adminTabList() {
  return [
    hasRequests() && ['requests', 'Peticiones', S.requests.pending],
    hasRequests() && window.api.users && ['users', 'Usuarios'],
    hasRequests() && window.api.announcements && ['announce', 'Avisos'],
    hasRequests() && window.api.accessLog && ['access', 'Registro'],
    emuleOn() && ['downloads', 'Descargas', activeDownloads().length]
  ].filter(Boolean);
}
const adminOn = () => isAdmin() && adminTabList().length > 0;
function adminHead(on, extra = '') {
  return `<div class="coll-head"><h1 class="page-title">Administración</h1>${extra}</div>
    <div class="list-tabs page-tabs">${adminTabList().map(([k, l, n]) => `<button class="gchip ${on === k ? 'on' : ''}" data-nav="${k}">${l}${n ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
}

// ---------- usuarios: quién entra y qué puede ver cada uno
const ROLE_NAME = { admin: 'Administrador', user: 'Usuario' };
const titlesLabel = n => `${n} ${n === 1 ? 'título' : 'títulos'}`;
function accessSummary(x) {
  if (x.role === 'admin') return 'Ve todo';
  if (x.blocked) return 'Sin acceso';
  if (x.mode === 'except') return `Todo menos ${titlesLabel(x.count)}`;
  if (x.mode === 'only') return `Sólo ${titlesLabel(x.count)}`;
  return 'Ve todo';
}
const seenText = x => x.online ? 'Conectado ahora' : x.seenAt ? 'Visto ' + ago(x.seenAt) : 'Sin actividad reciente';

async function loadUsers() {
  try { Object.assign(S.users, await window.api.users.list(), { error: null }); }
  catch (e) { S.users.error = errText(e); }
  if (S.route.name === 'users') render(true);
}

function viewUsers() {
  const u = S.users, g = u.groups;
  const row = x => {
    const admin = x.role === 'admin';
    const pill = x.blocked && !admin ? 'bad' : !admin && x.mode !== 'all' ? 'warn' : 'ok';
    return `<button class="user-row" ${admin ? 'disabled title="A los administradores no se les puede limitar"' : `data-user-open="${esc(x.name)}"`}>
      <span class="user-av">${esc(x.name[0].toUpperCase())}</span>
      <span class="user-main"><span class="user-name">${esc(x.name)}</span><span class="user-sub ${x.online ? 'on' : ''}">${seenText(x)}</span></span>
      ${x.mod?.length && !admin ? `<span class="status-pill" title="Puede corregir coincidencias">Moderador · ${esc(x.mod.map(k => (u.sources || []).find(s => s.key === k)?.label || k).join(', '))}</span>` : ''}
      <span class="status-pill">${x.role ? ROLE_NAME[x.role] : 'Fuera de los grupos'}</span>
      <span class="status-pill ${pill}">${accessSummary(x)}</span>
      <span class="user-go">${admin ? '' : I.right}</span>
    </button>`;
  };
  const body = u.error ? `<p class="filmo-note" style="padding-left:0;color:#f87171">${esc(u.error)}</p>`
    : !u.users ? '<p class="filmo-note" style="padding-left:0">Cargando…</p>'
    : `<div class="user-list">${u.users.map(row).join('')}</div>`;
  const people = (u.users || []).filter(x => x.role !== 'admin').map(x => x.name);
  const priv = u.folders || [];
  const folders = !u.users ? '' : `<h2 class="coll-sec">Carpetas privadas <span class="count">${priv.length || ''}</span></h2>
    <p class="coll-hint" style="margin:0 0 12px">Lo que hay dentro (también lo que se añada después) sólo lo ven los usuarios que marques y los administradores.</p>
    ${priv.length ? `<div class="ann-list">${priv.map(f => `<div class="ann-row">
      <span class="np">${I.folder}</span>
      <div class="ann-row-main"><b>${esc(f.label)}</b>
        <div class="ann-to"><span>La ven</span>${people.length ? people.map(n => `<button class="gchip ${f.users.includes(n) ? 'on' : ''}" data-folder-user="${esc(n)}" data-folder="${esc(f.path)}">${esc(n)}</button>`).join('') : '<small>sólo los administradores</small>'}</div></div>
      <button class="icon-btn sm" title="Que deje de ser privada" data-folder-del="${esc(f.path)}">${I.close}</button></div>`).join('')}</div>` : ''}
    <div class="uacc-add" style="margin-top:12px">
      <input class="input" id="folderNew" list="folderChoices" placeholder="Carpeta que hacer privada (por ejemplo /media/Peticiones)" spellcheck="false" style="min-width:min(420px,100%)">
      <datalist id="folderChoices">${(u.folderChoices || []).filter(c => !priv.some(f => f.path === c.path)).map(c => `<option value="${esc(c.path)}">${esc(c.label)}</option>`).join('')}</datalist>
      <button class="btn btn-ghost btn-sm" data-action="folder-add">Hacer privada</button>
    </div>`;
  return `<div class="page users">${adminHead('users')}
    <p class="req-intro">Quién puede entrar y qué puede ver cada uno. Por defecto, todos ven toda la biblioteca; a los administradores no se les puede limitar.${g ? ` Para dar de alta a alguien o hacerlo administrador, añádelo en DSM al grupo «${esc(g.user)}» o «${esc(g.admin)}».` : ''}</p>
    ${body}${folders}</div>`;
}

async function setFolder(q, ok) {
  try {
    S.users.folders = (await window.api.users.folders(q)).folders;
    if (ok) toast(ok, 'ok');
    render(true);
  } catch (e) { toast(errText(e), 'error'); }
}

async function loadUser(name) {
  try {
    const r = await window.api.users.get(name);
    if (r.sources) S.users.sources = r.sources;
    if (r.privateFolders) S.users.privateFolders = r.privateFolders;
    S.userEdit = { ...r, items: [...r.items], mod: [...(r.mod || [])], folders: [...(r.folders || [])], q: '' };
    S.userEdit.saved = userSnap(S.userEdit);
  } catch (e) { S.userEdit = { name, error: errText(e) }; }
  if (S.route.name === 'user') render(true);
}
const userSnap = e => JSON.stringify([e.mode, e.items, e.blocked, e.mod, [...(e.folders || [])].sort()]);
const userDirty = e => userSnap(e) !== e.saved;

const ACCESS_MODES = [
  ['all', 'Todo', 'Toda la biblioteca, también lo que se añada.'],
  ['except', 'Todo menos…', 'Toda la biblioteca salvo lo que elijas. Lo que se añada, lo verá.'],
  ['only', 'Sólo…', 'Únicamente lo que elijas. Lo que se añada no lo verá hasta que se lo añadas.']
];
function viewUser(name) {
  const e = S.userEdit?.name === name ? S.userEdit : null;
  const backBtn = `<button class="btn btn-ghost btn-sm saga-back" data-action="back">${I.left}Volver</button>`;
  if (!e) return `<div class="page">${backBtn}<p class="filmo-note" style="padding-left:0">Cargando…</p></div>`;
  if (e.error) return `<div class="page">${backBtn}<p class="filmo-note" style="padding-left:0;color:#f87171">${esc(e.error)}</p></div>`;
  const chosen = new Set(e.items);
  const q = normName(e.q || '');
  const found = q.length >= 2 ? S.lib.items.filter(i => !chosen.has(i.id) && (normName(T(i)).includes(q) || normName(i.title).includes(q))).slice(0, 40) : [];
  const mini = (it, on) => `<div class="coll-pick">
      <div class="art">${posterOf(it) ? `<img loading="lazy" src="${esc(posterOf(it))}" alt="">` : placeholder(it)}</div>
      <div class="t">${esc(T(it))}${Y(it) ? ` <span>${Y(it)}</span>` : ''}</div>
      ${on ? `<button class="btn btn-ghost btn-sm" data-uacc-remove="${esc(it.id)}">${I.close}Quitar</button>`
        : `<button class="btn btn-ghost btn-sm" data-uacc-add="${esc(it.id)}">${I.plus}Añadir</button>`}
    </div>`;
  const picks = e.items.map(byId).filter(Boolean);
  const except = e.mode === 'except';
  const opts = list => list.map(c => `<option value="${esc(c.id)}">${esc(sagaName(c))} (${c.films.length})</option>`).join('');
  const choose = e.mode === 'all' ? '' : `
    <h2 class="coll-sec">${except ? 'No puede ver' : 'Puede ver'} <span class="count">${picks.length}</span>
      ${picks.length ? '<button class="btn btn-ghost btn-sm uacc-clear" data-action="uacc-clear">Quitar todos</button>' : ''}</h2>
    ${picks.length ? `<div class="coll-picks">${picks.map(it => mini(it, true)).join('')}</div>`
      : `<p class="coll-hint">${except ? 'Todavía no hay nada oculto: añade abajo lo que no deba ver.' : 'Así no verá nada: añade abajo lo que sí pueda ver.'}</p>`}
    <h2 class="coll-sec">Añadir</h2>
    <div class="uacc-add">
      <input class="input coll-search" id="uaccSearch" placeholder="Busca películas o series de la biblioteca" value="${esc(e.q || '')}">
      <select class="input" id="uaccGroup"><option value="">Añadir varios de golpe…</option>
        <option value="type:movie">Todas las películas</option><option value="type:series">Todas las series</option>
        ${customCollections().length ? `<optgroup label="Colecciones">${opts(customCollections())}</optgroup>` : ''}
        ${allSagas().length ? `<optgroup label="Sagas">${opts(allSagas())}</optgroup>` : ''}
      </select>
    </div>
    ${found.length ? `<div class="coll-picks">${found.map(it => mini(it, false)).join('')}</div>` : q.length >= 2 ? '<p class="coll-hint">Nada más en la biblioteca con ese nombre.</p>' : ''}`;
  return `<div class="page user-edit">${backBtn}
    <div class="user-head"><span class="user-av big">${esc(name[0].toUpperCase())}</span>
      <div><h1 class="page-title">${esc(name)}</h1><div class="user-sub">${e.role ? ROLE_NAME[e.role] : 'Fuera de los grupos de CineLocal en DSM'} · ${seenText(e)}</div></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Puede entrar en CineLocal</div>
      <div class="d">Si se lo quitas, se le cierra la sesión en todas sus apps y no podrá volver a entrar hasta que se lo devuelvas.</div></div>
      <div class="ctl"><label class="switch"><input type="checkbox" id="uaccEnter" ${e.blocked ? '' : 'checked'}><span></span></label></div></div>
    ${(S.users.sources || []).length ? `<h2 class="coll-sec">Permisos</h2>
    ${S.users.sources.map(s => `<div class="set-row"><div class="lbl"><div class="t">Moderador de ${esc(s.label)}</div>
      <div class="d">Puede corregir las coincidencias con TMDB de las películas y series de ese NAS.</div></div>
      <div class="ctl"><label class="switch"><input type="checkbox" data-uacc-mod="${esc(s.key)}" ${e.mod?.includes(s.key) ? 'checked' : ''}><span></span></label></div></div>`).join('')}` : ''}
    ${(S.users.privateFolders || []).length ? `<h2 class="coll-sec">Carpetas privadas</h2>
    ${S.users.privateFolders.map(f => `<div class="set-row"><div class="lbl"><div class="t">Puede ver ${esc(f.label)}</div>
      <div class="d">Lo que hay en esa carpeta sólo lo ven los usuarios que la tengan marcada.</div></div>
      <div class="ctl"><label class="switch"><input type="checkbox" data-uacc-folder="${esc(f.path)}" ${e.folders?.includes(f.path) ? 'checked' : ''}><span></span></label></div></div>`).join('')}` : ''}
    <h2 class="coll-sec">Qué puede ver</h2>
    <div class="uacc-modes">${ACCESS_MODES.map(([k, l, d]) => `<button class="uacc-mode ${e.mode === k ? 'on' : ''}" data-uacc-mode="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>
    ${choose}
    <div class="coll-save"><button class="btn btn-ghost" data-action="back">Cancelar</button>
      <button class="btn btn-accent" data-action="uacc-save" ${userDirty(e) ? '' : 'disabled'}>Guardar cambios</button></div>
  </div>`;
}

/** Añade de golpe todas las películas, todas las series o los títulos de una colección o saga */
function addUserAccessGroup(v) {
  const e = S.userEdit;
  if (!e || !v) return;
  const ids = v === 'type:movie' || v === 'type:series' ? S.lib.items.filter(i => i.type === v.slice(5)).map(i => i.id)
    : (collById(v)?.films || []).map(f => f.id);
  const before = e.items.length;
  e.items = [...new Set([...e.items, ...ids])];
  const n = e.items.length - before;
  toast(n ? `${titlesLabel(n)} ${n === 1 ? 'añadido' : 'añadidos'}` : 'Ya estaban todos', n ? 'ok' : 'info');
  render(true);
}

async function saveUserAccess() {
  const e = S.userEdit;
  if (!e) return;
  try {
    // con «Todo» la selección se queda guardada en el servidor, por si se vuelve a limitar
    const r = await window.api.users.set({ name: e.name, mode: e.mode, items: e.items, blocked: e.blocked, mod: e.mod, folders: e.folders });
    S.userEdit = { ...e, ...r, items: [...r.items], mod: [...(r.mod || [])], folders: [...(r.folders || [])] };
    S.userEdit.saved = userSnap(S.userEdit);
    toast(`${e.name}: ${r.blocked ? 'sin acceso' : accessSummary({ ...r, count: r.items.length }).toLowerCase()}`, 'ok');
    render(true);
  } catch (err) { toast(errText(err), 'error'); }
}

// ---------- avisos: recomendar una película o serie, una colección o mandar un mensaje
const ANN_KINDS = [['title', 'Recomendar un título'], ['collection', 'Recomendar una colección'], ['message', 'Mensaje']];
const annBlank = () => ({ kind: 'title', target: null, q: '', coll: '', title: '', text: '', popup: true, to: [] });

async function loadAnnouncements() {
  try { S.ann.items = (await window.api.announcements.list()).items; S.ann.error = null; }
  catch (e) { S.ann.error = errText(e); }
  if (!S.users.users) await window.api.users.list().then(r => Object.assign(S.users, r)).catch(() => {});
  if (S.route.name === 'announce') paintCollectionEdit();
}

/** El aviso tal y como se mandará (para la vista previa y para enviarlo) */
function annPayload() {
  const e = S.annEdit;
  const q = { op: 'create', kind: e.kind, text: e.text.trim(), popup: e.popup, to: e.to };
  if (e.kind === 'title') q.target = e.target;
  if (e.kind === 'collection') {
    const c = collById(e.coll);
    if (c) Object.assign(q, { target: String(c.id), name: sagaName(c), items: c.films.map(f => f.id) });
  }
  if (e.kind === 'message') q.title = e.title.trim();
  return q;
}
const annReady = () => { const q = annPayload(); return q.kind === 'title' ? !!q.target : q.kind === 'collection' ? !!q.items?.length : !!q.title; };

function viewAnnounce() {
  const e = S.annEdit || (S.annEdit = annBlank());
  const a = S.ann;
  const users = (S.users.users || []).map(u => u.name);
  let pick = '';
  if (e.kind === 'title') {
    const it = e.target && byId(e.target);
    const q = normName(e.q || '');
    const found = !it && q.length >= 2 ? S.lib.items.filter(i => normName(T(i)).includes(q) || normName(i.title).includes(q)).slice(0, 12) : [];
    pick = it
      ? `<div class="ann-chosen"><div class="art">${posterOf(it) ? `<img src="${esc(posterOf(it))}" alt="">` : placeholder(it)}</div>
          <div><b>${esc(T(it))}</b><span>${[Y(it), it.type === 'series' ? 'Serie' : 'Película'].filter(Boolean).join(' · ')}</span></div>
          <button class="btn btn-ghost btn-sm" data-ann-pick="">Cambiar</button></div>`
      : `<input class="input coll-search" id="annSearch" placeholder="Busca la película o serie que quieres recomendar" value="${esc(e.q || '')}">
        ${found.length ? `<div class="ann-found">${found.map(i => `<button class="ann-hit" data-ann-pick="${esc(i.id)}">
          <span class="art">${posterOf(i) ? `<img loading="lazy" src="${esc(posterOf(i))}" alt="">` : ''}</span><b>${esc(T(i))}</b><span>${Y(i) || ''}</span></button>`).join('')}</div>`
          : q.length >= 2 ? '<p class="coll-hint">Nada en la biblioteca con ese nombre.</p>' : ''}`;
  } else if (e.kind === 'collection') {
    const opts = list => list.map(c => `<option value="${esc(c.id)}" ${String(c.id) === e.coll ? 'selected' : ''}>${esc(sagaName(c))} (${c.films.length})</option>`).join('');
    pick = `<select class="input" id="annColl"><option value="">Elige una colección o saga…</option>
      ${customCollections().length ? `<optgroup label="Colecciones">${opts(customCollections())}</optgroup>` : ''}
      ${allSagas().length ? `<optgroup label="Sagas">${opts(allSagas())}</optgroup>` : ''}</select>`;
  } else pick = `<input class="input" id="annTitle" maxlength="100" placeholder="Título del aviso (por ejemplo: El servidor se reinicia esta noche)" value="${esc(e.title)}">`;
  const sent = a.items || [];
  const kindName = { title: 'Recomendación', collection: 'Colección', message: 'Mensaje' };
  const sentRow = x => `<div class="ann-row">
      <span class="np">${x.poster ? `<img src="${esc(imgSrc(x.poster))}" alt="" loading="lazy">` : x.kind === 'message' ? I.info : I.film}</span>
      <div class="ann-row-main"><b>${esc(x.title || (x.kind === 'title' ? 'Título que ya no está' : 'Aviso'))}</b>
        ${x.text ? `<span class="ann-row-text">${esc(x.text)}</span>` : ''}
        <small>${kindName[x.kind]} · ${x.to?.length ? 'para ' + esc(x.to.join(', ')) : 'para todos'}${x.popup ? ' · emergente' : ''} · ${ago(x.createdAt)}${x.createdBy ? ' · ' + esc(x.createdBy) : ''}</small></div>
      <button class="icon-btn sm" title="Borrar el aviso (desaparece de la campana de todos)" data-ann-del="${esc(x.id)}">${I.close}</button></div>`;
  return `<div class="page announce">${adminHead('announce')}
    <p class="req-intro">Recomienda una película, una serie o una colección, o manda un mensaje. Llega a la campana de quien elijas y, si lo marcas, sale como aviso emergente al abrir la app (una sola vez). Quien no pueda ver ese título no lo recibe.</p>
    <div class="ann-form">
      <div class="list-tabs">${ANN_KINDS.map(([k, l]) => `<button class="gchip ${e.kind === k ? 'on' : ''}" data-ann-kind="${k}">${l}</button>`).join('')}</div>
      ${pick}
      <textarea class="input" id="annText" maxlength="600" rows="3" placeholder="${e.kind === 'message' ? 'El mensaje' : 'Por qué la recomiendas (opcional)'}">${esc(e.text)}</textarea>
      <div class="ann-to"><span>Para</span>
        <button class="gchip ${e.to.length ? '' : 'on'}" data-ann-to="">Todos</button>
        ${users.map(u => `<button class="gchip ${e.to.includes(u) ? 'on' : ''}" data-ann-to="${esc(u)}">${esc(u)}</button>`).join('')}</div>
      <label class="ann-popup"><label class="switch"><input type="checkbox" id="annPopup" ${e.popup ? 'checked' : ''}><span></span></label>
        <span><b>Aviso emergente</b><small>Además de en la campana, le sale en grande al abrir la app.</small></span></label>
      <div class="ann-btns"><button class="btn btn-ghost btn-sm" data-action="ann-preview" ${annReady() ? '' : 'disabled'}>Vista previa</button>
        <button class="btn btn-accent btn-sm" data-action="ann-send" ${annReady() ? '' : 'disabled'}>Enviar</button></div>
    </div>
    <h2 class="coll-sec">Enviados <span class="count">${sent.length}</span>
      ${sent.length ? '<button class="btn btn-ghost btn-sm uacc-clear" data-action="ann-clear">Borrar todos</button>' : ''}</h2>
    ${a.error ? `<p class="coll-hint" style="color:#f87171">${esc(a.error)}</p>` : !a.items ? '<p class="coll-hint">Cargando…</p>'
      : sent.length ? `<div class="ann-list">${sent.map(sentRow).join('')}</div>` : '<p class="coll-hint">Todavía no has mandado ningún aviso.</p>'}
  </div>`;
}

/** Vista previa: el aviso emergente tal y como lo verán */
function previewAnnouncement() {
  const q = annPayload();
  const n = { kind: 'admin', sub: q.kind, id: 'preview', target: q.target, at: Date.now(), text: q.text, by: S.me?.user || null,
    title: q.kind === 'collection' ? q.name : q.title, items: q.items };
  const entry = newsEntry(n);
  if (entry) showNews([{ ...entry, open: null, openLabel: null }]);
}

async function sendAnnouncement() {
  if (!annReady()) return;
  const q = annPayload();
  const who = q.to.length ? q.to.join(', ') : 'todos';
  if (!await confirmModal('Enviar aviso', `Les llegará a ${who}${q.popup ? ', también como aviso emergente' : ''}.`, 'Enviar')) return;
  try {
    await window.api.announcements.op(q);
    toast('Aviso enviado', 'ok');
    S.annEdit = annBlank();
    loadAnnouncements();
  } catch (err) { toast(errText(err), 'error'); }
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
    <b>Metadatos</b><span>${it.meta ? `TMDB #${m.tmdbId}${canFix(it) ? ` · <button class="link-btn" data-action="identify" data-id="${it.id}">Corregir coincidencia</button>` : ''}`
      : `${it.metaFailed ? 'No se encontró en TMDB' : 'Sin metadatos'}${canFix(it) ? ` · <button class="link-btn" data-action="identify" data-id="${it.id}">Identificar manualmente</button>` : ''}`}</span>
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
          ${it.type === 'movie' ? downloadLink(it.id, it.size, 'round-btn') : ''}
          ${m.trailer ? `<button class="round-btn" title="Ver tráiler" data-action="trailer" data-url="${esc(m.trailer)}">${I.yt}</button>` : ''}
          <div class="menu-wrap">
            <button class="round-btn" title="Más opciones" data-action="menu">${I.more}</button>
            <div class="menu hidden" id="detailMenu">
              <button data-action="mark-all" data-id="${it.id}" data-watched="${watchedAll ? 0 : 1}">${watchedAll ? I.restart : I.eye}${watchedAll ? 'Marcar como no visto' : 'Marcar como visto'}</button>
              ${canFix(it) ? `<button data-action="identify" data-id="${it.id}">${I.tag}Corregir coincidencia</button>` : ''}
              ${canManage() ? `<button data-action="poster" data-id="${it.id}">${I.image}Cambiar carátula</button>` : ''}
              ${emuleOn() ? `<button ${emuleFindAttrs(T(it), m.originalTitle, m.tmdbId && { tmdb: m.tmdbId, type: it.type, title: T(it), year: m.year })}>${I.download}Buscar en aMule</button>` : ''}
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
          <button class="round-btn ${inWatchlist(e.key) ? 'on' : ''}" title="${inWatchlist(e.key) ? 'Quitar de la Watchlist' : 'Añadir a la Watchlist'}" data-action="wl-toggle" data-entry="${esc(JSON.stringify(e))}">${inWatchlist(e.key) ? I.bookmarkOn : I.bookmark}</button>
          <button class="round-btn ${saved ? 'on' : ''}" title="Guardar en una lista" data-action="lists-pick" data-entry="${esc(JSON.stringify(e))}">${saved ? I.check : I.plus}</button>
          ${m.trailer ? `<button class="round-btn" title="Ver tráiler" data-action="trailer" data-url="${esc(m.trailer)}">${I.yt}</button>` : ''}
          ${emuleOn() ? `<button class="round-btn" title="Buscar en aMule" ${emuleFindAttrs(m.title, m.originalTitle, e)}>${I.download}</button>` : ''}
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
        <div class="side">${downloadLink(e.id, e.size, 'check-btn')}<button class="check-btn ${epSeen(it, e) ? 'on' : ''}" title="${epSeen(it, e) ? 'Marcar como no visto' : 'Marcar como visto'}" data-action="mark" data-id="${it.id}" data-ep="${e.id}" data-watched="${epSeen(it, e) ? 0 : 1}">${I.check}</button></div>
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
      <div class="set-row"><div class="lbl"><div class="t">${LOCAL() ? 'Idioma de los metadatos' : 'Idioma por defecto de las fichas'}</div><div class="d">${LOCAL() ? 'Títulos, sinopsis y nombres de episodios.' : 'Para los usuarios que no han elegido el suyo.'}</div></div>
        <div class="ctl"><select class="select" data-set="metaLang">${opt(META_LANGS, s.metaLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Volver a descargar todos los metadatos</div><div class="d">Útil si cambias de idioma o TMDB ha actualizado información. Se conservan las correcciones manuales.</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="refresh-meta">Actualizar</button></div></div>
    </div>

    <div class="set-group"><h3>Discord para todos</h3>
      ${discordAdminHTML(s)}
    </div>` : ''}

    ${LOCAL() ? '' : `<div class="set-group"><h3>Idioma</h3>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de las fichas</div><div class="d">Títulos, sinopsis y nombres de episodios. Sólo cambia para ti.</div></div>
        <div class="ctl"><select class="select" data-set="userMetaLang">${opt([['', 'El de por defecto'], ...META_LANGS], s.userMetaLang || '')}</select></div></div>
    </div>`}

    <div class="set-group"><h3>Audio y subtítulos</h3>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de audio preferido</div><div class="d">Se selecciona automáticamente si el archivo tiene esa pista; si no, se usa la pista por defecto.</div></div>
        <div class="ctl"><select class="select" data-set="audioLang">${opt(AUDIO_LANGS, s.audioLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de subtítulos preferido</div><div class="d">Incluye subtítulos internos y archivos .srt/.ass junto al vídeo.</div></div>
        <div class="ctl"><select class="select" data-set="subLang">${opt(SUB_LANGS, s.subLang)}</select></div></div>
      <div class="set-row ${s.subLang === 'none' ? 'hidden' : ''}"><div class="lbl"><div class="t">Mostrar subtítulos</div><div class="d">“Sólo si el audio está en otro idioma” evita subtítulos en español cuando ya escuchas en español.</div></div>
        <div class="ctl"><select class="select" data-set="subMode">${opt([['always', 'Siempre'], ['foreign', 'Sólo si el audio está en otro idioma'], ['off', 'Nunca (activables durante la reproducción)']], s.subMode)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Reproducir el siguiente episodio automáticamente</div></div><div class="ctl">${sw('autoplayNext', s.autoplayNext)}</div></div>
      ${!WEB && !S.lib.mpv ? `<div class="set-row"><div class="lbl"><div class="t">Reproductor mpv</div>
        <div class="d">No se encuentra. <a data-action="mpv-help">Cómo instalarlo</a></div></div>
        <div class="ctl"><span class="status-pill bad">No encontrado</span><button class="btn btn-ghost btn-sm" data-action="pick-mpv">Seleccionar mpv.exe</button></div></div>` : ''}
    </div>

    <div class="set-group" id="letterboxd"><h3>Letterboxd</h3>
      ${letterboxdSettingsHTML(s, sw)}
    </div>

    ${emuleOn() ? `<div class="set-group"><h3>Descargas (aMule)</h3>
      ${downloadsSettingsHTML()}
    </div>` : ''}

    ${!WEB && window.api.platform === 'win32' ? `<div class="set-group" id="discord"><h3>Discord</h3>
      ${discordSettingsHTML(s, sw)}
    </div>` : ''}

    ${WEB ? '' : `<div class="set-group" id="updates"><h3>Actualizaciones</h3>
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
      <div class="d">Opcional: un usuario del NAS con permiso de lectura en esas carpetas, sin depender de las credenciales guardadas en el Explorador de Windows. Vacío = la sesión que tenga Windows. La contraseña se guarda cifrada con tu cuenta de Windows.</div></div>
      <div class="ctl">
        <input class="input" data-lnas="user" value="${esc(s.nasUser)}" placeholder="Usuario del NAS" spellcheck="false">
        <input class="input" type="password" data-lnas="password" placeholder="${s.nasHasPassword ? 'Contraseña guardada' : 'Contraseña'}">
        <button class="btn btn-ghost btn-sm" data-action="nas-login">Conectar</button>
      </div>
      <div class="nas-status" id="nasStatus">${nasStatePill()}</div></div>`;
}

// ---------------------------------------------------------------- descargas (aMule en el NAS)
const DL_STATES = {
  downloading: 'Descargando', waiting: 'En espera', stalled: 'Sin fuentes', paused: 'En pausa', stopped: 'Detenida',
  complete: 'Completada', completing: 'Completando…', hashing: 'Comprobando…', error: 'Error'
};
const EMULE_ERRORS = {
  offline: ['aMule no responde', 'Comprueba en el NAS que el contenedor «amule» está en marcha (Container Manager).'],
  auth: ['aMule ha rechazado la contraseña', 'AMULE_PASSWORD de server/.env tiene que ser la contraseña de la interfaz web de aMule (WEBUI_PWD).'],
  unconfigured: ['aMule no está configurado en el servidor', 'Falta AMULE_URL o AMULE_PASSWORD en server/.env.']
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

/** Lo que pide atención: descargas en curso y las terminadas que esperan a que se elija dónde van */
function activeDownloads() { return [...(S.emule.snap.downloads || []).filter(d => d.state !== 'complete'), ...(S.emule.snap.pending || [])]; }

function emuleStatusHTML() {
  const sn = S.emule.snap;
  if (!sn.ok) {
    const [t, d] = EMULE_ERRORS[sn.code] || ['No se puede conectar con aMule', sn.error || ''];
    return `<div class="banner"><div class="txt"><b>${esc(t)}.</b> ${esc(d)}</div></div>`;
  }
  const st = sn.status;
  const srv = S.emule.srv;
  const server = { high: ['ok', 'ID alta'], low: ['warn', 'ID baja'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.server];
  const kad = { ok: ['ok', 'Abierto'], firewalled: ['warn', 'Tras cortafuegos'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.kad];
  const busy = (k) => srv.busy === k ? ' disabled' : '';
  const n = srv.list?.length;
  return `<div class="dl-status">
    <span><small>Servidor</small><span class="status-pill ${server[0]}">${server[1]}</span>${(st.server === 'high' || st.server === 'low') && st.serverName ? `<em title="${esc(st.serverName)}">${esc(st.serverName)}</em>` : ''}</span>
    <span><small>Kad</small><span class="status-pill ${kad[0]}">${kad[1]}</span>${st.kad !== 'off' && st.kadContacts ? `<em>${st.kadContacts} contactos</em>` : ''}</span>
    <span><small>Bajada</small><b>${fmtRate(st.down) || '0 KB/s'}</b></span>
    <span><small>Subida</small><b>${fmtRate(st.up) || '0 KB/s'}</b></span>
    <span class="dl-conn-btns">
      ${st.server === 'off'
        ? `<button class="btn btn-accent btn-sm" data-action="emule-srv-any"${busy('srv')}>Conectar</button>`
        : `<button class="btn btn-ghost btn-sm" data-action="emule-srv-off"${busy('srv')}>${st.server === 'connecting' ? 'Cancelar' : 'Desconectar'}</button>`}
      ${st.kad === 'off'
        ? `<button class="btn btn-accent btn-sm" data-action="emule-kad" data-op="connect"${busy('kad')}>Conectar Kad</button>`
        : `<button class="btn btn-ghost btn-sm" data-action="emule-kad" data-op="disconnect"${busy('kad')}>Desconectar Kad</button>`}
      <button class="btn btn-ghost btn-sm srv-toggle${srvOpen() ? ' on' : ''}" data-action="emule-srv-toggle" aria-expanded="${srvOpen()}">Servidores${n ? `<span class="srv-n">${n}</span>` : ''}${I.right}</button>
    </span>
  </div>`;
}

// ---- conexión: lista de servidores y Kad
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

function serversBodyHTML() {
  const srv = S.emule.srv;
  if (srv.error) return `<p class="dl-empty err">${esc(srv.error)}</p>`;
  if (!srv.list) return '<div class="srv-empty"><div class="spinner"></div>Cargando la lista de servidores de aMule…</div>';
  if (!srv.list.length) return `<div class="srv-empty">aMule no tiene servidores en su lista. Añade los de un <b>server.met</b> aquí abajo o conéctate sólo a Kad.</div>`;
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
    ${st.server === 'connecting' ? '<p class="srv-note"><span class="spinner sm"></span>aMule está probando servidores. Si tarda, elige uno de la lista o pulsa Cancelar.</p>' : ''}`;
}

function serversPanelHTML() {
  const kadIdle = S.emule.snap.status?.kad === 'off' || S.emule.snap.status?.kad === 'connecting';
  return `<div class="srv-panel${S.emule.snap.ok && srvOpen() ? '' : ' hidden'}" id="dlServers">
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
  $('#dlServers').classList.toggle('hidden', !(S.emule.snap.ok && srvOpen()));
  $('#dlSrvBody').innerHTML = serversBodyHTML();
  const st = S.emule.snap.status;
  $('#kadBoot').classList.toggle('hidden', !(st && (st.kad === 'off' || st.kad === 'connecting')));
}

/** Aplica la respuesta de servers/connectServer/disconnect/updateServerMet */
function setServers(r) {
  const srv = S.emule.srv;
  srv.at = Date.now();
  srv.error = null;
  srv.list = r.servers;
  srv.kad = r.kad;
}

/** Se pide al abrir Descargas y, con la lista visible, cada 5 s como mucho (al ritmo del sondeo del servidor) */
async function loadServers(force = false) {
  const srv = S.emule.srv;
  if (S.route.name !== 'downloads' || !emuleOn() || !S.emule.snap.ok || document.hidden) return;
  if (!force && !srvOpen() && srv.list) return;
  if (srv.loading || (!force && Date.now() - srv.at < 5000)) return;
  srv.loading = true;
  try { setServers(await window.api.emule.call('servers')); }
  catch (e) { srv.error = errText(e); srv.at = Date.now(); }
  finally { srv.loading = false; }
  paintServers();
  if ($('#dlStatus')) $('#dlStatus').innerHTML = emuleStatusHTML();
}

function downloadRow(d) {
  const pc = Math.floor(d.progress * 1000) / 10;
  const active = !['complete', 'completing', 'hashing', 'error'].includes(d.state);
  const paused = d.state === 'paused' || d.state === 'stopped';
  const sub = [
    `<b class="st-${esc(d.state)}">${DL_STATES[d.state] || esc(d.state)}</b>`,
    d.state === 'complete' ? fmtSize(d.size) : `${pc.toFixed(1)}% · ${d.done ? fmtSize(d.done) : '0 MB'} de ${fmtSize(d.size)}`,
    fmtRate(d.speed),
    active && !paused ? `${d.sources} de ${d.sourcesTotal} ${d.sourcesTotal === 1 ? 'fuente' : 'fuentes'}` : '',
    fmtEta(d) ? `quedan ${fmtEta(d)}` : ''
  ].filter(Boolean).join('<i class="dot"></i>');
  return `<div class="dl ${esc(d.state)}">
    <div class="dl-main">
      <div class="dl-name" title="${esc(d.name)}">${esc(d.name)}</div>
      <div class="dl-bar"><i style="width:${pc}%"></i></div>
      <div class="dl-sub">${sub}</div>
      ${d.target ? `<div class="dl-target" title="Al terminar">${I.right}${esc(d.target)}</div>` : ''}
    </div>
    <div class="dl-actions">
      ${active ? (paused
        ? `<button class="round-btn sm" title="Reanudar" data-action="dl-op" data-op="resume" data-hash="${d.hash}">${I.play}</button>`
        : `<button class="round-btn sm" title="Pausar" data-action="dl-op" data-op="pause" data-hash="${d.hash}">${I.pause}</button>`) : ''}
      ${d.link ? `<button class="round-btn sm" title="Copiar enlace ed2k" data-action="dl-copy" data-link="${esc(d.link)}">${I.link}</button>` : ''}
      ${active ? `<button class="round-btn sm" title="Cancelar descarga" data-action="dl-cancel" data-hash="${d.hash}" data-name="${esc(d.name)}">${I.close}</button>` : ''}
    </div>
  </div>`;
}

function downloadsListHTML() {
  if (!S.emule.snap.ok) return '';
  // las completadas sólo se ven un momento: el servidor las coloca y las quita de aMule
  const list = [...(S.emule.snap.downloads || [])].sort((a, b) => (a.state === 'complete') - (b.state === 'complete'));
  if (!list.length) return '<p class="dl-empty">No hay descargas en aMule. Busca arriba o pega un enlace ed2k.</p>';
  return list.map(downloadRow).join('');
}

/** Terminadas que no se han podido colocar solas: se elige la ficha y la carpeta */
function pendingHTML() {
  const list = S.emule.snap.pending || [];
  if (!list.length) return '';
  return `<h2 class="section-title">Pendientes de colocar</h2>
    <div class="dl-list">${list.map(p => `<div class="dl pending">
      <div class="dl-main">
        <div class="dl-name" title="${esc(p.name)}">${esc(p.name)}</div>
        <div class="dl-sub"><b class="st-error">${esc(p.reason)}</b><i class="dot"></i>${fmtSize(p.size)}${p.suggestion ? `<i class="dot"></i>¿${esc(p.suggestion.title)}${p.suggestion.year ? ` (${p.suggestion.year})` : ''}?` : ''}</div>
      </div>
      <div class="dl-actions">
        <button class="btn btn-accent btn-sm" data-action="dl-place" data-hash="${p.hash}">Colocar</button>
        <button class="round-btn sm" title="Quitar de la lista (el archivo se queda en la carpeta de descargas de aMule)" data-action="dl-dismiss" data-hash="${p.hash}" data-name="${esc(p.name)}">${I.close}</button>
      </div>
    </div>`).join('')}</div>`;
}

function placedHTML() {
  const list = S.emule.snap.placed || [];
  if (!list.length) return '';
  return `<h2 class="section-title">Colocadas en la biblioteca <button class="link-btn" data-action="dl-clear-placed">Vaciar</button></h2>
    <div class="dl-list">${list.map(p => `<div class="dl placed">
      <div class="dl-main">
        <div class="dl-name" title="${esc(p.dest)}">${I.check}${esc(p.dest)}</div>
        <div class="dl-sub">${esc(p.name)}<i class="dot"></i>${new Date(p.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</div>
      </div>
    </div>`).join('')}</div>`;
}

function searchResultsHTML() {
  const s = S.emule.search;
  if (s.error) return `<p class="dl-empty err">${esc(s.error)}</p>`;
  if (!s.run || s.hidden) return '';
  const inList = new Set((S.emule.snap.downloads || []).map(d => d.hash));
  const res = [...s.results].sort((a, b) => b.sources - a.sources);
  const head = `<div class="dl-res-head">${s.busy ? '<div class="spinner"></div>' : ''}
    <span>${res.length ? `${res.length} resultados` : s.busy ? 'Buscando en la red eD2k…' : 'Sin resultados. Prueba con menos palabras o con el título original.'}</span>
    ${s.entry ? `<small>Para: ${esc(s.entry.title)}${s.entry.year ? ` (${s.entry.year})` : ''}</small>` : ''}
    ${s.message && !s.busy ? `<small>${esc(s.message)}</small>` : ''}
    <span class="spacer"></span>${s.alt && !s.busy ? `<button class="btn btn-ghost btn-sm" data-action="emule-alt">${I.search}Buscar «${esc(s.alt)}»</button>` : ''}
    ${res.length || !s.busy ? '<button class="link-btn" data-action="dl-clear-results">Cerrar</button>' : ''}</div>`;
  return head + (res.length ? `<div class="dl-results">${res.slice(0, 200).map(r => {
    return `<div class="dl-res">
      <div class="dl-res-main"><div class="dl-name" title="${esc(r.name)}">${esc(r.name)}</div>
        <div class="dl-sub">${fmtSize(r.size)}<i class="dot"></i>${r.sources} ${r.sources === 1 ? 'fuente' : 'fuentes'}${r.complete ? ` (${r.complete} ${r.complete === 1 ? 'completa' : 'completas'})` : ''}
        ${releaseTags(r.name).map(t => `<span class="badge">${t}</span>`).join('')}</div></div>
      ${inList.has(r.hash) ? '<span class="status-pill ok">En descargas</span>'
        : `<button class="btn btn-ghost btn-sm" data-action="dl-get" data-hash="${r.hash}" data-name="${esc(r.name)}">${I.download}Descargar</button>`}
    </div>`;
  }).join('')}</div>` : '');
}

function viewDownloads() {
  const s = S.emule.search;
  const method = S.emule.method;
  return `<div class="page downloads">
    ${adminHead('downloads')}
    <div id="dlStatus">${emuleStatusHTML()}</div>
    ${serversPanelHTML()}
    <form class="dl-search" id="dlSearch">
      <div class="search big">${I.search}<input name="q" value="${esc(s.query)}" placeholder="Buscar en aMule: título, año, calidad…" spellcheck="false" autocomplete="off"></div>
      <select class="select" name="method" title="Dónde buscar">
        <option value="global" ${method === 'global' ? 'selected' : ''}>Servidores</option>
        <option value="kademlia" ${method === 'kademlia' ? 'selected' : ''}>Kad</option>
      </select>
      <button class="btn btn-primary btn-sm">Buscar</button>
    </form>
    <div id="dlResults">${searchResultsHTML()}</div>
    <div id="dlPending">${pendingHTML()}</div>
    <h2 class="section-title">En aMule</h2>
    <div class="dl-list" id="dlList">${downloadsListHTML()}</div>
    <form class="dl-link" id="dlLink">
      <input class="input" name="link" placeholder="Pega un enlace ed2k://|file|…" spellcheck="false" autocomplete="off">
      <button class="btn btn-ghost btn-sm">Añadir</button>
    </form>
    <div id="dlPlaced">${placedHTML()}</div>
  </div>`;
}

/** Actualiza sólo las partes vivas, sin tocar el buscador (foco, texto) */
function paintEmule() {
  const n = activeDownloads().length;
  $('#navAdmin').classList.toggle('hidden', !adminOn());
  const tab = $('[data-nav="downloads"] .n') || null;
  if (tab) tab.textContent = n || '';
  if (S.route.name === 'downloads') {
    $('#dlStatus').innerHTML = emuleStatusHTML();
    $('#dlList').innerHTML = downloadsListHTML();
    $('#dlPending').innerHTML = pendingHTML();
    $('#dlPlaced').innerHTML = placedHTML();
    if (!S.emule.snap.ok) S.emule.srv.list = S.emule.srv.kad = null;   // aMule parado: no enseñar datos viejos
    paintServers();
    loadServers();
  }
  if (S.route.name === 'settings' && $('#emuleState')) $('#emuleState').innerHTML = emuleStatePill();
}
function paintResults() { if (S.route.name === 'downloads') $('#dlResults').innerHTML = searchResultsHTML(); }

/**
 * alt: otra forma de buscar lo mismo (p. ej. el título original), ofrecida con un clic en los resultados.
 * entry: la ficha del título que se busca (desde su página): al descargar, ya se sabe qué es
 */
async function emuleSearch(query, alt, entry = null) {
  query = query.trim();
  if (!query) return;
  alt = alt && normName(alt) !== normName(query) ? alt.trim() : null;
  const s = S.emule.search = { query, alt, entry, results: [], message: '', busy: true, error: null, run: S.emule.search.run + 1 };
  const input = $('#dlSearch')?.q;
  if (input && input.value !== query) input.value = query;
  const run = s.run;
  paintResults();
  try {
    let r = await window.api.emule.call('search', { query, method: S.emule.method });
    // aMule va recibiendo resultados: consultar hasta que termine (o dejen de llegar)
    for (let i = 0; i < 30 && run === S.emule.search.run && !r.done; i++) {
      s.results = r.results; s.message = r.message;
      paintResults();
      await new Promise(res => setTimeout(res, 2500));
      if (run !== S.emule.search.run) return;
      r = await window.api.emule.call('results');
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

/**
 * Dónde y como qué va una descarga. mode «download»: antes de empezar (ficha opcional: sin ella se identifica por el
 * nombre al terminar) · «place»: una pendiente (ficha obligatoria). Devuelve { entry, dest } o null si se cancela.
 */
function placeDialog({ mode, name, entry = null, dest = '' }) {
  return new Promise(resolve => {
    const st = { entry, dest, browse: dest || '', auto: !dest, searching: !entry && mode === 'place' };
    const guess = parseNameLite(name);
    const m = modal(`<div class="modal-head"><h2>${mode === 'place' ? 'Colocar en la biblioteca' : 'Descargar'}</h2><p class="pl-file">${esc(name)}</p></div>
      <div class="pl-sec"><h3>Título</h3><div id="plEntry"></div>
        <form class="modal-search hidden" id="plForm">
          <input class="input" name="q" value="${esc(entry?.title || guess.title)}" placeholder="Título">
          <input class="input year" name="y" value="${esc(entry?.year || guess.year || '')}" placeholder="Año">
          <select class="select" name="t"><option value="movie">Película</option><option value="series" ${(entry?.type || guess.type) === 'series' ? 'selected' : ''}>Serie</option></select>
          <button class="btn btn-primary btn-sm">Buscar</button>
        </form>
        <div class="modal-list pl-list hidden" id="plList"></div>
        <div class="pl-ep hidden" id="plEp"><label>Temporada <input class="input" name="season" inputmode="numeric" value="${guess.season ?? ''}"></label>
          <label>Episodio <input class="input" name="episode" inputmode="numeric" value="${guess.episode ?? ''}"></label></div>
      </div>
      <div class="pl-sec"><h3>Carpeta</h3>
        <label class="pl-radio"><input type="radio" name="plDest" value="auto" ${st.auto ? 'checked' : ''}> Automática <small>películas a «Películas»; episodios a la carpeta de su serie</small></label>
        <label class="pl-radio"><input type="radio" name="plDest" value="pick" ${st.auto ? '' : 'checked'}> Elegir carpeta</label>
        <div class="pl-browser hidden" id="plBrowser"></div>
      </div>
      <div class="modal-foot" style="gap:10px"><button class="btn btn-ghost btn-sm" data-r="0">Cancelar</button>
        <button class="btn btn-accent btn-sm" data-r="1">${mode === 'place' ? 'Colocar' : `${I.download}Descargar`}</button></div>`);
    const form = $('#plForm', m), list = $('#plList', m), ep = $('#plEp', m), browser = $('#plBrowser', m);
    const paintEntry = () => {
      const e = st.entry;
      $('#plEntry', m).innerHTML = e
        ? `<div class="pl-chosen"><span><b>${esc(e.title)}</b>${e.year ? ` (${e.year})` : ''} · ${e.type === 'series' ? 'Serie' : 'Película'}</span><button class="link-btn" data-act="change">Cambiar</button>${mode === 'download' ? '<button class="link-btn" data-act="clear">Sin ficha</button>' : ''}</div>`
        : `<div class="pl-chosen"><span>${mode === 'place' ? 'Elige la ficha:' : 'Sin ficha: al terminar se identificará por el nombre del archivo (si no es seguro, quedará pendiente).'}</span>${st.searching ? '' : '<button class="link-btn" data-act="change">Elegir ficha</button>'}</div>`;
      form.classList.toggle('hidden', !st.searching);
      list.classList.toggle('hidden', !st.searching);
      // la temporada y el episodio sólo hacen falta al colocar una serie a mano
      ep.classList.toggle('hidden', !(mode === 'place' && (st.entry?.type || form.t.value) === 'series'));
    };
    const search = async () => {
      list.innerHTML = '<p class="pl-msg">Buscando…</p>';
      try {
        const type = form.t.value;
        const res = await window.api.searchMeta({ type, query: form.q.value.trim(), year: form.y.value.trim() || null });
        list.innerHTML = res.length ? res.slice(0, 12).map(r => `<div class="result" data-tmdb="${r.id}" data-type="${type}" data-title="${esc(r.title)}" data-year="${esc(r.year || '')}">
          <div class="p">${r.poster ? `<img src="${esc(r.poster)}" alt="">` : ''}</div>
          <div><div class="t">${esc(r.title)}<small>${r.year || ''}${r.originalTitle && r.originalTitle !== r.title ? ' · ' + esc(r.originalTitle) : ''}</small></div>
          <div class="o">${esc(r.overview || '')}</div></div></div>`).join('') : '<p class="pl-msg">Sin resultados. Prueba con el título original.</p>';
      } catch (e) { list.innerHTML = `<p class="pl-msg err">${esc(errText(e))}</p>`; }
    };
    const browse = async (dir) => {
      browser.innerHTML = '<p class="pl-msg">Cargando…</p>';
      try {
        const r = await window.api.emule.folders(dir);
        st.browse = r.path;
        const parts = r.path ? r.path.split('/') : [];
        const crumbs = [`<button class="link-btn" data-dir="">${esc(r.root)}</button>`, ...parts.map((p, i) => `<button class="link-btn" data-dir="${esc(parts.slice(0, i + 1).join('/'))}">${esc(p)}</button>`)].join(' / ');
        browser.innerHTML = `<div class="pl-crumbs">${crumbs}</div>
          <div class="pl-dirs">${r.dirs.map(d => `<button class="pl-dir" data-dir="${esc(r.path ? r.path + '/' + d : d)}">${I.right}${esc(d)}</button>`).join('') || '<p class="pl-msg">Sin subcarpetas</p>'}</div>
          <div class="pl-here">Irá a: <b>${esc([r.root, ...parts].join(' / '))}</b></div>`;
      } catch (e) { browser.innerHTML = `<p class="pl-msg err">${esc(errText(e))}</p>`; }
    };
    const paintDest = () => {
      browser.classList.toggle('hidden', st.auto);
      if (!st.auto && !browser.innerHTML) browse(st.browse);
    };
    form.addEventListener('submit', e => { e.preventDefault(); search(); });
    form.t.addEventListener('change', paintEntry);
    m.addEventListener('change', e => { if (e.target.name === 'plDest') { st.auto = e.target.value === 'auto'; paintDest(); } });
    m.addEventListener('click', async e => {
      const t = e.target;
      const act = t.closest('[data-act]')?.dataset.act;
      if (act === 'change') { st.searching = true; paintEntry(); search(); return; }
      if (act === 'clear') { st.entry = null; st.searching = false; paintEntry(); return; }
      const r = t.closest('.result[data-tmdb]');
      if (r) {
        st.entry = { tmdb: +r.dataset.tmdb, type: r.dataset.type, title: r.dataset.title, year: +r.dataset.year || null };
        st.searching = false;
        paintEntry();
        return;
      }
      const dir = t.closest('[data-dir]');
      if (dir) { browse(dir.dataset.dir); return; }
      const b = t.closest('[data-r]');
      if (!b) return;
      if (b.dataset.r === '0') { closeModal(); return resolve(null); }
      if (mode === 'place' && !st.entry) return toast('Elige la ficha del título', 'error');
      const out = { entry: st.entry ? { ...st.entry } : null, dest: st.auto ? '' : st.browse };
      if (mode === 'place' && st.entry.type === 'series') {
        const season = $('[name="season"]', m).value.trim(), episode = $('[name="episode"]', m).value.trim();
        if (season || episode) Object.assign(out.entry, { season: +season, episode: +episode });
      }
      closeModal();
      resolve(out);
    });
    paintEntry();
    paintDest();
    if (st.searching) search();
  });
}

/** Lo justo para rellenar el buscador del diálogo con el nombre del archivo */
function parseNameLite(name) {
  let s = String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ');
  const ep = /S(\d{1,2})\s*E(\d{1,3})|(?:^|\D)(\d{1,2})x(\d{2,3})(?:\D|$)/i.exec(s);
  if (ep) s = s.slice(0, ep.index);
  const y = /\b(19\d{2}|20\d{2})\b/.exec(s);
  if (y) s = s.slice(0, y.index);
  s = s.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').replace(/[\s-]+$/, '').trim();
  return { title: s, year: y ? +y[1] : null, type: ep ? 'series' : 'movie', season: ep ? +(ep[1] || ep[3]) : null, episode: ep ? +(ep[2] || ep[4]) : null };
}

function emuleStatePill() {
  const sn = S.emule.snap;
  if (sn.ok) {
    const id = sn.status?.server === 'high' ? 'ID alta' : sn.status?.server === 'low' ? 'ID baja' : 'sin servidor';
    return `<span class="status-pill ${sn.status?.server === 'high' ? 'ok' : 'warn'}">Conectado con aMule · ${id}</span>`;
  }
  return `<span class="status-pill bad">${esc((EMULE_ERRORS[sn.code] || [sn.error || 'Sin conexión'])[0])}</span>`;
}

function downloadsSettingsHTML() {
  const low = S.emule.snap.ok && S.emule.snap.status?.server === 'low';
  return `<div class="set-row"><div class="lbl"><div class="t">aMule en el NAS</div>
      <div class="d">Busca y descarga desde <b>Descargas</b>. Al terminar, cada vídeo se renombra con su título en inglés de TMDB
      («Title (Year)», «Show (Year) 1x01 Episode») y se mueve a la carpeta que elegiste o, en automático, a «Películas» o a la de su serie.
      Lo que no se pueda identificar con seguridad queda en Descargas, pendiente de colocar.</div></div>
      <div class="ctl"><span id="emuleState">${emuleStatePill()}</span></div></div>
    ${low ? `<div class="set-row"><div class="lbl"><div class="t">ID baja</div>
      <div class="d">Las descargas irán más lentas. Para tener ID alta, abre en el router hacia el NAS el puerto <b>4662 TCP</b> y el <b>4672 UDP</b>.</div></div></div>` : ''}`;
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
  return `${WEB ? `<div class="set-row"><div class="lbl"><div class="t">Tu Letterboxd en CineLocal</div>
      <div class="d">Películas vistas, notas, “me gusta” y watchlist. Se sincroniza solo desde la app de escritorio (con tu usuario de Letterboxd); aquí también puedes subir la exportación .zip.</div></div></div>`
    : `<div class="set-row"><div class="lbl"><div class="t">Usuario de Letterboxd</div>
      <div class="d">Se lee tu perfil público: películas vistas, tus notas, los “me gusta” y la watchlist. Al abrir CineLocal se añade lo último que hayas visto.</div></div>
      <div class="ctl"><input class="input" data-set-text="lbUser" value="${esc(s.lbUser || '')}" placeholder="tu_usuario" spellcheck="false" style="min-width:200px">
      <button class="btn btn-ghost btn-sm" data-action="lb-sync" ${s.lbUser && !S.lb.status?.running ? '' : 'disabled'}>Sincronizar ahora</button></div></div>`}
    <div class="set-row"><div class="lbl"><div class="t">Marcar como vistas las que has visto en Letterboxd</div>
      <div class="d">Las películas de la biblioteca que tienes vistas en Letterboxd se marcan como vistas en CineLocal (en tu usuario), sin tocar las que tienen progreso. Si desmarcas una, no se vuelve a marcar.</div></div>
      <div class="ctl">${sw('lbMarkWatched', s.lbMarkWatched !== false)}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Estado</div><div class="d" id="lbStatus">${lbStatusHTML()}</div></div>
      <div class="ctl">${S.lb.syncedAt ? '<button class="btn btn-ghost btn-sm" data-action="lb-clear">Borrar datos</button>' : ''}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Importar la exportación de Letterboxd</div>
      <div class="d">${WEB ? 'En' : 'Alternativa si la lectura del perfil falla: en'} Letterboxd, <a data-url="https://letterboxd.com/settings/data/">Settings → Data → Export your data</a>, y elige aquí el .zip descargado.</div></div>
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
  if (!s.discordClientId) return `<div class="set-row"><div class="lbl"><div class="t">Mostrar en Discord lo que estoy viendo</div>
      <div class="d">Un administrador tiene que configurar antes la aplicación de Discord en sus Ajustes.</div></div></div>`;
  return `<div class="set-row"><div class="lbl"><div class="t">Mostrar en Discord lo que estoy viendo</div>
      <div class="d">Mientras reproduces, tu perfil de Discord muestra «Viendo CineLocal» con el título, el póster y el tiempo que queda. Discord tiene que estar abierto en este PC.</div></div>
      <div class="ctl">${sw('discordEnabled', s.discordEnabled)}</div></div>
    ${s.discordEnabled ? `<div class="set-row"><div class="lbl"><div class="t">Estado</div><div class="d" id="discordStatus">${discordStatusHTML()}</div></div></div>` : ''}`;
}
/** Administradores: la aplicación de Discord con la que se muestra a todos lo que ven */
function discordAdminHTML(s) {
  return `<div class="set-row"><div class="lbl"><div class="t">ID de la aplicación de Discord</div>
      <div class="d">Para que cada usuario pueda mostrar en Discord lo que ve (lo activa en sus Ajustes de la app de escritorio). Crea una aplicación llamada «CineLocal» en <a data-url="https://discord.com/developers/applications">discord.com/developers/applications</a> y copia aquí su <i>Application ID</i>.</div></div>
      <div class="ctl"><input class="input" data-discord-id value="${esc(s.discordClientId || '')}" placeholder="123456789012345678" inputmode="numeric" spellcheck="false" style="min-width:220px">
      ${WEB ? '' : '<button class="btn btn-ghost btn-sm" data-action="discord-test">Probar</button>'}</div></div>
    ${WEB ? '' : `<div class="set-row"><div class="lbl"><div class="t">Prueba</div><div class="d" id="discordStatus">${discordStatusHTML()}</div></div></div>`}`;
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
    case 'available': return u.manual
      ? `<span class="status-pill warn">CineLocal ${v} disponible</span> · esta instalación no puede actualizarse sola: descárgala desde GitHub e instálala encima`
      : u.mode === 'portable'
      ? `<span class="status-pill warn">CineLocal ${v} disponible</span> · la versión portable no se actualiza sola: descárgala desde GitHub`
      : `<span class="status-pill"><span class="spinner sm"></span>CineLocal ${v} disponible · preparando la descarga…</span>`;
    case 'downloading': return `<span class="status-pill"><span class="spinner sm"></span>Descargando CineLocal ${v} · ${u.percent || 0} %</span>
      <div class="upd-bar"><i style="width:${u.percent || 0}%"></i></div>`;
    case 'downloaded': return `<span class="status-pill ok">CineLocal ${v} lista</span> · se instalará al cerrar CineLocal`;
    case 'error': return `<span class="status-pill bad">${esc(u.error || 'No se pudo comprobar')}</span>${when}`;
    default: return S.settings.autoUpdate !== false ? 'Se comprueba al abrir CineLocal.' : 'Aún no se ha comprobado.';
  }
}
/** La versión nueva hay que descargarla a mano: portable, o instalación que no puede actualizarse sola */
const updManual = (u) => u.mode === 'portable' || !!u.manual;
function updInfoHTML() {
  const u = S.update;
  const busy = u.state === 'checking' || u.state === 'disabled' || (['available', 'downloading'].includes(u.state) && !updManual(u));
  const ctl = u.state === 'downloaded' ? '<button class="btn btn-primary btn-sm" data-action="upd-install">Reiniciar ahora</button>'
    : u.state === 'available' && updManual(u) ? `<button class="btn btn-accent btn-sm" data-action="upd-open">Descargar</button>`
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
  const show = (u.state === 'downloaded' || (u.state === 'available' && updManual(u))) && S.updDismissed !== u.version;
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
    case 'users': html = viewUsers(); break;
    case 'announce': html = viewAnnounce(); break;
    case 'user': html = viewUser(r.id); break;
    case 'title': html = viewTitle(r.type, r.id); break;
    case 'collections': html = viewCollections(); break;
    case 'sagas': html = viewSagas(); break;
    case 'collection': html = viewCollection(r.id); break;
    case 'collection-edit': html = S.collEdit ? viewCollectionEdit() : viewCollections(); break;
    default: html = viewHome();
  }
  view.innerHTML = html;
  // Directores es una pestaña de Películas, y Sagas y cada colección, de Colecciones
  // y Peticiones, Usuarios, Registro y Descargas, de Administración
  const section = ADMIN_ROUTES.includes(r.name) && adminOn() ? 'admin'
    : { directors: 'movies', director: 'movies', sagas: 'collections', collection: 'collections', 'collection-edit': 'collections' }[r.name] || r.name;
  if (section === 'admin' && r.name !== 'user') S.adminTab = r.name;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === section));
  if (r.name === 'director') loadPerson(r.id);
  if (r.name === 'detail') ensureFull(r.id);
  if (r.name === 'downloads') loadServers(true);
  if (r.name === 'access' && !keepScroll) loadAccess();
  if (r.name === 'users' && !keepScroll) loadUsers();
  if (r.name === 'announce' && !keepScroll) loadAnnouncements();
  if (r.name === 'user' && S.userEdit?.name !== r.id) loadUser(r.id);
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
  if (S.route.name === 'search') { S.query = S.route.q || ''; $('#searchInput').value = S.query; }
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
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 7000 : onClick ? 6000 : 3000);
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
  if (key === 'userMetaLang' || key === 'metaLang') { setLib(await window.api.getLibrary()); render(true); }
  if (key === 'subLang' || key === 'playerMode' || key === 'region') render(true);
  if (key === 'lbUser') { setLb(await window.api.letterboxd.get()); paintLbStatus(); }
}

async function scanNow() {
  toast('Escaneando la biblioteca…');
  setLib(await window.api.scan());
  render(true);
  toast(`Biblioteca actualizada: ${S.lib.items.length} títulos`, 'ok');
}

// ---------------------------------------------------------------- eventos
async function emuleAction(a, el) {
  const d = el.dataset;
  const call = (action, q) => window.api.emule.call(action, q);
  try {
    if (a === 'emule-srv-any' || a === 'emule-srv-connect' || a === 'emule-srv-off') {
      S.emule.srv.busy = 'srv'; paintEmule();
      try { setServers(await (a === 'emule-srv-off' ? call('disconnect') : call('connectServer', { ip: d.ip, port: d.port }))); }
      finally { S.emule.srv.busy = null; }
      toast(a === 'emule-srv-off' ? 'Desconectado del servidor' : a === 'emule-srv-any' ? 'Conectando al primer servidor disponible…' : `Conectando a ${d.name}…`);
      paintEmule();
    } else if (a === 'emule-kad') {
      S.emule.srv.busy = 'kad'; paintEmule();
      try { const r = await call('kad', { op: d.op }); if (r.kad) S.emule.srv.kad = r.kad; }
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
    } else if (a === 'emule-find') {
      $('#detailMenu')?.classList.add('hidden');
      closeModal();
      S.emule.search.query = d.q;
      go('downloads');
      emuleSearch(d.q, d.alt, d.entry ? JSON.parse(d.entry) : null);
    } else if (a === 'emule-alt') {
      const { alt, query, entry } = S.emule.search;
      if (alt) emuleSearch(alt, query, entry);
    } else if (a === 'dl-get') {
      const plan = await placeDialog({ mode: 'download', name: d.name, entry: S.emule.search.entry });
      if (!plan) return;
      el.disabled = true;
      await call('download', { hash: d.hash, ...plan });
      toast('Añadido a las descargas de aMule', 'ok');
      paintResults();
    } else if (a === 'dl-op') await call('op', { hash: d.hash, op: d.op });
    else if (a === 'dl-cancel') {
      if (await confirmModal('¿Cancelar la descarga?', d.name + ' — se borrará lo descargado hasta ahora.', 'Cancelar descarga')) await call('op', { hash: d.hash, op: 'cancel', name: d.name });
    } else if (a === 'dl-copy') { await window.api.copy(d.link); toast('Enlace ed2k copiado', 'ok'); }
    else if (a === 'dl-place') {
      const p = (S.emule.snap.pending || []).find(x => x.hash === d.hash);
      if (!p) return;
      const plan = await placeDialog({ mode: 'place', name: p.name, entry: p.suggestion, dest: p.dest });
      if (!plan) return;
      const r = await call('place', { hash: p.hash, name: p.name, ...plan });
      toast(`Colocada en la biblioteca: ${r.dest}`, 'ok');
    } else if (a === 'dl-dismiss') {
      if (await confirmModal('¿Quitar de la lista?', d.name + ' — el archivo no se borra: se queda en la carpeta de descargas de aMule (@amule/incoming).', 'Quitar')) await call('dismiss', { hash: d.hash, name: d.name });
    } else if (a === 'dl-clear-placed') await call('clearPlaced');
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
  if (f.id === 'dlSearch') {
    e.preventDefault();
    S.emule.method = f.method.value;
    // una búsqueda escrita a mano ya no es la del título desde el que se llegó
    emuleSearch(f.q.value, null, normName(f.q.value) === normName(S.emule.search.query) ? S.emule.search.entry : null);
  }
  else if (f.id === 'srvMet' || f.id === 'kadBoot') {
    e.preventDefault();
    const btn = $('button', f);
    btn.disabled = true;
    try {
      if (f.id === 'srvMet') {
        const r = await window.api.emule.call('updateServerMet', { url: f.url.value.trim() });
        setServers(r);
        f.url.value = '';
        toast(r.message || 'Lista de servidores actualizada', 'ok');
      } else {
        const m = /^\s*([^\s:]+):(\d+)\s*$/.exec(f.addr.value);
        if (!m) throw new Error('Escribe la IP y el puerto del nodo, p. ej. 1.2.3.4:4672');
        const r = await window.api.emule.call('kad', { op: 'bootstrap', ip: m[1], port: +m[2] });
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
    const link = f.link.value.trim();
    const name = /\|file\|([^|]+)\|/.exec(link)?.[1];
    if (!name) return toast('Eso no parece un enlace ed2k de archivo', 'error');
    let shown = name;
    try { shown = decodeURIComponent(name); } catch {}
    try {
      const plan = await placeDialog({ mode: 'download', name: shown });
      if (!plan) return;
      await window.api.emule.call('download', { link, ...plan });
      f.link.value = '';
      toast('Añadido a las descargas de aMule', 'ok');
    } catch (err) { toast(errText(err), 'error'); }
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target;
  // descargar el vídeo: lo hace el navegador; que no cuente como clic en el episodio (reproducirlo)
  if (t.closest('a.dl-file')) return;

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
    // Administración: la última pestaña que se abrió
    if (route === 'admin') { const tabs = adminTabList().map(x => x[0]); go(tabs.includes(S.adminTab) ? S.adminTab : tabs[0]); return; }
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
    else if (a === 'coll-new') openCollectionEditor(null);
    else if (a === 'coll-edit') openCollectionEditor(action.dataset.id);
    else if (a === 'coll-save') saveCollection();
    else if (a === 'access-refresh') loadAccess();
    else if (a === 'folder-add') {
      const p = $('#folderNew')?.value.trim();
      if (p) setFolder({ path: p, users: [] }, 'Carpeta privada: de momento sólo la ven los administradores');
    }
    else if (a === 'ann-preview') previewAnnouncement();
    else if (a === 'ann-send') sendAnnouncement();
    else if (a === 'ann-clear') {
      if (await confirmModal('Borrar todos los avisos', 'Desaparecen de la campana de todos. No se puede deshacer.', 'Borrar todos')) {
        await window.api.announcements.op({ op: 'clear' }).catch(err => toast(errText(err), 'error'));
        loadAnnouncements();
      }
    }
    else if (a === 'uacc-save') saveUserAccess();
    else if (a === 'uacc-clear' && S.userEdit) { S.userEdit.items = []; render(true); }
    else if (a === 'coll-delete') {
      const c = customCollections().find(x => x.id === action.dataset.id);
      if (c && await confirmModal('Borrar colección', `Se borrará «${c.name}» para todos. Las películas y series siguen en la biblioteca.`, 'Borrar')) {
        try { await window.api.collections.op({ op: 'delete', id: c.id }); setLib(await window.api.getLibrary()); back(); toast('Colección borrada', 'ok'); }
        catch (err) { toast(String(err.message || err), 'error'); }
      }
    }
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
    else if (a === 'test-key') {
      const key = $('[data-set-text="tmdbKey"]').value.trim();
      const st = $('#keyStatus');
      st.innerHTML = '<span class="status-pill">Probando…</span>';
      const r = await window.api.testKey(key);
      st.innerHTML = r.ok ? '<span class="status-pill ok">Clave válida</span>' : `<span class="status-pill bad">${esc(r.error)}</span>`;
      if (r.ok && key !== S.settings.tmdbKey) { await saveSetting('tmdbKey', key); S.lib.hasKey = true; }
    } else if (a === 'refresh-meta') { await window.api.refreshMeta(); toast('Actualizando metadatos…'); }
    else if (a === 'lb-sync') {
      const r = await window.api.letterboxd.sync(true);
      if (r.ok) toast('Letterboxd sincronizado', 'ok'); else toast(r.error, 'error');
    } else if (a === 'lb-import') {
      const r = await window.api.letterboxd.importZip();
      if (r.started) toast('Exportación subida: se está emparejando con TMDB; puede tardar unos minutos');
      else if (r.ok) toast('Exportación de Letterboxd importada', 'ok'); else if (!r.canceled) toast(r.error, 'error');
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
    else if (a.startsWith('emule-') || a.startsWith('dl-')) emuleAction(a, action);
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


  const ds = t.closest('[data-dir-sort]');
  if (ds) { S.filters.directors.sort = ds.dataset.dirSort; render(); return; }

  const open = t.closest('[data-open]');
  if (open) { go('detail', { id: open.dataset.open }); return; }
  const tt = t.closest('[data-title-id]');
  if (tt) { go('title', { type: tt.dataset.titleType, id: +tt.dataset.titleId }); return; }

  const dot = t.closest('[data-hero-dot]');
  if (dot) { setHero(+dot.dataset.heroDot); startHeroTimer(); return; }

  const sg = t.closest('[data-coll]');
  if (sg) { go('collection', { id: sg.dataset.coll }); return; }
  // editor de colecciones
  const cu = t.closest('[data-coll-upload]');
  if (cu && S.collEdit) { pickCollectionImage(cu.dataset.collUpload); return; }
  const ci = t.closest('[data-coll-img]');
  if (ci && S.collEdit) { S.collEdit[ci.dataset.collImg] = ci.dataset.img; paintCollectionEdit(); return; }
  // avisos: tipo, título, destinatarios y borrar uno enviado
  const ak = t.closest('[data-ann-kind]');
  if (ak && S.annEdit) { S.annEdit.kind = ak.dataset.annKind; render(true); return; }
  const ap = t.closest('[data-ann-pick]');
  if (ap && S.annEdit) { S.annEdit.target = ap.dataset.annPick || null; S.annEdit.q = ''; render(true); return; }
  const at2 = t.closest('[data-ann-to]');
  if (at2 && S.annEdit) {
    const u = at2.dataset.annTo, e = S.annEdit;
    e.to = !u ? [] : e.to.includes(u) ? e.to.filter(x => x !== u) : [...e.to, u];
    render(true);
    return;
  }
  const ad = t.closest('[data-ann-del]');
  if (ad) {
    window.api.announcements.op({ op: 'delete', id: ad.dataset.annDel }).then(() => { toast('Aviso borrado', 'ok'); loadAnnouncements(); }).catch(err => toast(errText(err), 'error'));
    return;
  }
  const fu = t.closest('[data-folder-user]');
  if (fu) {
    const f = (S.users.folders || []).find(x => x.path === fu.dataset.folder), n = fu.dataset.folderUser;
    if (f) setFolder({ path: f.path, users: f.users.includes(n) ? f.users.filter(x => x !== n) : [...f.users, n] });
    return;
  }
  const fd = t.closest('[data-folder-del]');
  if (fd) {
    const f = (S.users.folders || []).find(x => x.path === fd.dataset.folderDel);
    if (f && await confirmModal('Dejar de ser privada', `Todos podrán ver lo que hay en ${f.label}.`, 'Hacerla pública')) setFolder({ path: f.path, remove: true }, 'La carpeta ya es pública');
    return;
  }
  // usuarios: abrir uno, qué puede ver y la lista de títulos
  const uo = t.closest('[data-user-open]');
  if (uo) { S.userEdit = null; go('user', { id: uo.dataset.userOpen }); return; }
  const um = t.closest('[data-uacc-mode]');
  if (um && S.userEdit) { S.userEdit.mode = um.dataset.uaccMode; render(true); return; }
  const ua = t.closest('[data-uacc-add], [data-uacc-remove]');
  if (ua && S.userEdit) {
    const e = S.userEdit;
    if (ua.dataset.uaccAdd) e.items.push(ua.dataset.uaccAdd);
    else e.items = e.items.filter(id => id !== ua.dataset.uaccRemove);
    paintCollectionEdit();
    return;
  }
  const ca = t.closest('[data-coll-add], [data-coll-remove], [data-coll-move]');
  if (ca && S.collEdit) {
    const e = S.collEdit;
    if (ca.dataset.collAdd) e.items.push(ca.dataset.collAdd);
    else if (ca.dataset.collRemove) e.items = e.items.filter(id => id !== ca.dataset.collRemove);
    else { const [i, d] = ca.dataset.collMove.split(':').map(Number); const j = i + d; if (j >= 0 && j < e.items.length) [e.items[i], e.items[j]] = [e.items[j], e.items[i]]; }
    paintCollectionEdit();
    return;
  }
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
    if (el?.classList.contains('card') || el?.dataset?.director) el.click();
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
  if (e.target.id === 'uaccGroup') { addUserAccessGroup(e.target.value); return; }
  if (e.target.id === 'annColl' && S.annEdit) { S.annEdit.coll = e.target.value; render(true); return; }
  if (e.target.id === 'annPopup' && S.annEdit) { S.annEdit.popup = e.target.checked; return; }
  if (e.target.dataset.uaccFolder && S.userEdit) {
    const k = e.target.dataset.uaccFolder, f = S.userEdit.folders || [];
    S.userEdit.folders = e.target.checked ? [...new Set([...f, k])] : f.filter(x => x !== k);
    const b = $('[data-action="uacc-save"]'); if (b) b.disabled = !userDirty(S.userEdit);
    return;
  }
  if (e.target.dataset.uaccMod && S.userEdit) {
    const k = e.target.dataset.uaccMod, m = S.userEdit.mod || [];
    S.userEdit.mod = e.target.checked ? [...new Set([...m, k])] : m.filter(x => x !== k);
    const b = $('[data-action="uacc-save"]'); if (b) b.disabled = !userDirty(S.userEdit);
    return;
  }
  if (e.target.id === 'uaccEnter' && S.userEdit) { S.userEdit.blocked = !e.target.checked; const b = $('[data-action="uacc-save"]'); if (b) b.disabled = !userDirty(S.userEdit); return; }
  if (e.target.id === 'accessDays') { S.access.days = +e.target.value; loadAccess(); }
});
let collTimer = null;
document.addEventListener('input', (e) => {
  if (S.collEdit && ['collName', 'collDesc', 'collSearch'].includes(e.target.id)) {
    const k = { collName: 'name', collDesc: 'description', collSearch: 'q' }[e.target.id];
    S.collEdit[k] = e.target.value;
    // el nombre y la descripción no cambian nada más que el botón; la búsqueda, los resultados
    if (k === 'q') { clearTimeout(collTimer); collTimer = setTimeout(paintCollectionEdit, 150); }
    else { const b = $('[data-action="coll-save"]'); if (b) b.disabled = S.collEdit.items.length < 2 || !S.collEdit.name.trim(); }
    return;
  }
  if (e.target.id === 'annSearch' && S.annEdit) { S.annEdit.q = e.target.value; clearTimeout(collTimer); collTimer = setTimeout(paintCollectionEdit, 150); return; }
  if ((e.target.id === 'annTitle' || e.target.id === 'annText') && S.annEdit) {
    S.annEdit[e.target.id === 'annTitle' ? 'title' : 'text'] = e.target.value;
    $$('[data-action="ann-preview"], [data-action="ann-send"]').forEach(b => { b.disabled = !annReady(); });
    return;
  }
  if (e.target.id === 'uaccSearch' && S.userEdit) { S.userEdit.q = e.target.value; clearTimeout(collTimer); collTimer = setTimeout(paintCollectionEdit, 150); return; }
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
      S.route = { name: 'search', q: S.query };   // al volver desde una ficha se recupera la búsqueda
      render();
    } else if (S.route.name === 'search') back();
  }, 180);
});

$('#view').addEventListener('scroll', onScroll, { passive: true });
// menú de arriba en una ventana estrecha: la rueda lo desplaza de lado
$('#nav').addEventListener('wheel', e => {
  const n = e.currentTarget;
  if (n.scrollWidth <= n.clientWidth || !e.deltaY) return;
  n.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });
// difuminado en el lado por el que quedan más secciones
const navEdges = () => {
  const n = $('#nav');
  n.classList.toggle('more-left', n.scrollLeft > 2);
  n.classList.toggle('more-right', n.scrollLeft + n.clientWidth < n.scrollWidth - 2);
};
$('#nav').addEventListener('scroll', navEdges, { passive: true });
new ResizeObserver(navEdges).observe($('#nav'));

// ---------------------------------------------------------------- campana de notificaciones
// Peticiones propias resueltas y novedades de la biblioteca (30 días); el punto, si hay algo desde la última vez
const NOTIF = { items: [], seenAt: 0, shownSeen: 0, open: false };
let notifTimer = null;
function loadNotifs() {
  clearTimeout(notifTimer);
  notifTimer = setTimeout(async () => {
    const r = await window.api.notifications?.get().catch(() => null);
    if (!r) return;
    NOTIF.items = r.items || [];
    NOTIF.seenAt = r.seenAt || 0;
    paintNotifs();
  }, 400);
}
const ago = ts => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};
function notifText(n) {
  const name = `«${n.title}»${n.year ? ` (${n.year})` : ''}`;
  if (n.kind === 'request') return n.status === 'done' ? `Ya puedes ver ${name}, que pediste` : `Tu petición de ${name} se ha rechazado${n.reply ? ': ' + n.reply : ''}`;
  if (n.kind === 'collection') return `Nueva colección: «${n.title}»`;
  if (n.kind === 'admin') {
    const by = n.by ? `${n.by} ` : '';
    if (n.sub === 'title') return `${by ? by + 'te recomienda' : 'Recomendación:'} ${name}${n.text ? ': ' + n.text : ''}`;
    if (n.sub === 'collection') return `${by ? by + 'te recomienda la colección' : 'Colección recomendada:'} «${n.title}»${n.text ? ': ' + n.text : ''}`;
    return `${n.title}${n.text ? ': ' + n.text : ''}`;
  }
  if (n.kind === 'watchlist') return `De tu watchlist: ${name} ya está en la biblioteca`;
  return `${n.type === 'series' ? 'Novedades en la biblioteca' : 'Nueva en la biblioteca'}: ${name}`;
}
function paintNotifs() {
  const unread = NOTIF.items.filter(n => n.at > NOTIF.seenAt).length;
  $('#notifDot').classList.toggle('hidden', !unread);
  $('#btnNotif').title = unread ? `Notificaciones · ${unread} sin ver` : 'Notificaciones';
  const p = $('#notifPanel');
  p.classList.toggle('hidden', !NOTIF.open);
  if (!NOTIF.open) return;
  p.innerHTML = `<div class="notif-h">Notificaciones${NOTIF.items.length ? '<button class="notif-clear" data-notif-clear>Borrar todas</button>' : ''}</div>` + (NOTIF.items.length
    ? '<div class="notif-list">' + NOTIF.items.map((n, i) => `<div class="notif-it ${n.at > NOTIF.shownSeen ? 'new' : ''}" data-notif="${i}" role="button" tabindex="0">
        <span class="np">${n.poster ? `<img src="${esc(imgSrc(n.poster))}" alt="" loading="lazy">` : n.kind === 'request' ? I.check : n.kind === 'admin' && n.sub === 'message' ? I.info : I.film}</span>
        <span class="nt"><span>${esc(notifText(n))}</span><small>${ago(n.at)}</small></span>
        <button class="notif-del" title="Borrar" data-notif-del="${i}">${I.close}</button></div>`).join('') + '</div>'
    : '<div class="notif-empty">No hay novedades en los últimos 30 días.</div>');
}
async function toggleNotifs(open = !NOTIF.open) {
  NOTIF.open = open;
  if (open) {
    NOTIF.shownSeen = NOTIF.seenAt;   // lo nuevo se marca mientras el panel está abierto
    paintNotifs();
    const r = await window.api.notifications?.seen().catch(() => null);
    if (r?.seenAt) NOTIF.seenAt = r.seenAt;
  }
  paintNotifs();
}
$('#btnNotif').addEventListener('click', e => { e.stopPropagation(); toggleNotifs(); });
$('#notifPanel').addEventListener('click', e => {
  e.stopPropagation();
  // borrar una o todas: sólo de mi campana
  if (e.target.closest('[data-notif-clear]')) {
    NOTIF.items = [];
    paintNotifs();
    window.api.notifications.dismiss?.({ all: true }).catch(() => {});
    return;
  }
  const del = e.target.closest('[data-notif-del]');
  if (del) {
    const d = NOTIF.items[del.dataset.notifDel];
    NOTIF.items = NOTIF.items.filter(x => x !== d);
    paintNotifs();
    if (d) window.api.notifications.dismiss?.({ key: d.kind + ':' + d.id }).catch(() => {});
    return;
  }
  const n = NOTIF.items[e.target.closest('[data-notif]')?.dataset.notif];
  if (!n) return;
  toggleNotifs(false);
  if (n.kind === 'request') go('requests');
  else if (n.kind === 'collection') go('collection', { id: n.id });
  else if (n.kind === 'admin') {
    if (n.sub === 'title' && byId(n.target)) go('detail', { id: n.target });
    else if (n.sub === 'collection' && collById(n.target)) go('collection', { id: n.target });
    else { const entry = newsEntry(n); if (entry) showNews([entry]); }
  }
  else go('detail', { id: n.id });
});
document.addEventListener('click', () => { if (NOTIF.open) toggleNotifs(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && NOTIF.open) toggleNotifs(false); });

// ---------------------------------------------------------------- eventos del proceso principal
window.api.onLibrary((lib) => {
  setLib(lib);
  loadNotifs();
  // no re-renderizar ajustes ni descargas mientras el usuario escribe
  if (['settings', 'downloads', 'announce', 'user', 'collection-edit'].includes(S.route.name) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  render(true);
  setTimeout(maybeCollectionNews, 1200);
});
window.api.onProgress((p) => { S.lib.progress = p; });
window.api.onPlayerClosed(({ error }) => {
  if (error) toast('mpv se cerró con un error:\n' + error, 'error');
  render(true);
});
window.api.onFullscreen((fs) => document.body.classList.toggle('fullscreen', fs));
window.api.onSessionExpired?.(async (msg) => { S.session = await window.api.session.get(); showLogin(msg); });
window.api.onToast(({ type, text, action }) => toast(text, type, action === 'requests' ? () => go('requests') : action === 'downloads' && emuleOn() ? () => go('downloads') : null));
window.api.onRequests?.((v) => {
  loadNotifs();
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
  setLb(await window.api.letterboxd.get());
  S.update = await window.api.update.status();
  S.discord = await window.api.discord.status();
  await refreshMe();
  if (emuleOn()) S.emule.snap = await window.api.emule.get().catch(() => S.emule.snap);
  render();
  paintUpdToast();
  paintEmule();
  setTimeout(maybeCollectionNews, 2000);   // colecciones nuevas desde la última vez
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
