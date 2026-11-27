// Calendario de estrenos (pestaña «Estrenos» de Películas y de Series), con los datos de TMDB.
// Se pide por meses: cada mes se calcula al pedirlo y se guarda un tiempo en memoria.
//
// Películas: estrenos en cines de la región (España) y películas que llegan a las plataformas principales (las propias
// salen desde su estreno; las demás, cuando TMDB sabe en qué plataforma están, que suele ser al llegar). Series: estrenos y temporadas nuevas de las plataformas principales.
// Sólo lo más relevante: lo más popular de cada mes, sin programas de entrevistas, noticias, realities ni culebrones.

const IMG = 'https://image.tmdb.org/t/p/';

/** Plataformas principales en España: nombre que se muestra ← cómo las llama TMDB */
const PLATFORMS = [
  ['Netflix', /^netflix( (standard|basic) with ads)?$/i],
  ['Prime Video', /^amazon prime video( with ads)?$/i],
  ['Disney+', /^disney ?(\+|plus)$/i],
  ['Max', /^(hbo )?max$/i],
  ['Apple TV+', /^apple tv ?(\+|plus)$/i],
  ['Movistar Plus+', /^movistar ?(\+|plus\+?)( ficción total)?$/i],
  ['SkyShowtime', /^skyshowtime$/i],
  ['Filmin', /^filmin( plus)?$/i]
];
// cadenas de TMDB de esas plataformas (sus series propias, aunque aún no salgan en las plataformas de la región)
const NETWORKS = { 213: 'Netflix', 1024: 'Prime Video', 2739: 'Disney+', 49: 'Max', 3186: 'Max', 2552: 'Apple TV+' };
const NOISE_GENRES = '10763,10764,10766,10767';   // noticias, reality, culebrones, entrevistas

const LIMITS = { cinema: 40, platform: 40, series: 50 };
const DAY = 86400e3;

const platformOf = name => PLATFORMS.find(([, re]) => re.test(String(name || '').trim()))?.[0] || null;

class Calendar {
  /** tmdb(lang): el cliente de TMDB con la clave y la región de los ajustes */
  constructor(tmdb) {
    this.tmdb = tmdb;
    this.months = new Map();     // «tipo:mes:idioma» → { at, data } o { at, promise }
    this.details = new Map();    // «tipo:id:idioma» → { at, data }
    this.providers = new Map();  // «tipo:región» → { at, ids, logos }
  }

  /** Estrenos de un mes («2026-11») de películas o series, ordenados por fecha */
  async month(kind, month, lang) {
    if (!/^(19|20|21)\d\d-(0[1-9]|1[0-2])$/.test(month)) throw Object.assign(new Error('Mes no válido'), { status: 400 });
    const key = `${kind}:${month}:${lang}`;
    const c = this.months.get(key);
    // los meses pasados apenas cambian; los de ahora y los que vienen, sí (se añaden fechas y plataformas)
    const past = month < new Date(Date.now() - 31 * DAY).toISOString().slice(0, 7);
    const ttl = past ? 7 * DAY : 12 * 3600e3;
    if (c && Date.now() - c.at < ttl) return c.data ?? c.promise;
    const api = this.tmdb(lang);
    const promise = (kind === 'series' ? this.seriesMonth(api, month) : this.moviesMonth(api, month))
      .then(data => { this.months.set(key, { at: Date.now(), data }); return data; })
      .catch(e => { this.months.delete(key); throw e; });
    this.months.set(key, { at: Date.now(), promise });
    if (this.months.size > 200) this.months.delete(this.months.keys().next().value);
    return promise;
  }

  // ---------- películas ----------
  async moviesMonth(api, month) {
    const [from, to] = range(month);
    const region = api.region;
    const prov = await this.mainProviders(api, 'movie');
    const base = { sort_by: 'popularity.desc', include_adult: false, language: api.language };
    const [cinema, platform, digital] = await Promise.all([   // digital: para saber qué día llega a una plataforma
      this.discover(api, '/discover/movie', { ...base, region, with_release_type: '2|3', 'release_date.gte': from, 'release_date.lte': to }, 3),
      prov.ids.length ? this.discover(api, '/discover/movie', { ...base, watch_region: region, with_watch_providers: prov.ids.join('|'), with_watch_monetization_types: 'flatrate', 'primary_release_date.gte': from, 'primary_release_date.lte': to }, 2) : [],
      this.discover(api, '/discover/movie', { ...base, region, with_release_type: 4, 'release_date.gte': from, 'release_date.lte': to }, 2)
    ]);
    const ids = [...new Set([...cinema, ...platform, ...digital].map(r => r.id))];
    const details = await pool(ids, 6, id => this.detail(api, 'movie', id).catch(() => null));
    const events = { cinema: [], platform: [] };
    for (const d of details) {
      if (!d || !d.poster_path) continue;
      const dates = d.release_dates?.results?.find(r => r.iso_3166_1 === region)?.release_dates || [];
      const day = t => dates.filter(x => x.type === t).map(x => x.release_date?.slice(0, 10)).filter(Boolean).sort()[0];
      const theatrical = day(3) || day(2);
      const digitalDay = day(4);
      const providers = this.flatrate(d, region, prov);
      const item = { id: d.id, type: 'movie', title: d.title, original: d.original_title, poster: IMG + 'w185' + d.poster_path, year: +(d.release_date || '').slice(0, 4) || null, popularity: d.popularity || 0 };
      if (theatrical && theatrical >= from && theatrical <= to) events.cinema.push({ ...item, date: theatrical, kind: 'cinema' });
      // a una plataforma: el día de su estreno digital aquí o, si no se estrenó en cines, el de su estreno (las propias)
      const platDay = digitalDay && digitalDay >= from && digitalDay <= to ? digitalDay
        : !theatrical && d.release_date >= from && d.release_date <= to ? d.release_date : null;
      // los estrenos digitales sin plataforma (alquiler o compra) no: suelen ser títulos menores
      if (platDay && providers.length) events.platform.push({ ...item, date: platDay, kind: 'platform', providers });
    }
    const top = (list, n) => list.sort((a, b) => b.popularity - a.popularity).slice(0, n);
    return finish([...top(events.cinema, LIMITS.cinema), ...top(events.platform, LIMITS.platform)], month);
  }

