// Peticiones: películas y series que los usuarios piden y que todavía no están en la biblioteca.
// Una petición por título (clave de TMDB); si otro usuario pide lo mismo, se suma a la misma.
// Los administradores la marcan como conseguida o rechazada; al aparecer en la biblioteca se marca sola.
const crypto = require('crypto');
const EventEmitter = require('events');
const { store } = require('./store');

const STATUSES = new Set(['pending', 'done', 'rejected']);
const MAX_PENDING_PER_USER = 50;
// las resueltas se guardan un tiempo para que quien las pidió vea qué pasó, y luego se borran
const KEEP_RESOLVED_DAYS = 60;

class Requests extends EventEmitter {
  constructor(dataDir) {
    super();
    this.store = store(dataDir, 'requests.json', { items: [] });
    this.prune();
  }

  get items() { return this.store.data.items; }

  /** Las de todos (administrador) o sólo las suyas */
  list(user, admin) {
    const name = user.toLowerCase();
    const mine = r => r.users.some(u => u.name === name);
    return this.items.filter(r => admin || mine(r)).map(r => ({ ...r, mine: mine(r) }));
  }

  pendingCount() {
    return this.items.filter(r => r.status === 'pending').length;
  }

  /** Pedir un título. entry: { tmdb, type, title, year, poster, note } */
  create(user, entry) {
    const name = user.toLowerCase();
    const tmdb = Number(entry?.tmdb);
    const type = entry?.type === 'series' || entry?.type === 'tv' ? 'series' : 'movie';
    if (!Number.isInteger(tmdb) || tmdb <= 0) throw httpError(400, 'Falta la ficha de TMDB del título');
    const title = String(entry.title || '').trim().slice(0, 200);
    if (!title) throw httpError(400, 'Falta el título');
    const key = `${type}:${tmdb}`;
    const note = String(entry.note || '').trim().slice(0, 300);
    let r = this.items.find(x => x.key === key);
    if (r?.users.some(u => u.name === name) && r.status === 'pending') return r;
    if (this.items.filter(x => x.status === 'pending' && x.users.some(u => u.name === name)).length >= MAX_PENDING_PER_USER) {
      throw httpError(400, `Tienes ya ${MAX_PENDING_PER_USER} peticiones pendientes`);
    }
    const now = Date.now();
    if (!r) {
      r = {
        id: crypto.randomBytes(8).toString('hex'), key, tmdb, type, title,
        year: Number.isInteger(+entry.year) && +entry.year > 1800 ? +entry.year : null,
        poster: typeof entry.poster === 'string' && entry.poster.startsWith('https://image.tmdb.org/') ? entry.poster : null,
        users: [], status: 'pending', at: now
      };
      this.items.unshift(r);
    } else if (r.status !== 'pending') {
      // se vuelve a pedir algo rechazado (o conseguido y luego borrado): otra vez pendiente
      Object.assign(r, { status: 'pending', at: now, resolvedAt: undefined, resolvedBy: undefined, reply: undefined });
      r.users = r.users.filter(u => u.name !== name);
    }
    r.users.push({ name, user, at: now, note: note || undefined });
    this.save();
    this.emit('created', { request: r, by: user });
    return r;
  }

  /** Quitar la petición propia (si nadie más la ha pedido, desaparece) */
  cancel(user, id) {
    const name = user.toLowerCase();
    const r = this.items.find(x => x.id === id);
    if (!r || !r.users.some(u => u.name === name)) throw httpError(404, 'Petición no encontrada');
    r.users = r.users.filter(u => u.name !== name);
    if (!r.users.length) this.store.data.items = this.items.filter(x => x !== r);
    this.save();
  }

  /** Administrador: conseguida, rechazada o de nuevo pendiente, con una respuesta opcional */
  resolve(admin, id, { status, reply }) {
    const r = this.items.find(x => x.id === id);
    if (!r) throw httpError(404, 'Petición no encontrada');
    if (!STATUSES.has(status)) throw httpError(400, 'Estado no válido');
    r.status = status;
    r.reply = String(reply || '').trim().slice(0, 300) || undefined;
    r.resolvedAt = status === 'pending' ? undefined : Date.now();
    r.resolvedBy = status === 'pending' ? undefined : admin;
    this.save();
    if (status !== 'pending') this.emit('resolved', r);
    return r;
  }

  remove(id) {
    this.store.data.items = this.items.filter(x => x.id !== id);
    this.save();
  }

  /** Lo pedido que ya está en la biblioteca (por su ficha de TMDB) se da por conseguido */
  matchLibrary(items) {
    const have = new Set(items.filter(it => it.meta?.tmdbId).map(it => `${it.type}:${it.meta.tmdbId}`));
    let changed = false;
    for (const r of this.items) {
      if (r.status !== 'pending' || !have.has(r.key)) continue;
      Object.assign(r, { status: 'done', resolvedAt: Date.now(), resolvedBy: null });
      changed = true;
      this.emit('resolved', r);
    }
    if (changed) this.save();
  }

  prune() {
    const limit = Date.now() - KEEP_RESOLVED_DAYS * 864e5;
    const before = this.items.length;
    this.store.data.items = this.items.filter(r => r.status === 'pending' || (r.resolvedAt || r.at) > limit);
    if (this.items.length !== before) this.store.save();
  }

  save() {
    this.store.save();
    this.emit('changed');
  }
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

module.exports = { Requests };
