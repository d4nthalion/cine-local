// Actualizaciones automáticas desde las releases de GitHub (d4nthalion/cine-local).
//
// * Instalador (NSIS): electron-updater lee `latest.yml` de la release marcada como «latest» en GitHub,
//   descarga el instalador nuevo en segundo plano y lo instala al cerrar (o al pulsar «Reiniciar ahora»).
// * Portable: no puede instalarse sola; se consulta la API de GitHub y, si hay versión nueva, se avisa
//   con un botón que abre la página de la release.
// * Las releases de Android (`android-vX.Y.Z`) se publican con --latest=false, así que GitHub nunca las
//   devuelve como «latest»; aun así, antes de descargar se comprueba que la etiqueta sea `vX.Y.Z`.
// * Los errores nunca interrumpen: se guardan en updater.log y sólo se ven en Ajustes.
const { app, net, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const REPO = 'd4nthalion/cine-local';
const RELEASES_URL = `https://github.com/${REPO}/releases`;
const DESKTOP_TAG = /^v\d+\.\d+\.\d+$/;
const DESKTOP_VERSION = /^\d+\.\d+\.\d+$/;

// Sólo para pruebas con `npx electron` (nunca en la app empaquetada): servidor de actualizaciones falso
const testFeed = () => (!app.isPackaged && process.env.CINELOCAL_UPDATE_FEED) || null;
const testApi = () => (!app.isPackaged && process.env.CINELOCAL_RELEASES_API) || null;

/** 1.10.0 > 1.9.3 (sólo versiones X.Y.Z) */
function newer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

/** Notas de la release (HTML del feed de GitHub o texto de latest.yml) → texto plano corto */
function notesText(notes) {
  if (Array.isArray(notes)) notes = notes.map(n => n.note || '').join('\n');
  if (!notes) return '';
  const txt = String(notes)
    .replace(/<\s*(br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim();
  return txt.length > 1200 ? txt.slice(0, 1200).trimEnd() + '…' : txt;
}

/** Mensaje corto para Ajustes (el detalle completo va al registro) */
function friendlyError(e) {
  const code = e?.code || '';
  const msg = String(e?.message || e || '');
  if (code === 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND') return 'La última versión publicada no admite actualización automática';
  if (code === 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' || code === 'ERR_UPDATER_NO_PUBLISHED_VERSIONS') return 'No se encuentra ninguna versión publicada en GitHub';
  if (code === 'ERR_UPDATER_INVALID_SIGNATURE' || /sha512 checksum mismatch/i.test(msg)) return 'La descarga no es válida; se volverá a intentar más tarde';
  if (/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_CONNECTION|ERR_NETWORK|ERR_TIMED_OUT|fetch failed/i.test(msg)) return 'Sin conexión con GitHub';
  if (/\b(403|429)\b/.test(msg)) return 'GitHub ha limitado las consultas; prueba más tarde';
  return msg.split('\n')[0].slice(0, 160) || 'Error desconocido';
}

class Updater {
  /**
   * @param {{ getSettings: () => object, send: (ch: string, data: any) => void, getWindow: () => Electron.BrowserWindow, icon: string, dataDir: string }} o
   */
  constructor({ getSettings, send, getWindow, icon, dataDir }) {
    this.getSettings = getSettings;
    this.send = send;
    this.getWindow = getWindow;
    this.icon = icon;
    this.logFile = path.join(dataDir, 'updater.log');
    this.portable = !!process.env.PORTABLE_EXECUTABLE_DIR;
    // installer: se actualiza sola · portable: sólo avisa · dev: ejecutando desde el código (npm start)
    this.mode = this.portable ? (app.isPackaged || testApi() ? 'portable' : 'dev') : (app.isPackaged || testFeed() ? 'installer' : 'dev');
    this.au = null;
    this.lastProgress = 0;
    this.st = { state: 'idle', current: app.getVersion(), mode: this.mode };
  }

  // ---------- registro ----------
  log(level, ...args) {
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${args.map(a => a instanceof Error ? (a.stack || a.message) : typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
    (level === 'error' ? console.error : console.log)('Actualizaciones:', line.trim());
    try {
      fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
      if (fs.existsSync(this.logFile) && fs.statSync(this.logFile).size > 256 * 1024) fs.renameSync(this.logFile, this.logFile + '.old');
      fs.appendFileSync(this.logFile, line);
    } catch {}
  }

  // ---------- estado ----------
  status() { return this.st; }

  set(patch, replace = false) {
    this.st = replace ? { current: app.getVersion(), mode: this.mode, ...patch } : { ...this.st, ...patch };
    this.send('update:status', this.st);
  }

  /** electron-updater se carga sólo cuando hace falta (no retrasa el arranque ni se usa en la portable) */
  updater() {
    if (this.au) return this.au;
    const { autoUpdater } = require('electron-updater');
    const au = autoUpdater;
    au.logger = { info: m => this.log('info', m), warn: m => this.log('warn', m), error: m => this.log('error', m), debug: () => {} };
    au.autoDownload = false;          // se descarga a mano tras comprobar que la release es de escritorio (ver onAvailable)
    au.autoInstallOnAppQuit = true;   // lo descargado se instala al cerrar CineLocal
    au.allowPrerelease = false;
    au.allowDowngrade = false;
    au.disableWebInstaller = true;
    if (testFeed()) {
      // prueba: servidor local, caché aparte y sin instalar nada al cerrar
      const cfg = path.join(path.dirname(this.logFile), 'dev-app-update.yml');
      fs.writeFileSync(cfg, `provider: generic\nurl: ${testFeed()}\nupdaterCacheDirName: cinelocal-updater-test\n`);
      au.updateConfigPath = cfg;
      au.forceDevUpdateConfig = true;
      au.autoInstallOnAppQuit = false;
      this.log('warn', 'Modo de prueba: servidor de actualizaciones', testFeed());
    }
    au.on('checking-for-update', () => this.set({ state: 'checking', error: null }));
    au.on('update-available', info => this.onAvailable(info));
    au.on('update-not-available', info => this.set({ state: 'not-available', latest: info?.version || null, checkedAt: Date.now() }, true));
    au.on('download-progress', p => {
      const percent = Math.max(0, Math.min(100, Math.floor(p.percent || 0)));
      // como mucho un aviso por cada 1 % o cada medio segundo
      if (percent === this.st.percent && Date.now() - this.lastProgress < 500) return;
      this.lastProgress = Date.now();
      this.set({ state: 'downloading', percent, bytes: p.transferred, total: p.total, speed: p.bytesPerSecond });
    });
    au.on('update-downloaded', info => this.onDownloaded(info));
    au.on('error', e => {
      this.log('error', e);
      // un fallo al volver a comprobar no debe ocultar una actualización ya descargada
      if (this.st.state === 'downloaded') return;
      this.set({ state: 'error', error: friendlyError(e), checkedAt: Date.now() }, true);
    });
    this.au = au;
    return au;
  }

  onAvailable(info) {
    const version = info?.version;
    // Defensa extra: nunca una release de Android (android-vX.Y.Z) ni versiones raras o antiguas
    if ((info?.tag != null && !DESKTOP_TAG.test(info.tag)) || !DESKTOP_VERSION.test(version || '') || !newer(version, app.getVersion())) {
      this.log('warn', `Release descartada (etiqueta ${info?.tag}, versión ${version})`);
      this.set({ state: 'not-available', latest: null, checkedAt: Date.now() }, true);
      return;
    }
    this.set({ state: 'available', version, notes: notesText(info.releaseNotes), url: `${RELEASES_URL}/tag/v${version}`, percent: 0, checkedAt: Date.now() }, true);
    this.au.downloadUpdate().catch(() => {});   // los errores llegan por el evento 'error'
  }

  onDownloaded(info) {
    this.set({ state: 'downloaded', version: info?.version || this.st.version, percent: 100 });
    const win = this.getWindow();
    if (Notification.isSupported() && (!win || win.isDestroyed() || !win.isFocused())) {
      const n = new Notification({
        title: `CineLocal ${this.st.version} está lista`,
        body: 'Se instalará al cerrar CineLocal.',
        icon: this.icon
      });
      n.on('click', () => this.focus());
      n.show();
    }
  }

  focus() {
    const win = this.getWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show(); win.focus();
  }

  // ---------- acciones ----------
  /** Comprobación al abrir (si está activada en Ajustes) */
  start() {
    if (this.getSettings().autoUpdate === false) return;
    this.check().catch(() => {});
  }

  /** Comprueba si hay versión nueva. Nunca lanza: el resultado queda en el estado. */
  async check() {
    if (this.mode === 'dev') {
      this.set({ state: 'disabled', error: null }, true);
      return this.st;
    }
    if (['checking', 'downloading', 'downloaded'].includes(this.st.state)) return this.st;
    if (this.mode === 'portable') return this.checkPortable();
    try { await this.updater().checkForUpdates(); }
    catch (e) {
      // ya registrado y convertido en estado por el evento 'error'
      if (this.st.state === 'checking') this.set({ state: 'error', error: friendlyError(e), checkedAt: Date.now() }, true);
    }
    return this.st;
  }

  /** Portable: sólo se mira la última release de GitHub y se avisa */
  async checkPortable() {
    this.set({ state: 'checking', error: null });
    try {
      const res = await net.fetch(testApi() || `https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': `CineLocal/${app.getVersion()}` }
      });
      if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
      const rel = await res.json();
      const tag = String(rel.tag_name || '');
      const version = tag.replace(/^v/, '');
      if (rel.draft || rel.prerelease || !DESKTOP_TAG.test(tag)) {
        this.log('warn', `Release descartada (etiqueta ${tag})`);
        this.set({ state: 'not-available', latest: null, checkedAt: Date.now() }, true);
      } else if (newer(version, app.getVersion())) {
        const url = /^https:\/\/github\.com\//.test(rel.html_url || '') ? rel.html_url : `${RELEASES_URL}/tag/${tag}`;
        this.log('info', `Versión nueva para la portable: ${version}`);
        this.set({ state: 'available', version, notes: notesText(rel.body), url, checkedAt: Date.now() }, true);
        const win = this.getWindow();
        if (Notification.isSupported() && (!win || win.isDestroyed() || !win.isFocused())) {
          const n = new Notification({ title: `CineLocal ${version} disponible`, body: 'Pulsa para abrir la página de descarga.', icon: this.icon });
          n.on('click', () => this.openRelease());
          n.show();
        }
      } else {
        this.set({ state: 'not-available', latest: version, checkedAt: Date.now() }, true);
      }
    } catch (e) {
      this.log('error', e);
      this.set({ state: 'error', error: friendlyError(e), checkedAt: Date.now() }, true);
    }
    return this.st;
  }

  /** Cierra CineLocal e instala la versión descargada (se vuelve a abrir sola) */
  install() {
    if (this.st.state !== 'downloaded' || !this.au) return false;
    this.log('info', `Reiniciando para instalar ${this.st.version}`);
    // instalación silenciosa en la misma carpeta y CineLocal se vuelve a abrir al terminar
    setImmediate(() => this.au.quitAndInstall(true, true));
    return true;
  }

  /** Página de la release (portable o si se quiere ver qué trae) */
  openRelease() {
    const url = this.st.url && /^https:\/\/github\.com\//.test(this.st.url) ? this.st.url : `${RELEASES_URL}/latest`;
    shell.openExternal(url);
  }
}

module.exports = { Updater, newer, notesText, friendlyError };
