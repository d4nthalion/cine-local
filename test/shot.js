// Arnés de capturas: electron test/shot.js <userData> <outDir>
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs');
const [ud, out] = process.argv.slice(-2);
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(1500); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => console.log('[r]', m));
    await wait(2000); await snap('1-home');
    await js("document.querySelector('#view').scrollTop=700"); await snap('2-rows');
    await js("go('detail',{id:S.lib.items.find(i=>i.title==='Breaking Bad').id})"); await snap('3-series'); await js("document.querySelector('#view').scrollTop=650"); await snap('3b-episodes');
    await js("go('detail',{id:S.lib.items.find(i=>i.title==='The Matrix').id})"); await snap('4-movie');
    await js("go('movies')"); await snap('5-movies');
    await js("go('settings')"); await snap('6-settings');
    await js("S.lib.items.forEach(i=>i.meta=null);S.heroList=[];go('home')"); await snap('7-nometa');
    app.exit(0);
  });
});
