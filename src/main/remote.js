// Cliente de CineLocal Server: la app de escritorio usa el NAS como origen de la biblioteca (por HTTPS, sin VPN).
// La contraseña sólo se usa para iniciar sesión; se guarda el token de la sesión (30 días).
const EventEmitter = require('events');

class RemoteServer extends EventEmitter {
  /** fetch: net.fetch de Electron (usa el proxy y los certificados del sistema) */
  constructor({ fetch }) {
    super();
    this.fetch = fetch;
    this.url = '';
    this.token = '';
    this.events = null;   // AbortController del flujo de eventos
    this.retry = null;
  }

  configure({ url, token }) {
    const u = normUrl(url);
    if (u === this.url && token === this.token) return;
    this.url = u;
    this.token = token || '';
    this.stopEvents();
    if (this.ready) this.listen();
  }

  get ready() { return !!(this.url && this.token); }

  /** Inicia sesión con el usuario de DSM. Devuelve { ok, token, user } o { ok: false, error, otp } */
  async login(url, { user, password, otp }) {
    const base = normUrl(url);
    if (!base) return { ok: false, error: 'Escribe la dirección del servidor, p. ej. https://cine.tudominio.com' };
    try {
      const res = await this.fetch(base + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CineLocal': '1' },
        body: JSON.stringify({ user, password, otp: otp || undefined, client: 'app' })
      });
      const r = await res.json().catch(() => null);
      if (!r) return { ok: false, error: `El servidor no ha respondido como CineLocal Server (HTTP ${res.status})` };
      return r;
    } catch (e) {
      return { ok: false, error: 'No se puede conectar con el servidor: ' + (e.cause?.code || e.message) };
    }
  }

  async request(method, path, body) {
    if (!this.ready) throw new Error('Configura CineLocal Server en Ajustes');
    let res;
    try {
      res = await this.fetch(this.url + path, {
        method,
        headers: { Authorization: 'Bearer ' + this.token, ...(method !== 'GET' && { 'Content-Type': 'application/json', 'X-CineLocal': '1' }) },
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {})
      });
    } catch (e) {
      throw Object.assign(new Error('No se puede conectar con CineLocal Server'), { offline: true });
    }
    if (res.status === 401) { this.emit('unauthorized'); throw Object.assign(new Error('La sesión de CineLocal Server ha caducado: vuelve a conectar en Ajustes'), { auth: true }); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `CineLocal Server: error ${res.status}`);
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }

  /** Dirección completa de un enlace del servidor (los enlaces firmados vienen sin el dominio) */
  abs(path) { return this.url + path; }

  // ---------- eventos en vivo (Server-Sent Events) ----------
  async listen() {
    this.stopEvents();
    const ctrl = new AbortController();
    this.events = ctrl;
    try {
      const res = await this.fetch(this.url + '/api/events', { headers: { Authorization: 'Bearer ' + this.token }, signal: ctrl.signal });
      if (res.status === 401) { this.emit('unauthorized'); return; }
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      this.emit('online');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          let ev = 'message', data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) ev = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (data) try { this.emit('event', ev, JSON.parse(data)); } catch {}
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
    }
    if (this.events !== ctrl) return;
    // se ha cortado (NAS reiniciado, sin internet): reintentar
    this.emit('offline');
    this.retry = setTimeout(() => this.listen(), 15000);
  }

  stopEvents() {
    clearTimeout(this.retry);
    this.events?.abort();
    this.events = null;
  }
}

/** «cine.dominio.com» → «https://cine.dominio.com», sin barra final */
function normUrl(u) {
  u = String(u || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

module.exports = { RemoteServer, normUrl };
