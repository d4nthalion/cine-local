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

const S = {
  lib: { items: [], progress: {}, favorites: [] },
  settings: {},
  route: { name: 'home' },
  history: [],
  heroIdx: 0,
  heroTimer: null,
  heroList: [],
  filters: { movies: { genre: null, sort: 'added', seen: 'all', open: false }, series: { genre: null, sort: 'added', seen: 'all', open: false }, directors: { sort: 'count', q: '' }, filmo: 'all', filmoSort: 'year', watchlist: 'all' },
  lb: { films: [], status: {} },   // Letterboxd: películas vistas, notas y watchlist
  lbById: new Map(),
  people: {},
  season: {},
  query: '',
  emule: {
    snap: { ok: false, code: 'disabled', downloads: [] },
    info: null,
    search: { query: '', results: [], message: '', busy: false, error: null, run: 0 }
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
const T = (it) => it.meta?.title || it.title;
const Y = (it) => it.meta?.year || it.year;
const prog = (p) => S.lib.progress[p];
const isFav = (id) => S.lib.favorites.includes(id);
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
  const next = eps.slice(idx + 1).find(e => !prog(e.path)?.watched);
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

function allGenres(items) {
  const c = new Map();
  for (const it of items) for (const g of it.meta?.genres || []) c.set(g, (c.get(g) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]);
}

function sortItems(items, sort) {
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

function card(it) {
  const poster = it.meta?.poster;
  const isNew = Date.now() - (it.added || 0) < 14 * DAY;
  let watched = false, bar = '';
  if (it.type === 'movie') {
    const p = prog(it.path);
    watched = !!p?.watched;
    if (p && !p.watched && p.pos > 30) bar = `<div class="progress"><i style="width:${pct(p)}%"></i></div>`;
  } else {
    watched = it.episodes.every(e => prog(e.path)?.watched);
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
function missingCard(f, { tag = '', sub } = {}) {
  const ph = { title: f.title, year: f.year, type: 'movie', meta: null };
  const lb = lbOf(f.id);
  const open = f.id ? `data-providers="${f.id}" data-ptitle="${esc(f.title)}" data-palt="${esc(f.originalTitle || '')}"` : (f.url ? `data-lb-url="${esc(f.url)}"` : '');
  const line = sub ?? [f.year, lb?.watched ? 'Vista' : '', f.rating ? '★ ' + f.rating.toFixed(1) : ''].filter(Boolean).join(' · ');
  return `<div class="card missing" tabindex="0" ${open}>
    <div class="art">${f.poster ? `<img loading="lazy" src="${esc(f.poster)}" alt="">` : placeholder(ph)}
      ${tag}${lbBadge(lb)}
      <div class="missing-hover"><span>${I.eye}${f.id ? 'Dónde verla' : 'Ver en Letterboxd'}</span>${S.settings.emuleEnabled ? `<button class="mh-emule" data-action="emule-find" data-q="${esc(f.title)}" data-alt="${esc(f.originalTitle || '')}">${I.download}Buscar en eMule</button>` : ''}</div>
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
  const sub = ep ? `${epLabel(ep)}${em?.name ? ' · ' + em.name : ''}` : (p ? fmtLeft(p.dur - p.pos) : '');
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
  [/^(hbo )?max|^hbo max/, q => `https://play.hbomax.com/search?q=${q}`],
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
    <div class="modal-foot prov-foot"><span class="prov-credit">Datos de JustWatch vía TMDB</span>${S.settings.emuleEnabled ? `<button class="btn btn-accent btn-sm" data-action="emule-find" data-q="${esc(title)}" data-alt="${esc(alt || '')}">${I.download}Buscar en eMule</button>` : ''}<button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button></div>`);
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
  const favs = S.lib.favorites.map(byId).filter(Boolean);
  const topRated = items.filter(i => (i.meta?.rating || 0) >= 7.5).sort((a, b) => b.meta.rating - a.meta.rating).slice(0, 24);

  let rows = '';
  rows += row('Continuar viendo', cont.map(wideCard).join(''), 'cont');
  rows += row('Añadido recientemente', recent.map(card).join(''), 'recent');
  if (favs.length) rows += row('Mi lista', favs.map(card).join(''), 'favs', 'list');
  const wl = watchlistEntries();
  if (wl.length) {
    // primero las que ya puedes ver
    const sorted = [...wl.filter(e => e.it), ...wl.filter(e => !e.it)].slice(0, 30);
    rows += row('Tu watchlist de Letterboxd', sorted.map(watchlistCard).join(''), 'lbwl', 'watchlist');
  }
  rows += row('Series', series.slice(0, 30).map(card).join(''), 'series', 'series');
  rows += row('Películas', movies.slice(0, 30).map(card).join(''), 'movies', 'movies');
  const dirs = sortDirectors(allDirectors(), 'count');
  if (dirs.length >= 3) rows += row('Directores', dirs.slice(0, 24).map(directorChip).join(''), 'directors', 'directors');
  if (topRated.length >= 4) rows += row('Las mejor valoradas', topRated.map(card).join(''), 'top');
  for (const [g] of allGenres(items).filter(([, n]) => n >= 4).slice(0, 8)) {
    rows += row(g, sortItems(items.filter(i => i.meta?.genres?.includes(g)), 'rating').map(card).join(''), 'g-' + g);
  }

  return `${hero}<div class="rows ${hero ? '' : 'no-hero'}">${banners()}${rows}</div>`;
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
  return `<div class="kicker">${it.type === 'movie' ? 'Película' : 'Serie'}${Date.now() - it.added < 14 * DAY ? ' · Nuevo' : ''}</div>
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
    out += `<div class="banner"><div class="txt"><b>No se puede leer la biblioteca.</b> ${esc(S.lib.error)}. Comprueba que el disco esté conectado o cambia la carpeta en Ajustes.</div>
      <button class="btn btn-ghost btn-sm" data-nav="settings">Ajustes</button></div>`;
  }
  if (!S.lib.hasKey) {
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
    <p>CineLocal busca en <b>${esc(S.settings.libraryPath)}</b>.<br>Los archivos de vídeo sueltos se muestran como películas y cada carpeta como una serie.</p>
    <div class="actions" style="justify-content:center">
      <button class="btn btn-primary" data-action="scan">Escanear ahora</button>
      <button class="btn btn-ghost" data-nav="settings">Cambiar carpeta</button>
    </div></div></div>`;
}

const isSeen = it => it.type === 'movie' ? !!prog(it.path)?.watched : it.episodes.every(e => prog(e.path)?.watched);

function viewGrid(kind) {
  const f = S.filters[kind];
  const base = S.lib.items.filter(i => i.type === (kind === 'movies' ? 'movie' : 'series'));
  const genres = allGenres(base).map(([g]) => g);
  const byGenre = f.genre ? base.filter(i => i.meta?.genres?.includes(f.genre)) : base;
  const seen = byGenre.filter(isSeen).length;
  let list = f.seen === 'seen' ? byGenre.filter(isSeen) : f.seen === 'unseen' ? byGenre.filter(i => !isSeen(i)) : byGenre;
  list = sortItems(list, f.sort);
  const title = kind === 'movies' ? 'Películas' : 'Series';
  return `<div class="page">
    <h1 class="page-title">${title}<span class="count">${list.length}</span></h1>
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${f.seen === 'all' ? 'on' : ''}" data-seen="all">Todas · ${byGenre.length}</button>
        <button class="chip ${f.seen === 'seen' ? 'on' : ''}" data-seen="seen">Vistas · ${seen}</button>
        <button class="chip ${f.seen === 'unseen' ? 'on' : ''}" data-seen="unseen">Sin ver · ${byGenre.length - seen}</button>
      </div>
      <div class="spacer"></div>
      ${f.genre ? `<button class="chip genre-on" data-genre="" title="Quitar filtro">${esc(f.genre)}${I.close}</button>` : ''}
      ${genres.length ? `<button class="icon-btn filter-btn ${f.open ? 'open' : ''} ${f.genre ? 'active' : ''}" data-action="toggle-genres" title="Filtrar por género">${I.filter}</button>` : ''}
      <select class="select" data-sort="${kind}">
        ${[['added', 'Añadidas recientemente'], ['title', 'Título (A-Z)'], ['year', 'Año'], ['rating', 'Valoración'], ...(kind === 'movies' && hasLb() ? [['mine', 'Mi nota (Letterboxd)']] : [])]
          .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    ${f.open && genres.length ? `<div class="genre-panel">
        <span class="lbl">Género</span>
        <button class="gchip ${!f.genre ? 'on' : ''}" data-genre="">Todos</button>
        ${genres.map(g => `<button class="gchip ${f.genre === g ? 'on' : ''}" data-genre="${esc(g)}">${esc(g)}</button>`).join('')}
      </div>` : ''}
    ${list.length ? `<div class="grid">${list.map(card).join('')}</div>`
      : `<div class="empty"><p>${base.length ? 'No hay ninguna con estos filtros.' : `No hay ${title.toLowerCase()} en tu biblioteca.`}</p></div>`}
  </div>`;
}

function viewWatchlist() {
  const all = watchlistEntries();
  const mode = S.filters.watchlist;
  const have = all.filter(e => e.it).length;
  const list = mode === 'owned' ? all.filter(e => e.it) : mode === 'missing' ? all.filter(e => !e.it) : all;
  return `<div class="page"><h1 class="page-title">Watchlist de Letterboxd<span class="count">${all.length}</span></h1>
    ${all.length ? `<div class="toolbar"><div class="chips">
        <button class="chip ${mode === 'all' ? 'on' : ''}" data-wl="all">Todas · ${all.length}</button>
        <button class="chip ${mode === 'owned' ? 'on' : ''}" data-wl="owned"><i class="dot-own"></i>En tu biblioteca · ${have}</button>
        <button class="chip ${mode === 'missing' ? 'on' : ''}" data-wl="missing">No las tienes · ${all.length - have}</button>
      </div></div>
      <div class="grid filmo">${list.map(e => e.it ? card(e.it).replace('class="card"', 'class="card owned"').replace('<div class="cap">', '<div class="cap"><div class="own-badge">' + I.check + 'En tu biblioteca</div>') : watchlistCard(e)).join('')}</div>`
      : `<div class="empty"><h2>Tu watchlist está vacía</h2><p>${S.settings.lbUser ? 'Sincroniza tu perfil desde Ajustes.' : 'Conecta tu perfil de Letterboxd en Ajustes.'}</p><button class="btn btn-ghost" data-nav="settings">Ajustes</button></div>`}
  </div>`;
}

function viewList() {
  const favs = S.lib.favorites.map(byId).filter(Boolean);
  return `<div class="page"><h1 class="page-title">Mi lista<span class="count">${favs.length}</span></h1>
    ${favs.length ? `<div class="grid">${favs.map(card).join('')}</div>`
      : `<div class="empty"><div class="big-ico">${I.plus}</div><h2>Aún no has añadido nada</h2><p>Pulsa el botón + en cualquier película o serie para guardarla aquí.</p></div>`}
  </div>`;
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
    if ((m.cast || []).some(c => norm(c.name).includes(nq))) score += 2;
    if (norm(m.director || m.creators).includes(nq)) score += 2;
    if (String(Y(it)) === q) score += 3;
    return { it, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const dmatch = allDirectors().filter(d => norm(d.name).includes(nq)).slice(0, 12);
  return `<div class="page"><h1 class="page-title">Resultados para “${esc(S.query)}”<span class="count">${scored.length}</span></h1>
    ${dmatch.length ? `<h2 class="section-title" style="margin-top:0">Directores</h2><div class="dir-strip">${dmatch.map(directorChip).join('')}</div><h2 class="section-title">Títulos</h2>` : ''}
    ${scored.length ? `<div class="grid">${scored.map(x => card(x.it)).join('')}</div>`
      : `<div class="empty"><div class="big-ico">${I.search}</div><h2>Sin resultados</h2><p>Prueba con otro título, un actor o un género.</p></div>`}</div>`;
}

function viewDetail(id) {
  const it = byId(id);
  if (!it) return `<div class="page"><div class="empty"><h2>No encontrado</h2><button class="btn btn-ghost" data-action="back">Volver</button></div></div>`;
  const m = it.meta || {};
  const fav = isFav(it.id);
  const credit = it.type === 'movie' ? (directorsOf(it).length ? `<b>Dirección</b>${directorsOf(it).map(d => `<a class="credit-link" data-director="${esc(dirKey(d))}">${esc(d.name)}</a>`).join(', ')}` : '')
    : (m.creators ? `<b>Creada por</b>${esc(m.creators)}` : '') + (m.networks?.length ? `&nbsp;&nbsp;·&nbsp;&nbsp;<b>Cadena</b>${esc(m.networks.join(', '))}` : '');
  let restart = '';
  if (it.type === 'movie') {
    const p = prog(it.path);
    if (p && !p.watched && p.pos > 30) restart = `<button class="round-btn" title="Desde el principio" data-play="${it.id}" data-from-start="1">${I.restart}</button>`;
  }
  const watchedAll = it.type === 'movie' ? !!prog(it.path)?.watched : it.episodes.every(e => prog(e.path)?.watched);

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
    <b>Metadatos</b><span>${it.meta ? `TMDB #${m.tmdbId} · <button class="link-btn" data-action="identify" data-id="${it.id}">Corregir coincidencia</button>`
      : `${it.metaFailed ? 'No se encontró en TMDB' : 'Sin metadatos'} · <button class="link-btn" data-action="identify" data-id="${it.id}">Identificar manualmente</button>`}</span>
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
          <button class="round-btn ${fav ? 'on' : ''}" title="${fav ? 'Quitar de Mi lista' : 'Añadir a Mi lista'}" data-action="fav" data-id="${it.id}">${fav ? I.check : I.plus}</button>
          ${m.trailer ? `<button class="round-btn" title="Ver tráiler" data-action="trailer" data-url="${esc(m.trailer)}">${I.yt}</button>` : ''}
          <div class="menu-wrap">
            <button class="round-btn" title="Más opciones" data-action="menu">${I.more}</button>
            <div class="menu hidden" id="detailMenu">
              <button data-action="mark-all" data-id="${it.id}" data-watched="${watchedAll ? 0 : 1}">${watchedAll ? I.restart : I.eye}${watchedAll ? 'Marcar como no visto' : 'Marcar como visto'}</button>
              <button data-action="identify" data-id="${it.id}">${I.tag}Corregir coincidencia</button>
              ${S.settings.emuleEnabled ? `<button data-action="emule-find" data-q="${esc(T(it))}">${I.download}Buscar en eMule</button>` : ''}
              <button data-action="reveal" data-path="${esc(it.type === 'movie' ? it.path : it.episodes[0].path)}">${I.folder}Abrir ubicación</button>
            </div>
          </div>
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
  const seasonName = n => it.meta?.seasons?.[n]?.name || (n === 0 ? 'Especiales' : `Temporada ${n}`);
  const tabs = it.seasons.length > 6
    ? `<select class="select" data-season-select="${it.id}">${it.seasons.map(n => `<option value="${n}" ${n === season ? 'selected' : ''}>${esc(seasonName(n))}</option>`).join('')}</select>`
    : `<div class="season-tabs">${it.seasons.map(n => `<button class="${n === season ? 'on' : ''}" data-season="${n}" data-id="${it.id}">${esc(seasonName(n))}</button>`).join('')}</div>`;
  return `<h2 class="section-title">Episodios</h2>
    <div class="season-bar">${tabs}</div>
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
          <div class="t">${esc(em.name || `Episodio ${e.episode}`)}<small>${[em.runtime ? em.runtime + ' min' : (p?.dur ? Math.round(p.dur / 60) + ' min' : ''), em.airDate ? new Date(em.airDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : ''].filter(Boolean).join(' · ')}</small></div>
          ${em.overview ? `<p>${esc(em.overview)}</p>` : ''}
          <div class="file">${esc(e.fileName)}</div>
        </div>
        <div class="side"><button class="check-btn ${p?.watched ? 'on' : ''}" title="${p?.watched ? 'Marcar como no visto' : 'Marcar como visto'}" data-action="mark" data-path="${esc(e.path)}" data-watched="${p?.watched ? 0 : 1}">${I.check}</button></div>
      </div>`;
    }).join('')}</div>`;
}

function viewSettings() {
  const s = S.settings;
  const opt = (list, v) => list.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const sw = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><span></span></label>`;
  return `<div class="page settings">
    <h1 class="page-title">Ajustes</h1>

    <div class="set-group"><h3>Biblioteca</h3>
      <div class="set-row"><div class="lbl"><div class="t">Carpeta de películas y series</div>
        <div class="d">Archivos de vídeo sueltos = películas · cada carpeta = una serie (admite subcarpetas por temporada).</div></div>
        <div class="ctl"><input class="input" data-set-text="libraryPath" value="${esc(s.libraryPath)}"><button class="btn btn-ghost btn-sm" data-action="pick-folder">Examinar</button></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Escanear de nuevo</div><div class="d">${S.lib.items.length} títulos · último escaneo ${S.lib.scannedAt ? new Date(S.lib.scannedAt).toLocaleString('es-ES') : 'nunca'}</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="scan">Escanear ahora</button></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Detectar archivos nuevos automáticamente</div><div class="d">Vigila la carpeta y añade lo nuevo en cuanto termine de copiarse, con aviso en la app y en Windows.</div></div>
        <div class="ctl">${sw('autoWatch', s.autoWatch !== false)}</div></div>
      <div class="set-row"><div class="lbl"><div class="t">Carpetas con un solo vídeo como película</div><div class="d">Si una carpeta contiene un único vídeo sin numeración de episodio, se trata como película en vez de serie.</div></div>
        <div class="ctl">${sw('singleFileFolderAsMovie', s.singleFileFolderAsMovie)}</div></div>
    </div>

    <div class="set-group"><h3>Metadatos (TMDB)</h3>
      <div class="set-row"><div class="lbl"><div class="t">API key de TMDB</div>
        <div class="d">Gratis en <a data-url="https://www.themoviedb.org/settings/api">themoviedb.org/settings/api</a>. Sirve la “Clave de la API” (v3) o el “Token de acceso de lectura” (v4).</div></div>
        <div class="ctl"><input class="input" type="password" data-set-text="tmdbKey" value="${esc(s.tmdbKey)}" placeholder="Pega aquí tu clave" style="min-width:260px">
        <button class="btn btn-ghost btn-sm" data-action="test-key">Probar</button><span id="keyStatus"></span></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de los metadatos</div><div class="d">Títulos, sinopsis y nombres de episodios.</div></div>
        <div class="ctl"><select class="select" data-set="metaLang">${opt(META_LANGS, s.metaLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Volver a descargar todos los metadatos</div><div class="d">Útil si cambias de idioma o TMDB ha actualizado información. Se conservan las correcciones manuales.</div></div>
        <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="refresh-meta">Actualizar</button></div></div>
    </div>

    <div class="set-group"><h3>Audio y subtítulos</h3>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de audio preferido</div><div class="d">Se selecciona automáticamente si el archivo tiene esa pista; si no, se usa la pista por defecto.</div></div>
        <div class="ctl"><select class="select" data-set="audioLang">${opt(AUDIO_LANGS, s.audioLang)}</select></div></div>
      <div class="set-row"><div class="lbl"><div class="t">Idioma de subtítulos preferido</div><div class="d">Incluye subtítulos internos y archivos .srt/.ass junto al vídeo.</div></div>
        <div class="ctl"><select class="select" data-set="subLang">${opt(SUB_LANGS, s.subLang)}</select></div></div>
      <div class="set-row ${s.subLang === 'none' ? 'hidden' : ''}"><div class="lbl"><div class="t">Mostrar subtítulos</div><div class="d">“Sólo si el audio está en otro idioma” evita subtítulos en español cuando ya escuchas en español.</div></div>
        <div class="ctl"><select class="select" data-set="subMode">${opt([['always', 'Siempre'], ['foreign', 'Sólo si el audio está en otro idioma'], ['off', 'Nunca (activables durante la reproducción)']], s.subMode)}</select></div></div>
    </div>

    <div class="set-group"><h3>Reproducción</h3>
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
    </div>

    <div class="set-group" id="platforms"><h3>Mis plataformas</h3>
      ${platformsSettingsHTML()}
    </div>

    <div class="set-group" id="letterboxd"><h3>Letterboxd</h3>
      ${letterboxdSettingsHTML(s, sw)}
    </div>

    <div class="set-group"><h3>Descargas (eMule)</h3>
      ${emuleSettingsHTML(s, sw)}
    </div>

    <div class="set-group"><h3>Aplicación</h3>
      <div class="set-row"><div class="lbl"><div class="t">Iniciar en pantalla completa</div><div class="d">Pulsa F11 en cualquier momento para entrar o salir.</div></div><div class="ctl">${sw('startFullscreen', s.startFullscreen)}</div></div>
      <div class="set-row"><div class="lbl"><div class="t">Pantalla completa ahora</div></div><div class="ctl"><button class="btn btn-ghost btn-sm" data-action="fullscreen">Alternar (F11)</button></div></div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- descargas (eMule)
const DL_STATES = {
  downloading: 'Descargando', waiting: 'En espera', stalled: 'Sin fuentes', paused: 'En pausa', stopped: 'Detenida',
  complete: 'Completada', completing: 'Completando…', hashing: 'Comprobando…', waitinghash: 'Comprobando…', error: 'Error'
};
const EMULE_ERRORS = {
  offline: ['eMule no está abierto', 'O su servidor web está desactivado (Opciones → Servidor Web).'],
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
  const server = { high: ['ok', 'ID alta'], low: ['warn', 'ID baja'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.server];
  const kad = { ok: ['ok', 'Conectado'], firewalled: ['warn', 'Tras cortafuegos'], connecting: ['', 'Conectando…'], off: ['bad', 'Desconectado'] }[st.kad];
  return `<div class="dl-status">
    <span><small>Servidor</small><span class="status-pill ${server[0]}">${server[1]}</span>${st.server !== 'off' && st.serverName ? `<em>${esc(st.serverName)}</em>` : ''}</span>
    <span><small>Kad</small><span class="status-pill ${kad[0]}">${kad[1]}</span></span>
    <span><small>Bajada</small><b>${fmtRate(st.down) || '0 KB/s'}</b></span>
    <span><small>Subida</small><b>${fmtRate(st.up) || '0 KB/s'}</b></span>
    ${st.server === 'off' && st.kad === 'off' ? '<button class="btn btn-accent btn-sm" data-action="emule-connect">Conectar</button>' : ''}
  </div>`;
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
  $('#navDownloads').classList.toggle('hidden', !S.settings.emuleEnabled);
  if (S.route.name === 'downloads') {
    $('#dlStatus').innerHTML = emuleStatusHTML();
    $('#dlList').innerHTML = downloadsListHTML();
    $('#dlCount').textContent = S.emule.snap.downloads?.length || '';
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
      <div class="d">Usa el servidor web de eMule para buscar, descargar y seguir el progreso desde CineLocal. Lo descargado pasa a tu biblioteca al terminar.</div></div>
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
    <div class="set-row"><div class="lbl"><div class="t">Mover a la biblioteca al terminar</div>
      <div class="d">Las películas van a la carpeta de la biblioteca y los episodios (S01E02, 1x02, Cap.102) a la carpeta de su serie. Sólo se mueven las descargas que CineLocal ha visto en curso${info?.incoming?.length ? `, desde <code>${esc(info.incoming.join(', '))}</code>` : ''}.</div></div>
      <div class="ctl">${sw('emuleMoveToLibrary', s.emuleMoveToLibrary !== false)}</div></div>
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
    <div class="set-row"><div class="lbl"><div class="t">Estado</div><div class="d" id="lbStatus">${lbStatusHTML()}</div></div>
      <div class="ctl">${S.lb.syncedAt ? '<button class="btn btn-ghost btn-sm" data-action="lb-clear">Borrar datos</button>' : ''}</div></div>
    <div class="set-row"><div class="lbl"><div class="t">Importar la exportación de Letterboxd</div>
      <div class="d">Alternativa si la lectura del perfil falla: en Letterboxd, <a data-url="https://letterboxd.com/settings/data/">Settings → Data → Export your data</a>, y elige aquí el .zip descargado.</div></div>
      <div class="ctl"><button class="btn btn-ghost btn-sm" data-action="lb-import" ${S.lb.status?.running ? 'disabled' : ''}>Elegir .zip</button></div></div>
    <div class="set-row"><div class="lbl"><div class="t">Marcar como vistas las que ya has visto en Letterboxd</div>
      <div class="d">Sólo películas de tu biblioteca que aún no hayas empezado en CineLocal.</div></div>
      <div class="ctl">${sw('lbMarkWatched', s.lbMarkWatched !== false)}</div></div>`;
}
function paintLbStatus() {
  if (S.route.name !== 'settings') return;
  const el = $('#lbStatus');
  if (el) el.innerHTML = lbStatusHTML();
  $$('[data-action="lb-sync"],[data-action="lb-import"]').forEach(b => { b.disabled = !!S.lb.status?.running || (b.dataset.action === 'lb-sync' && !S.settings.lbUser); });
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
    default: html = viewHome();
  }
  view.innerHTML = html;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === r.name || (r.name === 'director' && a.dataset.nav === 'directors')));
  if (r.name === 'director') loadPerson(r.id);
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
  $('#topbar').classList.toggle('solid', $('#view').scrollTop > 40 || ['settings', 'downloads'].includes(S.route.name));
}

