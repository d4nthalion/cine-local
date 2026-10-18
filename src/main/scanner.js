// Escáner de la biblioteca: archivo suelto = película, carpeta = serie.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VIDEO_EXT = new Set([
  '.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv', '.ts', '.m2ts', '.mts',
  '.webm', '.mpg', '.mpeg', '.flv', '.vob', '.ogv', '.divx', '.3gp'
]);

const SKIP_DIRS = /^(sample|samples|extras?|featurettes?|behind the scenes|deleted scenes|trailers?|\$recycle\.bin|system volume information|\..*)$/i;
const SKIP_FILES = /(^|[\s._-])sample([\s._-]|$)/i;

const JUNK = [
  '2160p', '1080p', '1080i', '720p', '576p', '480p', '4k', 'uhd', 'hdr', 'hdr10', 'dv', 'dolby vision',
  'bluray', 'blu-ray', 'bdrip', 'brrip', 'bdremux', 'remux', 'web-dl', 'webdl', 'webrip', 'web', 'hdtv',
  'dvdrip', 'dvdscr', 'dvd', 'hdrip', 'microhd', 'screener', 'hdcam', 'cam', 'ts-screener',
  'x264', 'x265', 'h264', 'h.264', 'h265', 'h.265', 'hevc', 'avc', 'xvid', 'divx', '10bit', '8bit',
  'aac', 'ac3', 'eac3', 'dts', 'dts-hd', 'truehd', 'atmos', 'ddp', 'dd5', 'flac', 'mp3', '5.1', '7.1', '2.0',
  'castellano', 'español', 'espanol', 'spanish', 'latino', 'english', 'ingles', 'inglés', 'vose', 'vos', 'subs',
  'multi', 'dual', 'dual audio', 'multisub', 'subbed', 'dubbed',
  'proper', 'repack', 'extended', 'unrated', 'directors cut', "director's cut", 'remastered', 'imax',
  'internal', 'limited', 'complete', 'completa', 'temporada', 'season', 'amzn', 'nf', 'hmax', 'dsnp', 'atvp'
];
const JUNK_RE = new RegExp(
  '(^|\\s)(' + JUNK.map(j => j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(\\s|$)', 'i'
);

function hashId(str) {
  return crypto.createHash('sha1').update(str.toLowerCase()).digest('hex').slice(0, 12);
}

function isVideo(name) {
  return VIDEO_EXT.has(path.extname(name).toLowerCase());
}

/** Convierte "The.Matrix.1999.1080p.BluRay.x264" en { title: "The Matrix", year: 1999 } */
function parseName(raw) {
  let s = raw;
  if (isVideo(s)) s = s.slice(0, -path.extname(s).length);
  s = s.replace(/\[[^\]]*\]/g, ' ')          // [etiquetas]
       .replace(/\{[^}]*\}/g, ' ')
       .replace(/[._]+/g, ' ')
       .replace(/\s+/g, ' ')
       .trim();

  let year = null;
  // año entre paréntesis tiene prioridad: "Dune (2021)"
  const maxYear = new Date().getFullYear() + 1;
  let m = s.match(/\((19\d{2}|20\d{2})\)/);
  if (m && +m[1] <= maxYear) {
    year = parseInt(m[1], 10);
    s = s.slice(0, m.index);
  } else {
    // último año que no esté al principio del título ("2001 Una odisea... 1968")
    const re = /(?:^|\s)(19\d{2}|20\d{2})(?=\s|$|-)/g;
    let last = null, r;
    while ((r = re.exec(s))) {
      if (r.index === 0 || +r[1] > maxYear) continue;
      // sólo es un año si detrás no queda más título ("2001 A Space Odyssey" no es del 2001)
      const rest = s.slice(r.index + r[0].length).trim();
      const restClean = rest.replace(/^[-–\s]+/, '');
      if (!restClean || JUNK_RE.test(' ' + restClean.split(' ')[0] + ' ') || /^[\[(]/.test(restClean)) last = r;
    }
    if (last) {
      year = parseInt(last[1], 10);
      s = s.slice(0, last.index);
    }
  }
  s = s.replace(/\([^)]*\)/g, ' ');
  // cortar en la primera etiqueta basura
  const j = s.match(JUNK_RE);
  if (j && j.index > 0) s = s.slice(0, j.index);
  // quitar marcadores de temporada/episodio en nombres de carpeta
  s = s.replace(/\s(S\d{1,2}(?:E\d{1,3})?(?:\s*-\s*S?\d{1,2})?|\d{1,2}x\d{2,3})(\s.*)?$/i, '');
  s = s.replace(/\s[-–]\s*$/, '').replace(/\s+/g, ' ').trim();
  if (!s) s = raw;
  return { title: s, year };
}

