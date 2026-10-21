// Discord Rich Presence: muestra en tu perfil de Discord lo que estás viendo en CineLocal («Viendo CineLocal»).
// Habla directamente el protocolo IPC local de Discord (tubería con nombre discord-ipc-N), sin dependencias:
// cada trama es opcode (int32LE) + longitud (int32LE) + JSON.
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };
const ACTIVITY_WATCHING = 3;
// icono de la app para cuando la aplicación de Discord no tiene la imagen «cinelocal» subida
const ICON_URL = 'https://raw.githubusercontent.com/d4nthalion/cine-local/main/build/icon.png';
const ICON_KEY = 'cinelocal';
// nombres genéricos que da TMDB a los capítulos sin traducir ("Episode 3", "Capítulo 3")
const GENERIC_EPISODE = /^(episode|episodio|cap[ií]tulo)\s*\d+$/i;

const isValidId = id => /^\d{17,20}$/.test(String(id || '').trim());

function defaultPipe(i) {
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${i}`;
  const dir = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
  return path.join(dir, `discord-ipc-${i}`);
}

// ---------- datos de la actividad (parte pura, probada en test/discord-test.js) ----------

/** Discord exige textos de 2 a 128 caracteres */
function text(s, max = 128) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return undefined;
  if (s.length > max) s = s.slice(0, max - 1).trimEnd() + '…';
  return s.length < 2 ? s + '​' : s;   // «M» (1931) sin año: Discord rechaza textos de 1 carácter
}

/** Datos de un elemento de la biblioteca que necesita la actividad (se guardan en cada entrada de la lista de reproducción) */
function mediaInfo(item, ep, lbSlug) {
  const m = item.meta || {};
  const base = { title: m.title || item.title, poster: m.poster || null, tmdbId: m.tmdbId || null };
  if (item.type === 'movie') {
    return { ...base, kind: 'movie', year: m.year || item.year || null, directors: (m.directors || []).map(d => d.name).filter(Boolean), lbSlug: lbSlug || null };
  }
  const name = m.seasons?.[ep.season]?.episodes?.[ep.episode]?.name;
  return { ...base, kind: 'episode', season: ep.season, episode: ep.episode, episodeName: name && !GENERIC_EPISODE.test(name.trim()) ? name.trim() : null };
}

/**
 * Actividad de Discord para lo que se está reproduciendo.
 * @param {object} p
 * @param {object} p.media   mediaInfo()
 * @param {number} p.pos     segundos reproducidos en el instante p.at
 * @param {number} p.dur     duración en segundos (0 si aún no se sabe)
 * @param {boolean} p.paused
 * @param {number} p.at      Date.now() del instante de pos
 * @param {object} [o]
 * @param {boolean} [o.discreet]  sin título, póster ni botones
 * @param {string|null} [o.icon]  clave o URL del icono pequeño (null: sin icono)
 */
function buildActivity({ media, pos = 0, dur = 0, paused = false, at = Date.now() }, { discreet = false, icon = ICON_KEY } = {}) {
  if (!media) return null;
  const movie = media.kind === 'movie';
  let details, state;
  const assets = {};
  const buttons = [];
  if (discreet) {
    details = movie ? 'Viendo una película' : 'Viendo una serie';
    if (icon) { assets.large_image = icon; assets.large_text = 'CineLocal'; }
  } else {
    details = movie && media.year ? `${media.title} (${media.year})` : media.title;
    if (movie) state = media.directors?.length ? `Película de ${media.directors.slice(0, 2).join(' y ')}` : 'Película';
    else state = `T${media.season}:E${media.episode}` + (media.episodeName ? ` · ${media.episodeName}` : '');
    if (media.poster && /^https:\/\//.test(media.poster) && media.poster.length <= 256) {
      assets.large_image = media.poster;
      assets.large_text = text(details);
      if (icon) { assets.small_image = icon; assets.small_text = 'CineLocal'; }
    } else if (icon) {
      assets.large_image = icon;
      assets.large_text = text(details);
    }
    if (media.tmdbId) buttons.push({ label: 'Ver en TMDB', url: `https://www.themoviedb.org/${movie ? 'movie' : 'tv'}/${media.tmdbId}` });
    if (movie && media.lbSlug) buttons.push({ label: 'Ver en Letterboxd', url: `https://letterboxd.com/film/${encodeURIComponent(media.lbSlug)}/` });
  }
  if (paused) {
    state = state ? `En pausa · ${state}` : 'En pausa';
    if (assets.small_image) assets.small_text = 'En pausa';
  }
  const activity = { type: ACTIVITY_WATCHING, details: text(details), instance: false };
  if (state) activity.state = text(state);
  if (!paused && dur > 0) {
    const start = Math.round(at - pos * 1000);
    activity.timestamps = { start, end: Math.round(start + dur * 1000) };
  }
  if (Object.keys(assets).length) activity.assets = assets;
  if (buttons.length) activity.buttons = buttons.slice(0, 2);
  return activity;
}

