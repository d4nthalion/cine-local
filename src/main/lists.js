// Listas propias además de «Mi lista» (que sigue siendo state.favorites, para no romper lo que ya hay).
// Lo usan la app de escritorio (state.json) y CineLocal Server (data/users/<usuario>.json).
//
// Cada entrada describe la película o serie, no el archivo: { key, tmdb, type, title, year, poster }.
// Así una lista puede tener títulos que aún no están en la biblioteca (aparecen como disponibles al conseguirlos),
// sobrevive a mover o renombrar archivos y vale igual en el PC, el servidor y el móvil.
// Sin ficha de TMDB se guarda el id de la biblioteca: { key: 'id:<id>', id, type, title, year }.
const crypto = require('crypto');

const MAX_LISTS = 50;
const MAX_ITEMS = 5000;
const MAX_NAME = 60;

const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** Sólo los campos conocidos y con valores razonables (lo que llega de la ventana o de otro dispositivo) */
function cleanEntry(e) {
  if (!e || typeof e !== 'object') throw new Error('Falta el título');
  const type = e.type === 'series' ? 'series' : 'movie';
  const tmdb = Number.isInteger(+e.tmdb) && +e.tmdb > 0 ? +e.tmdb : null;
  const id = typeof e.id === 'string' && /^[\w-]{1,64}$/.test(e.id) ? e.id : null;
  if (!tmdb && !id) throw new Error('Falta el título');
  const poster = typeof e.poster === 'string' && /^https:\/\/image\.tmdb\.org\//.test(e.poster) ? e.poster.slice(0, 300) : null;
  return {
    key: tmdb ? `${type}:${tmdb}` : `id:${id}`,
    ...(tmdb ? { tmdb } : { id }),
    type,
    title: String(e.title || '').slice(0, 200),
    year: Number.isInteger(+e.year) && +e.year > 1800 ? +e.year : null,
    poster
  };
}

/**
 * Aplica una operación y devuelve las listas nuevas (no modifica las de entrada).
 * op: create (name, entry opcional) · rename (id, name) · delete (id) · toggle (id, entry)
 */
function applyListOp(lists = [], { op, id, name, entry } = {}) {
  const out = lists.map(l => ({ ...l, items: [...l.items] }));
  const find = () => {
    const l = out.find(x => x.id === id);
    if (!l) throw new Error('Esa lista ya no existe');
    return l;
  };
  const sameName = (n, except) => out.some(x => x !== except && x.name.toLowerCase() === n.toLowerCase());
  if (op === 'create') {
    const n = cleanName(name);
    if (!n) throw new Error('Escribe un nombre para la lista');
    if (out.length >= MAX_LISTS) throw new Error(`Como mucho ${MAX_LISTS} listas`);
    if (sameName(n) || n.toLowerCase() === 'mi lista') throw new Error(`Ya tienes una lista llamada «${n}»`);
    out.push({ id: 'l' + crypto.randomBytes(5).toString('hex'), name: n, items: entry ? [cleanEntry(entry)] : [], created: Date.now() });
  } else if (op === 'rename') {
    const l = find(), n = cleanName(name);
    if (!n) throw new Error('Escribe un nombre para la lista');
    if (sameName(n, l) || n.toLowerCase() === 'mi lista') throw new Error(`Ya tienes una lista llamada «${n}»`);
    l.name = n;
  } else if (op === 'delete') {
    find();
    return out.filter(l => l.id !== id);
  } else if (op === 'toggle') {
    const l = find(), e = cleanEntry(entry);
    const i = l.items.findIndex(x => x.key === e.key);
    if (i >= 0) l.items.splice(i, 1);
    else if (l.items.length < MAX_ITEMS) l.items.unshift(e);   // lo último añadido, primero (como Mi lista)
  } else {
    throw new Error('Operación de listas no válida');
  }
  return out;
}

module.exports = { applyListOp, cleanEntry };
