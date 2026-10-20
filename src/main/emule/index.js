// Integración con eMule a través de su servidor web.
// eMule no tiene API: se le instala una plantilla propia (CineLocal.tmpl) que hace que el
// servidor web devuelva líneas "clave<TAB>valor" en vez de HTML, y se leen con un parser sencillo.
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const { execFile, spawn } = require('child_process');

const TEMPLATE = path.join(__dirname, 'CineLocal.tmpl');
const DEFAULT_PORT = 4711;

// ---------------------------------------------------------------- instalación y configuración

function regInstallPath() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    execFile('reg', ['query', 'HKCU\\Software\\eMule', '/v', 'Install Path'], { windowsHide: true }, (err, out) => {
      const m = !err && out.match(/Install Path\s+REG_SZ\s+(.+)/);
      resolve(m ? m[1].trim() : null);
    });
  });
}

/** Busca emule.exe: ruta configurada, registro o carpetas habituales */
async function findInstall(custom) {
  const dirs = [];
  if (custom) dirs.push(/\.exe$/i.test(custom) ? path.dirname(custom) : custom);
  const reg = await regInstallPath();
  if (reg) dirs.push(reg);
  for (const v of ['ProgramFiles(x86)', 'ProgramFiles', 'ProgramW6432']) if (process.env[v]) dirs.push(path.join(process.env[v], 'eMule'));
  for (const d of dirs) {
    const exe = path.join(d, 'emule.exe');
    if (fs.existsSync(exe)) return { dir: d, exe };
  }
  return null;
}

/** Carpeta de configuración de eMule (por usuario, pública o junto al programa) */
function findConfigDir(installDir) {
  const cands = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'eMule', 'config'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'eMule', 'config'),
    process.env.PUBLIC && path.join(process.env.PUBLIC, 'eMule', 'config'),
    installDir && path.join(installDir, 'config')
  ].filter(Boolean);
  let best = null, bestTime = 0;
  for (const d of cands) {
    try {
      const t = fs.statSync(path.join(d, 'preferences.ini')).mtimeMs;
      if (t > bestTime) { best = d; bestTime = t; }
    } catch {}
  }
  return best;
}

// Los .ini de eMule 0.50a están en ANSI (Windows-1252); latin1 conserva los bytes tal cual.
function readIni(file) {
  const out = {};
  let sec = null;
  for (const line of fs.readFileSync(file, 'latin1').split(/\r?\n/)) {
    const s = line.match(/^\[(.+)\]\s*$/);
    if (s) { sec = out[s[1]] = out[s[1]] || {}; continue; }
    const kv = line.match(/^([^=;]+)=(.*)$/);
    if (kv && sec) sec[kv[1].trim()] = kv[2];
  }
  return out;
}

/** Lo que interesa de la configuración actual de eMule */
async function inspect(customPath) {
  const inst = await findInstall(customPath);
  const configDir = findConfigDir(inst?.dir);
  const res = { installed: !!inst, exe: inst?.exe || null, configDir, running: await isRunning() };
  if (configDir) {
    const ini = readIni(path.join(configDir, 'preferences.ini'));
    const ws = ini.WebServer || {};
    res.webEnabled = ws.Enabled === '1';
    res.port = +ws.Port || DEFAULT_PORT;
    res.template = ini.eMule?.WebTemplateFile || '';
    res.incoming = incomingDirs(configDir, ini);
  }
  return res;
}

/** Carpeta de descargas completadas y las de las categorías */
function incomingDirs(configDir, ini) {
  const dirs = new Set();
  if (ini?.eMule?.IncomingDir) dirs.add(ini.eMule.IncomingDir);
  try {
    const cats = readIni(path.join(configDir, 'Category.ini'));
    for (const [k, v] of Object.entries(cats)) if (/^Cat#/.test(k) && v.Incoming) dirs.add(v.Incoming);
  } catch {}
  return [...dirs];
}

function isRunning() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(false);
    execFile('tasklist', ['/FI', 'IMAGENAME eq emule.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /emule\.exe/i.test(out)));
  });
}

