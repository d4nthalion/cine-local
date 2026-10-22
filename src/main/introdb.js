// Tiempos de intro, resumen y créditos de TheIntroDB (https://theintrodb.org, datos de la comunidad).
// Una petición por capítulo al empezar a reproducirlo (y la del siguiente de la lista, en segundo plano),
// con caché en disco: lo encontrado se guarda 30 días y lo que no está, 7 días. Ante un 429 se espera
// lo que indique Retry-After antes de volver a preguntar.

const API = 'https://api.theintrodb.org/v4/media';
const KINDS = ['intro', 'recap', 'credits', 'preview'];
const DAY = 864e5;
const TTL_FOUND = 30 * DAY;
const TTL_MISSING = 7 * DAY;
const ERROR_RETRY = 10 * 60e3;          // fallo de red o del servidor: no se repite en 10 min (sólo en memoria)
const WINDOW_MS = 10e3, WINDOW_MAX = 20; // por debajo del límite anónimo (25 cada 10 s)

/**
 * Respuesta de la API → { intro: [{start, end}], recap, credits, preview } en segundos.
 * start null ⇒ 0 · end null ⇒ hasta el final del archivo (null; sólo créditos y avance) ·
 * rangos vacíos o al revés ({0,0}) se descartan.
 */
function normalize(json) {
  const out = { intro: [], recap: [], credits: [], preview: [] };
  if (!json || typeof json !== 'object') return out;
  for (const kind of KINDS) {
    const list = Array.isArray(json[kind]) ? json[kind] : [];
    for (const r of list) {
      if (!r || typeof r !== 'object') continue;
      const s = r.start_ms == null ? 0 : Number(r.start_ms);
      const e = r.end_ms == null ? null : Number(r.end_ms);
      if (!Number.isFinite(s) || s < 0) continue;
      if (e === null) {
        // una intro o un resumen «hasta el final» saltaría el capítulo entero
        if (kind === 'intro' || kind === 'recap') continue;
      } else if (!Number.isFinite(e) || e <= s) continue;
      out[kind].push({ start: s / 1000, end: e === null ? null : e / 1000 });
    }
    out[kind].sort((a, b) => a.start - b.start);
  }
  return out;
}

const isEmpty = segs => !segs || KINDS.every(k => !segs[k]?.length);

/**
 * Lista plana para el reproductor: [{kind, start, end}] ordenada; end null (hasta el final) se resuelve con dur
 * si se conoce. Se quitan los tramos que empiezan después del final del archivo.
 */
