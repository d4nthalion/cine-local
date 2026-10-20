// Capturas del panel de conexión de Descargas contra un eMule simulado (test/fake-emule.js):
//   electron test/emule-servers-ui-test.js <userData> <carpetaCapturas>
// No necesita eMule ni toca su configuración: el simulado escucha en otro puerto.
const { app } = require('electron');
const path = require('path'); const fs = require('fs');
const { execFileSync } = require('child_process');
const { FakeEmule } = require('./fake-emule');
const args = process.argv.slice(process.argv.findIndex(a => /emule-servers-ui-test.js$/.test(a)) + 1);
const [ud, out] = args;
const PORT = 47811;
fs.mkdirSync(path.join(ud, 'lib'), { recursive: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({
  libraryPath: path.join(ud, 'lib'), emuleEnabled: true, emulePort: PORT, emulePassword: 'test', autoUpdate: false
}));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');

let fake = new FakeEmule({ state: { server: 'connected', current: '45.82.80.155:5687', kad: 'ok', contacts: 143 } });
const ready = fake.listen(PORT);
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));

app.on('browser-window-created', (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    await ready;
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(1200); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); console.log('[t] captura', n); };
    const state = () => js('({ok:S.emule.snap.ok,code:S.emule.snap.code,st:S.emule.snap.status,n:S.emule.srv.list&&S.emule.srv.list.length,open:S.emule.srv.open,outdated:srvOutdated(),hint:!!document.querySelector("#dlSrvHint .banner"),panel:!document.querySelector("#dlServers").classList.contains("hidden")})');
    win.webContents.on('console-message', (_e, l, m) => console.log('[r]', m));
    win.setSize(1400, 1000);
    try {
      await wait(4000);
      await js("go('downloads')"); await wait(1500);
      console.log('[t] conectado (panel cerrado por defecto):', JSON.stringify(await state()));
      await js("document.querySelector('[data-action=\"emule-srv-toggle\"]').click()"); await wait(1500);
      console.log('[t] conectado, panel abierto:', JSON.stringify(await state()));
      await snap('1-conectado');

      // orden por ping
      await js("document.querySelector('th[data-k=\"ping\"]').click()"); await wait(300);
      console.log('[t] orden ping:', await js("[...document.querySelectorAll('table.srv tbody tr td.num:nth-child(5)')].map(t=>t.textContent).join(' | ')"));
      await js("document.querySelector('th[data-k=\"users\"]').click()");

      // conectar a uno concreto desde la fila → conectando; Kad tras cortafuegos
      fake.st.kad = 'firewalled'; fake.st.contacts = 87;
      await js("document.querySelector('[data-action=\"emule-srv-connect\"][data-ip=\"176.123.5.89\"]').click()"); await wait(700);
      console.log('[t] conectando:', JSON.stringify(await state()), 'peticiones:', fake.log.filter(u => /c=connect/.test(u)).join(' '));
      await snap('2-conectando-kad-cortafuegos');
      await wait(6500);   // la lista se refresca cada 5 s mientras está a la vista
      console.log('[t] conectado al elegido:', await js("S.emule.srv.list.find(s=>s.connected)?.name"));

      // desconectar servidor y Kad: panel con «Conectar» / «Conectar Kad»
      await js("document.querySelector('[data-action=\"emule-srv-off\"]').click()"); await wait(800);
      await js("document.querySelector('[data-action=\"emule-kad\"][data-op=\"disconnect\"]').click()"); await wait(4000);
      console.log('[t] desconectado:', JSON.stringify(await state()));
      await snap('3-desconectado');

      // server.met
      await js("document.querySelector('#srvMetUrl').value='http://example.com/server.met';document.querySelector('#srvMet').requestSubmit()"); await wait(1500);
      console.log('[t] tras server.met:', await js('S.emule.srv.list.length'));

      // eMule cerrado
      fake.close(); await wait(17000);
      console.log('[t] sin eMule:', JSON.stringify(await state()));
      await snap('4-sin-emule');

      // eMule con la plantilla anterior en memoria (no ha pulsado «Recargar»)
      const old = path.join(ud, 'old.tmpl');
      fs.writeFileSync(old, execFileSync('git', ['show', 'HEAD:src/main/emule/CineLocal.tmpl'], { cwd: path.join(__dirname, '..') }));
      fake = new FakeEmule({ template: old, state: { server: 'connected', current: '45.82.80.155:5687', kad: 'firewalled', contacts: 50 } });
      await fake.listen(PORT); await wait(17000);
      console.log('[t] plantilla antigua:', JSON.stringify(await state()));
      await snap('5-recargar-plantilla');

      // el usuario pulsa «Recargar» en eMule → el aviso desaparece solo
      fake.reload(path.join(__dirname, '..', 'src', 'main', 'emule', 'CineLocal.tmpl')); await wait(5000);
      console.log('[t] tras recargar:', JSON.stringify(await state()));
      await snap('6-tras-recargar');
    } catch (e) { console.error('[t] error', e); }
    fake.close();
    app.exit(0);
  });
});
