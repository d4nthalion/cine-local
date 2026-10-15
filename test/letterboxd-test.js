// Prueba de Letterboxd: electron test/letterboxd-test.js <userData> <outDir> export <zip>
//                       electron test/letterboxd-test.js <userData> <outDir> profile <usuario>
// <userData> debe ser una copia de los datos de CineLocal (con la API key de TMDB); nunca los reales.
const { app, dialog } = require('electron');
const path = require('path'); const fs = require('fs');
const args = process.argv.slice(process.argv.findIndex(a => /letterboxd-test.js$/.test(a)) + 1);
const [ud, out, mode, arg] = args;
const sf = path.join(ud, 'settings.json');
const st = JSON.parse(fs.readFileSync(sf, 'utf8'));
fs.writeFileSync(sf, JSON.stringify({ ...st, lbUser: '', startFullscreen: false, emuleEnabled: false }));
if (mode === 'export') dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [arg] });
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
let done = false;
app.on('browser-window-created', (_e, win) => {
  if (done) return; done = true;   // la primera es la ventana de la app; la oculta de Letterboxd viene después
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(1500); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => { if (l >= 2) console.log('[r]', m); });
    await wait(4000);
    const t0 = Date.now();
    if (mode === 'export') {
      console.log('[t] import:', JSON.stringify(await js('window.api.letterboxd.importZip()')));
    } else {
      await js(`window.api.setSettings({ lbUser: ${JSON.stringify(arg)} })`);
      let last = '';
      for (;;) {
        await wait(2000);
        const s = await js('JSON.stringify(S.lb.status)');
        if (s !== last) { console.log('[t]', ((Date.now() - t0) / 1000).toFixed(0) + 's', s); last = s; }
        if (!JSON.parse(s).running && Date.now() - t0 > 6000) break;
      }
    }
    console.log('[t] tiempo:', ((Date.now() - t0) / 1000).toFixed(1), 's');
    await wait(1500);
    console.log('[t] resumen:', await js(`JSON.stringify({ n: S.lb.films.length, watched: S.lb.films.filter(f=>f.watched).length, rated: S.lb.films.filter(f=>f.rating).length,
      wl: S.lb.films.filter(f=>f.watchlist).length, sinId: S.lb.films.filter(f=>!f.tmdbId).map(f=>f.title+' '+f.year).slice(0,20), src: S.lb.source })`));
    console.log('[t] muestra:', await js('JSON.stringify(S.lb.films.slice(0, 8).map(f => [f.title, f.year, f.tmdbId, f.rating, f.liked, f.watchlist, f.localTitle]))'));
    console.log('[t] vistas marcadas:', await js("Object.values(S.lib.progress).filter(p => p.lb).length"));
    if (mode !== 'export') { app.exit(0); return; }

    await js("go('home')"); await wait(800);
    await js("document.querySelector('#toasts').innerHTML=''; const r=document.querySelector('[data-row=lbwl]'); document.querySelector('#view').scrollTop = r ? r.offsetTop - 200 : 0; !!r").then(v => console.log('[t] fila watchlist:', v)); await snap('1-home-watchlist');
    await js("go('watchlist')"); await snap('2-watchlist');
    const mid = await js("(S.lib.items.find(i => i.meta?.title === 'Mulholland Drive') || {}).id");
    if (mid) { await js(`go('detail', { id: ${JSON.stringify(mid)} })`); await snap('3-detail'); }
    await js("go('movies')"); await js("S.filters.movies.sort='mine'; render()"); await snap('4-movies-mine');
    const lynch = await js("(allDirectors().find(d => /Lynch/.test(d.name)) || {}).key");
    if (lynch) {
      await js(`go('director', { id: ${JSON.stringify(lynch)} })`); await wait(3000);
      await js("S.filters.filmoSort='mine'; render(true); document.querySelector('.filmo-head')?.scrollIntoView()"); await snap('5-director');
    }
    await js("go('settings')"); await wait(800);
    await js("document.querySelector('#letterboxd').scrollIntoView()"); await snap('6-settings');
    app.exit(0);
  });
});
