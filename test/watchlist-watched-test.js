// Una película vista sale de la Watchlist (server/library.js): node test/watchlist-watched-test.js
// Al terminarla en el reproductor o marcarla como vista; no al marcarla por Letterboxd ni al ver un episodio.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Library } = require('../server/library');
const { WATCHLIST } = require('../src/main/lists');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-wl-'));
  const lib = path.join(tmp, 'lib');
  // con fecha de hace una hora: el escáner se salta lo que se acaba de modificar (podría estar copiándose)
  const mk = p => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(1e5)); const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); };
  mk(path.join(lib, 'Dune (2021).mkv'));
  mk(path.join(lib, 'Heat (1995).mkv'));
  mk(path.join(lib, 'Alien (1979).mkv'));
  mk(path.join(lib, 'The Bear', 'The Bear S01E01.mkv'));
  mk(path.join(lib, 'The Bear', 'The Bear S01E02.mkv'));

  const library = new Library(path.join(tmp, 'data'), { defaults: { libraryPath: lib, tmdbKey: '', metaLangs: [] } });
  library.isAdmin = () => false;
  await library.scan();
  const items = library.library.data.items;
  const byTitle = t => items.find(i => i.title === t);
  const dune = byTitle('Dune'), heat = byTitle('Heat'), alien = byTitle('Alien'), bear = items.find(i => i.type === 'series');
  assert(dune && heat && alien && bear, 'no se han escaneado los títulos: ' + items.map(i => i.title).join(', '));
  // Dune y la serie con ficha (se guardan por TMDB); Heat y Alien sin ficha (por su id)
  library.metadata.data[dune.id] = { tmdbId: 438631, meta: { tmdbId: 438631, title: 'Dune' } };
  library.metadata.data[bear.id] = { tmdbId: 136315, meta: { tmdbId: 136315, title: 'The Bear' } };

  const USER = 'Ana';
  const u = library.user(USER);
  const entries = [
    { key: 'movie:438631', tmdb: 438631, type: 'movie', title: 'Dune' },
    { key: 'id:' + heat.id, id: heat.id, type: 'movie', title: 'Heat' },
    { key: 'id:' + alien.id, id: alien.id, type: 'movie', title: 'Alien' },
    { key: 'series:136315', tmdb: 136315, type: 'series', title: 'The Bear' }
  ];
  u.data.lists = u.data.lists.map(l => l.id === WATCHLIST ? { ...l, items: entries } : l);
  const wl = () => library.user(USER).data.lists.find(l => l.id === WATCHLIST).items.map(e => e.title);
  const events = [];
  library.on('watchlist', name => events.push(name));

  // a medias: sigue en la Watchlist
  library.reportProgress(USER, dune.id, 600, 6000);
  assert.deepStrictEqual(wl(), ['Dune', 'Heat', 'Alien', 'The Bear']);
  assert.strictEqual(events.length, 0);

  // terminada en el reproductor: fuera (por su ficha de TMDB), con aviso para sus apps
  library.reportProgress(USER, dune.id, 5800, 6000);
  assert.deepStrictEqual(wl(), ['Heat', 'Alien', 'The Bear']);
  assert.deepStrictEqual(events, ['ana']);

  // seguir mandando progreso de una ya vista (créditos) no vuelve a avisar
  library.reportProgress(USER, dune.id, 5900, 6000);
  assert.strictEqual(events.length, 1);

  // marcada como vista a mano, sin ficha: fuera por su id
  library.markProgress(USER, { paths: [heat.path], watched: true });
  assert.deepStrictEqual(wl(), ['Alien', 'The Bear']);
  assert.strictEqual(events.length, 2);

  // marcada por lo visto en Letterboxd: se queda
  library.markProgress(USER, { paths: [alien.path], watched: true }, { keepWatchlist: true });
  assert.deepStrictEqual(wl(), ['Alien', 'The Bear']);

  // desmarcar y volver a marcar: ya estaba fuera, no pasa nada
  library.markProgress(USER, { paths: [heat.path], watched: false });
  library.markProgress(USER, { paths: [heat.path], watched: true });
  assert.deepStrictEqual(wl(), ['Alien', 'The Bear']);

  // ver episodios no saca la serie, ni terminándolos ni marcándolos
  const [e1, e2] = bear.episodes;
  library.reportProgress(USER, e1.id, 1700, 1800);
  library.markProgress(USER, { paths: [e2.path], watched: true });
  assert.deepStrictEqual(wl(), ['Alien', 'The Bear']);
  assert.strictEqual(events.length, 2);

  // las otras listas no se tocan
  const { applyListOp } = require('../src/main/lists');
  u.data.lists = applyListOp(u.data.lists, { op: 'create', name: 'Favoritas', entry: { tmdb: 438631, type: 'movie', title: 'Dune' } });
  library.markProgress(USER, { paths: [dune.path], watched: false });
  library.markProgress(USER, { paths: [dune.path], watched: true });
  assert.deepStrictEqual(library.user(USER).data.lists.find(l => l.name === 'Favoritas').items.map(e => e.title), ['Dune']);

  // los datos se guardan en disco
  library.user(USER).flushSync();
  const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'users', 'ana.json'), 'utf8'));
  assert.deepStrictEqual(saved.lists.find(l => l.id === WATCHLIST).items.map(e => e.title), ['Alien', 'The Bear']);

  library.watcher?.stop?.();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK: las películas vistas salen de la Watchlist (y sólo ellas)');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
