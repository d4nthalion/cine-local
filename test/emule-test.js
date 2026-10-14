// Prueba contra un eMule real: electron test/emule-test.js <userData> <outDir> <contraseña> [búsqueda]
// Requiere eMule abierto con el servidor web activado y la plantilla de CineLocal (ver Ajustes → Descargas).
const { app } = require('electron');
const path = require('path'); const fs = require('fs');
const args = process.argv.slice(process.argv.findIndex(a => /emule-test.js$/.test(a)) + 1);
const [ud, out, password, query = 'big buck bunny'] = args;
fs.mkdirSync(path.join(ud, 'lib'), { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ libraryPath: path.join(ud, 'lib'), emuleEnabled: true, emulePassword: password }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(1200); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => console.log('[r]', m));
    await wait(5000);
    console.log('[t] snapshot:', JSON.stringify(await js('({ok:S.emule.snap.ok,code:S.emule.snap.code,status:S.emule.snap.status,n:S.emule.snap.downloads.length})')));
    console.log('[t] nav visible:', await js("!document.querySelector('#navDownloads').classList.contains('hidden')"));
    await js("go('downloads')"); await snap('1-downloads');
    await js(`document.querySelector('#dlSearch').q.value=${JSON.stringify(query)};document.querySelector('#dlSearch').requestSubmit()`);
    await wait(15000);
    console.log('[t] search:', JSON.stringify(await js('({busy:S.emule.search.busy,n:S.emule.search.results.length,msg:S.emule.search.message,err:S.emule.search.error,first:S.emule.search.results[0]})')));
    await snap('2-search');
    // descarga real (Big Buck Bunny, CC-BY): se añade, se captura y se cancela
    const L = 'ed2k://|file|big_buck_bunny_720p_h264.mov|416751190|DB28CF46B967F01EA5AC2966035551A8|/';
    await js(`window.api.emule.addLink(${JSON.stringify(L)})`); await js("window.api.emule.op('DB28CF46B967F01EA5AC2966035551A8','pause')");
    await js("S.emule.search.hidden=true;paintResults()"); await wait(4000);
    console.log('[t] downloads:', JSON.stringify(await js('S.emule.snap.downloads')), 'badge:', await js("document.querySelector('#dlBadge').textContent"));
    await snap('2b-downloads');
    await js("window.api.emule.op('DB28CF46B967F01EA5AC2966035551A8','cancel')"); await wait(1000);
    console.log('[t] tras cancelar:', await js('S.emule.snap.downloads.length'));
    await js("go('settings')"); await wait(1500);
    await js("document.querySelector('#view').scrollTop=document.querySelector('#view').scrollHeight"); await snap('3-settings');
    app.exit(0);
  });
});