/** Actividad de prueba del botón «Probar» de Ajustes */
function testActivity(at = Date.now(), icon = ICON_KEY) {
  const a = { type: ACTIVITY_WATCHING, details: 'Probando CineLocal', state: 'Si ves esto, ya está configurado', timestamps: { start: at, end: at + 15000 }, instance: false };
  if (icon) a.assets = { large_image: icon, large_text: 'CineLocal' };
  return a;
}

/** ¿Hace falta reenviar? (los instantes se comparan con margen: el progreso normal no cuenta como cambio) */
function sameActivity(a, b) {
  if (!a || !b) return a === b;
  const strip = x => JSON.stringify({ ...x, timestamps: !!x.timestamps });
  if (strip(a) !== strip(b)) return false;
  if (!a.timestamps) return true;
  return Math.abs(a.timestamps.start - b.timestamps.start) < 5000 && Math.abs(a.timestamps.end - b.timestamps.end) < 5000;
}

// ---------- conexión IPC con Discord ----------
function encode(op, obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

function rpcError(code, message) { const e = new Error(message); e.code = code; return e; }

class RpcConnection extends EventEmitter {
  constructor(sock, clientId) {
    super();
    this.sock = sock;
    this.clientId = clientId;
    this.pending = new Map();
    this.closed = false;
    let buf = Buffer.alloc(0);
    sock.on('data', d => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8) {
        const op = buf.readInt32LE(0), len = buf.readInt32LE(4);
        if (len < 0 || len > 1 << 20) { this.close(); return; }
        if (buf.length < 8 + len) break;
        let msg = null;
        try { msg = JSON.parse(buf.subarray(8, 8 + len).toString('utf8')); } catch {}
        buf = buf.subarray(8 + len);
        this._onFrame(op, msg);
      }
    });
    sock.on('error', () => {});
    sock.on('close', () => this._closed());
  }

  /** Abre la primera tubería discord-ipc-N que responda y hace el saludo */
  static async open(clientId, { pipe = defaultPipe, timeout = 5000 } = {}) {
    let lastErr = null;
    for (let i = 0; i < 10; i++) {
      let sock;
      try { sock = await connectPipe(pipe(i), timeout); }
      catch (e) { lastErr = e; continue; }
      const conn = new RpcConnection(sock, clientId);
      try {
        conn.ready = await conn._handshake(timeout);
        return conn;
      } catch (e) {
        conn.close();
        if (e.code === 'invalid-client') throw e;
        lastErr = e;
      }
    }
    throw lastErr?.code === 'timeout' ? lastErr : rpcError('not-running', 'Discord no está abierto');
  }

  _handshake(timeout) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { cleanup(); reject(rpcError('timeout', 'Discord no responde')); }, timeout);
      const onReady = data => { cleanup(); resolve(data); };
      const onClose = info => {
        cleanup();
        const bad = info?.code === 4000 || /client id/i.test(info?.message || '');
        reject(bad ? rpcError('invalid-client', 'Discord no reconoce el ID de la aplicación') : rpcError('closed', info?.message || 'Discord ha cerrado la conexión'));
      };
      const cleanup = () => { clearTimeout(t); this.off('ready', onReady); this.off('close', onClose); };
      this.once('ready', onReady);
      this.once('close', onClose);
      this._write(OP.HANDSHAKE, { v: 1, client_id: this.clientId });
    });
  }

  _onFrame(op, msg) {
    if (op === OP.PING) { this._write(OP.PONG, msg); return; }
    if (op === OP.CLOSE) { this.closeInfo = msg; this.close(); return; }
    if (op !== OP.FRAME || !msg) return;
    if (msg.cmd === 'DISPATCH' && msg.evt === 'READY') { this.emit('ready', msg.data || {}); return; }
    const p = msg.nonce && this.pending.get(msg.nonce);
    if (!p) return;
    this.pending.delete(msg.nonce);
    clearTimeout(p.timer);
    if (msg.evt === 'ERROR') p.reject(rpcError('rpc', msg.data?.message || 'Error de Discord'));
    else p.resolve(msg.data);
  }

  request(cmd, args, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.closed) return reject(rpcError('closed', 'Sin conexión con Discord'));
      const nonce = crypto.randomUUID();
      const timer = setTimeout(() => { this.pending.delete(nonce); reject(rpcError('timeout', 'Discord no responde')); }, timeout);
      this.pending.set(nonce, { resolve, reject, timer });
      this._write(OP.FRAME, { cmd, args, nonce });
    });
  }

  _write(op, obj) {
    try { if (!this.closed) this.sock.write(encode(op, obj)); } catch {}
  }

  close() {
    if (this.closed) return;
    try { this.sock.end(); } catch {}
    setTimeout(() => { try { this.sock.destroy(); } catch {} }, 200);
    this._closed();
  }

  _closed() {
    if (this.closed) return;
    this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(rpcError('closed', 'Sin conexión con Discord')); }
    this.pending.clear();
    this.emit('close', this.closeInfo || null);
  }
}

