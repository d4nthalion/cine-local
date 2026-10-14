// Capturas de la interfaz del reproductor: node test/player-ui-test.js <mpv.exe> <outDir>
// Reproduce un vídeo de prueba en una ventana de mpv con player-ui/, mueve el "ratón" y guarda capturas.
const fs = require('fs'); const path = require('path'); const os = require('os');
const { Player } = require('../src/main/player');
const [mpv, out] = process.argv.slice(2);
const uiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-ui-'));
fs.cpSync(path.join(__dirname, '..', 'player-ui'), uiDir, { recursive: true });
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
// vídeo real de 2 min (en el lavfi directo mpv calcula mal la duración al saltar)
const src = path.join(uiDir, 'prueba.mkv');
require('child_process').execFileSync(mpv, ['av://lavfi:testsrc2=duration=120:size=1280x720:rate=24', '--o=' + src, '--ovc=libx264', '--ovcopts=preset=ultrafast', '--no-config', '--really-quiet']);
const log = path.join(out, 'mpv.log');
const p = new Player();
p.on('closed', ({ code }) => console.log('[t] mpv cerrado', code));
p.play({
  mpv, uiDir,
  playlist: [{ path: src, title: 'Dark · T1:E1 · Secretos' }, { path: src, title: 'Dark · T1:E2 · Mentiras' }],
  settings: { playerFullscreen: false, audioLang: 'spa', subLang: 'spa', subMode: 'foreign', extraMpvArgs: `--geometry=1280x720+60+60 --ontop --log-file=${log}` }
});
p.once('started', async () => {
  const cmd = (...a) => p._cmd(...a);
  const shot = name => cmd('screenshot-to-file', path.join(out, name), 'window');
  await wait(2500);
  cmd('seek', 47, 'absolute');
  cmd('mouse', 600, 330); await wait(250); cmd('mouse', 610, 340); await wait(600);
  shot('1-interfaz.png');
  cmd('mouse', 420, 640); await wait(250); cmd('mouse', 430, 642); await wait(1500);
  shot('2-barra-miniatura.png');
  cmd('mouse', 178, 683); await wait(250); cmd('mouse', 180, 684); await wait(600);
  shot('3-volumen.png');
  cmd('set', 'pause', 'yes'); cmd('mouse', 640, 360); await wait(4000);
  shot('4-pausa-sin-mover.png');
  cmd('set', 'pause', 'no'); await wait(4000);
  shot('5-oculta.png');
  cmd('script-binding', 'uosc/menu'); await wait(900);
  shot('6-menu.png');
  cmd('keypress', 'ESC');
  await wait(500);
  p.stop();
  await wait(1500);
  const errors = fs.readFileSync(log, 'utf8').split(/\r?\n/).filter(l => /\]\[(e|f|w)\]\[(cinelocal_osc|cinelocal-osc|uosc|thumbfast)\]|lua.*error|stack traceback/i.test(l));
  console.log('[t] errores de scripts:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'ninguno');
  fs.rmSync(uiDir, { recursive: true, force: true });
  console.log('[t] capturas:', fs.readdirSync(out).filter(f => f.endsWith('.png')).join(', '));
  process.exit(0);
});
