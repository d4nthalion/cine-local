// Clic y arrastre en la barra de tiempo: node test/seekbar-test.js <mpv.exe> [carpeta player-ui]
// Pincha en puntos conocidos de la barra (vídeo de 120 s en una ventana de 1280x720) y comprueba
// que salta al tiempo que hay bajo el ratón.
const fs = require('fs'); const path = require('path'); const os = require('os');
const { Player } = require('../src/main/player');
const [mpv, uiSrc = path.join(__dirname, '..', 'player-ui')] = process.argv.slice(2);
const uiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-seek-'));
fs.cpSync(uiSrc, uiDir, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const DUR = 120;
const src = path.join(uiDir, 'prueba.mkv');
require('child_process').execFileSync(mpv, [`av://lavfi:testsrc2=duration=${DUR}:size=1280x720:rate=24`, '--o=' + src, '--ovc=libx264', '--ovcopts=preset=ultrafast,g=24', '--no-config', '--really-quiet']);

// Geometría de la barra en cinelocal-osc.lua para 1280x720
const W = 1280, H = 720;
const s = Math.max(0.55, Math.min(W / 1920, H / 1080));
const pad = 52 * s, x1 = pad + 128 * s, x2 = W - pad - 128 * s, y = Math.round(H - 112 * s);
const xAt = f => Math.round(x1 + (x2 - x1) * f);

const p = new Player();
p.play({
  mpv, uiDir,
  playlist: [{ path: src, title: 'Prueba · barra de tiempo' }],
  settings: { playerFullscreen: false, extraMpvArgs: `--geometry=${W}x${H}+60+60 --pause` }
});
p.once('started', async () => {
  const cmd = (...a) => p._cmd(...a);
  let fails = 0;
  const check = async (label, expected) => {
    await wait(700);
    const t = await p._get('time-pos');
    const ok = Math.abs(t - expected) <= 1.5;
    if (!ok) fails++;
    console.log(`[t] ${ok ? 'OK ' : 'MAL'} ${label}: esperado ${expected.toFixed(1)} s, ha saltado a ${(+t).toFixed(1)} s`);
  };
  await wait(2000);
  for (const f of [0.1, 0.25, 0.5, 0.9]) {
    cmd('mouse', xAt(f), y); await wait(200);
    cmd('keydown', 'MBTN_LEFT'); await wait(120); cmd('keyup', 'MBTN_LEFT');
    await check(`clic al ${f * 100}%`, DUR * f);
  }
  // arrastrar del 20% al 70%
  cmd('mouse', xAt(0.2), y); await wait(200);
  cmd('keydown', 'MBTN_LEFT'); await wait(150);
  for (const f of [0.3, 0.45, 0.6, 0.7]) { cmd('mouse', xAt(f), y); await wait(120); }
  cmd('keyup', 'MBTN_LEFT');
  await check('arrastrar del 20% al 70%', DUR * 0.7);

  p.stop();
  await wait(1000);
  fs.rmSync(uiDir, { recursive: true, force: true });
  console.log(fails ? `[t] ${fails} comprobaciones fallidas` : '[t] todo correcto');
  process.exit(fails ? 1 : 0);
});