function seasonFromDir(name) {
  const m = name.match(/(?:season|temporada|temp|series|serie|staffel|saison|^s)\s*\.?\s*(\d{1,2})\b/i)
        || name.match(/^(\d{1,2})$/);
  if (m) return parseInt(m[1], 10);
  if (/^(specials?|especiales?)$/i.test(name)) return 0;
  return null;
}

/** Intenta extraer temporada y episodio de un nombre de archivo */
function parseEpisode(fileName, dirSeason) {
  const base = fileName.slice(0, -path.extname(fileName).length).replace(/[._]/g, ' ');
  let m;
  if ((m = base.match(/S(\d{1,2})\s*[-.]?\s*E(\d{1,3})(?:\s*-?\s*E(\d{1,3}))?/i)))
    return { season: +m[1], episode: +m[2], episodeEnd: m[3] ? +m[3] : null };
  if ((m = base.match(/(?:^|\D)(\d{1,2})x(\d{2,3})(?:\D|$)/i)))
    return { season: +m[1], episode: +m[2] };
  // "Cap.102" / "Capitulo 102" (formato habitual en releases españolas)
  if ((m = base.match(/cap(?:itulo|ítulo)?\s*\.?\s*(\d{1,2})(\d{2})(?!\d)/i)))
    return { season: +m[1], episode: +m[2] };
  if ((m = base.match(/(?:episod(?:e|io)|ep|cap(?:itulo|ítulo)?|e)\s*\.?\s*(\d{1,3})(?!\d)/i)))
    return { season: dirSeason ?? 1, episode: +m[1] };
  if ((m = base.match(/^(\d{1,3})(?:\s|-|$)/)))
    return { season: dirSeason ?? 1, episode: +m[1] };
  return null;
}

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function walkVideos(dir, depth = 0, out = []) {
  if (depth > 4) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.test(e.name)) walkVideos(full, depth + 1, out);
    } else if (e.isFile() && isVideo(e.name) && !SKIP_FILES.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function scanSeries(dirPath, dirName, options) {
  const files = walkVideos(dirPath).sort(naturalCompare);
  if (!files.length) return null;
  const st = safeStat(dirPath);
  const info = parseName(dirName);

  // Excepción opcional: carpeta con un único vídeo sin patrón de episodio -> película
  if (options.singleFileFolderAsMovie && files.length === 1 &&
      !parseEpisode(path.basename(files[0]), null)?.episode) {
    const fst = safeStat(files[0]);
    return {
      id: hashId('movie:' + files[0]), type: 'movie', path: files[0], folder: dirPath,
      fileName: path.basename(files[0]), title: info.title, year: info.year,
      size: fst?.size || 0, added: (fst?.birthtimeMs || fst?.mtimeMs || 0)
    };
  }

  const episodes = [];
  const unplaced = [];
  for (const f of files) {
    const rel = path.relative(dirPath, f);
    const parts = rel.split(path.sep);
    let dirSeason = null;
    for (let i = parts.length - 2; i >= 0; i--) {
      const s = seasonFromDir(parts[i]);
      if (s !== null) { dirSeason = s; break; }
    }
    const ep = parseEpisode(path.basename(f), dirSeason);
    const fst = safeStat(f);
    const base = {
      id: hashId('ep:' + f), path: f, fileName: path.basename(f),
      size: fst?.size || 0, added: fst?.birthtimeMs || fst?.mtimeMs || 0
    };
    if (ep) episodes.push({ ...base, season: ep.season, episode: ep.episode, episodeEnd: ep.episodeEnd || null });
    else unplaced.push({ ...base, dirSeason });
  }
  // Archivos sin numeración: se colocan detrás, por orden natural
  for (const u of unplaced) {
    const season = u.dirSeason ?? 1;
    const max = episodes.filter(e => e.season === season).reduce((a, e) => Math.max(a, e.episode), 0);
    const { dirSeason, ...rest } = u;
    episodes.push({ ...rest, season, episode: max + 1, guessed: true });
  }
  episodes.sort((a, b) => a.season - b.season || a.episode - b.episode || naturalCompare(a.fileName, b.fileName));

  return {
    id: hashId('series:' + dirPath), type: 'series', path: dirPath, folderName: dirName,
    title: info.title, year: info.year,
    added: Math.max(st?.mtimeMs || 0, ...episodes.map(e => e.added)),
    seasons: [...new Set(episodes.map(e => e.season))].sort((a, b) => a - b),
    episodes
  };
}

function scanLibrary(root, options = {}) {
  if (!root || !fs.existsSync(root)) {
    return { ok: false, error: `No se encuentra la carpeta "${root}"`, items: [] };
  }
  const items = [];
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch (e) { return { ok: false, error: e.message, items: [] }; }

  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.test(e.name)) continue;
      const s = scanSeries(full, e.name, options);
      if (s) items.push(s);
    } else if (e.isFile() && isVideo(e.name) && !SKIP_FILES.test(e.name)) {
      const st = safeStat(full);
      const info = parseName(e.name);
      items.push({
        id: hashId('movie:' + full), type: 'movie', path: full, fileName: e.name,
        title: info.title, year: info.year,
        size: st?.size || 0, added: st?.birthtimeMs || st?.mtimeMs || 0
      });
    }
  }
  items.sort((a, b) => naturalCompare(a.title, b.title));
  return { ok: true, items, scannedAt: Date.now() };
}

