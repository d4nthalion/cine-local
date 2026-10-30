// Capturas del modo local (sin CineLocal Server): npx electron test/nas-ui-test.js <carpetaTemporal> <carpetaCapturas>
// Entra desde la pantalla de inicio de sesión, añade una carpeta organizada por categorías y una del NAS (\\…),
// y vuelve a la pantalla de inicio de sesión con «Usar CineLocal Server».
const { app } = require('electron');
const path = require('path'); const fs = require('fs');
const [ud, out] = process.argv.slice(-2);
fs.rmSync(ud, { recursive: true, force: true });
fs.mkdirSync(ud, { recursive: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ autoUpdate: false }));
// biblioteca de prueba organizada por categorías, como la del NAS de la tele
const lib = path.join(ud, 'lib');
const mk = p => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(1e6)); const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); };
mk(path.join(lib, 'Peliculas Humor', 'Aterriza como puedas (1980)', 'airplane.mkv'));
mk(path.join(lib, 'Series Sci-Fi', 'Dark', 'Dark.S01E01.mkv'));
mk(path.join(lib, 'Series Sci-Fi', 'Dark', 'Dark.S01E02.mkv'));
mk(path.join(lib, 'Documentales', 'Cosmos', 'Cosmos 1x01.mkv'));
const unc = '\\\\127.0.0.1\\cinelocal-no-existe';
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = false;
const check = (c, m) => { console.log((c ? 'ok - ' : 'FALLO - ') + m); if (!c) failed = true; };
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(600); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => { if (l >= 2) console.log('[r]', m); });
    try {
      await wait(2000);
      check(await js("document.body.classList.contains('login-mode') && !!document.querySelector('#lgLocal')"), 'sin sesión: pantalla de inicio de sesión con «Usar sin servidor»');
      await snap('local-1-login');
      await js("document.querySelector('#lgLocal').click()"); await wait(1500);
      check(await js("S.route.name === 'settings' && LOCAL() && !document.body.classList.contains('login-mode')"), 'modo local: a Ajustes la primera vez');
      check(await js("document.querySelector('#navRequests').classList.contains('hidden')"), 'sin Peticiones en modo local');
      await snap('local-2-settings');
      await js(`saveLibPaths([${JSON.stringify(lib)}])`); await wait(1500);
      await js(`window.api.setSettings({ libraryLayouts: { ${JSON.stringify(lib)}: { mode: 'categories', movies: [], series: ['Serie'], ignore: ['CineLocal-TV'], folderMovie: true } } })`);
      await js('scanNow()'); await wait(1500);
      await js("setLib && window.api.getLibrary().then(v => { setLib(v); render(true); })"); await wait(500);
      const titles = await js("JSON.stringify(S.lib.items.map(i => i.type[0] + ':' + i.title).sort())");
      check(titles === JSON.stringify(['m:Aterriza como puedas', 's:Cosmos', 's:Dark']), 'por categorías: ' + titles);
      await js("document.querySelector('.lib-paths').scrollIntoView({block:'start'})"); await snap('local-3-paths');
      await js(`saveLibPaths([${JSON.stringify(lib)}, ${JSON.stringify(unc)}])`); await wait(4000);
      check(await js("!!document.querySelector('[data-lnas=user]')"), 'con una carpeta \\\\NAS\\…: inicio de sesión en el NAS');
      check(await js("S.lib.items.length === 3 && !!S.lib.error"), 'carpeta del NAS que no responde: se conserva lo demás y se avisa (' + await js('S.lib.error') + ')');
      await js("document.querySelector('[data-lnas=user]').scrollIntoView({block:'center'})"); await snap('local-4-nas');
      await js("go('home')"); await snap('local-5-home');
      await js("go('settings')"); await wait(500);
      await js("document.querySelector('[data-action=use-server]').click()"); await wait(1500);
      check(await js("document.body.classList.contains('login-mode')"), 'Usar CineLocal Server sin sesión: a la pantalla de inicio de sesión');
      const s = JSON.parse(fs.readFileSync(path.join(ud, 'settings.json'), 'utf8'));
      check(s.localMode === false, 'guardado: localMode = false');
      check(fs.existsSync(path.join(ud, 'local', 'settings.json')), 'la biblioteca local queda guardada en local/');
    } catch (e) { console.error(e); failed = true; }
    app.exit(failed ? 1 : 0);
  });
});