function startEmule(exe) {
  const p = spawn(exe, [], { cwd: path.dirname(exe), detached: true, stdio: 'ignore' });
  p.unref();
}

/**
 * Copia la plantilla a la carpeta de datos de CineLocal (la de la app cambia con cada versión)
 * y devuelve su ruta para indicarla en eMule → Opciones → Servidor Web.
 * La contraseña se pone en eMule, que la guarda con su propio hash y aplica todo sin reiniciar.
 */
function installTemplate(dataDir) {
  const dir = path.join(dataDir, 'emule');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'CineLocal.tmpl');
  const src = fs.readFileSync(TEMPLATE);
  let cur = null;
  try { cur = fs.readFileSync(dest); } catch {}
  // Sólo se escribe si ha cambiado; eMule no la vuelve a leer hasta pulsar «Recargar» (TEMPLATE_REV)
  if (!cur || !cur.equals(src)) fs.writeFileSync(dest, src);
  return dest;
}

/**
 * Revisión de la plantilla que espera esta versión de CineLocal. eMule la devuelve en la línea
 * "tmpl" de la cabecera; si falta o es menor, eMule sigue con la plantilla antigua en memoria.
 */
const TEMPLATE_REV = 2;

// ---------------------------------------------------------------- respuesta de la plantilla

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeHtml(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
/** Texto visible: sin etiquetas ni los enlaces "(Conectar…)" que añade eMule */
function plain(s) {
  return decodeHtml(String(s || '').replace(/\s*\((?:[^()]*<a\b[^>]*>[^<]*<\/a>[^()]*)+\)/gi, '').replace(/<[^>]+>/g, '')).trim();
}
function unescapeJs(s) { return String(s || '').replace(/\\n/g, '\n').replace(/\\(.)/g, '$1'); }

/** Divide la respuesta en bloques "#TIPO ... #/TIPO" con sus pares clave/valor */
function parseBlocks(text) {
  const blocks = [];
  let cur = null;
  // eMule recorta el salto de línea final de cada sección y las pega: "#/HEADER#FOOTER", "#/S#S".
  // Sólo se separan los cierres seguidos de otra marca, para no confundir un "#" dentro de un valor.
  text = text.replace(/(#\/[A-Z]+)(?=#\/?[A-Z])/g, '$1\n');
  for (const line of text.split(/\r?\n/)) {
    const open = line.match(/^#([A-Z]+)\s*$/);
    if (open) { cur = { type: open[1], data: {} }; blocks.push(cur); continue; }
    if (/^#\/[A-Z]+\s*$/.test(line)) { cur = null; continue; }
    const tab = line.indexOf('\t');
    if (cur && tab > 0) cur.data[line.slice(0, tab)] = line.slice(tab + 1);
  }
  return blocks;
}

/** ed2k://|file|nombre|tamaño|hash|...|/ */
function parseEd2k(link) {
  const m = /^ed2k:\/\/\|file\|([^|]+)\|(\d+)\|([0-9a-f]{32})\|/i.exec(String(link || '').trim());
  if (!m) return null;
  let name = m[1];
  try { name = decodeURIComponent(name); } catch {}
  return { name, size: +m[2], hash: m[3].toUpperCase() };
}

function parseNum(s) {
  const m = /\d+(?:[.,]\d+)?/.exec(s || '');
  return m ? parseFloat(m[0].replace(',', '.')) || 0 : 0;
}

function toDownload(d) {
  const link = parseEd2k(decodeHtml(d.ed2k));
  const info = unescapeJs(decodeHtml(d.info));
  const state = (d.state || '').trim();
  const size = link?.size || 0;
  // "Completado: 12.3 MB/149.26 MB (8.2%)": el porcentaje es el único dato exacto del avance
  const pm = /\/[^\n(]*\(([\d.,]+)\s*%\)/.exec(info);
  let progress = state === 'complete' ? 1 : pm ? parseNum(pm[1]) / 100 : 0;
  progress = Math.max(0, Math.min(1, progress));
  const src = (d.sources || '').match(/\d+/g)?.map(Number) || [];
  return {
    hash: (d.hash || link?.hash || '').trim().toUpperCase(),
    name: link?.name || unescapeJs(decodeHtml(d.name)),
    size,
    done: Math.round(size * progress),
    progress,
    speed: parseNum(d.speed) * 1024,            // eMule da kB/s
    sources: src[0] || 0,
    sourcesTotal: src[1] ?? src[0] ?? 0,
    state,
    priority: (d.prio || '').trim(),
    link: link ? decodeHtml(d.ed2k).trim() : null
  };
}

function toResult(r) {
  // Orden de los %s de TMPL_SEARCH_RESULT_LINE: 1 icono de fuentes, 2 enlace ed2k, 3 icono de valoración, 4 tipo, 5 nombre, 6 tamaño, 7 hash, 8 "fuentes(completas)", 9 hash
  const link = parseEd2k(decodeHtml(r.s2));
  if (!link) return null;
  const src = plain(r.s8).match(/\d+/g)?.map(Number) || [];
  return {
    hash: link.hash,
    name: link.name,
    size: link.size,
    sources: src[0] || 0,
    complete: src[1] ?? 0,
    type: (r.s4 || '').trim()
  };
}

/** Texto completo: eMule recorta los nombres largos a <acronym title="completo">recortado...</acronym> */
function fullText(s) {
  const m = /<acronym\b[^>]*\btitle="([^"]*)"/i.exec(s || '');
  return m ? decodeHtml(m[1]).trim() : plain(s);
}

/** Cifras abreviadas de eMule (CastItoIShort): "523", "12.34 k", "1,2 M" */
function parseShort(s) {
  const m = /(\d+(?:[.,]\d+)?)\s*([kmgt])?/i.exec(s || '');
  if (!m) return 0;
  const mult = { k: 1e3, m: 1e6, g: 1e9, t: 1e12 }[(m[2] || '').toLowerCase()] || 1;
  return Math.round(parseFloat(m[1].replace(',', '.')) * mult);
}

const SRV_STATES = new Set(['high', 'low', 'connecting', 'failed', 'disconnected']);

/** Línea de TMPL_SERVER_LINE (WebServer.cpp de eMule 0.50a, _GetServerList) */
function toServer(d) {
  const ip = (d.ip || '').trim();
  const port = parseInt(d.port, 10) || 0;
  if (!ip || !port) return null;
  const users = plain(d.users);                 // "usuarios (máximo)" o vacío si no se sabe
  const max = /\(([^)]*)\)/.exec(users);
  const state = (d.state || '').trim();
  return {
    name: fullText(d.name) || ip,
    ip,
    port,
    description: fullText(d.desc),
    ping: parseInt(d.ping, 10) || 0,
    users: parseShort(users.replace(/\(.*$/, '')),
    maxUsers: max ? parseShort(max[1]) : 0,
    files: parseShort(plain(d.files)),
    failed: parseInt(d.failed, 10) || 0,
    priority: ({ low: 'low', normal: 'normal', high: 'high' })[(d.prio || '').trim().toLowerCase()] || 'normal',
    static: (d.type || '').trim() === 'static',
    state: SRV_STATES.has(state) ? state : 'disconnected',
    connected: state === 'high' || state === 'low',
    version: fullText(d.version)
  };
}

/** Bloque #KAD (TMPL_KADDLG): contactos y búsquedas activas en "n<br />n" */
function toKad(d) {
  if (!d) return null;
  const n = String(d.stats || '').split(/<br\s*\/?>/i).map(x => parseInt(plain(x), 10) || 0);
  return { text: plain(d.status), contacts: n[0] || 0, searches: n[1] || 0, canBootstrap: (d.bootstrap || '').trim() === 'yes' };
}

/** Estado de Kad: los enlaces que añade eMule no dependen del idioma; el texto, de reserva */
function kadState(raw) {
  raw = String(raw || '');
  if (/c=rcfirewall/.test(raw)) return 'firewalled';
  if (/c=disconnect/.test(raw)) return 'ok';
  if (/c=connect/.test(raw)) return 'off';
  const t = plain(raw);
  return !t || /desconectado|disconnected/i.test(t) ? 'off'
    : /conectando|connecting/i.test(t) ? 'connecting'
    : /cortafuegos|firewalled/i.test(t) ? 'firewalled' : 'ok';
}

const HOST = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/i;
function checkAddr(ip, port) {
  ip = String(ip || '').trim();
  port = +port;
  if (!HOST.test(ip)) throw err('Dirección de servidor no válida');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw err('Puerto no válido');
  return { ip, port: String(port) };
}

// ---------------------------------------------------------------- cliente del servidor web

const err = (msg, code) => Object.assign(new Error(msg), { code });
const HASH = /^[0-9A-F]{32}$/i;

class EmuleClient {
  constructor({ port, password }) {
    this.port = +port || DEFAULT_PORT;
    this.password = password || '';
    this.ses = null;
  }

  raw(params, timeout = 8000) {
    const qs = new URLSearchParams(params).toString();
    return new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port: this.port, path: '/?' + qs, timeout, headers: { Connection: 'close' } }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          // Con "Usar compresión gzip" (UseGzip=1) eMule comprime las páginas aunque no se pida
          let buf = Buffer.concat(chunks);
          if (/gzip/i.test(res.headers['content-encoding'] || '') || (buf[0] === 0x1f && buf[1] === 0x8b)) {
            try { buf = zlib.gunzipSync(buf); } catch (e) { return reject(e); }
          }
          resolve(buf.toString('utf8'));
        });
        res.on('error', reject);
      });
      req.on('timeout', () => req.destroy(err('eMule no responde', 'offline')));
      req.on('error', e => reject(e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET'
        ? err('eMule no está abierto o su servidor web está desactivado', 'offline') : e));
    });
  }

  async login() {
    if (!this.password) throw err('Falta la contraseña del servidor web de eMule', 'unconfigured');
    this.ses = null;
    const text = await this.raw({ w: 'password', p: this.password });
    const head = parseBlocks(text).find(b => b.type === 'HEADER');
    if (!head) {
      if (/#LOGIN/.test(text)) throw err('eMule ha rechazado la contraseña', 'auth');
      throw err('eMule no está usando la plantilla de CineLocal', 'template');
    }
    this.ses = head.data.ses;
    return head;
  }

  /** Petición con sesión; si ha caducado (5 min sin uso por defecto) se vuelve a entrar una vez */
  async call(params, timeout) {
    if (!this.ses) await this.login();
    let text = await this.raw({ ses: this.ses, ...params }, timeout);
    if (!/#HEADER/.test(text) && /#LOGIN/.test(text)) {
      await this.login();
      text = await this.raw({ ses: this.ses, ...params }, timeout);
    }
    const blocks = parseBlocks(text);
    const head = blocks.find(b => b.type === 'HEADER');
    if (!head) throw err('eMule no está usando la plantilla de CineLocal', 'template');
    return { head: head.data, blocks, text };
  }

  static status(head) {
    // [ConState] de eMule 0.50a: high (ID alta) / low (ID baja) / connecting / disconnected
    const con = (head.con || '').trim();
    return {
      server: con === 'high' || con === 'connected' ? 'high' : con === 'low' ? 'low' : con === 'connecting' ? 'connecting' : 'off',
      serverName: plain(head.context),
      kad: kadState(head.kad),
      kadText: plain(head.kad),
      down: parseNum(head.down) * 1024,
      up: parseNum(head.up) * 1024,
      template: parseInt(head.tmpl, 10) || 1    // revisión de la plantilla cargada en eMule
    };
  }

  async transfers(params = {}) {
    const { head, blocks } = await this.call({ w: 'transfer', ...params });
    return {
      status: EmuleClient.status(head),
      downloads: blocks.filter(b => b.type === 'D').map(b => toDownload(b.data)).filter(d => d.hash)
    };
  }

  /** op: pause | resume | stop | cancel | priolow | prionormal | priohigh | prioauto | clear */
  fileOp(hash, op) {
    if (!HASH.test(hash)) throw err('Descarga no válida');
    if (op === 'clear') return this.transfers({ clearcompleted: hash });
    if (!/^(pause|resume|stop|cancel|prio(low|normal|high|auto))$/.test(op)) throw err('Operación no válida');
    return this.transfers({ op, file: hash });
  }

  clearCompleted() { return this.transfers({ clearcompleted: 'all' }); }

  addLink(link) {
    if (!parseEd2k(link)) throw err('Eso no parece un enlace ed2k de archivo');
    return this.transfers({ ed2k: link.trim() });
  }

  connect() { return Promise.all([this.call({ w: 'server', c: 'connect' }), this.call({ w: 'kad', c: 'connect' })]); }

  // ---- servidores y Kad (w=server y w=kad de WebServer.cpp)

  /**
   * Lista de servidores con el estado de la conexión y de Kad.
   * outdated: eMule sigue con una plantilla anterior en memoria (hay que pulsar «Recargar» en eMule).
   */
  async servers(params = {}, timeout) {
    const [{ head, blocks }, kad] = await Promise.all([
      this.call({ w: 'server', ...params }, timeout),
      this.call({ w: 'kad' }).then(r => r.blocks.find(b => b.type === 'KAD')?.data, () => null)
    ]);
    const status = EmuleClient.status(head);
    const list = blocks.find(b => b.type === 'SERVERS');
    const msg = blocks.find(b => b.type === 'SRVMSG');
    return {
      status,
      outdated: !list || status.template < TEMPLATE_REV,
      servers: blocks.filter(b => b.type === 'S').map(b => toServer(b.data)).filter(Boolean),
      kad: toKad(kad),
      message: msg ? plain(msg.data.msg) : ''
    };
  }

  /** Sin dirección: el primer servidor disponible (como «Conectar» en eMule). Con ella, uno de la lista */
  connectServer(ip, port) {
    if (!ip) return this.servers({ c: 'connect' });
    return this.servers({ c: 'connect', ...checkAddr(ip, port) });
  }

  /** Desconecta del servidor o cancela el intento de conexión en curso */
  disconnectServer() { return this.servers({ c: 'disconnect' }); }

  /** op: connect | disconnect | recheck (volver a comprobar el cortafuegos) | bootstrap (con ip y puerto de un nodo) */
  async kad(op, ip, port) {
    const p = op === 'connect' ? { c: 'connect' } : op === 'disconnect' ? { c: 'disconnect' } : op === 'recheck' ? { c: 'rcfirewall' }
      : op === 'bootstrap' ? { bootstrap: '1', ...checkAddr(ip, port) } : null;
    if (!p) throw err('Operación de Kad no válida');
    const { head, blocks } = await this.call({ w: 'kad', ...p });
    return { status: EmuleClient.status(head), kad: toKad(blocks.find(b => b.type === 'KAD')?.data) };
  }

  /**
   * Añade los servidores de un server.met remoto. eMule lo descarga mientras responde (abre su
   * ventana de progreso), así que la espera es larga; el mensaje es la última línea de su registro.
   */
  updateServerMet(url) {
    url = String(url || '').trim();
    if (!/^https?:\/\/[^\s"'<>]+$/i.test(url)) throw err('Escribe la dirección completa de un server.met (http://…)');
    return this.servers({ updateservermetfromurl: 'true', servermeturl: url }, 120000);
  }

  /** method: global (todos los servidores) | server | kademlia · min/max en MB */
  search({ query, method = 'global', type = 'Video', min, max }) {
    const p = { w: 'search', tosearch: query, type, method, unicode: 'on' };
    if (min) p.min = String(min);
    if (max) p.max = String(max);
    return this.searchResults(p);
  }

  async searchResults(extra = {}) {
    const { blocks } = await this.call({ w: 'search', ...extra });
    const s = blocks.find(b => b.type === 'SEARCH');
    return { message: plain(s?.data.msg), results: blocks.filter(b => b.type === 'R').map(b => toResult(b.data)).filter(Boolean) };
  }

  download(hash) {
    if (!HASH.test(hash)) throw err('Resultado no válido');
    return this.searchResults({ downloads: hash });
  }
}

module.exports = { EmuleClient, inspect, installTemplate, isRunning, findInstall, startEmule, parseBlocks, parseEd2k, toDownload, toResult, toServer, toKad, kadState, parseShort, TEMPLATE_REV };
