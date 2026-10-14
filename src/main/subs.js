// Localiza subtítulos externos guardados en una carpeta aparte (p. ej. "D:\Películas y Series\Subtítulos\...")
const fs = require('fs');
const path = require('path');
const { LANG_TAGS } = require('./player');

const SUB_EXT = new Set(['.srt', '.ass', '.ssa', '.vtt', '.sub', '.sup']);
const SUB_DIRS = /^(subt[ií]tulos|subtitles|subtitle|subs?)$/i;
const LANG_NAMES = { spa: 'Español', eng: 'Inglés', fre: 'Francés', ger: 'Alemán', ita: 'Italiano', por: 'Portugués', cat: 'Catalán', baq: 'Euskera', glg: 'Gallego', jpn: 'Japonés', kor: 'Coreano', chi: 'Chino', rus: 'Ruso' };

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// etiqueta -> código (es, spa, castellano... -> spa)
const REVERSE = {};
for (const [code, tags] of Object.entries(LANG_TAGS)) for (const t of tags) REVERSE[norm(t)] = code;
REVERSE.espanol = 'spa'; REVERSE.latino = 'spa'; REVERSE.ingles = 'eng'; REVERSE.forced = undefined;

function walk(dir, depth, out) {
  if (depth > 4) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, depth + 1, out);
    else if (SUB_EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
}

function detectLang(relPath, titleWords) {
  const parts = relPath.split(/[\\/]/).reverse(); // primero el nombre del archivo, luego las carpetas
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    if (i === 0) p = p.slice(0, -path.extname(p).length);
    const toks = norm(p).split(' ').reverse();
    for (const t of toks) {
      if (titleWords.has(t)) continue;           // "It" en "It Follows" no es italiano
      if (REVERSE[t]) return REVERSE[t];
    }
  }
  return null;
}

/**
 * @param {string} root carpeta de la biblioteca
 * @param {object} item película (con .meta opcional)
 */
function findExternalSubs(root, item) {
  if (!root || !item) return [];
  const dirs = [];
  try {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) if (e.isDirectory() && SUB_DIRS.test(e.name)) dirs.push(path.join(root, e.name));
  } catch { return []; }
  // también una carpeta "Subs"/"Subtítulos" junto al propio vídeo
  const own = path.dirname(item.path);
  if (own !== root) {
    try { for (const e of fs.readdirSync(own, { withFileTypes: true })) if (e.isDirectory() && SUB_DIRS.test(e.name)) dirs.push(path.join(own, e.name)); } catch {}
  }
  if (!dirs.length) return [];

  const files = [];
  for (const d of dirs) walk(d, 0, files);
  if (!files.length) return [];

  const m = item.meta || {};
  const imdb = (m.imdbId || '').toLowerCase();
  const raw = item.title.split(/\s+[-–]\s+/).pop();
  const titles = [...new Set([m.title, m.originalTitle, raw, item.title].map(norm).filter(t => t && t.length >= 4))];
  const titleWords = new Set(titles.join(' ').split(' '));

  const out = [];
  for (const f of files) {
    const rel = path.relative(root, f);
    const lower = rel.toLowerCase();
    const n = ' ' + norm(rel) + ' ';
    const hit = (imdb && lower.includes(imdb)) || titles.some(t => n.includes(' ' + t + ' '));
    if (!hit) continue;
    const lang = detectLang(rel, titleWords);
    out.push({ path: f, lang, title: `${LANG_NAMES[lang] || 'Subtítulos'} (externo)` });
  }
  return out;
}

module.exports = { findExternalSubs, detectLang };
