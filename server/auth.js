// Inicio de sesión con los usuarios de DSM (como Video Station) y sesiones propias de CineLocal.
// La contraseña sólo se usa para preguntar a DSM si es válida; no se guarda en ningún sitio.
const crypto = require('crypto');
const fs = require('fs');

// Errores de SYNO.API.Auth
const DSM_ERRORS = {
  400: 'Usuario o contraseña incorrectos',
  401: 'La cuenta está desactivada',
  402: 'Esta cuenta no tiene permiso para iniciar sesión',
  403: 'otp',   // falta el código de verificación en dos pasos
  404: 'El código de verificación no es correcto',
  406: 'Tienes que activar la verificación en dos pasos en DSM',
  407: 'DSM ha bloqueado esta dirección IP por demasiados intentos',
  408: 'La contraseña ha caducado; cámbiala en DSM',
  409: 'La contraseña ha caducado; cámbiala en DSM',
  410: 'Tienes que cambiar la contraseña en DSM'
};

// Sesión de DSM con la que se comprueba la contraseña: «webui» es la de la propia web de DSM, así que vale el
// permiso «DSM» de Privilegios de aplicaciones. Con un nombre propio DSM sólo deja entrar a los administradores
const DSM_SESSION = 'webui';

const SESSION_DAYS = 30;
const FAIL_WINDOW = 15 * 60e3;
const FAILS_PER_IP = 5;
// Límite global: si muchas IPs fallan a la vez, DSM acabaría bloqueando al propio servidor (todas las
// peticiones le llegan desde él), así que se corta antes
const FAILS_GLOBAL = 20;

class Auth {
  /**
   * dsmUrl: http://127.0.0.1:5000 dentro del NAS
   * store: { data, save() } con las sesiones abiertas
   * groupFile: /etc/group del NAS (montado de sólo lectura). Con los grupos de DSM [adminGroup] y [userGroup] creados,
   *   el grupo decide quién entra y qué puede hacer; sin ellos, se usan allowed / admins como antes
   * allowed: lista de usuarios permitidos (vacía = todos los de DSM) · admins: administradores
   */
  constructor({ dsmUrl, store, allowed = [], admins = [], devUser = null, devRole = 'admin', groupFile = null, adminGroup = 'cinelocal-admin', userGroup = 'cinelocal-user' }) {
    this.dsmUrl = dsmUrl.replace(/\/+$/, '');
    this.store = store;
    this.allowed = allowed.map(u => u.toLowerCase());
    this.admins = admins.map(u => u.toLowerCase());
    this.devUser = devUser;
    this.devRole = devRole;
    this.groupFile = groupFile;
    this.adminGroup = adminGroup.toLowerCase();
    this.userGroup = userGroup.toLowerCase();
    this.groupCache = null;   // { at, groups: Map(nombre → Set(usuarios)) }
    this.fails = [];   // { ip, at }
    if (!this.store.data.sessions) this.store.data.sessions = {};
    this.prune();
  }

  /** Intenta iniciar sesión. Devuelve { ok, token, user } o { ok: false, error, otp } */
  async login({ user, password, otp }, ip) {
    if (this.devUser) return { ok: true, ...this.open(this.devUser) };   // desarrollo sin DSM
    user = String(user || '').trim();
    if (!user || !password) return { ok: false, error: 'Escribe tu usuario y tu contraseña del NAS' };
    const now = Date.now();
    this.fails = this.fails.filter(f => now - f.at < FAIL_WINDOW);
    if (this.fails.filter(f => f.ip === ip).length >= FAILS_PER_IP || this.fails.length >= FAILS_GLOBAL) {
      return { ok: false, error: 'Demasiados intentos fallidos. Espera unos minutos.', status: 429 };
    }
    if (!this.groupsActive() && this.allowed.length && !this.allowed.includes(user.toLowerCase())) {
      this.fails.push({ ip, at: now });
      return { ok: false, error: DSM_ERRORS[400] };
    }

    let r;
    try { r = await this.dsmLogin(user, password, otp); }
    catch (e) { return { ok: false, error: 'No se puede contactar con DSM: ' + e.message, status: 502 }; }
    if (!r.success) {
      const code = r.error?.code;
      if (code === 403) return { ok: false, otp: true, error: 'Escribe el código de verificación en dos pasos' };
      this.fails.push({ ip, at: now });
      return { ok: false, error: DSM_ERRORS[code] || `DSM ha rechazado el inicio de sesión (error ${code})` };
    }
    // sólo queríamos saber si la contraseña es buena: se cierra la sesión de DSM enseguida
    this.dsmLogout(r.data.sid).catch(() => {});
    // la contraseña es buena, pero sin grupo de CineLocal no se entra (se dice después de comprobarla: así no se
    // puede averiguar quién está en los grupos sin saber su contraseña)
    if (!this.role(user)) return { ok: false, error: `Tu usuario no tiene acceso a CineLocal: pide que te añadan al grupo «${this.userGroup}» del NAS` };
    return { ok: true, ...this.open(user) };
  }

