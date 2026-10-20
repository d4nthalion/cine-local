// Prueba de las actualizaciones automáticas, sin publicar nada ni instalar:
//   npx electron test/update-test.js <carpetaTemporal> <carpetaCapturas> [installer|portable|github]
// (en Git Bash: env -u ELECTRON_RUN_AS_NODE npx electron …)
// * installer: sirve en local una versión siguiente falsa (el instalador de dist/ renombrado, con su latest.yml y sha512)
//   y comprueba: buscando → disponible → progreso de descarga → descargada → aviso y estado en Ajustes.
//   Antes hay que haber hecho `npm run dist`.
// * portable: simula la API de GitHub; primero devuelve una release de Android (debe descartarse) y luego la siguiente versión.
// * github: sólo lectura contra el repositorio real: qué release elige electron-updater (nunca android-v…).
// Usa una carpeta de datos nueva en <carpetaTemporal> (nunca %APPDATA%\CineLocal) y no instala nada al cerrar.
const { app } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const args = process.argv.slice(process.argv.findIndex(a => /update-test.js$/.test(a)) + 1);
const [tmp, out, mode = 'installer'] = args;
const pkg = require('../package.json');
const NEXT = pkg.version.replace(/\d+$/, n => +n + 1);
// al lanzar un script suelto Electron devolvería su propia versión
app.getVersion = () => pkg.version;

