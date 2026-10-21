// Pruebas de Discord Rich Presence: node test/discord-test.js
// 1) actividad a partir de la película/capítulo (parte pura)
// 2) protocolo con un Discord falso en una tubería con nombre: saludo, SET_ACTIVITY, límite de envíos, borrar al parar,
//    ID rechazado, reconexión cuando Discord se reinicia
// Opcional, contra el Discord real de este PC (sin iniciar sesión ni tocar nada):
//   node test/discord-test.js real-bogus            → con un ID falso tiene que fallar sin romper nada
//   node test/discord-test.js real <idAplicación>   → prueba de 15 s y una película de ejemplo unos segundos; al final se borra
const assert = require('assert');
const net = require('net');
const { DiscordPresence, buildActivity, mediaInfo, testActivity, encode, OP, ICON_KEY } = require('../src/main/discord');

const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n    ', e.stack || e); }
}

// ---------- datos de ejemplo ----------
const movieItem = { type: 'movie', title: 'mulholland drive', year: 2001, meta: {
  title: 'Mulholland Drive', year: 2001, tmdbId: 1018, poster: 'https://image.tmdb.org/t/p/w500/x8UDrfTUW9GSMiwHn4JWx0Qwf4K.jpg',
  directors: [{ id: 5602, name: 'David Lynch' }] } };
const seriesItem = { type: 'series', title: 'twin peaks', meta: { title: 'Twin Peaks', tmdbId: 1920, poster: 'https://image.tmdb.org/t/p/w500/lA9CNSdo50iQPZ8A2fyVpMvJZAf.jpg',
  seasons: { 2: { episodes: { 5: { name: 'El hombre tras el cristal' }, 6: { name: 'Episode 6' } } } } } };

async function unit() {
  const at = 1_700_000_000_000;
  await t('película: título (año), director, póster, botones TMDB y Letterboxd, tiempos', () => {
    const a = buildActivity({ media: mediaInfo(movieItem, null, 'mulholland-drive'), pos: 600, dur: 8820, at });
    assert.strictEqual(a.type, 3);
    assert.strictEqual(a.details, 'Mulholland Drive (2001)');
    assert.strictEqual(a.state, 'Película de David Lynch');
    assert.strictEqual(a.assets.large_image, movieItem.meta.poster);
    assert.strictEqual(a.assets.large_text, 'Mulholland Drive (2001)');
    assert.strictEqual(a.assets.small_image, ICON_KEY);
    assert.deepStrictEqual(a.timestamps, { start: at - 600000, end: at - 600000 + 8820000 });
    assert.deepStrictEqual(a.buttons, [
      { label: 'Ver en TMDB', url: 'https://www.themoviedb.org/movie/1018' },
      { label: 'Ver en Letterboxd', url: 'https://letterboxd.com/film/mulholland-drive/' }]);
  });
  await t('película sin director ni Letterboxd: «Película» y sólo TMDB', () => {
    const it = { ...movieItem, meta: { ...movieItem.meta, directors: [] } };
    const a = buildActivity({ media: mediaInfo(it), pos: 0, dur: 100, at });
    assert.strictEqual(a.state, 'Película');
    assert.strictEqual(a.buttons.length, 1);
  });
  await t('capítulo con nombre: serie + T2:E5 · nombre, botón de TMDB tv', () => {
    const a = buildActivity({ media: mediaInfo(seriesItem, { season: 2, episode: 5 }), pos: 10, dur: 2900, at });
    assert.strictEqual(a.details, 'Twin Peaks');
    assert.strictEqual(a.state, 'T2:E5 · El hombre tras el cristal');
    assert.deepStrictEqual(a.buttons, [{ label: 'Ver en TMDB', url: 'https://www.themoviedb.org/tv/1920' }]);
  });
  await t('capítulo con nombre genérico de TMDB: sólo el código', () => {
    const a = buildActivity({ media: mediaInfo(seriesItem, { season: 2, episode: 6 }), pos: 10, dur: 2900, at });
    assert.strictEqual(a.state, 'T2:E6');
  });
  await t('en pausa: sin tiempos y «En pausa»', () => {
    const a = buildActivity({ media: mediaInfo(seriesItem, { season: 2, episode: 5 }), pos: 10, dur: 2900, paused: true, at });
    assert.strictEqual(a.timestamps, undefined);
    assert.strictEqual(a.state, 'En pausa · T2:E5 · El hombre tras el cristal');
    assert.strictEqual(a.assets.small_text, 'En pausa');
  });
  await t('modo discreto: sin título, póster ni botones', () => {
    const m = buildActivity({ media: mediaInfo(movieItem, null, 'x'), pos: 1, dur: 100, at }, { discreet: true });
    assert.strictEqual(m.details, 'Viendo una película');
    assert.strictEqual(m.state, undefined);
    assert.strictEqual(m.buttons, undefined);
    assert.strictEqual(m.assets.large_image, ICON_KEY);
    assert.ok(!JSON.stringify(m).includes('Mulholland'));
    const s = buildActivity({ media: mediaInfo(seriesItem, { season: 2, episode: 5 }), pos: 1, dur: 100, at, paused: true }, { discreet: true });
    assert.strictEqual(s.details, 'Viendo una serie');
    assert.strictEqual(s.state, 'En pausa');
  });
  await t('sin póster ni metadatos: icono de la app y título de la carpeta', () => {
    const a = buildActivity({ media: mediaInfo({ type: 'movie', title: 'peli rara', year: null, meta: null }), pos: 0, dur: 50, at });
    assert.strictEqual(a.details, 'peli rara');
    assert.strictEqual(a.assets.large_image, ICON_KEY);
    assert.strictEqual(a.assets.small_image, undefined);
    assert.strictEqual(a.buttons, undefined);
    const b = buildActivity({ media: mediaInfo({ type: 'movie', title: 'x', meta: null }), pos: 0, dur: 0, at }, { icon: null });
    assert.strictEqual(b.assets, undefined);
    assert.strictEqual(b.timestamps, undefined, 'sin duración no hay barra');
    assert.ok(b.details.length >= 2, 'Discord exige 2 caracteres');
  });
  await t('textos largos se recortan a 128', () => {
    const a = buildActivity({ media: { kind: 'movie', title: 'x'.repeat(300) }, pos: 0, dur: 1, at });
    assert.strictEqual(a.details.length, 128);
  });
}