function connectPipe(p, timeout) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(p);
    const t = setTimeout(() => { sock.destroy(); reject(rpcError('timeout', 'Discord no responde')); }, timeout);
    sock.once('connect', () => { clearTimeout(t); sock.removeAllListeners('error'); resolve(sock); });
    sock.once('error', e => { clearTimeout(t); sock.destroy(); reject(e); });
  });
}

// ---------- servicio ----------
/**
 * Mantiene la actividad de Discord al día con lo que se reproduce.
 * Se conecta sólo cuando hay algo que mostrar, reintenta con espera creciente si Discord no está abierto,
 * y envía como mucho una actualización cada 4 s (Discord admite unas 5 cada 20 s).
 * Eventos: 'status' { state: off|unconfigured|idle|connecting|connected|not-running|error, error }
 */
class DiscordPresence extends EventEmitter {
  constructor({ pipe = defaultPipe, minGap = 4000, backoff = [5000, 10000, 20000, 40000, 60000], idleClose = 10000,
    fetchAssets = null, pid = process.pid } = {}) {
    super();
    Object.assign(this, { pipe, minGap, backoff, idleClose, fetchAssets, pid });
    this.cfg = { enabled: false, clientId: '', discreet: false };
    this.playback = null;      // { media, pos, dur, paused, at }
    this.testing = null;       // { clientId, at }
    this.conn = null;
    this.connecting = false;
    this.attempts = 0;
    this.badId = null;         // ID rechazado por Discord: no se reintenta hasta que cambie
    this.lastSent = undefined; // undefined = no se sabe qué muestra Discord
    this.lastSentAt = 0;
    this.icons = new Map();    // clientId -> clave o URL del icono
    this.st = { state: 'off', error: null };
  }

  get status() { return { ...this.st }; }

  configure({ enabled, clientId, discreet }) {
    const id = String(clientId || '').trim();
    if (id !== this.cfg.clientId) { this.badId = null; this.attempts = 0; }
    this.cfg = { enabled: !!enabled, clientId: id, discreet: !!discreet };
    if (!this.testing) this._baseStatus();
    this._sync();
  }