  // ---------- series ----------
  async seriesMonth(api, month) {
    const [from, to] = range(month);
    const region = api.region;
    const prov = await this.mainProviders(api, 'tv');
    const base = { sort_by: 'popularity.desc', language: api.language, without_genres: NOISE_GENRES, include_null_first_air_dates: false };
    const lists = await Promise.all([
      // con episodios ese mes, en las plataformas de aquí o de las cadenas de esas plataformas
      prov.ids.length ? this.discover(api, '/discover/tv', { ...base, watch_region: region, with_watch_providers: prov.ids.join('|'), 'air_date.gte': from, 'air_date.lte': to }, 3) : [],
      this.discover(api, '/discover/tv', { ...base, with_networks: Object.keys(NETWORKS).join('|'), 'air_date.gte': from, 'air_date.lte': to }, 3),
      // estrenos (primera temporada)
      this.discover(api, '/discover/tv', { ...base, with_networks: Object.keys(NETWORKS).join('|'), 'first_air_date.gte': from, 'first_air_date.lte': to }, 2)
    ]);
    const ids = [...new Set(lists.flat().map(r => r.id))];
    const details = await pool(ids, 6, id => this.detail(api, 'tv', id).catch(() => null));
    const out = [];
    for (const d of details) {
      if (!d || !d.poster_path) continue;
      let providers = this.flatrate(d, region, prov);
      if (!providers.length) providers = [...new Map((d.networks || []).filter(n => NETWORKS[n.id]).map(n => [NETWORKS[n.id], { name: NETWORKS[n.id], logo: null }])).values()];
      if (!providers.length) continue;   // sólo las de las plataformas principales
      const item = { id: d.id, type: 'series', title: d.name, original: d.original_name, poster: IMG + 'w185' + d.poster_path, year: +(d.first_air_date || '').slice(0, 4) || null, popularity: d.popularity || 0, providers };
      for (const s of d.seasons || []) {
        if (!s.season_number || !s.air_date || s.air_date < from || s.air_date > to) continue;
        out.push({ ...item, date: s.air_date, kind: s.season_number === 1 ? 'premiere' : 'season', season: s.season_number, episodes: s.episode_count || null });
      }
    }
    return finish(out.sort((a, b) => b.popularity - a.popularity).slice(0, LIMITS.series), month);
  }

  // ---------- TMDB ----------
  /** Resultados de /discover, hasta «pages» páginas */
  async discover(api, endpoint, params, pages) {
    const out = [];
    for (let page = 1; page <= pages; page++) {
      const r = await api.get(endpoint, { ...params, page });
      out.push(...(r.results || []));
      if (page >= (r.total_pages || 1)) break;
    }
    return out;
  }

  /** Ficha con fechas por país y plataformas (24 h en caché) */
  async detail(api, type, id) {
    const key = `${type}:${id}:${api.language}`;
    const c = this.details.get(key);
    if (c && Date.now() - c.at < DAY) return c.data;
    const data = await api.get(`/${type}/${id}`, { language: api.language, append_to_response: type === 'movie' ? 'release_dates,watch/providers' : 'watch/providers' });
    if (this.details.size > 3000) this.details.delete(this.details.keys().next().value);
    this.details.set(key, { at: Date.now(), data });
    return data;
  }

  /** Las plataformas principales de una ficha en la región (sin repetir «con anuncios»), con su logo */
  flatrate(d, region, prov) {
    const list = d['watch/providers']?.results?.[region]?.flatrate || [];
    const out = new Map();
    for (const p of list) {
      const name = platformOf(p.provider_name);
      if (name && !out.has(name)) out.set(name, { name, logo: prov.logos[name] || (p.logo_path ? IMG + 'w92' + p.logo_path : null) });
    }
    return [...out.values()];
  }

  /** Los identificadores de TMDB de las plataformas principales en la región (una semana en caché) */
  async mainProviders(api, type) {
    const key = `${type}:${api.region}`;
    const c = this.providers.get(key);
    if (c && Date.now() - c.at < 7 * DAY) return c;
    try {
      const r = await api.get(`/watch/providers/${type}`, { watch_region: api.region, language: api.language });
      const ids = [], logos = {};
      for (const p of r.results || []) {
        const name = platformOf(p.provider_name);
        if (!name) continue;
        ids.push(p.provider_id);
        if (!logos[name] && p.logo_path) logos[name] = IMG + 'w92' + p.logo_path;
      }
      const v = { at: Date.now(), ids, logos };
      this.providers.set(key, v);
      return v;
    } catch { return { ids: [], logos: {} }; }
  }
}

/** Primer y último día del mes */
function range(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, '0')}`];
}

function finish(items, month) {
  items.sort((a, b) => a.date.localeCompare(b.date) || b.popularity - a.popularity);
  return { month, items };
}

/** Ejecuta fn sobre cada elemento, como mucho n a la vez, y devuelve los resultados en orden */
async function pool(list, n, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) { const k = i++; out[k] = await fn(list[k]); }
  }));
  return out;
}

module.exports = { Calendar, PLATFORMS };
