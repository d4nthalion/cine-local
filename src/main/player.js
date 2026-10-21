// Reproducción con mpv: selección automática de pistas por idioma y seguimiento del progreso por IPC.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

// Variantes de etiquetas de idioma que aparecen en los MKV/MP4
const LANG_TAGS = {
  spa: ['spa', 'es', 'esp', 'es-ES', 'es-419', 'es-MX', 'cas', 'castellano', 'spanish', 'español'],
  eng: ['eng', 'en', 'en-US', 'en-GB', 'english', 'inglés'],
  fre: ['fre', 'fra', 'fr', 'fr-FR', 'french', 'français'],
  ger: ['ger', 'deu', 'de', 'de-DE', 'german', 'deutsch'],
  ita: ['ita', 'it', 'it-IT', 'italian', 'italiano'],
  por: ['por', 'pt', 'pt-PT', 'pt-BR', 'portuguese', 'português'],
  cat: ['cat', 'ca', 'catalan', 'català'],
  baq: ['baq', 'eus', 'eu', 'basque', 'euskara'],
  glg: ['glg', 'gl', 'galician', 'galego'],
  jpn: ['jpn', 'ja', 'japanese'],
  kor: ['kor', 'ko', 'korean'],
  chi: ['chi', 'zho', 'zh', 'chinese'],
  rus: ['rus', 'ru', 'russian'],
  dut: ['dut', 'nld', 'nl', 'dutch'],
  swe: ['swe', 'sv', 'swedish'],
  dan: ['dan', 'da', 'danish'],
  nor: ['nor', 'nob', 'no', 'norwegian'],
  pol: ['pol', 'pl', 'polish'],
  tur: ['tur', 'tr', 'turkish'],
  ara: ['ara', 'ar', 'arabic'],
  hin: ['hin', 'hi', 'hindi']
};

function langList(code) {
  if (!code || code === 'none' || code === 'original') return '';
  return (LANG_TAGS[code] || [code]).join(',');
}

function findMpv(custom, resourcesPath) {
  const candidates = [];
  if (custom) candidates.push(custom);
  const exe = process.platform === 'win32' ? 'mpv.exe' : 'mpv';
  if (resourcesPath) candidates.push(path.join(resourcesPath, 'mpv', exe));
  candidates.push(path.join(path.dirname(process.execPath), 'mpv', exe));
  candidates.push(path.join(__dirname, '..', '..', 'mpv', exe));
  if (process.platform === 'win32') {
    const env = process.env;
    const home = os.homedir();
    candidates.push(
      path.join(env.ProgramFiles || 'C:\\Program Files', 'mpv', 'mpv.exe'),
      path.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'mpv', 'mpv.exe'),
      path.join(env.LOCALAPPDATA || '', 'Programs', 'mpv', 'mpv.exe'),
      path.join(env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'mpv.exe'),
      path.join(home, 'scoop', 'apps', 'mpv', 'current', 'mpv.exe'),
      path.join(home, 'scoop', 'shims', 'mpv.exe'),
      'C:\\ProgramData\\chocolatey\\bin\\mpv.exe',
      'C:\\mpv\\mpv.exe'
    );
    // winget (paquete portable shinchiro.mpv u otros)
    const pk = path.join(env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
    try {
      for (const d of fs.readdirSync(pk)) {
        if (/mpv/i.test(d) && !/mpv\.net/i.test(d)) {
          candidates.push(path.join(pk, d, 'mpv.exe'));
          try { for (const sub of fs.readdirSync(path.join(pk, d))) candidates.push(path.join(pk, d, sub, 'mpv.exe')); } catch {}
        }
      }
    } catch {}
  } else {
    candidates.push('/usr/bin/mpv', '/usr/local/bin/mpv', '/opt/homebrew/bin/mpv');
  }
  for (const c of candidates) {
    try { if (c && fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {}
  }
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['mpv'], { encoding: 'utf8', windowsHide: true });
    const first = out.split(/\r?\n/).map(s => s.trim()).find(Boolean);
    if (first && fs.existsSync(first)) return first;
  } catch {}
  return null;
}