function flatten(segs, dur = 0) {
  const out = [];
  if (!segs) return out;
  for (const kind of KINDS) {
    for (const r of segs[kind] || []) {
      let end = r.end;
      if (dur > 0) {
        if (r.start >= dur) continue;
        end = end == null ? dur : Math.min(end, dur);
      }
      if (end != null && end - r.start < 1) continue;
      out.push({ kind, start: r.start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Tramo activo en el segundo t (el mismo criterio que usa cinelocal-osc.lua); end null = hasta dur */
function activeSegment(list, t, dur = 0) {
  for (const sg of list || []) {
    const end = sg.end == null ? (dur > 0 ? dur : Infinity) : sg.end;
    if (t >= sg.start && t < end - 0.5) return sg;
  }
  return null;
}

/** Clave de caché: tv:<id>:<temporada>:<capítulo> o movie:<id> */
function cacheKey({ type, tmdbId, season, episode }) {
  return type === 'movie' ? `movie:${tmdbId}` : `tv:${tmdbId}:${season}:${episode}`;
}

/** ¿Sigue valiendo la entrada de caché? (lo encontrado, 30 días; lo que no está, 7) */
function fresh(entry, now = Date.now()) {
  if (!entry || !entry.at) return false;
  return now - entry.at < (entry.segs ? TTL_FOUND : TTL_MISSING);
}

class IntroDB {
  /**
   * @param {object} o
   * @param {(url: string, opts: object) => Promise<Response>} o.fetch
   * @param {{data: object, save: Function}} o.store   caché persistente ({ entries: {} })
   * @param {() => string} [o.apiKey]                  clave opcional (Bearer)
   * @param {string} [o.userAgent]
   */
  constructor({ fetch, store, apiKey = () => '', userAgent = 'CineLocal' }) {
    this.fetch = fetch;
    this.store = store;
    this.apiKey = apiKey;
    this.userAgent = userAgent;
    this.inflight = new Map();
    this.errors = new Map();     // clave → instante del último fallo
    this.blockedUntil = 0;       // tras un 429
    this.recent = [];            // instantes de las últimas peticiones
    if (!this.store.data.entries) this.store.data.entries = {};
    this.prune();
  }

  /** Quita de la caché lo caducado */
  prune(now = Date.now()) {
    const e = this.store.data.entries;
    let n = 0;
    for (const k of Object.keys(e)) if (!fresh(e[k], now)) { delete e[k]; n++; }
    if (n) this.store.save();
  }

  /** Tiempos en caché sin preguntar a la API (undefined si no hay nada válido) */
  cached(media, now = Date.now()) {
    const c = this.store.data.entries[cacheKey(media)];
    return fresh(c, now) ? c.segs : undefined;
  }

  /**
   * Tiempos del capítulo o película; null si TheIntroDB no los tiene o no se pueden pedir ahora.
   * @param {{type:'tv'|'movie', tmdbId:number, season?:number, episode?:number}} media
   * @param {{durationMs?: number}} [o]
   */
  async get(media, { durationMs } = {}) {
    if (!media?.tmdbId || (media.type !== 'movie' && !(media.season >= 0 && media.episode >= 0))) return null;
    const key = cacheKey(media);
    const hit = this.cached(media);
    if (hit !== undefined) return hit;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const now = Date.now();
    if (now - (this.errors.get(key) || 0) < ERROR_RETRY) return null;
    if (now < this.blockedUntil) return null;
    this.recent = this.recent.filter(t => now - t < WINDOW_MS);
    if (this.recent.length >= WINDOW_MAX) return null;
    this.recent.push(now);
    const p = this._request(media, key, durationMs).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  async _request(media, key, durationMs) {
    const q = new URLSearchParams({ tmdb_id: String(media.tmdbId) });
    if (media.type !== 'movie') { q.set('season', String(media.season)); q.set('episode', String(media.episode)); }
    if (durationMs > 0) q.set('duration_ms', String(Math.round(durationMs)));
    const headers = { Accept: 'application/json', 'User-Agent': this.userAgent };
    const k = (this.apiKey() || '').trim();
    if (k) headers.Authorization = `Bearer ${k}`;
    let res;
    try {
      res = await this.fetch(`${API}?${q}`, { headers });
    } catch (e) {
      this.errors.set(key, Date.now());
      console.warn('TheIntroDB:', e.message);
      return null;
    }
    if (res.status === 429) {
      const ra = Number(res.headers?.get?.('retry-after'));
      this.blockedUntil = Date.now() + (Number.isFinite(ra) && ra > 0 ? ra * 1000 : 60e3);
      console.warn('TheIntroDB: límite de peticiones; se espera hasta', new Date(this.blockedUntil).toLocaleTimeString());
      return null;
    }
    if (res.status === 404) { this._save(key, null); return null; }
    if (!res.ok) {
      this.errors.set(key, Date.now());
      console.warn('TheIntroDB: HTTP', res.status);
      return null;
    }
    let json;
    try { json = await res.json(); } catch { this.errors.set(key, Date.now()); return null; }
    const segs = normalize(json);
    const val = isEmpty(segs) ? null : segs;
    this._save(key, val);
    return val;
  }

  _save(key, segs) {
    this.store.data.entries[key] = { at: Date.now(), segs };
    this.store.save();
  }
}

module.exports = { IntroDB, normalize, flatten, activeSegment, cacheKey, fresh, isEmpty, TTL_FOUND, TTL_MISSING };