// ---------- Discord falso ----------
const PREFIX = `cinelocal-test-discord-${process.pid}`;
const pipeOf = i => `\\\\.\\pipe\\${PREFIX}-${i}`;

function fakeDiscord({ validId = '123456789012345678', index = 0 } = {}) {
  const ev = { handshakes: [], frames: [], conns: 0, sockets: new Set() };
  const server = net.createServer(sock => {
    ev.conns++; ev.sockets.add(sock);
    sock.on('close', () => ev.sockets.delete(sock));
    sock.on('error', () => {});
    let buf = Buffer.alloc(0);
    sock.on('data', d => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8) {
        const op = buf.readInt32LE(0), len = buf.readInt32LE(4);
        if (buf.length < 8 + len) break;
        const msg = JSON.parse(buf.subarray(8, 8 + len).toString());
        buf = buf.subarray(8 + len);
        if (op === OP.HANDSHAKE) {
          ev.handshakes.push(msg);
          if (msg.v !== 1 || msg.client_id !== validId) { sock.write(encode(OP.CLOSE, { code: 4000, message: 'Invalid Client ID' })); sock.end(); }
          else sock.write(encode(OP.FRAME, { cmd: 'DISPATCH', evt: 'READY', data: { v: 1, user: { username: 'prueba' } } }));
        } else if (op === OP.FRAME) {
          ev.frames.push({ at: Date.now(), msg });
          sock.write(encode(OP.FRAME, { cmd: msg.cmd, evt: null, data: msg.args.activity || null, nonce: msg.nonce }));
        }
      }
    });
  });
  return new Promise(r => server.listen(pipeOf(index), () => r({ ev, close: () => new Promise(res => { for (const s of ev.sockets) s.destroy(); server.close(() => res()); }) })));
}

const lastActivity = ev => ev.frames.at(-1)?.msg.args.activity;
const media = mediaInfo(movieItem, null, 'mulholland-drive');

