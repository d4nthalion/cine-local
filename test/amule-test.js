// Pruebas de las descargas con aMule en el servidor (sin aMule ni TMDB de verdad): node test/amule-test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AmuleClient, toDownload, toStatus } = require('../server/amule/client');
const { episodeOf, safeName, identify, englishNames, targetPath } = require('../server/amule/organize');
const { AmuleService } = require('../server/amule/service');

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FALLO', name, '\n     ', e.stack.split('\n').slice(0, 3).join('\n      ')); }
}

/** amuleapi de mentira: rutas → respuesta { status, body } o función (req) => …  */
function fakeApi(routes) {
  const calls = [];
  const fetch = async (url, opt = {}) => {
    const u = new URL(url);
    const key = `${opt.method || 'GET'} ${u.pathname.replace('/api/v1', '')}${u.search}`;
    const req = { key, body: opt.body ? JSON.parse(opt.body) : undefined, auth: opt.headers?.Authorization };
    calls.push(req);
    let r = routes[key] ?? routes[key.replace(/\?.*$/, '')];
    if (typeof r === 'function') r = r(req);
    if (!r) r = { status: 404, body: { error: { code: 'not_found', message: 'no' } } };
    return { ok: r.status < 300, status: r.status, json: async () => r.body };
  };
  return { fetch, calls };
}

/** TMDB de mentira: títulos en inglés y búsquedas */
const tmdb = {
  enabled: true,
  async get(ep) {
    const m = {
      '/movie/10331': { title: 'Night of the Living Dead', release_date: '1968-10-04' },
      '/movie/603': { title: 'The Matrix', release_date: '1999-03-30' },
      '/movie/1': { title: 'Mission: Impossible', release_date: '1996-05-22' },
      '/tv/86848': { name: 'Dracula', first_air_date: '2020-01-01' },
      '/tv/86848/season/1/episode/1': { name: 'The Rules of the Beast' },
      '/tv/86848/season/1/episode/2': { name: 'Episode 2' }
    }[ep];
    if (!m) throw new Error('TMDB 404');
    return m;
  },
  async findBest(type, title) { return { 'night of the living dead': 10331, 'the matrix': 603, dracula: 86848 }[title.toLowerCase()] || null; },
  async searchMatch(type, title) {
    return [{ id: 10331, title: 'La noche de los muertos vivientes', titles: ['La noche de los muertos vivientes', 'Night of the Living Dead'], originalTitle: 'Night of the Living Dead', year: '1968' },
      { id: 603, title: 'Matrix', titles: ['Matrix', 'The Matrix'], originalTitle: 'The Matrix', year: '1999' },
      { id: 86848, title: 'Drácula', titles: ['Drácula', 'Dracula'], originalTitle: 'Dracula', year: '2020' }];
  }
};

