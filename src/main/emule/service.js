// Mantiene la conexión con eMule, consulta las descargas periódicamente y
// coloca en la biblioteca los vídeos que terminan.
const EventEmitter = require('events');
const { EmuleClient, inspect } = require('./index');
const { organize } = require('./organize');
const { isVideo } = require('../scanner');

const FAST = 3000;      // con eMule respondiendo
const SLOW = 15000;     // eMule cerrado o sin configurar

class EmuleService extends EventEmitter {
  /**
   * getSettings(): ajustes actuales · getItems(): elementos de la biblioteca
   * state: almacén persistente { tracked: {hash: true} } con las descargas vistas sin terminar
   */
  constructor({ getSettings, getItems, state }) {
    super();
    this.getSettings = getSettings;
    this.getItems = getItems;
    this.state = state;
    this.client = null;
    this.timer = null;
    this.snapshot = { ok: false, error: null, code: 'disabled', status: null, downloads: [] };
    this.incoming = null;
    this.busy = new Set();
  }

  get enabled() { return !!this.getSettings().emuleEnabled; }

  /** Vuelve a crear el cliente (cambio de puerto/contraseña) y reinicia el sondeo */
  restart() {
    clearTimeout(this.timer);
    const s = this.getSettings();
    this.client = new EmuleClient({ port: s.emulePort, password: s.emulePassword });
    this.incoming = null;
    if (!this.enabled) {
      this.publish({ ok: false, code: 'disabled', error: null, status: null, downloads: [] });
      return;
    }
    this.tick();
  }

  stop() { clearTimeout(this.timer); this.timer = null; }

  publish(snap) {
    this.snapshot = snap;
    this.emit('update', snap);
  }

  async tick() {
    clearTimeout(this.timer);
    if (!this.enabled) return;
    let next = FAST;
    try {
      await this.refresh();
    } catch {
      next = SLOW;
    }
    if (this.enabled) this.timer = setTimeout(() => this.tick(), next);
  }

  /** Lee el estado y las descargas; lanza si eMule no está disponible */
  async refresh(result) {
    try {
      const r = result || await this.client.transfers();
      this.publish({ ok: true, code: null, error: null, ...r });
      this.handleCompleted(r.downloads);
      return this.snapshot;
    } catch (e) {
      this.publish({ ok: false, code: e.code || 'error', error: e.message, status: null, downloads: [] });
      throw e;
    }
  }

  /** Ejecuta una acción del cliente y publica el estado resultante */
  async run(fn) {
    if (!this.enabled) throw new Error('Activa la integración con eMule en Ajustes');
    const r = await fn(this.client);
    if (r && r.downloads) await this.refresh(r);
    else this.refresh().catch(() => {});
    return r;
  }

  /** Consulta que no cambia nada en eMule (lista de servidores): no vuelve a leer las descargas */
  async query(fn) {
    if (!this.enabled) throw new Error('Activa la integración con eMule en Ajustes');
    return fn(this.client);
  }

  async handleCompleted(downloads) {
    const tracked = this.state.data.tracked;
    let changed = false;
    for (const d of downloads) {
      if (d.state !== 'complete') {
        if (!tracked[d.hash]) { tracked[d.hash] = true; changed = true; }
        continue;
      }
      // Sólo las que CineLocal ha visto descargándose: no tocar completadas antiguas
      if (!tracked[d.hash] || this.busy.has(d.hash)) continue;
      delete tracked[d.hash];
      changed = true;
      this.busy.add(d.hash);
      this.finish(d).finally(() => this.busy.delete(d.hash));
    }
    // olvidar las que ya no están en la lista (canceladas o limpiadas en eMule)
    const live = new Set(downloads.map(d => d.hash));
    for (const h of Object.keys(tracked)) if (!live.has(h)) { delete tracked[h]; changed = true; }
    if (changed) this.state.save();
  }

  async finish(d) {
    const s = this.getSettings();
    let moved = null, problem = null;
    if (s.emuleMoveToLibrary !== false && s.libraryPath) {
      try {
        if (!this.incoming) this.incoming = (await inspect(s.emulePath)).incoming || [];
        const r = await organize({ name: d.name, incomingDirs: this.incoming, root: s.libraryPath, items: this.getItems() });
        moved = r.dest || null;
        if (r.skipped && isVideo(d.name)) problem = r.skipped;
      } catch (e) {
        problem = e.message;
      }
      // Ya no está en Incoming: quitarla de la lista de eMule para no dejar una entrada rota
      if (moved) this.client.fileOp(d.hash, 'clear').catch(() => {});
    }
    this.emit('completed', { name: d.name, hash: d.hash, moved, problem });
  }
}

module.exports = { EmuleService };
