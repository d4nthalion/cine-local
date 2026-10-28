// Registro de actividad: quién ha visto o descargado cada archivo, quién ha entrado, qué ha hecho cada usuario
// (listas, peticiones, ajustes…) y los errores, para saber qué pasó cuando algo falla.
// Una reproducción son muchas peticiones (saltos, trozos del archivo): se juntan en un solo acceso por
// usuario, archivo, tipo e IP, que se cierra tras unos minutos sin actividad y se guarda en el archivo del mes.
const fs = require('fs');
const path = require('path');

const IDLE_MS = 10 * 60 * 1000;
const MAX_RESULTS = 2000;
const MIN_BYTES = 2 * 1024 * 1024;
const VIDEO = new Set(['play', 'remux', 'transcode', 'download']);
const SESSION = new Set(['login', 'login-failed', 'logout']);
/** video · session · action · error */
const categoryOf = kind => VIDEO.has(kind) ? 'video' : SESSION.has(kind) ? 'session' : kind === 'error' || kind === 'client-error' ? 'error' : 'action';

class AccessLog {
  constructor(dataDir, { months = 12 } = {}) {
    this.dir = path.join(dataDir, 'logs');
    this.months = months;
    this.open = new Map();   // clave → acceso en curso
    fs.mkdirSync(this.dir, { recursive: true });
    this.prune();
    setInterval(() => this.closeIdle(), 60 * 1000).unref();
  }

  fileOf(ts) {
    const d = new Date(ts);
    return path.join(this.dir, `access-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.jsonl`);
  }

  write(entry) {
    try { fs.appendFileSync(this.fileOf(entry.at), JSON.stringify(entry) + '\n'); }
    catch (e) { console.warn('Registro de accesos:', e.message); }
  }

  /** Un evento suelto (inicio de sesión, lista creada, error…) */
  event(kind, { user, ip, client, title, detail }) {
    this.write({ at: Date.now(), kind, user: user || null, ip, client, ...(title && { title: String(title).slice(0, 300) }), ...(detail && { detail: String(detail).slice(0, 500) }) });
  }

  /**
   * Una petición a un vídeo. kind: play (archivo tal cual), remux, transcode o download.
   * Devuelve una función para sumar los bytes enviados.
   */
  touch({ user, ip, client, kind, id, title, file }) {
    const key = [user.toLowerCase(), id, kind, ip].join('|');
    const now = Date.now();
    let a = this.open.get(key);
    if (!a) {
      a = { at: now, end: now, kind, user, ip, client, id, title, file, bytes: 0 };
      this.open.set(key, a);
    }
    a.end = now;
    return n => { a.bytes += n; a.end = Date.now(); };
  }

  closeIdle(all = false) {
    const limit = Date.now() - IDLE_MS;
    for (const [key, a] of this.open) {
      if (!all && a.end > limit) continue;
      this.open.delete(key);
      // el reproductor del navegador lee el principio del archivo antes de elegir cómo reproducirlo: no cuenta
      if (a.bytes >= MIN_BYTES || a.kind === 'download') this.write(a);
    }
  }

  /** Lo último primero. { days, user, q, type: video · session · action · error } */
  list({ days = 7, user = '', q = '', type = '' } = {}) {
    const since = Date.now() - Math.max(1, Math.min(366, days)) * 864e5;
    const u = user.toLowerCase(), text = q.toLowerCase();
    const keep = e => e.at >= since
      && (!u || (e.user || '').toLowerCase() === u)
      && (!type || categoryOf(e.kind) === type)
      && (!text || [e.title, e.file, e.ip, e.detail].some(v => v && String(v).toLowerCase().includes(text)));
    const out = [...this.open.values()].map(a => ({ ...a, live: true })).filter(keep);
    const files = fs.readdirSync(this.dir).filter(f => /^access-\d{4}-\d{2}\.jsonl$/.test(f)).sort().reverse();
    for (const f of files) {
      const [, y, m] = /(\d{4})-(\d{2})/.exec(f);
      if (new Date(+y, +m, 1).getTime() < since) break;   // el mes entero es anterior
      const lines = fs.readFileSync(path.join(this.dir, f), 'utf8').split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i]) continue;
        let e; try { e = JSON.parse(lines[i]); } catch { continue; }
        if (keep(e)) out.push(e);
      }
    }
    out.sort((a, b) => b.at - a.at);
    const users = [...new Set(out.map(e => e.user).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { items: out.slice(0, MAX_RESULTS), total: out.length, users };
  }

  /** Se borran los meses más antiguos que el límite */
  prune() {
    const d = new Date();
    d.setMonth(d.getMonth() - this.months);
    const oldest = `access-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.jsonl`;
    for (const f of fs.readdirSync(this.dir)) {
      if (/^access-\d{4}-\d{2}\.jsonl$/.test(f) && f < oldest) fs.rmSync(path.join(this.dir, f), { force: true });
    }
  }
}

/** Qué app ha hecho la petición, por su User-Agent */
function clientOf(req) {
  const ua = String(req.headers['user-agent'] || '');
  if (/okhttp|LibVLC|Android.*CineLocal|Dalvik/i.test(ua)) return 'Android';
  if (/\bmpv\b|Electron|CineLocal\//i.test(ua)) return 'Escritorio';
  if (/Android|iPhone|iPad/i.test(ua)) return 'Web (móvil)';
  return ua ? 'Web' : '';
}

module.exports = { AccessLog, clientOf };
