// Metadatos desde TMDB (The Movie Database). Requiere API key gratuita (v3) o token de lectura (v4).
const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';

class TMDB {
  constructor(key, language = 'es-ES', fetchImpl = globalThis.fetch) {
    this.fetch = fetchImpl;
    this.key = (key || '').trim();
    this.language = language;
    this.region = (language.split('-')[1] || 'ES').toUpperCase();
  }

  get enabled() { return !!this.key; }

  async get(endpoint, params = {}, attempt = 0) {
    const url = new URL(API + endpoint);
    const headers = { accept: 'application/json' };
    if (this.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + this.key;
    else url.searchParams.set('api_key', this.key);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    let res;
    try { res = await this.fetch(url.toString(), { headers }); }
    catch { throw new Error('No se pudo conectar con TMDB. Comprueba tu conexión a Internet.'); }
    if (res.status === 429 && attempt < 4) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      return this.get(endpoint, params, attempt + 1);
    }
    if (res.status === 401) throw new Error('API key de TMDB no válida');
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return res.json();
  }

  async test() {
    await this.get('/configuration');
    return true;
  }

  async search(type, query, year) {
    const ep = type === 'movie' ? '/search/movie' : '/search/tv';
    const yearKey = type === 'movie' ? 'year' : 'first_air_date_year';
    const base = { query, language: this.language, include_adult: 'false' };
    let r = await this.get(ep, year ? { ...base, [yearKey]: year } : base);
    if (!r.results?.length && year) r = await this.get(ep, base);
    return (r.results || []).map(x => ({
      id: x.id,
      title: x.title || x.name,
      originalTitle: x.original_title || x.original_name,
      year: (x.release_date || x.first_air_date || '').slice(0, 4) || null,
      poster: img(x.poster_path, 'w342'),
      overview: x.overview
    }));
  }