class Player extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.sock = null;
    this.state = {};
  }

  get playing() { return !!this.proc; }

  /**
   * @param {object} o
   * @param {string} o.mpv        ruta a mpv
   * @param {Array<{path:string,title:string,start?:number}>} o.playlist
   * @param {object} o.settings
   * @param {string} [o.uiDir]   carpeta de configuración con uosc (interfaz moderna); sin ella, la OSC de mpv
   * @param {string} [o.wid]     ventana donde dibujar (reproductor integrado en CineLocal); sin ella, ventana propia
   */
  play({ mpv, playlist, settings, screen, uiDir, wid }) {
    this.stop();
    const ipc = process.platform === 'win32'
      ? `\\\\.\\pipe\\cinelocal-mpv-${process.pid}`
      : path.join(os.tmpdir(), `cinelocal-mpv-${process.pid}.sock`);

    const args = [
      '--force-window=immediate',
      '--keep-open=no',
      '--idle=no',
      `--input-ipc-server=${ipc}`,
      '--sub-auto=fuzzy',
      '--audio-file-auto=fuzzy',
      '--osd-level=1',
      '--save-position-on-quit=no',
      '--hwdec=auto-safe',
      '--cursor-autohide=1000',
      '--osd-font=Segoe UI',
      '--sub-font=Segoe UI Semibold',
      '--sub-font-size=46',
      '--sub-border-size=2.5',
      '--sub-shadow-offset=1'
    ];
    if (uiDir) {
      // uosc sustituye a la OSC de mpv; --config-dir hace que cargue sus scripts, fuentes y opciones
      args.push(`--config-dir=${uiDir}`, '--osc=no', '--osd-bar=no', '--border=no',
        `--script-opts-append=thumbfast-mpv_path=${mpv}`);
    } else {
      args.push('--osc=yes');
    }
    if (wid) {
      // la pantalla completa la pone CineLocal en su ventana; mpv sólo informa de los cambios (tecla f, botón de uosc, Esc)
      // sin arrastre: mpv movería su ventana dentro de la de CineLocal
      args.push(`--wid=${wid}`, '--window-dragging=no');
    } else {
      if (settings.playerFullscreen !== false) args.push('--fs');
      if (Number.isInteger(screen)) args.push(`--fs-screen=${screen}`, `--screen=${screen}`);
    }

    // Audio: idioma preferido; si no existe mpv recurre a la pista por defecto del archivo.
    const alang = langList(settings.audioLang);
    if (alang) args.push(`--alang=${alang}`);

    // Subtítulos
    const mode = settings.subMode || 'always';
    const slang = langList(settings.subLang);
    if (mode === 'off' || !slang) {
      args.push('--sid=no');
    } else {
      args.push(`--slang=${slang}`);
      // "foreign": no mostrar subtítulos cuando el audio ya está en el idioma de los subtítulos
      args.push(`--subs-with-matching-audio=${mode === 'foreign' ? 'no' : 'yes'}`);
    }

    if (settings.extraMpvArgs) {
      for (const a of String(settings.extraMpvArgs).split(/\s+(?=--)/)) if (a.trim()) args.push(a.trim());
    }

    // Lista de reproducción con opciones por archivo (título y punto de reanudación)
    for (const item of playlist) {
      args.push('--{');
      if (item.title) args.push(`--force-media-title=${item.title}`);
      if (item.start && item.start > 5) args.push(`--start=${Math.floor(item.start)}`);
      args.push(item.path, '--}');
    }

    this.embedded = !!wid;
    this.fsSeen = false;
    this.maxSeen = false;
    this.state = { playlist, index: 0, path: playlist[0]?.path, pos: 0, dur: 0 };
    this.settings = settings;
    this.reqId = 100;
    this.pending = new Map();
    this.subsAdded = new Set();
    const proc = spawn(mpv, args, { windowsHide: false, stdio: ['ignore', 'ignore', 'pipe'] });
    this.proc = proc;
    let stderr = '';
    proc.stderr.on('data', d => { stderr = (stderr + d.toString()).slice(-4000); });
    proc.on('error', err => {
      if (this.proc !== proc) return;
      this.emit('error', err.message);
      this._cleanup();
    });
    proc.on('exit', code => {
      // una reproducción sustituida por otra nueva no debe cerrar la nueva
      if (this.proc !== proc) return;
      this._flush();
      this.emit('closed', { code, stderr: code ? stderr : '' });
      this._cleanup();
    });
    this._connect(ipc, 0);
  }

  _connect(ipc, attempt) {
    if (!this.proc) return;
    const sock = net.connect(ipc);
    sock.on('connect', () => {
      this.sock = sock;
      const send = cmd => sock.write(JSON.stringify({ command: cmd }) + '\n');
      send(['observe_property', 1, 'path']);
      send(['observe_property', 2, 'time-pos']);
      send(['observe_property', 3, 'duration']);
      send(['observe_property', 4, 'playlist-pos']);
      send(['observe_property', 8, 'pause']);
      if (this.embedded) {
        // integrado, mpv ignora estas órdenes (botones de uosc, teclas) y CineLocal las aplica a su ventana
        send(['observe_property', 5, 'fullscreen']);
        send(['observe_property', 6, 'window-minimized']);
        send(['observe_property', 7, 'window-maximized']);
      }
      // si el archivo ya se cargó antes de conectar, añadir ya los subtítulos externos
      this._get('duration').then(d => { if (d) this._addExternalSubs(); });
      this.emit('started');
    });
    let buf = '';
    sock.on('data', d => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try { this._onMsg(JSON.parse(line)); } catch {}
      }
    });
    sock.on('error', () => {
      if (!this.sock && attempt < 40) setTimeout(() => this._connect(ipc, attempt + 1), 150);
    });
    sock.on('close', () => { if (this.sock === sock) this.sock = null; });
  }

  _get(prop) {
    return new Promise(resolve => {
      if (!this.sock) return resolve(null);
      const id = ++this.reqId;
      this.pending.set(id, resolve);
      this.sock.write(JSON.stringify({ command: ['get_property', prop], request_id: id }) + '\n');
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); resolve(null); } }, 1500);
    });
  }

  _cmd(...args) {
    try { this.sock?.write(JSON.stringify({ command: args }) + '\n'); } catch {}
  }

  /** Añade subtítulos externos (p. ej. de la carpeta "Subtítulos") respetando las preferencias de idioma */
  async _addExternalSubs() {
    const p = await this._get('path');
    if (!p) return;
    const item = (this.state.playlist || []).find(i => samePath(i.path, p));
    if (!item?.subs?.length) return;
    this.subsAdded = this.subsAdded || new Set();
    if (this.subsAdded.has(item.path)) return;
    this.subsAdded.add(item.path);
    const st = this.settings || {};
    const prefTags = (LANG_TAGS[st.subLang] || []).map(x => x.toLowerCase());
    const [audioLang, subLang] = await Promise.all([this._get('current-tracks/audio/lang'), this._get('current-tracks/sub/lang')]);
    const mode = st.subMode || 'always';
    const audioIsPref = audioLang && prefTags.includes(String(audioLang).toLowerCase());
    const alreadyGood = subLang && prefTags.includes(String(subLang).toLowerCase());
    let selected = false;
    for (const sub of item.subs) {
      const isPref = sub.lang && sub.lang === st.subLang;
      const want = isPref && !selected && !alreadyGood && mode !== 'off' && st.subLang !== 'none' && !(mode === 'foreign' && audioIsPref);
      this._cmd('sub-add', sub.path, want ? 'select' : 'auto', sub.title || path.basename(sub.path), sub.lang || '');
      if (want) selected = true;
    }
  }

  _onMsg(m) {
    if (m.request_id && this.pending.has(m.request_id)) {
      const r = this.pending.get(m.request_id); this.pending.delete(m.request_id);
      r(m.error === 'success' ? m.data : null);
      return;
    }
    if (m.event === 'file-loaded') { this._addExternalSubs(); return; }
    // tras un salto (o al empezar un archivo) avisar con la posición ya actualizada
    if (m.event === 'playback-restart') { this._get('time-pos').then(p => { if (typeof p === 'number') this.state.pos = p; this._emitState(); }); return; }
    if (m.event !== 'property-change') return;
    const s = this.state;
    if (m.name === 'path' && m.data && m.data !== s.path) {
      this._flush();
      s.path = m.data; s.pos = 0; s.dur = 0;
    } else if (m.name === 'time-pos' && typeof m.data === 'number') {
      s.pos = m.data;
      const now = Date.now();
      if (!s.lastEmit || now - s.lastEmit > 5000) { s.lastEmit = now; this._flush(); this._emitState(); }
    } else if (m.name === 'duration' && typeof m.data === 'number') {
      const first = !(s.dur > 0) || Math.abs(m.data - s.dur) > 2;
      s.dur = m.data;
      if (first) this._emitState();
    } else if (m.name === 'pause' && typeof m.data === 'boolean') {
      if (s.paused !== m.data) { s.paused = m.data; this._emitState(); }
    } else if (m.name === 'fullscreen' && typeof m.data === 'boolean') {
      // el primer aviso es el valor inicial de mpv, no un cambio pedido por el usuario
      if (this.fsSeen) this.emit('fullscreen', m.data);
      this.fsSeen = true;
    } else if (m.name === 'window-minimized' && m.data === true) {
      this.emit('minimize');
      this._cmd('set', 'window-minimized', 'no');
    } else if (m.name === 'window-maximized' && typeof m.data === 'boolean') {
      if (this.maxSeen) this.emit('maximize', m.data);
      this.maxSeen = true;
    }
  }

  _flush() {
    const s = this.state;
    if (s.path && s.dur > 0) this.emit('progress', { path: resolvePath(s.path, s.playlist), pos: s.pos, dur: s.dur });
  }

  /** Estado de la reproducción (archivo, posición, duración, pausa) para Discord: al empezar, pausar, saltar y cada 5 s */
  _emitState() {
    const s = this.state;
    if (s.path && s.dur > 0) this.emit('state', { path: resolvePath(s.path, s.playlist), pos: s.pos, dur: s.dur, paused: !!s.paused });
  }

  /** Integrado: refleja en mpv la pantalla completa de la ventana de CineLocal */
  setFullscreen(v) { this._cmd('set', 'fullscreen', v ? 'yes' : 'no'); }

  /** Integrado: refleja en mpv si la ventana de CineLocal está maximizada (icono del botón de uosc) */
  setMaximized(v) { this._cmd('set', 'window-maximized', v ? 'yes' : 'no'); }

  /** Integrado: tecla pulsada con el foco en CineLocal (nombre de tecla de mpv) */
  key(name) { this._cmd('keypress', name); }

  stop() {
    if (this.proc) {
      try { this.sock?.write(JSON.stringify({ command: ['quit'] }) + '\n'); } catch {}
      const p = this.proc;
      setTimeout(() => { try { p.kill(); } catch {} }, 800);
    }
  }

  _cleanup() {
    try { this.sock?.destroy(); } catch {}
    this.sock = null;
    this.proc = null;
  }
}

// mpv puede devolver la ruta con otra normalización; la casamos con la lista original.
function samePath(a, b) { return path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase(); }

function resolvePath(p, playlist) {
  const norm = x => path.normalize(x).toLowerCase();
  const hit = (playlist || []).find(i => norm(i.path) === norm(p));
  return hit ? hit.path : p;
}

module.exports = { Player, findMpv, LANG_TAGS };
