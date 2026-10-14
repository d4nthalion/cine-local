// Reproductor integrado (Windows): electron test/embed-test.js <userData> <outDir> <mpv.exe>
// Crea una biblioteca con un vídeo de prueba, lo reproduce dentro de la ventana, prueba teclas y captura la pantalla.
const { app, BrowserWindow } = require('electron');
const path = require('path'); const fs = require('fs'); const net = require('net');
const { execFileSync } = require('child_process');
const args = process.argv.slice(process.argv.findIndex(a => /embed-test\.js$/.test(a)) + 1);
const [ud, out, mpv] = args;
const lib = path.join(ud, 'lib');
fs.mkdirSync(lib, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const video = path.join(lib, 'Prueba (2024).mkv');
if (!fs.existsSync(video)) execFileSync(mpv, ['av://lavfi:testsrc2=duration=120:size=1280x720:rate=24', '--o=' + video, '--ovc=libx264', '--ovcopts=preset=ultrafast', '--no-config', '--really-quiet']);
{ const old = new Date(Date.now() - 3600e3); fs.utimesSync(video, old, old); }
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ libraryPath: lib, mpvPath: mpv, playerMode: 'embedded', playerFullscreen: false, extraMpvArgs: '--log-file=' + path.join(out, 'mpv.log') }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));

// Envía una orden a mpv por su IPC (mismo nombre de tubería que usa player.js)
function mpvCmd(...command) {
  const s = net.connect(`\\\\.\\pipe\\cinelocal-mpv-${process.pid}`);
  s.on('connect', () => { s.write(JSON.stringify({ command }) + '\n'); setTimeout(() => s.destroy(), 200); });
  s.on('error', () => {});
}
// Consulta una propiedad de mpv por su IPC
function mpvGet(prop) {
  return new Promise(resolve => {
    const s = net.connect(`\\\\.\\pipe\\cinelocal-mpv-${process.pid}`);
    s.on('connect', () => s.write(JSON.stringify({ command: ['get_property', prop], request_id: 1 }) + '\n'));
    let buf = '';
    s.on('data', d => { buf += d; const l = buf.split('\n').find(x => x.includes('"request_id":1')); if (l) { s.destroy(); resolve(JSON.parse(l).data); } });
    s.on('error', () => resolve(undefined));
    setTimeout(() => { s.destroy(); resolve(undefined); }, 2000);
  });
}

app.on('browser-window-created', (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const shot = name => {
      const b = win.getBounds();
      execFileSync('powershell', ['-NoProfile', '-Command',
        `Add-Type -AssemblyName System.Drawing; $b=New-Object System.Drawing.Bitmap(${b.width},${b.height}); $g=[System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(${b.x},${b.y},0,0,$b.Size); $b.Save('${path.join(out, name)}')`]);
    };
    const key = async k => { win.webContents.sendInputEvent({ type: 'keyDown', keyCode: k }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode: k }); await wait(700); };
    win.setBounds({ x: 60, y: 60, width: 1280, height: 760 });
    win.focus();
    await wait(4000);
    const id = await js("S.lib.items[0]?.id");
    console.log('[t] elementos:', await js('S.lib.items.length'));
    await js(`go('detail',{id:'${id}'})`); await wait(800);
    shot('0-ficha.png');
    const t0 = Date.now();
    await js(`play('${id}')`);
    await wait(5000);
    console.log('[t] reproduciendo; pausa =', await mpvGet('pause'), '· tiempo =', (await mpvGet('time-pos'))?.toFixed(1));
    // Ratón de verdad (no simulado): mpv debe recibirlo para que uosc muestre la interfaz
    const b = win.getContentBounds();
    const cursor = (x, y) => execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x},${y})`]);
    cursor(b.x + 300, b.y + b.height - 80); await wait(150); cursor(b.x + 320, b.y + b.height - 60); await wait(600);
    console.log('[t] ratón real sobre el vídeo: mpv lo recibe =', (await mpvGet('mouse-pos'))?.hover === true);
    shot('1-integrado.png');
    console.log('[t] arrastre de ventana desactivado =', (await mpvGet('window-dragging')) === false);
    // clic real en el centro del vídeo: pausa
    win.focus(); await wait(300);   // las ventanas de PowerShell de la prueba le quitan el foco; sin él, Windows usa el primer clic para activar
    cursor(b.x + 320, b.y + b.height - 200); await wait(200);   // zona libre (en el centro de la pantalla puede haber otra ventana encima)
    execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);' -Name M -Namespace W; [W.M]::mouse_event(2,0,0,0,0); [W.M]::mouse_event(4,0,0,0,0)`]);
    await wait(600);
    console.log('[t] tras clic en el vídeo: pausa =', await mpvGet('pause'));
    mpvCmd('set', 'pause', 'no');
    // botones de ventana de uosc (misma orden que ejecutan)
    cursor(b.x + 640, b.y + 15); await wait(150); cursor(b.x + 650, b.y + 18); await wait(700);
    shot('1b-barra-superior.png');
    mpvCmd('cycle', 'window-maximized'); await wait(1200);
    console.log('[t] botón maximizar: app maximizada =', win.isMaximized());
    mpvCmd('cycle', 'window-maximized'); await wait(1200);
    console.log('[t] otra vez: app maximizada =', win.isMaximized());
    mpvCmd('cycle', 'window-minimized'); await wait(1200);
    console.log('[t] botón minimizar: app minimizada =', win.isMinimized());
    win.restore(); win.focus(); await wait(1500);
    console.log('[t] restaurada: mpv sigue abierto =', (await mpvGet('pause')) !== undefined);
    shot('1c-restaurada.png');
    await key('Space');
    console.log('[t] tras espacio: pausa =', await mpvGet('pause'));
    await key('Space');
    await key('Right');
    console.log('[t] tras flecha derecha: tiempo =', (await mpvGet('time-pos'))?.toFixed(1));
    await key('f'); await wait(1500);
    console.log('[t] tras f: app en pantalla completa =', win.isFullScreen(), '· mpv fullscreen =', await mpvGet('fullscreen'));
    shot('2-pantalla-completa.png');
    await key('Escape'); await wait(1500);
    console.log('[t] tras Esc: app en pantalla completa =', win.isFullScreen());
    console.log('[t] ruta de la app sigue en la ficha =', await js("S.route.name"));
    await key('q'); await wait(2500);
    console.log('[t] tras q: mpv sigue abierto =', (await mpvGet('pause')) !== undefined, '· ruta =', await js('S.route.name'));
    shot('3-tras-salir.png');
    app.exit(0);
  });
});
