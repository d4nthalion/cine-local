// Vistas de Letterboxd → vistas en CineLocal (modo local, TMDB simulado): npx electron test/lb-watched-test.js <carpetaTemporal>
// Dune está vista en Letterboxd y Heat no: sólo se marca Dune, una vez; desmarcada a mano, no se vuelve a marcar.
const { app, protocol } = require('electron');
const path = require('path'); const fs = require('fs');
const { keyOf } = require('../src/main/letterboxd');
const ud = process.argv[process.argv.length - 1];
fs.rmSync(ud, { recursive: true, force: true });
const lib = path.join(ud, 'lib');
const mk = p => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(1e5)); const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); };
mk(path.join(lib, 'Dune (2021).mkv'));
mk(path.join(lib, 'Heat (1995).mkv'));
fs.mkdirSync(path.join(ud, 'local'), { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ autoUpdate: false, localMode: true, lbUser: 'prueba' }));
fs.writeFileSync(path.join(ud, 'local', 'settings.json'), JSON.stringify({ libraryPath: lib, tmdbKey: 'prueba', metaLang: 'es-ES' }));
// Letterboxd ya sincronizado (sin red): Dune vista, Heat sólo en la watchlist
const kD = keyOf('Dune', 2021), kH = keyOf('Heat', 1995);
fs.writeFileSync(path.join(ud, 'letterboxd.json'), JSON.stringify({
  user: 'prueba', syncedAt: Date.now(), fullAt: Date.now(), source: 'profile',
  films: { [kD]: { title: 'Dune', year: 2021, watched: true, watchlist: false }, [kH]: { title: 'Heat', year: 1995, watched: false, watchlist: true } },
  ids: { [kD]: { id: 438631 }, [kH]: { id: 949 } }
}));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');

const MOVIES = { 438631: ['Dune', '2021-09-15'], 949: ['Heat', '1995-12-15'] };
const json = d => new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } });
function fakeTmdb(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/^\/3/, '');
  if (p === '/search/movie') {
    const q = (u.searchParams.get('query') || '').toLowerCase();
    return json({ results: Object.entries(MOVIES).filter(([, [t]]) => q.includes(t.toLowerCase())).map(([id, [t, d]]) => ({ id: +id, title: t, original_title: t, release_date: d, popularity: 50, vote_count: 500 })) });
  }
  const m = /^\/movie\/(\d+)$/.exec(p);
  if (m && MOVIES[m[1]]) {
    const [t, d] = MOVIES[m[1]];
    return json({ id: +m[1], title: t, original_title: t, release_date: d, genres: [], credits: { cast: [], crew: [] }, images: { logos: [], backdrops: [] }, release_dates: { results: [] }, videos: { results: [] }, recommendations: { results: [] } });
  }
  return json({ results: [] });
}
app.whenReady().then(() => protocol.handle('https', req => (/themoviedb\.org/.test(req.url) ? fakeTmdb(req.url) : new Response('', { status: 404 }))));
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = false;
const check = (c, m) => { console.log((c ? 'ok - ' : 'FALLO - ') + m); if (!c) failed = true; };
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const watched = t => js(`!!prog(S.lib.items.find(i => i.title === '${t}')?.path)?.watched`);
    try {
      for (let i = 0; i < 40 && !(await watched('Dune')); i++) await wait(500);
      check(await watched('Dune'), 'Dune (vista en Letterboxd) marcada como vista');
      check(!(await watched('Heat')), 'Heat (sólo en la watchlist) sin marcar');
      // desmarcarla a mano y forzar otra pasada (cambio en la biblioteca): no se vuelve a marcar
      const dune = await js("S.lib.items.find(i => i.title === 'Dune').path");
      await js(`window.api.markProgress({ paths: [${JSON.stringify(dune)}], watched: false }).then(p => { S.lib.progress = p; })`);
      await js('window.api.scan()'); await wait(5000);
      check(!(await watched('Dune')), 'desmarcada a mano: no se vuelve a marcar');
      const lb = JSON.parse(fs.readFileSync(path.join(ud, 'letterboxd.json'), 'utf8'));
      check(lb.marked?.local?.length === 1, 'apuntado lo que ya se marcó (local: ' + (lb.marked?.local || []).length + ')');
      check(await js("S.route.name = 'settings'; render(); !!document.querySelector('[data-set=lbMarkWatched]:checked')"), 'interruptor en Ajustes, activado por defecto');
    } catch (e) { console.error(e); failed = true; }
    app.exit(failed ? 1 : 0);
  });
});