/**
 * Escanea varias carpetas de biblioteca y junta el resultado.
 * Una serie repartida entre carpetas (mismo título y año) se muestra como una sola, con el id de la primera.
 * Devuelve también qué carpetas fallaron, para conservar lo que ya se conocía de ellas.
 */
function scanLibraries(roots, options = {}) {
  const items = [], failed = [];
  const shows = new Map();
  for (const root of roots) {
    const r = scanLibrary(root, options);
    if (!r.ok) { failed.push({ root, error: r.error }); continue; }
    for (const it of r.items) {
      if (it.type !== 'series') { items.push(it); continue; }
      const key = it.title.toLowerCase() + '|' + (it.year || '');
      const prev = shows.get(key);
      if (!prev) { shows.set(key, it); items.push(it); continue; }
      prev.episodes = [...prev.episodes, ...it.episodes]
        .sort((a, b) => a.season - b.season || a.episode - b.episode || naturalCompare(a.fileName, b.fileName));
      prev.seasons = [...new Set(prev.episodes.map(e => e.season))].sort((a, b) => a - b);
      prev.added = Math.max(prev.added, it.added);
      (prev.extraPaths ||= []).push(it.path);
    }
  }
  items.sort((a, b) => naturalCompare(a.title, b.title));
  return { ok: failed.length < roots.length, items, failed, scannedAt: Date.now() };
}

module.exports = { scanLibrary, scanLibraries, parseName, parseEpisode, isVideo, hashId };
