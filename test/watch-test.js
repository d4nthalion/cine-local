// electron test/watch-test.js <userData> <lib> <outPng>
const { app } = require('electron'); const fs = require('fs'); const path = require('path');
const [ud, lib, out] = process.argv.slice(-3);
app.setPath('userData', ud); app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', (_e, win) => win.webContents.once('did-finish-load', async () => {
  const js = s => win.webContents.executeJavaScript(s);
  win.webContents.on('ipc-message', () => {});
  console.log('[t] loaded');
  await js("window.__new=[];window.api.onNewItems(l=>window.__new.push(...l.map(x=>x.title+' | '+x.sub)));0");
  await wait(3000);
  const n0 = await js('S.lib.items.length');
  // 1) película completa (fecha antigua)
  const done = path.join(lib, 'Denis Villeneuve - Arrival (2016).mkv');
  fs.writeFileSync(done, 'x'.repeat(1000)); const old = new Date(Date.now() - 3600e3); fs.utimesSync(done, old, old);
  // 2) episodio nuevo de serie existente
  fs.writeFileSync(path.join(lib, 'Dark (2017)', 'Dark.S01E04.mkv'), 'x'.repeat(500));
  // 3) archivo "descargándose" que crece
  const grow = path.join(lib, 'Creciendo (2020).mkv');
  fs.writeFileSync(grow, 'x');
  const iv = setInterval(() => fs.appendFileSync(grow, 'x'.repeat(100)), 1000);
  await wait(12000);
  console.log('[t] tras 12s:', await js('S.lib.items.length - ' + n0), 'nuevos;', 'creciendo visible =', await js("S.lib.items.some(i=>i.title.startsWith('Creciendo'))"));
  clearInterval(iv);
  await wait(22000);
  console.log('[t] tras parar:', 'creciendo visible =', await js("S.lib.items.some(i=>i.title.startsWith('Creciendo'))"));
  console.log('[t] avisos:', JSON.stringify(await js('window.__new')));
  fs.writeFileSync(out, (await win.webContents.capturePage()).toPNG());
  fs.unlinkSync(done); fs.unlinkSync(grow); fs.unlinkSync(path.join(lib, 'Dark (2017)', 'Dark.S01E04.mkv'));
  app.exit(0);
}));