async function protocol() {
  await t('sin Discord: no se conecta hasta reproducir y avisa «no está abierto» sin romper', async () => {
    const p = new DiscordPresence({ pipe: pipeOf, backoff: [100] });
    p.configure({ enabled: true, clientId: '123456789012345678' });
    assert.strictEqual(p.status.state, 'idle');
    p.setPlayback({ media, pos: 5, dur: 100 });
    await wait(300);
    assert.strictEqual(p.status.state, 'not-running');
    // Discord se abre: se conecta solo con el reintento
    const fake = await fakeDiscord({ index: 3 });
    await wait(400);
    assert.strictEqual(p.status.state, 'connected');
    assert.strictEqual(lastActivity(fake.ev).details, 'Mulholland Drive (2001)');
    p.shutdown(); await wait(100); await fake.close();
  });

  await t('desactivado: nunca se conecta', async () => {
    const fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf });
    p.configure({ enabled: false, clientId: '123456789012345678' });
    p.setPlayback({ media, pos: 5, dur: 100 });
    await wait(200);
    assert.strictEqual(fake.ev.conns, 0);
    assert.strictEqual(p.status.state, 'off');
    await fake.close();
  });

  await t('saludo, SET_ACTIVITY con pid, límite de envíos, pausa, salto y borrar al parar', async () => {
    const fake = await fakeDiscord();
    const statuses = [];
    const p = new DiscordPresence({ pipe: pipeOf, minGap: 300, idleClose: 300, pid: 4242 });
    p.on('status', s => statuses.push(s.state));
    p.configure({ enabled: true, clientId: '123456789012345678', discreet: false });
    p.setPlayback({ media, pos: 600, dur: 8820 });
    await wait(200);
    assert.deepStrictEqual(fake.ev.handshakes, [{ v: 1, client_id: '123456789012345678' }]);
    assert.strictEqual(fake.ev.frames.length, 1);
    const f = fake.ev.frames[0].msg;
    assert.strictEqual(f.cmd, 'SET_ACTIVITY');
    assert.strictEqual(f.args.pid, 4242);
    assert.ok(f.nonce);
    assert.strictEqual(f.args.activity.type, 3);
    // progreso normal (cada 5 s): no se reenvía
    for (let i = 1; i <= 5; i++) p.setPlayback({ media, pos: 600 + i * 0.05, dur: 8820 });
    await wait(400);
    assert.strictEqual(fake.ev.frames.length, 1, 'el progreso normal no se envía');
    // pausa y reanudar enseguida: se agrupa y se envía lo último como mucho una vez cada minGap
    p.setPlayback({ media, pos: 601, dur: 8820, paused: true });
    await wait(450);
    assert.strictEqual(lastActivity(fake.ev).timestamps, undefined, 'en pausa sin tiempos');
    assert.match(lastActivity(fake.ev).state, /^En pausa/);
    // salto de 10 minutos
    p.setPlayback({ media, pos: 1200, dur: 8820 });
    await wait(400);
    const a = lastActivity(fake.ev);
    assert.ok(Math.abs(Date.now() - a.timestamps.start - 1200000) < 2000, 'tiempos tras el salto');
    // ráfaga: muchos cambios seguidos → como mucho uno cada minGap
    const n0 = fake.ev.frames.length;
    for (let i = 0; i < 10; i++) { p.setPlayback({ media, pos: 2000 + i * 60, dur: 8820, paused: i % 2 === 0 }); await wait(30); }
    await wait(700);
    const burst = fake.ev.frames.slice(n0);
    assert.ok(burst.length <= 3, `ráfaga limitada (${burst.length})`);
    for (let i = 1; i < fake.ev.frames.length; i++) assert.ok(fake.ev.frames[i].at - fake.ev.frames[i - 1].at >= 280, 'separación mínima');
    assert.strictEqual(lastActivity(fake.ev).timestamps.start > 0, true, 'el último estado (reproduciendo) es el que queda');
    // parar: se borra la actividad y luego se cierra la conexión
    p.setPlayback(null);
    await wait(400);
    const last = fake.ev.frames.at(-1).msg;
    assert.strictEqual(last.cmd, 'SET_ACTIVITY');
    assert.strictEqual(last.args.activity, undefined, 'actividad borrada');
    await wait(400);
    assert.strictEqual(fake.ev.sockets.size, 0, 'conexión cerrada al quedar sin uso');
    assert.strictEqual(p.status.state, 'idle');
    assert.deepStrictEqual(statuses.slice(0, 3), ['idle', 'connecting', 'connected']);
    await fake.close();
  });

  await t('cambio de capítulo y modo discreto al vuelo', async () => {
    const fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf, minGap: 100 });
    p.configure({ enabled: true, clientId: '123456789012345678' });
    p.setPlayback({ media: mediaInfo(seriesItem, { season: 2, episode: 5 }), pos: 0, dur: 2900 });
    await wait(200);
    p.setPlayback({ media: mediaInfo(seriesItem, { season: 2, episode: 6 }), pos: 0, dur: 2900 });
    await wait(200);
    assert.strictEqual(lastActivity(fake.ev).state, 'T2:E6');
    p.configure({ enabled: true, clientId: '123456789012345678', discreet: true });
    await wait(200);
    assert.strictEqual(lastActivity(fake.ev).details, 'Viendo una serie');
    // desactivar: se borra
    p.configure({ enabled: false, clientId: '123456789012345678', discreet: true });
    await wait(200);
    assert.strictEqual(fake.ev.frames.at(-1).msg.args.activity, undefined);
    p.shutdown(); await fake.close();
  });

  await t('ID rechazado: error claro y sin reintentos', async () => {
    const fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf, backoff: [50] });
    p.configure({ enabled: true, clientId: '999999999999999999' });
    p.setPlayback({ media, pos: 0, dur: 100 });
    await wait(400);
    assert.strictEqual(p.status.state, 'error');
    assert.match(p.status.error, /no reconoce/);
    assert.strictEqual(fake.ev.conns, 1, 'no reintenta con un ID rechazado');
    p.shutdown(); await fake.close();
  });

  await t('Discord se reinicia durante la reproducción: vuelve a conectar y reenvía', async () => {
    let fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf, backoff: [150], minGap: 50 });
    p.configure({ enabled: true, clientId: '123456789012345678' });
    p.setPlayback({ media, pos: 0, dur: 100 });
    await wait(200);
    await fake.close();
    await wait(100);
    assert.strictEqual(p.status.state, 'not-running');
    fake = await fakeDiscord();
    await wait(500);
    assert.strictEqual(p.status.state, 'connected');
    assert.strictEqual(lastActivity(fake.ev).details, 'Mulholland Drive (2001)');
    p.shutdown(); await wait(100); await fake.close();
  });

  await t('Probar: actividad de 15 s aunque esté desactivado; ID mal escrito', async () => {
    const fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf });
    p.configure({ enabled: false, clientId: '' });
    assert.deepStrictEqual(await p.test('123'), { ok: false, error: 'El ID de la aplicación tiene que tener entre 17 y 20 cifras' });
    const r = await p.test('123456789012345678');
    assert.deepStrictEqual(r, { ok: true });
    assert.strictEqual(lastActivity(fake.ev).details, 'Probando CineLocal');
    const bad = await p.test('999999999999999999');
    assert.strictEqual(bad.ok, false);
    assert.match(bad.error, /no reconoce/);
    p.shutdown(); await fake.close();
  });

  await t('icono: clave «cinelocal» si la aplicación la tiene; si no, el de GitHub', async () => {
    const fake = await fakeDiscord();
    const p = new DiscordPresence({ pipe: pipeOf, minGap: 50, fetchAssets: async () => [{ name: 'cinelocal' }] });
    p.configure({ enabled: true, clientId: '123456789012345678' });
    p.setPlayback({ media, pos: 0, dur: 100 });
    await wait(300);
    assert.strictEqual(fake.ev.frames[0].msg.args.activity.assets.small_image.startsWith('https://'), true);
    assert.strictEqual(lastActivity(fake.ev).assets.small_image, 'cinelocal');
    p.shutdown(); await fake.close();
  });
}