const ud = path.join(tmp, 'userData');
const lib = path.join(tmp, 'biblioteca');
const feed = path.join(tmp, 'feed');
for (const d of [ud, lib, feed, out]) fs.mkdirSync(d, { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ libraryPath: lib, startFullscreen: false, emuleEnabled: false, lbUser: '' }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');

let srv;
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log('[t]', ...a);
let failures = 0;
const check = (ok, what) => { log(ok ? 'OK  ' : 'FALLO', what); if (!ok) failures++; };

// ---------- servidor falso ----------
let apiCalls = 0;
const requests = [];
function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      requests.push(req.method + ' ' + req.url);
      if (req.url.startsWith('/api/latest')) {
        // 1.ª consulta: release de Android (debe descartarse) · después: la versión siguiente de escritorio
        const rel = apiCalls++ === 0
          ? { tag_name: 'android-v9.9.9', html_url: 'https://github.com/d4nthalion/cine-local/releases/tag/android-v9.9.9', body: 'Android' }
          : { tag_name: 'v' + NEXT, html_url: `https://github.com/d4nthalion/cine-local/releases/tag/v${NEXT}`, body: '<ul><li>Prueba de aviso en la portable</li><li>Segunda línea</li></ul>' };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ draft: false, prerelease: false, ...rel }));
        return;
      }
      const file = path.join(feed, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
      if (!file.startsWith(feed) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
      const size = fs.statSync(file).size;
      res.writeHead(200, { 'content-length': size, 'content-type': 'application/octet-stream' });
      if (req.method === 'HEAD') { res.end(); return; }
      if (!file.endsWith('.exe')) { fs.createReadStream(file).pipe(res); return; }
      // el instalador se sirve a ~20 MB/s para poder ver el progreso
      const fd = fs.openSync(file, 'r');
      const chunk = Buffer.alloc(1 << 20);
      let pos = 0;
      const pump = () => {
        if (res.destroyed) { fs.closeSync(fd); return; }
        const n = fs.readSync(fd, chunk, 0, chunk.length, pos);
        if (!n) { fs.closeSync(fd); res.end(); return; }
        pos += n;
        res.write(Buffer.from(chunk.subarray(0, n)));
        setTimeout(pump, 50);
      };
      pump();
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function prepareFeed() {
  const src = path.join(__dirname, '..', 'dist', `CineLocal-Setup-${pkg.version}.exe`);
  if (!fs.existsSync(src)) throw new Error('Falta ' + src + ' (ejecuta npm run dist)');
  const name = `CineLocal-Setup-${NEXT}.exe`;
  const dest = path.join(feed, name);
  fs.copyFileSync(src, dest);
  const sha512 = crypto.createHash('sha512').update(fs.readFileSync(dest)).digest('base64');
  const size = fs.statSync(dest).size;
  fs.writeFileSync(path.join(feed, 'latest.yml'), [
    `version: ${NEXT}`, 'files:', `  - url: ${name}`, `    sha512: ${sha512}`, `    size: ${size}`,
    `path: ${name}`, `sha512: ${sha512}`, `releaseDate: '${new Date().toISOString()}'`,
    'releaseNotes: |-', '  • Prueba de actualización automática', '  • Las notas de la release se ven en Ajustes', ''
  ].join('\n'));
  log('feed preparado:', name, size, 'bytes');
}

// ---------- guarda contra releases de Android (lógica de onAvailable, sin red) ----------
function guardTest() {
  const { Updater, newer } = require('../src/main/updater');
  const u = new Updater({ getSettings: () => ({}), send: () => {}, getWindow: () => null, icon: '', dataDir: path.join(tmp, 'guard') });
  let downloads = 0;
  u.au = { downloadUpdate: () => { downloads++; return Promise.resolve(); } };
  u.onAvailable({ tag: 'android-v9.9.9', version: '9.9.9' });
  check(u.status().state === 'not-available' && downloads === 0, 'etiqueta android-v9.9.9 descartada');
  u.onAvailable({ tag: 'v1.0.0', version: '1.0.0' });
  check(u.status().state === 'not-available' && downloads === 0, 'versión anterior descartada');
  u.onAvailable({ tag: 'v2.0.0-beta.1', version: '2.0.0-beta.1' });
  check(u.status().state === 'not-available' && downloads === 0, 'prerelease descartada');
  u.onAvailable({ tag: 'v' + NEXT, version: NEXT, releaseNotes: '<p>Hola</p>' });
  check(u.status().state === 'available' && downloads === 1, `v${NEXT} aceptada y descarga iniciada`);
  check(newer('1.10.0', '1.9.9') && !newer('1.6.0', '1.6.0') && !newer('1.5.9', '1.6.0'), 'comparación de versiones');
}

/**
 * Sólo lectura contra GitHub de verdad: qué release elige el proveedor de GitHub de electron-updater
 * (nunca una android-v…) y cómo se muestra el resultado. No descarga ni instala nada.
 */
async function githubTest() {
  await app.whenReady();
  const { NsisUpdater } = require('electron-updater');
  const { friendlyError } = require('../src/main/updater');
  const cfg = path.join(tmp, 'github-app-update.yml');
  fs.writeFileSync(cfg, 'owner: d4nthalion\nrepo: cine-local\nprovider: github\nupdaterCacheDirName: cinelocal-updater-test\n');
  const u = new NsisUpdater();
  Object.assign(u, { updateConfigPath: cfg, forceDevUpdateConfig: true, autoDownload: false, autoInstallOnAppQuit: false });
  u.logger = { info: m => log('updater:', m), warn: m => log('updater:', m), error: () => {}, debug: () => {} };
  try {
    const r = await u.checkForUpdates();
    log('resultado:', JSON.stringify({ disponible: r.isUpdateAvailable, version: r.updateInfo.version, tag: r.updateInfo.tag }));
    check(!/^android/.test(r.updateInfo.tag || ''), 'la release elegida no es de Android');
  } catch (e) {
    const tag = (String(e.message).match(/\/download\/([^/]+)\//) || [])[1];
    log('error:', e.code, '· etiqueta elegida:', tag, '· en Ajustes:', friendlyError(e));
    check(tag && !/^android/.test(tag), `la release elegida (${tag}) no es de Android`);
  }
  log(failures ? `${failures} FALLOS` : 'TODO OK');
  app.exit(failures ? 1 : 0);
}

(async () => {
  guardTest();
  if (mode === 'github') return githubTest();
  srv = await startServer();
  const base = `http://127.0.0.1:${srv.address().port}`;
  if (mode === 'portable') {
    process.env.PORTABLE_EXECUTABLE_DIR = tmp;
    process.env.CINELOCAL_RELEASES_API = base + '/api/latest';
  } else {
    prepareFeed();
    process.env.CINELOCAL_UPDATE_FEED = base + '/';
  }
  require('../src/main/main.js');
})().catch(e => { console.error(e); app.exit(1); });

let done = false;
app.on('browser-window-created', (_e, win) => {
  if (done) return; done = true;
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(700); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); log('captura', n); };
    win.webContents.on('console-message', (_e, l, m) => { if (l >= 2) log('[r]', m); });
    try {
      await wait(2500);
      await js("go('settings')"); await wait(500);
      await js("document.querySelector('#updates').scrollIntoView({ block: 'center' })");
      await snap(`${mode}-1-ajustes-antes`);

      // la comprobación automática salta a los ~10 s de abrir
      const seen = [];
      let midShot = false;
      const t0 = Date.now();
      for (;;) {
        const st = JSON.parse(await js('JSON.stringify(S.update)'));
        const key = st.state;
        if (seen[seen.length - 1] !== key) { seen.push(key); log(((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify({ ...st, notes: st.notes ? st.notes.slice(0, 60) : st.notes })); }
        if (mode === 'installer' && st.state === 'downloading' && st.percent >= 25 && !midShot) {
          midShot = true;
          await js("document.querySelector('#updates').scrollIntoView({ block: 'center' })");
          await snap('installer-2-ajustes-descargando');
        }
        if (['downloaded', 'error'].includes(st.state) || (mode === 'portable' && ['available', 'not-available'].includes(st.state))) break;
        if (Date.now() - t0 > 120000) { log('tiempo agotado'); break; }
        await wait(250);
      }

      if (mode === 'portable') {
        check(apiCalls === 1 && seen[seen.length - 1] === 'not-available', 'portable: la release android-v9.9.9 se descarta');
        await js("document.querySelector('[data-action=upd-check]').click()");
        await wait(1500);
        const st = JSON.parse(await js('JSON.stringify(S.update)'));
        log('tras «Comprobar ahora»:', JSON.stringify(st));
        check(st.state === 'available' && st.version === NEXT && st.mode === 'portable' && /^https:\/\/github\.com\//.test(st.url), `portable: v${NEXT} disponible con enlace a GitHub`);
        check(await js("!!document.querySelector('#updToast [data-action=upd-open]')"), 'portable: aviso con botón Descargar');
        check(await js("!!document.querySelector('#updInfo [data-action=upd-open]')"), 'portable: botón Descargar en Ajustes');
        await js("document.querySelector('#updates').scrollIntoView({ block: 'center' })");
        await snap('portable-2-ajustes-disponible');
        check(!requests.some(r => /\.exe|latest\.yml/.test(r)), 'portable: no descarga nada');
      } else {
        check(['checking', 'available', 'downloading', 'downloaded'].every(s => seen.includes(s)), 'secuencia buscando → disponible → descargando → descargada');
        check(requests.some(r => r.startsWith('GET /latest.yml')) && requests.some(r => r.startsWith(`GET /CineLocal-Setup-${NEXT}.exe`)), 'pide latest.yml y el instalador');
        check(await js("!!document.querySelector('#updToast [data-action=upd-install]')"), 'aviso «está lista» con Reiniciar ahora');
        check(await js("!!document.querySelector('#updInfo [data-action=upd-install]')"), 'Reiniciar ahora en Ajustes');
        check(await js("/se instalará al cerrar/i.test(document.querySelector('#updToast')?.textContent)"), 'texto del aviso');
        await js("document.querySelector('#updates').scrollIntoView({ block: 'center' })");
        await snap('installer-3-ajustes-descargada');
        await js("go('home')");
        await snap('installer-4-inicio-aviso');
        // lo descargado está en la caché de pruebas, con el mismo sha512 que el del feed
        const cache = path.join(process.env.LOCALAPPDATA || os.homedir(), 'cinelocal-updater-test');
        const pending = path.join(cache, 'pending');
        const files = fs.existsSync(pending) ? fs.readdirSync(pending) : [];
        log('caché de pruebas:', pending, files);
        check(files.some(f => f.endsWith('.exe')), 'instalador descargado en la caché de pruebas');
        const { autoUpdater } = require('electron-updater');
        check(autoUpdater.autoInstallOnAppQuit === false && !autoUpdater.quitHandlerAdded, 'en pruebas no se instala nada al cerrar');
        fs.rmSync(cache, { recursive: true, force: true });
      }
      log('peticiones:', requests.join(' | '));
      log('registro:\n' + fs.readFileSync(path.join(ud, 'updater.log'), 'utf8').split('\n').slice(-12).join('\n'));
    } catch (e) { console.error(e); failures++; }
    log(failures ? `${failures} FALLOS` : 'TODO OK');
    srv?.close?.();
    app.exit(failures ? 1 : 0);
  });
});