// ---------------------------------------------------------------- acciones
async function play(itemId, episodeId, fromStart) {
  const r = await window.api.play({ itemId, episodeId, fromStart: !!fromStart });
  if (!r.ok) {
    if (r.error === 'mpv-missing') mpvHelp();
    else toast(r.error, 'error');
  } else {
    toast('Abriendo reproductor…');
  }
}

function toast(text, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = text;
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
    await window.api.identify({ itemId: id, tmdbId: +r.dataset.tmdb });
    closeModal();
    toast('Metadatos actualizados', 'ok');
  });
  search();
}

async function saveSetting(key, value) {
  S.settings = await window.api.setSettings({ [key]: value });
  if (key === 'region') S.providerList = null;   // recargar la lista del nuevo país (los ids de TMDB son los mismos en todos)
  if (key === 'subLang' || key === 'emuleEnabled' || key === 'playerMode' || key === 'region') render(true);
  if (key === 'lbUser') { setLb(await window.api.letterboxd.get()); paintLbStatus(); }
  if (key.startsWith('emule')) paintEmule();
  if (key === 'emuleEnabled' && value) loadEmuleInfo();
}

async function scanNow() {
  const b = $('#btnScan');
  b.classList.add('spin');
  try {
    S.lib = await window.api.scan();
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
  if (nav) { closeModal(); go(nav.dataset.nav); return; }

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
    else if (a === 'toggle-genres') { const f = S.filters[S.route.name]; f.open = !f.open; render(true); }
    else if (a === 'bio-more') {
      const d = allDirectors().find(x => x.key === S.route.id);
      const pp = d?.id ? S.people[d.id] : null;
      if (pp) modal(`<div class="modal-head"><h2>${esc(pp.name || d.name)}</h2><p>Biografía</p></div>
        <div class="modal-list" style="padding:0 24px 20px;line-height:1.65;color:var(--text-2);white-space:pre-line;user-select:text">${esc(pp.bio)}</div>
        <div class="modal-foot"><button class="btn btn-ghost btn-sm" data-action="close-modal">Cerrar</button></div>`);
    }
    else if (a === 'scan') scanNow();
    else if (a === 'fav') { S.lib.favorites = await window.api.toggleFavorite(action.dataset.id); render(true); }
    else if (a === 'trailer') window.api.openExternal(action.dataset.url);
    else if (a === 'menu') $('#detailMenu').classList.toggle('hidden');
    else if (a === 'identify') { $('#detailMenu')?.classList.add('hidden'); identify(action.dataset.id); }
    else if (a === 'reveal') window.api.showInFolder(action.dataset.path);
    else if (a === 'mark') {
      e.stopPropagation();
      S.lib.progress = await window.api.markProgress({ paths: [action.dataset.path], watched: action.dataset.watched === '1' });
      render(true);
    } else if (a === 'mark-all') {
      const it = byId(action.dataset.id);
      const paths = it.type === 'movie' ? [it.path] : it.episodes.map(x => x.path);
      S.lib.progress = await window.api.markProgress({ paths, watched: action.dataset.watched === '1' });
      render(true);
    } else if (a === 'fullscreen') window.api.toggleFullscreen();
    else if (a === 'pick-folder') {
      const p = await window.api.pickFolder();
      if (p) { await saveSetting('libraryPath', p); S.lib = await window.api.getLibrary(); render(true); }
    } else if (a === 'pick-mpv') {
      const p = await window.api.pickMpv();
      if (p) { await saveSetting('mpvPath', p); S.lib = await window.api.getLibrary(); closeModal(); render(true); toast(S.lib.mpv ? 'mpv configurado' : 'Ese archivo no parece mpv', S.lib.mpv ? 'ok' : 'error'); }
    } else if (a === 'mpv-help') mpvHelp();
    else if (a === 'close-modal') closeModal();
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

  const dot = t.closest('[data-hero-dot]');
  if (dot) { setHero(+dot.dataset.heroDot); startHeroTimer(); return; }

  const g = t.closest('[data-genre]');
  if (g) { S.filters[S.route.name].genre = g.dataset.genre || null; render(true); return; }

  const sn = t.closest('[data-seen]');
  if (sn) { S.filters[S.route.name].seen = sn.dataset.seen; render(true); return; }

  const sb = t.closest('[data-season]');
  if (sb) { S.season[sb.dataset.id] = +sb.dataset.season; render(true); return; }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.sort) { S.filters[t.dataset.sort].sort = t.value; render(); }
  else if ('filmoSort' in t.dataset) { S.filters.filmoSort = t.value; render(true); }
  else if (t.dataset.seasonSelect) { S.season[t.dataset.seasonSelect] = +t.value; render(true); }
  else if (t.dataset.set) {
    const v = t.type === 'checkbox' ? t.checked : t.value;
    saveSetting(t.dataset.set, v).then(() => {
      if (t.dataset.set === 'startFullscreen') window.api.setFullscreen(v);
      if (t.dataset.set === 'singleFileFolderAsMovie') window.api.getLibrary().then(l => { S.lib = l; });
    });
  } else if (t.dataset.setText) {
    const key = t.dataset.setText;
    const v = t.value.trim();
    saveSetting(key, v).then(async () => {
      if (key === 'libraryPath' || key === 'tmdbKey') { S.lib = await window.api.getLibrary(); render(true); }
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
document.addEventListener('input', (e) => {
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
  S.lib = lib;
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
window.api.onToast(({ type, text }) => toast(text, type));
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
window.api.onOpenItem((id) => { closeModal(); go('detail', { id }); });
window.api.onMetaProgress((p) => {
  const el = $('#metaStatus');
  if (!p || !p.total) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = `<div class="spinner"></div><span>Descargando metadatos ${p.done}/${p.total}${p.title ? ' · ' + esc(p.title) : ''}</span>`;
});

// ---------------------------------------------------------------- arranque
(async function init() {
  if (window.api.platform === 'win32') document.body.classList.add('win');
  document.body.classList.toggle('fullscreen', await window.api.isFullscreen());
  S.settings = await window.api.getSettings();
  S.lib = await window.api.getLibrary();
  S.emule.snap = await window.api.emule.get();
  setLb(await window.api.letterboxd.get());
  render();
  paintEmule();
  if (S.settings.emuleEnabled) loadEmuleInfo();
  // escaneo en segundo plano al abrir (detecta archivos nuevos)
  S.lib = await window.api.scan();
  render(true);
})();