  /**
   * Busca la mejor coincidencia para un nombre de archivo/carpeta.
   * Entiende "Director - Título" (y "Título - Subtítulo"), comprueba el director
   * contra TMDB tolerando faltas de ortografía ("Scorssese", "Robbert Eggers"...).
   * Devuelve el id de TMDB o null.
   */
  async findBest(type, rawTitle, year) {
    const title = cleanQuery(rawTitle);
    const parts = title.split(/\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    const attempts = [];
    if (parts.length >= 2) {
      const left = parts[0], right = parts.slice(1).join(' ');
      attempts.push({ q: right, hint: left }, { q: title, hint: null }, { q: left, hint: right });
    } else {
      attempts.push({ q: title, hint: null });
    }
    // variantes: "The VVitch" -> "The Witch"; números romanos al final ("The Godfather II" -> "Part II")
    for (const a of [...attempts]) {
      if (/VV/.test(a.q)) attempts.push({ ...a, q: a.q.replace(/VV/g, 'W') });
      const rm = a.q.match(/^(.*\S)\s+(II|III|IV|V|VI)$/);
      if (rm) attempts.push({ ...a, q: `${rm[1]} Part ${rm[2]}` }, { ...a, q: `${rm[1]} ${romanToInt(rm[2])}` });
    }

    let fallback = null;
    for (const a of attempts) {
      let results;
      try { results = await this.search(type, a.q, year); } catch (e) { if (/no válida|conectar/.test(e.message)) throw e; continue; }
      if (!results.length) continue;
      const ranked = rankResults(results, a.q, year);
      if (!fallback) fallback = ranked[0].id;
      if (a.hint && type === 'movie') {
        // ¿el texto que sobra es el director? Mirar los 5 primeros resultados
        for (const r of ranked.slice(0, 5)) {
          const directors = await this.directorsOf(r.id).catch(() => []);
          if (directors.some(d => personMatches(a.hint, d))) return r.id;
        }
      } else if (a.hint && type === 'series') {
        continue; // en series no comprobamos creador; seguimos probando el resto
      } else {
        return ranked[0].id;
      }
    }
    return fallback;
  }

  async directorsOf(movieId) {
    const c = await this.get(`/movie/${movieId}/credits`);
    return (c.crew || []).filter(p => p.job === 'Director').map(p => p.name);
  }

  pickLogo(images) {
    const logos = images?.logos || [];
    const lang = this.language.split('-')[0];
    const pick = logos.find(l => l.iso_639_1 === lang) || logos.find(l => l.iso_639_1 === 'en') || logos[0];
    return pick ? img(pick.file_path, 'w500') : null;
  }

  async movie(id) {
    const lang = this.language.split('-')[0];
    const d = await this.get(`/movie/${id}`, {
      language: this.language,
      append_to_response: 'credits,images,release_dates,videos',
      include_image_language: `${lang},en,null`
    });
    let overview = d.overview;
    if (!overview) overview = (await this.get(`/movie/${id}`, { language: 'en-US' }).catch(() => ({}))).overview;
    const rel = d.release_dates?.results || [];
    const cert = (rel.find(r => r.iso_3166_1 === this.region) || rel.find(r => r.iso_3166_1 === 'US'))
      ?.release_dates?.map(x => x.certification).find(Boolean) || null;
    return {
      tmdbId: d.id,
      imdbId: d.imdb_id || d.external_ids?.imdb_id || null,
      title: d.title,
      originalTitle: d.original_title,
      tagline: d.tagline,
      overview,
      year: d.release_date ? +d.release_date.slice(0, 4) : null,
      releaseDate: d.release_date,
      runtime: d.runtime,
      rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
      genres: (d.genres || []).map(g => g.name),
      poster: img(d.poster_path, 'w500'),
      backdrop: img(d.backdrop_path, 'original') || img(d.images?.backdrops?.[0]?.file_path, 'original'),
      logo: this.pickLogo(d.images),
      certification: cert,
      director: (d.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name).join(', '),
      cast: castOf(d.credits),
      trailer: trailerOf(d.videos)
    };
  }

  async tv(id, seasons = []) {
    const lang = this.language.split('-')[0];
    const d = await this.get(`/tv/${id}`, {
      language: this.language,
      append_to_response: 'credits,images,content_ratings,videos',
      include_image_language: `${lang},en,null`
    });
    let overview = d.overview;
    if (!overview) overview = (await this.get(`/tv/${id}`, { language: 'en-US' }).catch(() => ({}))).overview;
    const cr = d.content_ratings?.results || [];
    const cert = (cr.find(r => r.iso_3166_1 === this.region) || cr.find(r => r.iso_3166_1 === 'US'))?.rating || null;

    const seasonData = {};
    for (const n of seasons) {
      try {
        const s = await this.get(`/tv/${id}/season/${n}`, { language: this.language });
        seasonData[n] = {
          name: s.name,
          overview: s.overview,
          poster: img(s.poster_path, 'w342'),
          episodes: Object.fromEntries((s.episodes || []).map(e => [e.episode_number, {
            name: e.name,
            overview: e.overview,
            still: img(e.still_path, 'w500'),
            runtime: e.runtime,
            airDate: e.air_date,
            rating: e.vote_average ? Math.round(e.vote_average * 10) / 10 : null
          }]))
        };
      } catch { /* temporada inexistente en TMDB */ }
    }

    return {
      tmdbId: d.id,
      title: d.name,
      originalTitle: d.original_name,
      tagline: d.tagline,
      overview,
      year: d.first_air_date ? +d.first_air_date.slice(0, 4) : null,
      endYear: d.status === 'Ended' && d.last_air_date ? +d.last_air_date.slice(0, 4) : null,
      runtime: d.episode_run_time?.[0] || null,
      rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
      genres: (d.genres || []).map(g => g.name),
      poster: img(d.poster_path, 'w500'),
      backdrop: img(d.backdrop_path, 'original') || img(d.images?.backdrops?.[0]?.file_path, 'original'),
      logo: this.pickLogo(d.images),
      certification: cert,
      creators: (d.created_by || []).map(c => c.name).join(', '),
      networks: (d.networks || []).map(n => n.name),
      numberOfSeasons: d.number_of_seasons,
      cast: castOf(d.credits),
      trailer: trailerOf(d.videos),
      seasons: seasonData
    };
  }
}

// ---------- utilidades de coincidencia ----------
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function cleanQuery(t) {
  return String(t)
    .replace(/\((?:imax|remastered|remasterizad[ao]|extended|director'?s cut|version extendida|versión extendida|4k|uhd)\)/ig, ' ')
    .replace(/\s+I$/, '')            // "The Godfather I" -> "The Godfather"
    .replace(/\s+/g, ' ').trim();
}

function romanToInt(r) { return { II: 2, III: 3, IV: 4, V: 5, VI: 6 }[r] || r; }

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** "Scorssese" ~ "Martin Scorsese", "Hitchcock" ~ "Alfred Hitchcock", "Satosi Kon" ~ "Satoshi Kon" */
function personMatches(hint, name) {
  const h = norm(hint).split(' ').filter(w => w.length >= 3);
  const n = norm(name).split(' ').filter(w => w.length >= 2);
  if (!h.length || !n.length) return false;
  const surname = n[n.length - 1];
  return h.some(w => {
    const tol = w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
    return lev(w, surname) <= tol || n.some(x => x.length >= 4 && lev(w, x) <= tol && w[0] === x[0]);
  });
}

/** Ordena resultados: título exacto y año cercano primero, manteniendo la popularidad de TMDB como desempate */
function rankResults(results, query, year) {
  const q = norm(query);
  return results.map((r, i) => {
    let s = -i * 0.5;
    const t = norm(r.title), o = norm(r.originalTitle);
    if (t === q || o === q) s += 10;
    else if (t.startsWith(q) || o.startsWith(q)) s += 4;
    const qt = q.split(' ');
    const has = t2 => { const set = new Set(t2.split(' ')); return qt.every(w => set.has(w)); };
    if (has(t) || has(o)) s += 3;   // contiene todas las palabras ("The Godfather II" -> "...Part II")
    if (year && r.year) s += Math.max(0, 4 - Math.abs(+r.year - year) * 2);
    return { ...r, _s: s };
  }).sort((a, b) => b._s - a._s);
}

function img(p, size) { return p ? IMG + size + p : null; }

function castOf(credits) {
  return (credits?.cast || []).slice(0, 15).map(c => ({
    name: c.name, character: c.character, photo: img(c.profile_path, 'w185')
  }));
}

function trailerOf(videos) {
  const v = (videos?.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
  return v ? `https://www.youtube.com/watch?v=${v.key}` : null;
}

module.exports = { TMDB, personMatches, cleanQuery, rankResults };
