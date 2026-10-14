// Lleva a la biblioteca los vídeos que termina de descargar eMule.
// Película → raíz de la biblioteca. Episodio (S01E02, 1x02, Cap.102) → carpeta de su serie.
const fs = require('fs');
const path = require('path');
const { parseName, isVideo } = require('../scanner');

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Sólo patrones inequívocos: el resto de heurísticas del escáner ("Parte 2", "02 - …") darían falsos episodios
function episodeOf(fileName) {
  const base = fileName.replace(/[._]/g, ' ');
  let m;
  if ((m = base.match(/S(\d{1,2})\s*[-.]?\s*E(\d{1,3})/i))) return { season: +m[1], episode: +m[2] };
  if ((m = base.match(/(?:^|\D)(\d{1,2})x(\d{2,3})(?:\D|$)/i))) return { season: +m[1], episode: +m[2] };
  if ((m = base.match(/cap(?:itulo|ítulo)?\s*\.?\s*(\d{1,2})(\d{2})(?!\d)/i))) return { season: +m[1], episode: +m[2] };
  return null;
}

function safeName(s) { return s.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim(); }

/**
 * Carpeta de destino dentro de la biblioteca.
 * items: elementos de la biblioteca (con meta) para reutilizar la carpeta de una serie que ya existe.
 */
function destinationFor(fileName, root, items = []) {
  const ep = episodeOf(fileName);
  if (!ep) return path.join(root, fileName);
  // "Cap.102" de releases españolas: el título está antes de "Cap"
  const { title, year } = parseName(fileName.replace(/[\s._-]*cap(?:itulo|ítulo)?\s*\.?\s*\d{3,4}.*$/i, ''));
  const key = norm(title);
  const show = items.find(it => it.type === 'series' && [it.title, it.meta?.title, it.meta?.originalTitle].some(t => t && norm(t) === key));
  const dir = show ? show.path : path.join(root, safeName(year ? `${title} (${year})` : title) || 'Series');
  return path.join(dir, fileName);
}

/** Busca el archivo completado en las carpetas "Incoming" de eMule */
function findCompleted(name, incomingDirs) {
  for (const d of incomingDirs) {
    const p = path.join(d, name);
    try { if (fs.statSync(p).isFile()) return p; } catch {}
  }
  return null;
}

/**
 * Mueve el archivo. Entre discos distintos copia a un ".part" (que el vigilante de la biblioteca ignora)
 * y lo renombra al terminar, para que no aparezca a medio copiar.
 */
async function moveInto(src, dest) {
  if (fs.existsSync(dest)) throw new Error('Ya existe un archivo con ese nombre en la biblioteca');
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.promises.rename(src, dest);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    const tmp = dest + '.part';
    await fs.promises.copyFile(src, tmp);
    await fs.promises.rename(tmp, dest);
    await fs.promises.unlink(src);
  }
  return dest;
}

async function organize({ name, incomingDirs, root, items }) {
  if (!isVideo(name)) return { skipped: 'no es un vídeo' };
  const src = findCompleted(name, incomingDirs);
  if (!src) return { skipped: 'no se encuentra en la carpeta de descargas de eMule' };
  const dest = destinationFor(name, root, items);
  if (path.resolve(src) === path.resolve(dest)) return { dest };
  return { dest: await moveInto(src, dest) };
}

module.exports = { organize, destinationFor, episodeOf };
