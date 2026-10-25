// Capturas del modo NAS en Ajustes: npx electron test/nas-ui-test.js <carpetaTemporal> <carpetaCapturas>
const { app } = require('electron');
const path = require('path'); const fs = require('fs');
const [ud, out] = process.argv.slice(-2);
fs.mkdirSync(ud, { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ libraryPath: '\\\\10.8.0.1\\Multimedia', nasMode: true, nasHost: '10.8.0.1', nasUser: 'cinelocal', autoUpdate: false }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    win.webContents.on('console-message', (_e, l, m) => console.log('[r]', m));
    await wait(2500);
    await js("go('settings')"); await wait(800);
    console.log(await js("JSON.stringify({nas: S.lib.nas, err: S.lib.error, pass: 'nasPasswordEnc' in S.settings, has: S.settings.nasHasPassword})"));
    await js("document.querySelector('[data-nas=host]').scrollIntoView({block:'center'})"); await wait(800);
    fs.writeFileSync(path.join(out, 'nas-1.png'), (await win.webContents.capturePage()).toPNG());
    await js("saveSetting('nasMode', false)"); await wait(1500);
    await js("document.querySelector('[data-set=nasMode]').scrollIntoView({block:'center'})"); await wait(500);
    fs.writeFileSync(path.join(out, 'nas-2.png'), (await win.webContents.capturePage()).toPNG());
    app.exit(0);
  });
});

