// Coloca en la biblioteca lo que termina de descargar aMule: lo identifica en TMDB, lo renombra con el título en
// inglés y lo mueve a la carpeta elegida o, en automático, a «Películas» o a la carpeta de su serie.
//   Película: «Night of the Living Dead (1968).mkv»
//   Episodio: «Series/Dracula (2020)/Dracula (2020) 1x01 The Rules of the Beast.mkv»
const fs = require('fs');
const path = require('path');
const { parseName, categoryDir } = require('../../src/main/scanner');

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Sólo patrones inequívocos: el resto de heurísticas del escáner ("Parte 2", "02 - …") darían falsos episodios.
// index: dónde empieza la marca, para quedarse con el título que va delante
function episodeOf(fileName) {
  const base = fileName.replace(/[._]/g, ' ');
  let m;
  if ((m = /S(\d{1,2})\s*[-.]?\s*E(\d{1,3})/i.exec(base))) return { season: +m[1], episode: +m[2], index: m.index };
  if ((m = /(?:^|\D)(\d{1,2})x(\d{2,3})(?:\D|$)/i.exec(base))) return { season: +m[1], episode: +m[2], index: m.index };
  // "Cap.102" de las releases españolas
  if ((m = /cap(?:itulo|ítulo)?\s*\.?\s*(\d{1,2})(\d{2})(?!\d)/i.exec(base))) return { season: +m[1], episode: +m[2], index: m.index };
  return null;
}

/** Nombre válido en Windows y en el NAS: «Mission: Impossible» → «Mission - Impossible» */
function safeName(s) {
  return String(s || '').replace(/\s*:\s*/g, ' - ').replace(/[<>"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim();
}

/**
 * Qué es el archivo, sin ficha previa: la mejor coincidencia de TMDB y si es segura (el título coincide con uno de
 * los de la ficha y, en películas, también el año; sin año no se sabe qué versión es: «Night of the Living Dead»).
 * api: TMDB en el idioma de la biblioteca. Devuelve null si TMDB no encuentra nada.
 */
async function identify(fileName, api) {
  const ep = episodeOf(fileName);
  const type = ep ? 'series' : 'movie';
  const raw = ep ? fileName.replace(/[._]/g, ' ').slice(0, ep.index) : fileName;
  const { title, year } = parseName(raw.replace(/[\s-]+$/, '') || fileName);
  if (!title) return null;
  const id = await api.findBest(type, title, year);
  if (!id) return null;
  const hit = (await api.searchMatch(type, title, year).catch(() => [])).find(r => r.id === id);
  const sameTitle = !!hit && [...hit.titles, hit.originalTitle].some(t => norm(t) === norm(title));
  const certain = sameTitle && (type === 'series' ? !year || !hit.year || Math.abs(+hit.year - year) <= 1 : !!year && +hit.year === year);
  return { type, tmdb: id, title: hit?.title || title, year: hit?.year ? +hit.year : year || null, season: ep?.season, episode: ep?.episode, certain };
}

/** Títulos en inglés de TMDB. info: { type, tmdb, season?, episode? } · api: TMDB (cualquier idioma: se pide en-US) */
async function englishNames(api, info) {
  if (info.type === 'movie') {
    const d = await api.get(`/movie/${info.tmdb}`, { language: 'en-US' });
    return { title: d.title || d.original_title, year: +(d.release_date || '').slice(0, 4) || null };
  }
  const [d, e] = await Promise.all([
    api.get(`/tv/${info.tmdb}`, { language: 'en-US' }),
    info.season != null ? api.get(`/tv/${info.tmdb}/season/${info.season}/episode/${info.episode}`, { language: 'en-US' }).catch(() => null) : null
  ]);
  // TMDB rellena con «Episode 5» los que no tienen título: mejor sin él
  const epTitle = e?.name && !/^episode \d+$/i.test(e.name.trim()) ? e.name : '';
  return { title: d.name || d.original_name, year: +(d.first_air_date || '').slice(0, 4) || null, epTitle };
}

const withYear = (title, year) => safeName(year ? `${title} (${year})` : title);
const pad = n => String(n).padStart(2, '0');

/**
 * Ruta final. info: { type, tmdb, season, episode } · names: englishNames() · ext: «.mkv»
 * roots: las carpetas de biblioteca entre las que elige «Automática» (la primera con «Películas» o «Series», o la
 * primera) · dest: carpeta elegida o null para «Automática» · items: series de la biblioteca, para reutilizar su carpeta
 */
function targetPath({ info, names, ext, roots, dest, items = [] }) {
  const show = withYear(names.title, names.year);
  const category = kind => roots.map(r => categoryDir(r, kind)).find(Boolean) || roots[0];
  if (info.type === 'movie') return path.join(dest || category('movies'), show + ext);
  const file = safeName(`${show} ${info.season}x${pad(info.episode)}${names.epTitle ? ' ' + names.epTitle : ''}`) + ext;
  const series = items.filter(it => it.type === 'series' && (dest ? path.resolve(it.path) === path.resolve(dest) || isInside(dest, it.path) : roots.some(r => isInside(r, it.path))));
  // la carpeta elegida ya es la de una serie: ahí mismo
  if (dest && series.some(it => path.resolve(it.path) === path.resolve(dest))) return path.join(dest, file);
  // la serie ya está en la biblioteca (por su ficha): su carpeta, si cae dentro de la elegida
  const known = series.find(it => it.meta?.tmdbId === info.tmdb);
  if (known) return path.join(known.path, file);
  return path.join(dest || category('series'), show, file);
}

function isInside(dir, p) {
  const rel = path.relative(dir, p);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Mueve el archivo sin sobrescribir nunca nada, ni aunque dos descargas acaben a la vez con el mismo nombre: un
 * enlace duro falla si el destino ya existe (rename lo reemplazaría). Entre discos distintos (otro NAS por SMB) copia
 * antes a un ".part" (que el vigilante de la biblioteca ignora), para que no aparezca a medio copiar.
 */
async function moveInto(src, dest) {
  const exists = () => new Error(`Ya existe «${path.basename(dest)}» en la biblioteca`);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.promises.link(src, dest);
  } catch (e) {
    if (e.code === 'EEXIST') throw exists();
    if (e.code !== 'EXDEV') throw e;
    const tmp = dest + '.part';
    await fs.promises.copyFile(src, tmp, fs.constants.COPYFILE_EXCL);
    try { await fs.promises.link(tmp, dest); }
    catch (e2) {
      if (e2.code === 'EEXIST') { await fs.promises.unlink(tmp).catch(() => {}); throw exists(); }
      // las carpetas de otro NAS montadas por SMB no admiten enlaces duros: renombrar, comprobando antes que no exista
      if (fs.existsSync(dest)) { await fs.promises.unlink(tmp).catch(() => {}); throw exists(); }
      try { await fs.promises.rename(tmp, dest); }
      catch (e3) { await fs.promises.unlink(tmp).catch(() => {}); throw e3; }
    }
    await fs.promises.unlink(tmp).catch(() => {});
  }
  await fs.promises.unlink(src);
  return dest;
}

module.exports = { episodeOf, safeName, identify, englishNames, targetPath, moveInto, isInside };