(async () => {
  // ---------- traducción de los datos de amuleapi ----------
  await test('toDownload: estados, avance y fuentes', () => {
    const d = toDownload({ hash: 'AB'.repeat(16), name: 'x.mkv', size_bytes: 1000, completed_bytes: 250, speed_bytes_per_second: 50, status: 'downloading',
      priority: 'normal', priority_auto: false, sources: { total: 9, transferring: 2 }, progress: { percent: 25 }, ed2k_link: 'ed2k://|file|x|/' });
    assert.deepStrictEqual([d.hash, d.state, d.progress, d.done, d.sources, d.sourcesTotal], ['ab'.repeat(16), 'downloading', 0.25, 250, 2, 9]);
    assert.strictEqual(toDownload({ hash: 'a'.repeat(32), status: 'downloading', sources: { total: 0 } }).state, 'stalled');
    assert.strictEqual(toDownload({ hash: 'a'.repeat(32), status: 'completed', size_bytes: 5 }).progress, 1);
    assert.strictEqual(toDownload({ hash: 'a'.repeat(32), status: 'insufficient_disk' }).state, 'error');
  });
  await test('toStatus: ID baja y Kad tras cortafuegos', () => {
    const st = toStatus({ ed2k: { state: 'connected', high_id: false, server_name: 'S', server_ip: '1.2.3.4', server_port: 5 }, kad: { state: 'connected', firewalled_tcp: true, network: { node_count: 7 } }, speeds: { download_speed_bytes_per_second: 3 } });
    assert.deepStrictEqual([st.server, st.serverName, st.serverAddr, st.kad, st.kadContacts, st.down], ['low', 'S', '1.2.3.4:5', 'firewalled', 7, 3]);
    assert.strictEqual(toStatus({ ed2k: { state: 'disconnected' }, kad: { state: 'disabled' } }).kad, 'off');
  });

  // ---------- cliente ----------
  await test('cliente: inicia sesión y vuelve a entrar una vez si el token caduca', async () => {
    let logins = 0, statusCalls = 0;
    const api = fakeApi({
      'POST /auth/login?include_token=true': () => ({ status: 200, body: { token: 't' + (++logins) } }),
      'GET /status': req => (++statusCalls === 1 ? { status: 401, body: { error: { code: 'unauthorized', message: 'caducado' } } }
        : { status: 200, body: { ec_connected: true, ed2k: { state: 'connected', high_id: true }, kad: { state: 'connected' } } }),
      'GET /downloads?status=all': { status: 200, body: { downloads: [] } }
    });
    const c = new AmuleClient({ url: 'http://x:4711/', password: 'pw', fetch: api.fetch });
    const r = await c.transfers();
    assert.strictEqual(r.status.server, 'high');
    assert.strictEqual(logins, 2);
    assert.strictEqual(api.calls.at(-1).auth, 'Bearer t2');
  });
  await test('cliente: contraseña incorrecta → code auth, sin bucle', async () => {
    const api = fakeApi({ 'POST /auth/login?include_token=true': { status: 401, body: { error: { code: 'invalid_credentials', message: 'no' } } } });
    const c = new AmuleClient({ url: 'http://x', password: 'mal', fetch: api.fetch });
    await assert.rejects(c.transfers(), e => e.code === 'auth');
    assert.ok(api.calls.length <= 2);
  });
  await test('cliente: búsqueda en Kad, resultados y fin', async () => {
    const api = fakeApi({
      'POST /auth/login?include_token=true': { status: 200, body: { token: 't' } },
      'POST /search': req => ({ status: 202, body: { search_id: 7, echo: req.body } }),
      'GET /search/7/results': { status: 200, body: { results: [{ hash: 'C'.repeat(32), name: 'a.mkv', size_bytes: 9, sources: { total: 4, complete: 1 } }], progress: { state: 'finished' } } }
    });
    const c = new AmuleClient({ url: 'http://x', password: 'pw', fetch: api.fetch });
    const r = await c.search({ query: 'night', method: 'kademlia', min: 1 });
    assert.deepStrictEqual(api.calls.find(x => x.key === 'POST /search').body, { query: 'night', type: 'kad', file_type: 'video', min_size_bytes: 1048576 });
    assert.strictEqual(r.done, true);
    assert.deepStrictEqual(r.results[0], { hash: 'c'.repeat(32), name: 'a.mkv', size: 9, sources: 4, complete: 1, type: '' });
  });
  await test('cliente: un enlace rechazado por aMule es un error', async () => {
    const api = fakeApi({
      'POST /auth/login?include_token=true': { status: 200, body: { token: 't' } },
      'POST /downloads': { status: 207, body: { results: [{ ok: false, error: { message: 'malformed ed2k link' } }] } }
    });
    const c = new AmuleClient({ url: 'http://x', password: 'pw', fetch: api.fetch });
    await assert.rejects(c.addLink('ed2k://|file|a.mkv|10|' + 'a'.repeat(32) + '|/'), /malformed/);
    await assert.rejects(c.addLink('http://no'), /no parece un enlace/);
  });

  // ---------- nombres ----------
  await test('episodeOf y safeName', () => {
    assert.deepStrictEqual(episodeOf('Dracula.2020.S01E02.720p.mkv'), { season: 1, episode: 2, index: 13 });
    assert.strictEqual(episodeOf('Serie 1x05 algo.avi').episode, 5);
    assert.strictEqual(episodeOf('Serie Cap.203 HDTV.avi').season, 2);
    assert.strictEqual(episodeOf('The Matrix 1999 1080p.mkv'), null);
    assert.strictEqual(safeName('Mission: Impossible / Fallout?'), 'Mission - Impossible Fallout');
  });
  await test('identify: seguro con año; sin año, no', async () => {
    const a = await identify('Night.Of.The.Living.Dead.1968.1080p.BluRay.x264-[YTS.AM].mp4', tmdb);
    assert.deepStrictEqual([a.type, a.tmdb, a.certain], ['movie', 10331, true]);
    const b = await identify('Night of the Living Dead.mkv', tmdb);
    assert.strictEqual(b.certain, false);
    const c = await identify('Dracula.S01E01.mkv', tmdb);
    assert.deepStrictEqual([c.type, c.tmdb, c.season, c.episode, c.certain], ['series', 86848, 1, 1, true]);
    assert.strictEqual(await identify('Cosa rarisima 2001.mkv', tmdb), null);
  });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-amule-'));
  const root = path.join(tmp, 'Multimedia');
  for (const d of ['Peliculas', 'Series/Drácula (2020)', 'Peticiones', '@amule/incoming']) fs.mkdirSync(path.join(root, d), { recursive: true });

  await test('targetPath: automática, carpeta elegida y serie que ya existe', async () => {
    const movie = await englishNames(tmdb, { type: 'movie', tmdb: 1 });
    assert.strictEqual(targetPath({ info: { type: 'movie' }, names: movie, ext: '.mkv', root }), path.join(root, 'Peliculas', 'Mission - Impossible (1996).mkv'));
    assert.strictEqual(targetPath({ info: { type: 'movie' }, names: movie, ext: '.mkv', root, dest: path.join(root, 'Peticiones') }), path.join(root, 'Peticiones', 'Mission - Impossible (1996).mkv'));
    const ep = { type: 'series', tmdb: 86848, season: 1, episode: 1 };
    const names = await englishNames(tmdb, ep);
    const show = { type: 'series', path: path.join(root, 'Series', 'Drácula (2020)'), meta: { tmdbId: 86848 } };
    // nueva: Series/Dracula (2020)/Dracula (2020) 1x01 The Rules of the Beast.mkv
    assert.strictEqual(targetPath({ info: ep, names, ext: '.mkv', root }), path.join(root, 'Series', 'Dracula (2020)', 'Dracula (2020) 1x01 The Rules of the Beast.mkv'));
    // ya está (por su ficha): su carpeta, aunque se llame en español
    assert.strictEqual(targetPath({ info: ep, names, ext: '.mkv', root, items: [show] }), path.join(show.path, 'Dracula (2020) 1x01 The Rules of the Beast.mkv'));
    // «Episode 2» de TMDB no es un título
    const n2 = await englishNames(tmdb, { ...ep, episode: 2 });
    assert.strictEqual(path.basename(targetPath({ info: { ...ep, episode: 2 }, names: n2, ext: '.mkv', root })), 'Dracula (2020) 1x02.mkv');
  });

  // ---------- servicio: de descarga terminada a la biblioteca ----------
  await test('servicio: coloca con plan, deja pendiente lo dudoso y se coloca a mano', async () => {
    const H1 = '1'.repeat(32), H2 = '2'.repeat(32), H3 = '3'.repeat(32), H4 = '4'.repeat(32);
    let list = [
      { hash: H1, name: 'Night.Of.The.Living.Dead.1968.1080p.mp4', state: 'downloading', size: 10 },
      { hash: H2, name: 'Night of the Living Dead.mkv', state: 'downloading', size: 10 },
      { hash: H3, name: 'Dracula.S01E01.720p.mkv', state: 'downloading', size: 10 },
      { hash: H4, name: 'Dracula.2020.S01E02.1080p.mkv', state: 'downloading', size: 10 }
    ];
    const cleared = [];
    const client = { transfers: async () => ({ status: {}, downloads: list }), fileOp: async (h, op) => { if (op === 'clear') cleared.push(h); }, download: async () => {} };
    const pins = [];
    let scans = 0;
    // la serie ya está en la biblioteca, con su carpeta en español
    const show = path.join(root, 'Series', 'Drácula (2020)');
    const library = { settings: { data: { libraryPath: root } }, tmdb: () => tmdb, seriesFolders: () => [{ type: 'series', path: show, meta: { tmdbId: 86848 } }],
      pinMatch: (...a) => pins.push(a), scan: () => { scans++; } };
    const data = { plans: {}, tracked: {}, pending: {}, placed: [] };
    const svc = new AmuleService({ client, library, store: { data, save() {} }, incoming: path.join(root, '@amule', 'incoming') });
    // H3 se lanzó desde la ficha de la serie, a la carpeta Peticiones
    svc.setPlan(H3, { entry: { tmdb: 86848, type: 'series', title: 'Drácula', year: 2020 }, dest: 'Peticiones' });
    await svc.refresh();
    for (const d of list) fs.writeFileSync(path.join(root, '@amule', 'incoming', d.name), 'x');
    list = list.map(d => ({ ...d, state: 'complete' }));
    await svc.refresh();
    await new Promise(r => setTimeout(r, 50));
    assert.ok(fs.existsSync(path.join(root, 'Peliculas', 'Night of the Living Dead (1968).mp4')), 'película colocada');
    assert.ok(fs.existsSync(path.join(root, 'Peticiones', 'Dracula (2020)', 'Dracula (2020) 1x01 The Rules of the Beast.mkv')), 'episodio en la carpeta elegida');
    assert.ok(fs.existsSync(path.join(show, 'Dracula (2020) 1x02.mkv')), 'episodio sin ficha, junto a los de su serie');
    assert.deepStrictEqual(Object.keys(data.pending), [H2]);
    assert.strictEqual(data.pending[H2].suggestion.tmdb, 10331);
    assert.deepStrictEqual(pins.map(p => p[0]).sort(), ['movie', 'series', 'series']);
    assert.deepStrictEqual(cleared.sort(), [H1, H2, H3, H4]);
    assert.strictEqual(scans, 3);
    // la dudosa, a mano, a otra carpeta
    const dest = await svc.placePending({ hash: H2, entry: { tmdb: 10331, type: 'movie' }, dest: 'Peticiones' });
    assert.strictEqual(dest, path.join('Peticiones', 'Night of the Living Dead (1968).mkv'));
    assert.deepStrictEqual(data.pending, {});
    assert.strictEqual(data.placed.length, 4);
    // no se sobrescribe nada: la misma película otra vez
    fs.writeFileSync(path.join(root, '@amule', 'incoming', 'otra.mkv'), 'y');
    data.pending.x = { hash: 'x', name: 'otra.mkv', file: path.join(root, '@amule', 'incoming', 'otra.mkv') };
    await assert.rejects(svc.placePending({ hash: 'x', entry: { tmdb: 10331, type: 'movie' }, dest: 'Peticiones' }), /Ya existe/);
  });
  await test('carpetas: dentro de la biblioteca y sin las ocultas', () => {
    const svc = new AmuleService({ client: {}, library: { settings: { data: { libraryPath: root } } }, store: { data: {}, save() {} }, root });
    assert.deepStrictEqual(svc.folders('').dirs, ['Peliculas', 'Peticiones', 'Series']);
    assert.throws(() => svc.relDir('../fuera'), /dentro de la biblioteca/);
    assert.throws(() => svc.relDir('@amule'), /no válida/);
    assert.throws(() => svc.relDir('NoExiste'), /No existe/);
  });

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failed ? `\n${failed} pruebas fallidas` : '\nTodo bien');
  process.exit(failed ? 1 : 0);
})();
