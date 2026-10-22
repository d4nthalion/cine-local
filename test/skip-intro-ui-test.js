// Capturas del botón «Saltar intro»: node test/skip-intro-ui-test.js <mpv.exe> <outDir>
// Dos capítulos de prueba con tramos inyectados (como los manda CineLocal): resumen, intro con la interfaz oculta,
// intro con el ratón encima, clic en el botón (salta al final de la intro), créditos con «Siguiente episodio» (tecla s),
// salto automático de la intro con su aviso y créditos del último capítulo (sin botón).
const fs = require('fs'); const path = require('path'); const os = require('os');
const { Player } = require('../src/main/player');
const { normalize, flatten } = require('../src/main/introdb');
const [mpv, out] = process.argv.slice(2);
const uiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-skip-'));
fs.cpSync(path.join(__dirname, '..', 'player-ui'), uiDir, { recursive: true });
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ep1 = path.join(uiDir, 'capitulo1.mkv'), ep2 = path.join(uiDir, 'capitulo2.mkv');
require('child_process').execFileSync(mpv, ['av://lavfi:testsrc2=duration=120:size=1280x720:rate=24', '--o=' + ep1, '--ovc=libx264', '--ovcopts=preset=ultrafast', '--no-config', '--really-quiet']);
fs.copyFileSync(ep1, ep2);
const log = path.join(out, 'mpv.log');
const p = new Player();
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(ok ? 'ok  ' : 'FAIL', name, extra); };

const seg1 = normalize({ recap: [{ start_ms: null, end_ms: 8000 }], intro: [{ start_ms: 10000, end_ms: 40000 }], credits: [{ start_ms: 100000, end_ms: null }] });
const seg2 = normalize({ intro: [{ start_ms: 3000, end_ms: 30000 }], credits: [{ start_ms: 100000, end_ms: null }] });
const loaded = [];
p.on('loaded', ({ path: file, mpvPath, dur }) => {
  const first = file === ep1;
  loaded.push(file);
  p.sendSegments({ path: mpvPath, segments: flatten(first ? seg1 : seg2, dur), autoIntro: !first, autoRecap: false });
});
p.on('closed', ({ code }) => console.log('[t] mpv cerrado', code));
p.play({
  mpv, uiDir,
  playlist: [{ path: ep1, title: 'Twin Peaks · T1:E2 · Rastros hacia ninguna parte' }, { path: ep2, title: 'Twin Peaks · T1:E3 · Zen' }],
  settings: { playerFullscreen: false, audioLang: 'spa', subLang: 'spa', subMode: 'foreign', extraMpvArgs: `--geometry=1280x720+60+60 --ontop --input-cursor=no --screenshot-dir=${out} --log-file=${log}` }
});
p.once('started', async () => {
  const cmd = (...a) => p._cmd(...a);
  const shot = name => cmd('screenshot-to-file', path.join(out, name), 'window');
  await wait(2500);
  cmd('set', 'pause', 'no');   // por si un clic de verdad cae en la ventana al abrirse
  cmd('seek', 2, 'absolute'); await wait(800);
  cmd('set', 'pause', 'no'); await wait(3000);
  shot('1-resumen-interfaz-oculta.png');
  cmd('seek', 15, 'absolute'); cmd('set', 'pause', 'no'); await wait(3200);
  shot('2-intro-interfaz-oculta.png');
  // botón en 1280×720: s = 0,667 → abajo a la derecha, centro ≈ (1160, 593)
  cmd('mouse', 1150, 590); await wait(250); cmd('mouse', 1160, 593); await wait(700);
  shot('3-intro-raton-encima.png');
  cmd('keydown', 'MBTN_LEFT'); await wait(80); cmd('keyup', 'MBTN_LEFT'); await wait(1200);
  const afterClick = await p._get('time-pos');
  check('clic en «Saltar intro» lleva al final de la intro (40,5 s)', afterClick >= 40 && afterClick < 44, `time-pos=${afterClick?.toFixed(2)}`);
  cmd('mouse', 640, 300); await wait(200);
  cmd('seek', 105, 'absolute'); cmd('set', 'pause', 'no'); await wait(3500);
  shot('4-creditos-siguiente-episodio.png');
  cmd('keypress', 's'); await wait(300);
  cmd('set', 'pause', 'no'); await wait(2200);
  const pos = await p._get('playlist-pos');
  check('tecla s en los créditos pasa al siguiente capítulo', pos === 1, `playlist-pos=${pos}`);
  // capítulo 2: intro de 3 a 30 s con salto automático
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) { const t = await p._get('time-pos'); if (t > 30) break; await wait(100); }
  await wait(250);
  shot('5-intro-saltada-automaticamente.png');
  const t2 = await p._get('time-pos');
  check('salto automático de la intro (pasa de 30 s)', t2 >= 30, `time-pos=${t2?.toFixed(2)}`);
  cmd('seek', 10, 'absolute'); await wait(1200);
  shot('6-intro-de-nuevo-sin-salto.png');
  const t3 = await p._get('time-pos');
  check('al volver a la intro no se salta otra vez', t3 > 9 && t3 < 15, `time-pos=${t3?.toFixed(2)}`);
  cmd('seek', 105, 'absolute'); await wait(3800);
  shot('7-creditos-ultimo-capitulo.png');
  cmd('keypress', 's'); await wait(1000);   // sin botón: captura normal de mpv, no cambia de capítulo
  const pos2 = await p._get('playlist-pos');
  check('último capítulo: sin botón en los créditos, s no cierra', pos2 === 1, `playlist-pos=${pos2}`);
  check('aviso «loaded» una vez por capítulo', loaded.length === 2, loaded.map(f => path.basename(f)).join(','));
  p.stop();
  await wait(1500);
  const errors = fs.readFileSync(log, 'utf8').split(/\r?\n/).filter(l => /\]\[(e|f|w)\]\[(cinelocal_osc|cinelocal-osc|uosc|thumbfast)\]|stack traceback|Can't find script/i.test(l));
  console.log('[t] errores de scripts:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'ninguno');
  check('sin errores de scripts', !errors.length);
  fs.rmSync(uiDir, { recursive: true, force: true });
  console.log('[t] capturas:', fs.readdirSync(out).filter(f => f.endsWith('.png')).join(', '));
  process.exit(results.every(Boolean) ? 0 : 1);
});