// ---------- Discord real de este PC ----------
async function real(mode, id) {
  const statuses = [];
  const p = new DiscordPresence({
    fetchAssets: cid => fetch(`https://discord.com/api/v10/oauth2/applications/${cid}/assets`).then(r => r.ok ? r.json() : [])
  });
  p.on('status', s => statuses.push(s.state + (s.error ? ': ' + s.error : '')));
  if (mode === 'real-bogus') {
    const r = await p.test('100000000000000001');
    console.log('ID falso →', r, statuses);
    assert.strictEqual(r.ok, false);
    p.shutdown();
    return;
  }
  const r = await p.test(id);
  console.log('Prueba →', r, statuses);
  assert.ok(r.ok, 'la prueba tiene que funcionar');
  await wait(6000);
  // película de ejemplo unos segundos
  p.configure({ enabled: true, clientId: id });
  p.testing = null; clearTimeout(p.testTimer);
  p.setPlayback({ media, pos: 1234, dur: 8820 });
  await wait(6000);
  console.log('Enviada película de ejemplo:', JSON.stringify(p.lastSent));
  p.setPlayback({ media, pos: 1240, dur: 8820, paused: true });
  await wait(5000);
  console.log('En pausa:', JSON.stringify(p.lastSent));
  p.setPlayback(null);
  await wait(4500);
  console.log('Borrada:', p.lastSent === null, statuses);
  p.shutdown();
  await wait(300);
}

(async () => {
  const [mode, id] = process.argv.slice(2);
  if (mode && mode.startsWith('real')) await real(mode, id);
  else { await unit(); await protocol(); }
  console.log(failed ? `\n${failed} fallo(s)` : '\nTodo correcto');
  process.exit(failed ? 1 : 0);
})();
