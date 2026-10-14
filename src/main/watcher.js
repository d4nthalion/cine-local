// Vigila la carpeta de la biblioteca y avisa cuando hay cambios (con espera a que terminen las copias).
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { isVideo } = require('./scanner');

class LibraryWatcher extends EventEmitter {
  constructor() {
    super();
    this.watcher = null;
    this.timer = null;
    this.retry = null;
    this.root = null;
  }

  start(root) {
    this.stop();
    this.root = root;
    if (!root || !fs.existsSync(root)) {
      // disco desconectado: reintentar cada 30 s
      this.retry = setTimeout(() => this.start(root), 30000);
      return;
    }
    try {
      this.watcher = fs.watch(root, { recursive: true }, (_ev, name) => {
        // carpetas (sin extensión) o vídeos; ignorar .srt, .nfo, temporales, etc.
        if (!name || isVideo(name) || !path.extname(name)) this.schedule(3000);
      });
      this.watcher.on('error', () => {
        this.stop();
        this.retry = setTimeout(() => { this.emit('change'); this.start(root); }, 30000);
      });
    } catch {
      this.retry = setTimeout(() => this.start(root), 30000);
    }
  }

  schedule(ms) {
    // espera a que se calmen los cambios, pero nunca más de 6 s (una descarga escribe sin parar)
    const now = Date.now();
    if (!this.firstPending) this.firstPending = now;
    const delay = Math.max(0, Math.min(ms, this.firstPending + 6000 - now));
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.firstPending = 0; this.emit('change'); }, delay);
  }

  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.retry);
    try { this.watcher?.close(); } catch {}
    this.watcher = null;
  }
}

/**
 * Un archivo nuevo se considera "listo" cuando su tamaño no cambia entre dos comprobaciones
 * y Windows no lo tiene bloqueado (copia o descarga en curso).
 */
const lastSizes = new Map();
function isStable(p) {
  let st;
  try { st = fs.statSync(p); } catch { return false; }
  if (st.size === 0) return false;
  // Si se modificó hace poco, exigir que el tamaño no cambie entre dos escaneos
  if (Date.now() - st.mtimeMs < 120000) {
    const prev = lastSizes.get(p);
    lastSizes.set(p, st.size);
    if (prev !== st.size) return false;
  }
  try {
    const fd = fs.openSync(p, 'r+');
    fs.closeSync(fd);
  } catch (e) {
    if (e.code === 'EBUSY') return false;     // otro programa lo está escribiendo
  }
  return true;
}
function forget(p) { lastSizes.delete(p); }

module.exports = { LibraryWatcher, isStable, forget };