  open(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    this.store.data.sessions[hash(token)] = { user, at: Date.now(), exp: Date.now() + SESSION_DAYS * 864e5 };
    this.store.save();
    return { token, user };
  }

  /** Usuario de la sesión, o null */
  check(token) {
    if (this.devUser) return this.devUser;
    if (!token) return null;
    const s = this.store.data.sessions[hash(token)];
    if (!s || s.exp < Date.now()) return null;
    // quien sale del grupo pierde el acceso enseguida, aunque tenga la sesión abierta
    return this.role(s.user) ? s.user : null;
  }

  /**
   * Enlace firmado a un vídeo (o a sus subtítulos) para reproductores que no envían la sesión:
   * mpv, su generador de miniaturas y LibVLC. Sólo vale para ese vídeo y caduca.
   */
  sign(id, user, ttlHours = 24) {
    const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
    return new URLSearchParams({ u: user, exp, sig: this.mac(`${id}|${exp}|${user}`) }).toString();
  }

  /** Usuario del enlace firmado, o null si no es válido para ese vídeo o ha caducado */
  checkSigned(id, q) {
    const user = q.get('u'), exp = +q.get('exp'), sig = q.get('sig') || '';
    if (!user || !(exp > Date.now() / 1000)) return null;
    const good = Buffer.from(this.mac(`${id}|${exp}|${user}`));
    const got = Buffer.from(sig);
    if (got.length !== good.length || !crypto.timingSafeEqual(got, good)) return null;
    // un enlace de alguien a quien ya no se deja entrar deja de valer
    return this.role(user) ? user : null;
  }

  mac(text) {
    if (!this.store.data.secret) { this.store.data.secret = crypto.randomBytes(32).toString('hex'); this.store.save(); }
    return crypto.createHmac('sha256', this.store.data.secret).update(text).digest('base64url');
  }

  logout(token) {
    if (!token) return;
    delete this.store.data.sessions[hash(token)];
    this.store.save();
  }

  isAdmin(user) {
    return this.role(user) === 'admin';
  }

  /** 'admin', 'user' o null (no puede entrar) */
  role(user) {
    if (!user) return null;
    if (this.devUser) return user === this.devUser ? this.devRole : null;
    const name = user.toLowerCase();
    const groups = this.groups();
    if (groups.has(this.adminGroup) || groups.has(this.userGroup)) {
      if (groups.get(this.adminGroup)?.has(name)) return 'admin';
      return groups.get(this.userGroup)?.has(name) ? 'user' : null;
    }
    // todavía no se han creado los grupos en DSM: como antes
    if (this.admins.includes(name)) return 'admin';
    return !this.allowed.length || this.allowed.includes(name) ? 'user' : null;
  }

  groupsActive() {
    const g = this.groups();
    return g.has(this.adminGroup) || g.has(this.userGroup);
  }

  /**
   * Grupos del NAS (/etc/group: «nombre:x:gid:usuario1,usuario2»), releídos cada 30 s.
   * groupFile puede ser una lista separada por comas: se usa el primero que exista (la copia que deja
   * la tarea programada de DSM en /data, y si aún no está, el /etc/group montado)
   */
  groups() {
    if (!this.groupFile) return new Map();
    if (this.groupCache && Date.now() - this.groupCache.at < 30e3) return this.groupCache.groups;
    const groups = new Map();
    const files = this.groupFile.split(',').map(f => f.trim()).filter(Boolean);
    const file = files.find(f => fs.existsSync(f)) || files[0];
    try {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const [name, , , members = ''] = line.split(':');
        if (name) groups.set(name.toLowerCase(), new Set(members.split(',').map(m => m.trim().toLowerCase()).filter(Boolean)));
      }
    } catch (e) {
      // sin poder leerlo no se deja entrar a nadie por grupo; se avisa una vez
      if (!this.groupWarned) { console.warn('No se puede leer', file, e.message); this.groupWarned = true; }
      if (this.groupCache) return this.groupCache.groups;
    }
    this.groupCache = { at: Date.now(), groups };
    return groups;
  }

  prune() {
    const now = Date.now();
    for (const [k, s] of Object.entries(this.store.data.sessions)) if (s.exp < now) delete this.store.data.sessions[k];
    this.store.save();
  }

  async dsmLogin(account, passwd, otp) {
    const body = new URLSearchParams({
      api: 'SYNO.API.Auth', version: '6', method: 'login', session: DSM_SESSION, format: 'sid',
      account, passwd, ...(otp ? { otp_code: String(otp).trim() } : {})
    });
    // por POST: la contraseña no queda en los registros de DSM como parte de la URL
    const res = await fetch(this.dsmUrl + '/webapi/entry.cgi', {
      method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async dsmLogout(sid) {
    const q = new URLSearchParams({ api: 'SYNO.API.Auth', version: '6', method: 'logout', session: DSM_SESSION, _sid: sid });
    await fetch(this.dsmUrl + '/webapi/entry.cgi?' + q, { signal: AbortSignal.timeout(10000) });
  }
}

// En disco sólo se guarda el hash del token: quien lea el archivo no puede entrar con él
const hash = t => crypto.createHash('sha256').update(t).digest('hex');

module.exports = { Auth };