  /** Lo que se reproduce ahora (null al terminar). Se puede llamar en cada aviso de progreso: sólo se envía si cambia. */
  setPlayback(p) {
    this.playback = p && p.media ? { media: p.media, pos: +p.pos || 0, dur: +p.dur || 0, paused: !!p.paused, at: p.at || Date.now() } : null;
    this._sync();
  }

  /** Actividad de prueba durante 15 s. Devuelve { ok } o { ok:false, error } */
  test(clientId) {
    const id = String(clientId || '').trim();
    if (!isValidId(id)) return Promise.resolve({ ok: false, error: 'El ID de la aplicación tiene que tener entre 17 y 20 cifras' });
    if (this.badId === id) this.badId = null;
    this.attempts = 0;
    clearTimeout(this.retryTimer); this.retryTimer = null;
    clearTimeout(this.testTimer);
    this.testing = { clientId: id, at: Date.now() };
    this.testTimer = setTimeout(() => { this.testing = null; this._baseStatus(); this._sync(); }, 15000);
    this.lastSentAt = 0;
    this._settleTest({ ok: false, error: 'Se ha lanzado otra prueba' });
    return new Promise(resolve => {
      this.testWaiter = resolve;
      setTimeout(() => this._settleTest({ ok: false, error: 'Discord no responde' }), 8000);
      this._sync();
    });
  }

  _settleTest(r) {
    const w = this.testWaiter;
    this.testWaiter = null;
    if (w) w(r);
  }

  /** Al cerrar CineLocal: quitar la actividad y soltar la conexión */
  shutdown() {
    this.playback = null; this.testing = null;
    for (const t of ['retryTimer', 'sendTimer', 'idleTimer', 'testTimer']) { clearTimeout(this[t]); this[t] = null; }
    const c = this.conn;
    this.conn = null;
    if (c) { c._write(OP.FRAME, { cmd: 'SET_ACTIVITY', args: { pid: this.pid }, nonce: crypto.randomUUID() }); c.close(); }
  }

  _setStatus(state, error = null) {
    if (this.st.state === state && this.st.error === error) return;
    this.st = { state, error };
    this.emit('status', this.status);
  }

  _baseStatus() {
    if (this.conn) return this._setStatus('connected');
    if (!this.cfg.enabled) return this._setStatus('off');
    if (!isValidId(this.cfg.clientId)) return this._setStatus('unconfigured');
    if (this.badId === this.cfg.clientId) return;   // se mantiene el error
    if (!['not-running', 'error'].includes(this.st.state) || !this.playback) this._setStatus('idle');
  }

  /** Qué hay que mostrar: { clientId, activity } o null */
  _wanted() {
    if (this.testing) return { clientId: this.testing.clientId, test: true };
    const { enabled, clientId } = this.cfg;
    if (enabled && isValidId(clientId) && this.playback) return { clientId };
    return null;
  }

  _activity(w) {
    const icon = this.icons.has(w.clientId) ? this.icons.get(w.clientId) : ICON_URL;
    if (w.test) return testActivity(this.testing.at, icon);
    return buildActivity(this.playback, { discreet: this.cfg.discreet, icon });
  }

  _sync() {
    const w = this._wanted();
    clearTimeout(this.idleTimer); this.idleTimer = null;
    if (this.conn && w && this.conn.clientId !== w.clientId) { this._drop(); }
    if (!w) {
      clearTimeout(this.retryTimer); this.retryTimer = null;
      if (this.conn) {
        this._schedule();
        // sin nada que mostrar un rato: cerrar la conexión (Discord borra la actividad al cerrar)
        this.idleTimer = setTimeout(() => { if (!this._wanted()) { this._drop(); this._baseStatus(); } }, this.idleClose);
      }
      return;
    }
    if (this.conn) return this._schedule();
    if (this.connecting || this.retryTimer || this.badId === w.clientId) return;
    this._connect(w.clientId);
  }

