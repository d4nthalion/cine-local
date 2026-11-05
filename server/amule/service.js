// Descargas con aMule en el NAS: consulta aMule periódicamente, recuerda para qué título, a qué carpeta y de quién es
// cada descarga y, al terminar, la renombra y la mueve a la biblioteca. Lo que no se puede identificar con seguridad
// queda «pendiente de colocar» hasta que alguien elige la ficha y la carpeta.
// Descargan los administradores (en cualquier carpeta de la biblioteca) y los moderadores con permiso (en las de sus
// NAS); cada moderador sólo ve y toca sus propias descargas.
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { isVideo } = require('../../src/main/scanner');
const { episodeOf, identify, englishNames, targetPath, moveInto, isInside } = require('./organize');

const FAST = 4000;      // con aMule respondiendo
const SLOW = 15000;     // aMule parado o sin configurar
const AUTH_RETRY = 5 * 60000;   // contraseña rechazada
const KEEP_PLACED = 30; // últimas colocadas que se enseñan en Descargas
const SKIP_DIRS = /^(\..*|@.*|#recycle|#snapshot|\$recycle\.bin|system volume information)$/i;
const HASH = /^[0-9a-f]{32}$/i;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const keyOf = user => String(user || '').toLowerCase();
const within = (root, p) => path.resolve(root) === path.resolve(p) || isInside(root, p);
/** Las carpetas en las que de verdad se puede escribir (las de otro NAS pueden estar montadas sólo para leer) */
const writable = roots => roots.filter(r => {
  try { fs.accessSync(r, fs.constants.W_OK); return fs.statSync(r).isDirectory(); } catch { return false; }
});

class AmuleService extends EventEmitter {
  /**
   * client: AmuleClient · library: Library del servidor · store: { plans, tracked, pending, placed }
   * incoming: carpeta de aMule con lo terminado, vista desde este contenedor
   */
  constructor({ client, library, store, incoming }) {
    super();
    this.client = client;
    this.library = library;
    this.store = store;
    this.incoming = incoming;
    this.snapshot = { ok: false, code: 'offline', error: null, status: null, downloads: [], pending: [], placed: [] };
    this.last = '';
    this.timer = null;
    this.busy = new Set();
  }

  get enabled() { return !!this.client; }
  get data() { return this.store.data; }

  start() {
    if (!this.enabled) {
      this.snapshot = { ...this.snapshot, code: 'unconfigured' };
      return;
    }
    this.tick();
  }

  stop() { clearTimeout(this.timer); this.timer = null; }

  async tick() {
    clearTimeout(this.timer);
    let next = FAST;
    // contraseña mal: muy de tarde en tarde, que amuleapi bloquea la IP tras 30 fallos
    try { await this.refresh(); } catch (e) { next = e.code === 'auth' ? AUTH_RETRY : SLOW; }
    this.timer = setTimeout(() => this.tick(), next);
    this.timer.unref?.();
  }

  /**
   * Lee el estado y las descargas; lanza si aMule no está disponible. Si se cruzan dos lecturas (el sondeo y la de
   * después de una acción), sólo cuenta la última: una respuesta vieja volvería a dar por seguida una ya colocada
   */
  async refresh() {
    const gen = this.gen = (this.gen || 0) + 1;
    try {
      const r = await this.client.transfers();
      if (gen !== this.gen) return this.snapshot;
      this.publish({ ok: true, code: null, error: null, ...r });
      this.handleCompleted(r.downloads);
    } catch (e) {
      if (gen !== this.gen) return this.snapshot;
      this.publish({ ok: false, code: e.code || 'error', error: e.message, status: null, downloads: [] });
      throw e;
    }
    return this.snapshot;
  }

  /** Publica el estado (con lo pendiente y lo colocado), sólo si ha cambiado algo */
  publish(snap) {
    const plans = this.data.plans;
    const downloads = snap.downloads.map(d => ({ ...d, target: plans[d.hash] ? this.planLabel(plans[d.hash]) : null, by: plans[d.hash]?.by || null }));
    this.snapshot = { ...snap, downloads, pending: Object.values(this.data.pending), placed: this.data.placed };
    const key = JSON.stringify(this.snapshot);
    if (key !== this.last) {
      this.last = key;
      this.emit('update', this.snapshot);
    }
  }
  republish() { this.publish(this.snapshot); }

  /** Lo que ve cada uno: un administrador, todo; un moderador, sólo lo suyo */
  snapshotFor(user) {
    // canWrite: hay al menos una carpeta suya en la que se puede escribir (si no, la interfaz lo avisa)
    const canWrite = this.rootsFor(user).length > 0;
    if (this.library.isAdmin(user)) return { ...this.snapshot, canWrite };
    const mine = x => x.by === keyOf(user);
    const s = this.snapshot;
    return { ...s, canWrite, downloads: s.downloads.filter(mine), pending: s.pending.filter(mine), placed: s.placed.filter(mine) };
  }

  planLabel(p) {
    const what = p.title ? `${p.title}${p.year ? ` (${p.year})` : ''}` : '';
    return [what, p.dest ? this.library.folderLabel(p.dest) : 'Automática'].filter(Boolean).join(' → ');
  }

  /** Ejecuta una acción en aMule y vuelve a leer el estado */
  async run(fn) {
    if (!this.enabled) throw httpError(503, 'aMule no está configurado en el servidor');
    const r = await fn(this.client);
    this.refresh().catch(() => {});
    return r;
  }

  /** Consulta que no cambia nada (servidores, resultados de búsqueda) */
  query(fn) {
    if (!this.enabled) throw httpError(503, 'aMule no está configurado en el servidor');
    return fn(this.client);
  }

  // ---------- quién puede qué ----------

  /** Las carpetas de biblioteca en las que puede guardar descargas y en las que de verdad se puede escribir */
  rootsFor(user) { return writable(this.library.downloadRoots(user)); }

  canUse(user) { return this.enabled && this.library.downloadRoots(user).length > 0; }

  /** ¿Es suya esta descarga (o es administrador)? */
  owns(user, hash) {
    if (this.library.isAdmin(user)) return true;
    hash = String(hash || '').toLowerCase();
    const by = this.data.plans[hash]?.by || this.data.pending[hash]?.by;
    return !!by && by === keyOf(user);
  }

  // ---------- plan de cada descarga: para qué título y a qué carpeta ----------

  /**
   * plan: { entry: { tmdb, type, title, year }?, dest: carpeta (ruta completa) o '' (Automática), by: usuario }.
   * Sin ficha, al terminar se intenta identificar por el nombre del archivo.
   */
  setPlan(hash, plan = {}) {
    hash = String(hash || '').toLowerCase();
    if (!HASH.test(hash)) return;
    const e = plan.entry;
    const tmdb = Number(e?.tmdb);
    this.data.plans[hash] = {
      ...(Number.isInteger(tmdb) && tmdb > 0 && {
        tmdb, type: e.type === 'series' || e.type === 'tv' ? 'series' : 'movie',
        title: String(e.title || '').slice(0, 200), year: +e.year || null
      }),
      dest: plan.dest ? this.checkDest(plan.by, plan.dest) : '',
      by: keyOf(plan.by),
      at: Date.now()
    };
    this.store.save();
  }

  /** Descargar un resultado de la búsqueda o un enlace ed2k, con su plan */
  async download(user, { hash, link, entry, dest }) {
    if (!this.rootsFor(user).length) throw httpError(409, 'No hay ninguna carpeta de tu biblioteca en la que se pueda escribir');
    if (dest) this.checkDest(user, dest);   // antes de descargar: si la carpeta no vale, que no empiece
    if (link) {
      const m = /\|file\|[^|]+\|\d+\|([0-9a-f]{32})\|/i.exec(String(link));
      if (m && this.data.plans[m[1].toLowerCase()] && !this.owns(user, m[1])) throw httpError(409, 'Otra persona ya está descargando ese archivo');
      await this.run(c => c.addLink(link));
      if (m) this.setPlan(m[1], { entry, dest, by: user });
    } else {
      if (this.data.plans[String(hash || '').toLowerCase()] && !this.owns(user, hash)) throw httpError(409, 'Otra persona ya está descargando ese archivo');
      await this.run(c => c.download(String(hash || '')));
      this.setPlan(hash, { entry, dest, by: user });
    }
    this.republish();
  }

  /** Buscar: cada uno con su búsqueda, para que dos personas buscando a la vez no se pisen */
  async search(user, q) {
    this.searches ||= new Map();
    const r = await this.query(c => c.search(q, this.searches.get(keyOf(user))));
    this.searches.set(keyOf(user), r.searchId);
    return r;
  }

  searchResults(user) {
    return this.query(c => c.searchResults(this.searches?.get(keyOf(user))));
  }

  /** Pausar, reanudar, cancelar…: un moderador, sólo las suyas */
  fileOp(user, hash, op) {
    if (!this.owns(user, hash)) throw httpError(403, 'Esa descarga no es tuya');
    return this.run(c => c.fileOp(String(hash || ''), String(op || '')));
  }

  // ---------- al terminar ----------

  handleCompleted(downloads) {
    const { tracked, plans } = this.data;
    let changed = false;
    for (const d of downloads) {
      if (d.state !== 'complete') {
        if (!tracked[d.hash]) { tracked[d.hash] = true; changed = true; }
        continue;
      }
      // sólo las que CineLocal ha visto descargándose o ha lanzado él: no tocar completadas antiguas
      if ((!tracked[d.hash] && !plans[d.hash]) || this.busy.has(d.hash) || this.data.pending[d.hash]) continue;
      this.busy.add(d.hash);
      this.finish(d).finally(() => this.busy.delete(d.hash));
    }
    // olvidar las que ya no están en aMule (canceladas o quitadas allí)
    const live = new Set(downloads.map(d => d.hash));
    for (const h of Object.keys(tracked)) if (!live.has(h)) { delete tracked[h]; changed = true; }
    for (const [h, p] of Object.entries(plans)) {
      // margen: un enlace recién añadido tarda un poco en aparecer en la lista de aMule
      if (!live.has(h) && Date.now() - p.at > 10 * 60000) { delete plans[h]; changed = true; }
    }
    if (changed) this.store.save();
  }

  async finish(d) {
    const plan = this.data.plans[d.hash];
    const file = path.join(this.incoming, d.name);
    const keep = reason => this.addPending(d, file, reason, null);
    try {
      // el nombre lo da aMule: nunca una ruta
      if (path.basename(d.name) !== d.name || d.name === '..') return await keep('Nombre de archivo no válido');
      if (!isVideo(d.name)) return await keep('No es un vídeo');
      if (!fs.existsSync(file)) return await keep('No se encuentra en la carpeta de descargas de aMule');
      let info;
      if (plan?.tmdb) {
        const ep = episodeOf(d.name);
        if (plan.type === 'series' && !ep) return await keep('No se sabe qué episodio es: el nombre no lleva S01E02 ni 1x02');
        info = { type: plan.type, tmdb: plan.tmdb, season: ep?.season, episode: ep?.episode };
      } else {
        const api = this.library.tmdb();
        if (!api.enabled) return await keep('Falta la API key de TMDB');
        const found = await identify(d.name, api);
        if (!found?.certain) {
          return await this.addPending(d, file, found ? 'No es seguro de qué título es' : 'No se encuentra en TMDB',
            found ? { type: found.type, tmdb: found.tmdb, title: found.title, year: found.year } : null);
        }
        info = found;
      }
      // las descargas sin dueño (lanzadas en aMule, o de antes de que lo hubiera) son de los administradores
      await this.place({ hash: d.hash, name: d.name, file, info, dest: plan?.dest || '', by: plan?.by || null });
    } catch (e) {
      await keep(e.message);
    }
  }

  /**
   * Renombra y mueve; deja fijada la ficha para que el escaneo no la confunda con otra.
   * by: quien la coloca (sus carpetas) · owner: de quién es (para que la vea en «Colocadas»)
   */
  async place({ hash, name, file, info, dest, by, owner = by }) {
    const api = this.library.tmdb();
    if (!api.enabled) throw new Error('Falta la API key de TMDB');
    const admin = !by || this.library.isAdmin(by);
    const roots = admin ? writable(this.library.roots()) : this.rootsFor(by);
    if (!roots.length) throw new Error('No hay ninguna carpeta de la biblioteca en la que se pueda escribir');
    // «Automática»: un administrador, en la biblioteca principal; un moderador, en las carpetas de sus NAS
    const main = this.library.settings.data.libraryPath;
    const auto = admin && roots.includes(main) ? [main] : roots;
    const destAbs = dest ? (path.isAbsolute(dest) ? dest : path.join(main, dest)) : null;   // antes, relativo a la principal
    if (destAbs && !roots.some(r => within(r, destAbs))) throw new Error('No puedes guardar en esa carpeta');
    const names = await englishNames(api, info);
    const target = targetPath({ info, names, ext: path.extname(name).toLowerCase(), roots: auto, dest: destAbs, items: this.library.seriesFolders() });
    if (!roots.some(r => isInside(r, target))) throw new Error('La carpeta de destino no está dentro de la biblioteca');
    await moveInto(file, target);
    this.library.pinMatch(info.type, info.type === 'movie' ? target : path.dirname(target), info.tmdb);
    const label = this.library.folderLabel(target);
    this.data.placed.unshift({ hash, name, dest: label, by: owner ? keyOf(owner) : null, at: Date.now() });
    this.data.placed.length = Math.min(this.data.placed.length, KEEP_PLACED);
    delete this.data.plans[hash];
    delete this.data.pending[hash];
    delete this.data.tracked[hash];
    this.store.save();
    this.client.fileOp(hash, 'clear').catch(() => {});
    this.library.scan();
    this.emit('placed', { name, dest: label, by: owner ? keyOf(owner) : null });
    this.republish();
    return label;
  }

  async addPending(d, file, reason, suggestion) {
    const plan = this.data.plans[d.hash];
    this.data.pending[d.hash] = { hash: d.hash, name: d.name, size: d.size, file, reason, suggestion, dest: plan?.dest || '', by: plan?.by || null, at: Date.now() };
    // el destino ya va en la pendiente; sin plan ni seguimiento, quitarla de la lista no la hace volver
    delete this.data.plans[d.hash];
    delete this.data.tracked[d.hash];
    this.store.save();
    // fuera de la lista de aMule: el archivo sigue en su carpeta y aquí queda la entrada para colocarlo
    this.client.fileOp(d.hash, 'clear').catch(() => {});
    this.emit('pending', this.data.pending[d.hash]);
    this.republish();
  }

  /** Coloca una pendiente con la ficha y la carpeta que se eligen. body: { hash, entry, dest } */
  async placePending(user, { hash, entry, dest }) {
    const p = this.data.pending[String(hash || '').toLowerCase()];
    if (!p || !this.owns(user, p.hash)) throw httpError(404, 'Esa descarga ya no está pendiente');
    if (!fs.existsSync(p.file)) throw httpError(409, 'El archivo ya no está en la carpeta de descargas de aMule');
    const tmdb = Number(entry?.tmdb);
    if (!Number.isInteger(tmdb) || tmdb <= 0) throw httpError(400, 'Elige la ficha del título');
    const type = entry.type === 'series' || entry.type === 'tv' ? 'series' : 'movie';
    let ep = null;
    if (type === 'series') {
      ep = Number.isInteger(+entry.season) && Number.isInteger(+entry.episode) && +entry.episode > 0
        ? { season: +entry.season, episode: +entry.episode } : episodeOf(p.name);
      if (!ep) throw httpError(400, 'Indica la temporada y el episodio');
    }
    const destAbs = dest ? this.checkDest(user, dest) : '';
    if (this.busy.has(p.hash)) throw httpError(409, 'Ya se está colocando');
    this.busy.add(p.hash);
    try {
      return await this.place({ hash: p.hash, name: p.name, file: p.file, info: { type, tmdb, season: ep?.season, episode: ep?.episode }, dest: destAbs, by: user, owner: p.by || keyOf(user) });
    } catch (e) {
      throw e.status ? e : httpError(400, e.message);
    } finally {
      this.busy.delete(p.hash);
    }
  }

  dismissPending(user, hash) {
    hash = String(hash || '').toLowerCase();
    if (!this.data.pending[hash] || !this.owns(user, hash)) throw httpError(404, 'Esa descarga ya no está pendiente');
    delete this.data.pending[hash];
    this.store.save();
    this.republish();
  }

  /** Vacía «Colocadas»: un administrador, todas; un moderador, las suyas */
  clearPlaced(user) {
    this.data.placed = this.library.isAdmin(user) ? [] : this.data.placed.filter(p => p.by !== keyOf(user));
    this.store.save();
    this.republish();
  }

  // ---------- carpetas de destino ----------

  /** Carpeta de destino comprobada (ruta completa): que exista, que sea suya y que no sea interna del NAS */
  checkDest(user, dest) {
    const abs = path.resolve(String(dest || ''));
    const root = this.rootsFor(user).find(r => within(r, abs));
    if (!root) throw httpError(400, 'No puedes guardar en esa carpeta');
    if (path.relative(root, abs).split(/[\\/]/).some(s => SKIP_DIRS.test(s))) throw httpError(400, 'Carpeta no válida');
    let st = null;
    try { st = fs.statSync(abs); } catch {}
    if (!st?.isDirectory()) throw httpError(404, 'No existe esa carpeta');
    return abs;
  }

  /**
   * El selector de destino: sin carpeta, las bibliotecas en las que puede guardar (si sólo hay una, directamente su
   * contenido); con carpeta, sus subcarpetas. crumbs: el camino, para volver atrás
   */
  folders(user, dir) {
    const roots = this.rootsFor(user);
    if (!roots.length) throw httpError(409, 'No hay ninguna carpeta de tu biblioteca en la que se pueda escribir');
    if (!dir && roots.length === 1) dir = roots[0];
    const top = roots.length > 1 ? [{ path: '', name: 'Bibliotecas' }] : [];
    if (!dir) return { path: '', label: '', crumbs: top, dirs: roots.map(r => ({ path: r, name: this.library.rootLabel(r) })) };
    const abs = this.checkDest(user, dir);
    const root = roots.find(r => within(r, abs));
    const parts = path.relative(root, abs).split(/[\\/]/).filter(Boolean);
    const crumbs = [...top, { path: root, name: this.library.rootLabel(root) }, ...parts.map((p, i) => ({ path: path.join(root, ...parts.slice(0, i + 1)), name: p }))];
    const dirs = fs.readdirSync(abs, { withFileTypes: true })
      .filter(e => e.isDirectory() && !SKIP_DIRS.test(e.name))
      .map(e => ({ path: path.join(abs, e.name), name: e.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    return { path: abs, label: this.library.folderLabel(abs), crumbs, dirs };
  }
}

module.exports = { AmuleService };
