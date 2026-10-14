// Integración con eMule a través de su servidor web.
// eMule no tiene API: se le instala una plantilla propia (CineLocal.tmpl) que hace que el
// servidor web devuelva líneas "clave<TAB>valor" en vez de HTML, y se leen con un parser sencillo.
const fs = require('fs');
const path = require('path');
const http = require('http');
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
  fs.copyFileSync(TEMPLATE, dest);
  return dest;
}

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
  // eMule recorta el salto de línea final de cada sección: "#/HEADER#FOOTER"
  text = text.replace(/#(\/?[A-Z]+)(?=#|\r?\n|$)/g, '\n#$1\n');
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

// ---------------------------------------------------------------- cliente del servidor web

const err = (msg, code) => Object.assign(new Error(msg), { code });
const HASH = /^[0-9A-F]{32}$/i;

class EmuleClient {
  constructor({ port, password }) {
    this.port = +port || DEFAULT_PORT;
    this.password = password || '';
    this.ses = null;
  }

  raw(params) {
    const qs = new URLSearchParams(params).toString();
    return new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port: this.port, path: '/?' + qs, timeout: 8000, headers: { Connection: 'close' } }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
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
  async call(params) {
    if (!this.ses) await this.login();
    let text = await this.raw({ ses: this.ses, ...params });
    if (!/#HEADER/.test(text) && /#LOGIN/.test(text)) {
      await this.login();
      text = await this.raw({ ses: this.ses, ...params });
    }
    const blocks = parseBlocks(text);
    const head = blocks.find(b => b.type === 'HEADER');
    if (!head) throw err('eMule no está usando la plantilla de CineLocal', 'template');
    return { head: head.data, blocks, text };
  }

  static status(head) {
    const con = (head.con || '').trim();     // connected (ID alta) / low / connecting / disconnected
    const kad = plain(head.kad);
    return {
      server: con === 'connected' ? 'high' : con === 'low' ? 'low' : con === 'connecting' ? 'connecting' : 'off',
      serverName: plain(head.context),
      kad: !kad || /desconectado|disconnected/i.test(kad) ? 'off'
        : /conectando|connecting/i.test(kad) ? 'connecting'
        : /cortafuegos|firewalled/i.test(kad) ? 'firewalled' : 'ok',
      kadText: kad,
      down: parseNum(head.down) * 1024,
      up: parseNum(head.up) * 1024
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

module.exports = { EmuleClient, inspect, installTemplate, isRunning, findInstall, startEmule, parseBlocks, parseEd2k, toDownload, toResult };