  _drop() {
    const c = this.conn;
    this.conn = null;
    clearTimeout(this.sendTimer); this.sendTimer = null;
    if (c) c.close();
  }

  async _connect(clientId) {
    this.connecting = true;
    if (this.st.state !== 'not-running') this._setStatus('connecting');
    try {
      const conn = await RpcConnection.open(clientId, { pipe: this.pipe });
      this.connecting = false;
      const w = this._wanted();
      if (!w || w.clientId !== clientId) { conn.close(); this._baseStatus(); return this._sync(); }
      this.conn = conn;
      this.attempts = 0;
      this.lastSent = undefined;
      conn.on('close', () => {
        if (this.conn !== conn) return;
        // Discord se ha cerrado o reiniciado: volver a intentarlo si sigue habiendo algo que mostrar
        this.conn = null;
        clearTimeout(this.sendTimer); this.sendTimer = null;
        this._setStatus(this._wanted() ? 'not-running' : (this.cfg.enabled ? 'idle' : 'off'));
        this._retry();
      });
      this._setStatus('connected');
      this._loadIcon(clientId);
      this._sync();
    } catch (e) {
      this.connecting = false;
      if (e.code === 'invalid-client') {
        this.badId = clientId;
        this._setStatus('error', 'Discord no reconoce el ID de la aplicación');
        this._settleTest({ ok: false, error: 'Discord no reconoce el ID de la aplicación' });
        return;
      }
      this._setStatus('not-running');
      this._settleTest({ ok: false, error: 'Discord no está abierto' });
      this._retry();
    }
  }

  _retry() {
    if (!this._wanted() || this.retryTimer) return;
    const ms = this.backoff[Math.min(this.attempts, this.backoff.length - 1)];
    this.attempts++;
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this._sync(); }, ms);
  }

  /** ¿La aplicación de Discord tiene subida la imagen «cinelocal»? Si no (o no se sabe), se usa el icono de GitHub */
  _loadIcon(clientId) {
    if (this.icons.has(clientId) || !this.fetchAssets) return;
    this.icons.set(clientId, ICON_URL);
    Promise.resolve().then(() => this.fetchAssets(clientId)).then(list => {
      if (Array.isArray(list) && list.some(a => a?.name === ICON_KEY)) { this.icons.set(clientId, ICON_KEY); this._sync(); }
    }).catch(() => {});
  }

  _schedule() {
    if (!this.conn) return;
    const w = this._wanted();
    const act = w ? this._activity(w) : null;
    if (this.lastSent !== undefined && sameActivity(act, this.lastSent) && !(w?.test && this.testWaiter)) return;
    if (this.sendTimer) return;   // ya hay un envío pendiente: mandará lo último
    const wait = this.lastSentAt + this.minGap - Date.now();
    if (wait > 0) this.sendTimer = setTimeout(() => { this.sendTimer = null; this._flush(); }, wait);
    else this._flush();
  }

  _flush() {
    const conn = this.conn;
    if (!conn) return;
    const w = this._wanted();
    const act = w ? this._activity(w) : null;
    if (this.lastSent !== undefined && sameActivity(act, this.lastSent) && !(w?.test && this.testWaiter)) return;
    this.lastSent = act;
    this.lastSentAt = Date.now();
    const args = { pid: this.pid };
    if (act) args.activity = act;
    conn.request('SET_ACTIVITY', args).then(() => {
      if (this.st.state === 'error') this._setStatus('connected');
      if (w?.test) this._settleTest({ ok: true });
    }, e => {
      if (e.code === 'closed') return;
      this.lastSent = undefined;
      this._setStatus('error', e.message);
      if (w?.test) this._settleTest({ ok: false, error: e.message });
    });
  }
}

module.exports = { DiscordPresence, RpcConnection, buildActivity, testActivity, mediaInfo, sameActivity, isValidId, encode, OP, GENERIC_EPISODE, ICON_URL, ICON_KEY };
