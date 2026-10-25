// Modo NAS: inicia sesión en el NAS (SMB) con «net use» para que Windows, el escáner, el vigilante y mpv
// puedan leer \\NAS\Carpeta sin depender de las credenciales guardadas en el Explorador.
const { execFile } = require('child_process');
const fs = require('fs');

// Mensajes en español de los errores de sistema que devuelve «net use»
const ERRORS = {
  53: 'No se encuentra el NAS. Comprueba el nombre o la IP y, si estás fuera de casa, que la VPN esté conectada',
  67: 'El NAS responde pero no comparte archivos (¿SMB desactivado en DSM?)',
  64: 'Se ha cortado la conexión con el NAS',
  121: 'El NAS ha tardado demasiado en responder',
  86: 'Usuario o contraseña incorrectos',
  1326: 'Usuario o contraseña incorrectos',
  1327: 'La cuenta tiene restricciones de inicio de sesión',
  1331: 'La cuenta está desactivada en el NAS',
  1909: 'La cuenta está bloqueada en el NAS por demasiados intentos',
  1219: 'Windows ya está conectado a este NAS con otro usuario. Cierra esa sesión (net use \\\\NAS /delete) o usa el mismo usuario',
  2202: 'El nombre de usuario no es válido'
};

/** «\\nas», «nas», «smb://nas» → «nas» */
const cleanHost = h => String(h || '').trim().replace(/^smb:\/\//i, '').replace(/^[\\/]+/, '').split(/[\\/]/)[0];
/** Identifica una sesión: si cambia el host, el usuario o la contraseña, hay que abrir otra */
const keyOf = cfg => [cleanHost(cfg.host).toLowerCase(), cfg.user || '', cfg.password || ''].join('|');

function run(args, timeout = 30000) {
  return new Promise(resolve => {
    execFile('net', args, { windowsHide: true, timeout, encoding: 'latin1' }, (err, stdout, stderr) => {
      const code = err ? +((stderr || '').match(/\d+/) || [])[0] || (err.killed ? 121 : null) : 0;
      resolve({ code, out: (stderr || stdout || '').trim() });
    });
  });
}

class NasSession {
  constructor() {
    this.key = null;        // keyOf() de la sesión abierta por CineLocal
    this.pending = null;
  }

  /** Abre la sesión si hace falta. cfg: { host, user, password } */
  async ensure(cfg) {
    const host = cleanHost(cfg.host);
    if (!host) return { ok: false, error: 'Escribe el nombre o la IP del NAS' };
    const key = keyOf(cfg);
    if (this.key === key) return { ok: true };
    if (this.pending?.key === key) return this.pending.promise;
    const promise = this.connect(host, cfg).finally(() => { if (this.pending?.promise === promise) this.pending = null; });
    this.pending = { key, promise };
    return promise;
  }

  /** cfg.roots: carpetas de la biblioteca, para ver si ya se pueden leer con otra sesión */
  async connect(host, cfg) {
    const { user, password, roots = [] } = cfg;
    if (this.key) await this.disconnect();
    if (!user) return { ok: false, error: 'Escribe el usuario del NAS' };
    const r = await run(['use', `\\\\${host}\\IPC$`, password || '', `/user:${user}`, '/persistent:no']);
    if (r.code === 0) { this.key = keyOf(cfg); return { ok: true }; }
    // ya había una sesión de Windows con otro usuario (p. ej. la del Explorador): si se lee la biblioteca, vale igual
    if (r.code === 1219 && roots.some(p => fs.existsSync(p))) return { ok: true, note: 'Windows ya tenía abierta una sesión en el NAS con otro usuario; se usa esa' };
    return { ok: false, code: r.code, error: ERRORS[r.code] || r.out.split(/\r?\n/).filter(Boolean).pop() || 'No se pudo conectar con el NAS' };
  }

  /** Cierra sólo la sesión que abrió CineLocal */
  async disconnect() {
    if (!this.key) return;
    const host = this.key.split('|')[0];
    this.key = null;
    await run(['use', `\\\\${host}\\IPC$`, '/delete', '/y'], 10000);
  }

  /** Olvida la sesión (p. ej. tras un fallo de lectura) para volver a abrirla en el próximo escaneo */
  reset() { this.key = null; }
}

module.exports = { NasSession, cleanHost, keyOf };
