// Descargas con aMule en el NAS: consulta aMule periódicamente, recuerda para qué título y a qué carpeta va cada
// descarga y, al terminar, la renombra y la mueve a la biblioteca. Lo que no se puede identificar con seguridad
// queda «pendiente de colocar» hasta que un administrador elige la ficha y la carpeta.
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { isVideo } = require('../../src/main/scanner');
const { episodeOf, identify, englishNames, targetPath, moveInto, isInside } = require('./organize');

const FAST = 4000;      // con aMule respondiendo
const SLOW = 15000;     // aMule parado o sin configurar
const AUTH_RETRY = 5 * 60000;   // contraseña rechazada
const KEEP_PLACED = 20; // últimas colocadas que se enseñan en Descargas
const SKIP_DIRS = /^(\..*|@.*|#recycle|#snapshot|\$recycle\.bin|system volume information)$/i;
const HASH = /^[0-9a-f]{32}$/i;

const httpError = (status, message) => Object.assign(new Error(message), { status });

class AmuleService extends EventEmitter {
  /**
   * client: AmuleClient · library: Library del servidor · store: { plans, tracked, pending, placed }
   * incoming: carpeta de aMule con lo terminado, vista desde este contenedor · root: biblioteca en la que se escribe
   */
  constructor({ client, library, store, incoming, root }) {
    super();
    this.client = client;
    this.library = library;
    this.store = store;
    this.incoming = incoming;
    this.rootDir = root;
    this.snapshot = { ok: false, code: 'offline', error: null, status: null, downloads: [], pending: [], placed: [] };
    this.last = '';
    this.timer = null;
    this.busy = new Set();
  }

  get enabled() { return !!this.client; }
  get root() { return this.rootDir || this.library.settings.data.libraryPath || ''; }
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
    const downloads = snap.downloads.map(d => ({ ...d, target: plans[d.hash] ? this.planLabel(plans[d.hash]) : null }));
    this.snapshot = { ...snap, downloads, pending: Object.values(this.data.pending), placed: this.data.placed };
    const key = JSON.stringify(this.snapshot);
    if (key !== this.last) {
      this.last = key;
      this.emit('update', this.snapshot);
    }
  }
  republish() { this.publish(this.snapshot); }

  planLabel(p) {
    const what = p.title ? `${p.title}${p.year ? ` (${p.year})` : ''}` : '';
    return [what, p.dest ? p.dest : 'Automática'].filter(Boolean).join(' → ');
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

  // ---------- plan de cada descarga: para qué título y a qué carpeta ----------

  /**
   * plan: { entry: { tmdb, type, title, year }?, dest: carpeta relativa a la biblioteca o '' (Automática) }.
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
      dest: plan.dest ? this.relDir(plan.dest) : '',
      at: Date.now()
    };
    this.store.save();
  }

  /** Descargar un resultado de la búsqueda o un enlace ed2k, con su plan */
  async download({ hash, link, entry, dest }) {
    if (dest) this.relDir(dest);   // antes de descargar: si la carpeta no vale, que no empiece
    if (link) {
      const m = /\|file\|[^|]+\|\d+\|([0-9a-f]{32})\|/i.exec(String(link));
      await this.run(c => c.addLink(link));
      if (m) this.setPlan(m[1], { entry, dest });
    } else {
      await this.run(c => c.download(String(hash || '')));
      this.setPlan(hash, { entry, dest });
    }
    this.republish();
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
      await this.place({ hash: d.hash, name: d.name, file, info, dest: plan?.dest || '' });
    } catch (e) {
      await keep(e.message);
    }
  }

  /** Renombra y mueve; deja fijada la ficha para que el escaneo no la confunda con otra */
  async place({ hash, name, file, info, dest }) {
    const api = this.library.tmdb();
    if (!api.enabled) throw new Error('Falta la API key de TMDB');
    const root = this.root;
    if (!root) throw new Error('No hay carpeta de biblioteca configurada');
    const names = await englishNames(api, info);
    const target = targetPath({
      info, names, ext: path.extname(name).toLowerCase(), root,
      dest: dest ? path.join(root, this.relDir(dest)) : null, items: this.library.seriesFolders()
    });
    if (!isInside(root, target)) throw new Error('La carpeta de destino no está dentro de la biblioteca');
    await moveInto(file, target);
    this.library.pinMatch(info.type, info.type === 'movie' ? target : path.dirname(target), info.tmdb);
    const rel = path.relative(root, target);
    this.data.placed.unshift({ hash, name, dest: rel.split(path.sep).join('/'), at: Date.now() });
    this.data.placed.length = Math.min(this.data.placed.length, KEEP_PLACED);
    delete this.data.plans[hash];
    delete this.data.pending[hash];
    delete this.data.tracked[hash];
    this.store.save();
    this.client.fileOp(hash, 'clear').catch(() => {});
    this.library.scan();
    this.emit('placed', { name, dest: rel });
    this.republish();
    return rel;
  }

  async addPending(d, file, reason, suggestion) {
    const plan = this.data.plans[d.hash];
    this.data.pending[d.hash] = { hash: d.hash, name: d.name, size: d.size, file, reason, suggestion, dest: plan?.dest || '', at: Date.now() };
    // el destino ya va en la pendiente; sin plan ni seguimiento, quitarla de la lista no la hace volver
    delete this.data.plans[d.hash];
    delete this.data.tracked[d.hash];
    this.store.save();
    // fuera de la lista de aMule: el archivo sigue en su carpeta y aquí queda la entrada para colocarlo
    this.client.fileOp(d.hash, 'clear').catch(() => {});
    this.emit('pending', this.data.pending[d.hash]);
    this.republish();
  }

  /** Administrador: coloca una pendiente con la ficha y la carpeta que elige. body: { hash, entry, dest } */
  async placePending({ hash, entry, dest }) {
    const p = this.data.pending[String(hash || '').toLowerCase()];
    if (!p) throw httpError(404, 'Esa descarga ya no está pendiente');
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
    if (this.busy.has(p.hash)) throw httpError(409, 'Ya se está colocando');
    this.busy.add(p.hash);
    try {
      return await this.place({ hash: p.hash, name: p.name, file: p.file, info: { type, tmdb, season: ep?.season, episode: ep?.episode }, dest: dest || '' });
    } catch (e) {
      throw e.status ? e : httpError(400, e.message);
    } finally {
      this.busy.delete(p.hash);
    }
  }

  dismissPending(hash) {
    delete this.data.pending[String(hash || '').toLowerCase()];
    this.store.save();
    this.republish();
  }

  clearPlaced() {
    this.data.placed = [];
    this.store.save();
    this.republish();
  }

  // ---------- carpetas de destino (dentro de la biblioteca) ----------

  /** Carpeta relativa a la biblioteca, comprobada: que exista y no salga de ella. '' es la propia biblioteca */
  relDir(rel) {
    const root = this.root;
    if (!root) throw httpError(409, 'No hay carpeta de biblioteca configurada');
    const clean = String(rel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const abs = path.resolve(root, clean);
    if (abs !== path.resolve(root) && !isInside(root, abs)) throw httpError(400, 'La carpeta tiene que estar dentro de la biblioteca');
    if (clean.split('/').some(s => SKIP_DIRS.test(s))) throw httpError(400, 'Carpeta no válida');
    let st = null;
    try { st = fs.statSync(abs); } catch {}
    if (!st?.isDirectory()) throw httpError(404, 'No existe la carpeta ' + (clean || '(biblioteca)'));
    return clean;
  }

  /** Subcarpetas de una carpeta de la biblioteca, para el selector de destino */
  folders(rel) {
    const clean = this.relDir(rel);
    const abs = path.join(this.root, clean);
    const dirs = fs.readdirSync(abs, { withFileTypes: true })
      .filter(e => e.isDirectory() && !SKIP_DIRS.test(e.name))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    return { path: clean, root: path.basename(this.root) || this.root, dirs };
  }
}

module.exports = { AmuleService };
