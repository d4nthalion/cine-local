// Watchlist, marcar temporadas y versiones de un episodio (modo local, TMDB simulado):
//   npx electron test/watchlist-ui-test.js <carpetaTemporal> <carpetaCapturas>
// «Mi lista» pasa a la Watchlist; añadir y quitar se ve al momento; una temporada se marca entera; un episodio con
// dos archivos cuenta como visto si se ha visto cualquiera de los dos.
const { app, protocol } = require('electron');
const path = require('path'); const fs = require('fs');
const [ud, out] = process.argv.slice(-2);
fs.rmSync(ud, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const lib = path.join(ud, 'lib');
const mk = p => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(1e5)); const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); };
mk(path.join(lib, 'Dune (2021).mkv'));
mk(path.join(lib, 'Heat (1995).mkv'));
for (let s = 1; s <= 2; s++) for (let e = 1; e <= 3; e++) mk(path.join(lib, 'Battlestar Galactica', `T${s}`, `Battlestar Galactica ${s}x0${e}.mkv`));
// otra versión de 1x02 (como las «[1080p][Dual]» del NAS)
mk(path.join(lib, 'Battlestar Galactica', 'T1', 'Battlestar Galáctica 1x02 - Agua [1080p][Dual].mkv'));
fs.mkdirSync(path.join(ud, 'local', 'users'), { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ autoUpdate: false, localMode: true }));
fs.writeFileSync(path.join(ud, 'local', 'settings.json'), JSON.stringify({ libraryPath: lib, tmdbKey: 'prueba', metaLang: 'es-ES' }));
// usuario de antes de la Watchlist: Heat en «Mi lista» y una lista propia
const { hashId } = require('../src/main/scanner');
const heatId = hashId('movie:' + path.join(lib, 'Heat (1995).mkv'));
fs.writeFileSync(path.join(ud, 'local', 'users', 'local.json'), JSON.stringify({ progress: {}, favorites: [heatId], lists: [{ id: 'lviejas', name: 'Viejas', items: [], created: 1 }], lastPlayed: {}, prefs: {} }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');

const MOVIES = { 438631: ['Dune', '2021-09-15'], 949: ['Heat', '1995-12-15'] };
const json = d => new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } });
function fakeTmdb(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/^\/3/, '');
  const q = (u.searchParams.get('query') || '').toLowerCase();
  if (p === '/search/movie') return json({ results: Object.entries(MOVIES).filter(([, [t]]) => q.includes(t.toLowerCase())).map(([id, [t, d]]) => ({ id: +id, title: t, original_title: t, release_date: d, popularity: 50, vote_count: 500 })) });
  if (p === '/search/tv') return json({ results: q.includes('battlestar') ? [{ id: 1972, name: 'Battlestar Galactica', original_name: 'Battlestar Galactica', first_air_date: '2004-10-18', popularity: 50, vote_count: 500 }] : [] });
  const m = /^\/movie\/(\d+)$/.exec(p);
  if (m && MOVIES[m[1]]) {
    const [t, d] = MOVIES[m[1]];
    return json({ id: +m[1], title: t, original_title: t, release_date: d, genres: [], credits: { cast: [], crew: [] }, images: { logos: [], backdrops: [] }, release_dates: { results: [] }, videos: { results: [] }, recommendations: { results: [] } });
  }
  if (/^\/tv\/1972$/.test(p)) return json({ id: 1972, name: 'Battlestar Galactica', original_name: 'Battlestar Galactica', first_air_date: '2004-10-18', genres: [], credits: { cast: [], crew: [] }, images: { logos: [], backdrops: [] }, content_ratings: { results: [] }, videos: { results: [] }, recommendations: { results: [] }, seasons: [] });
  if (/^\/tv\/1972\/season\/\d+$/.test(p)) return json({ episodes: [] });
  return json({ results: [] });
}
app.whenReady().then(() => protocol.handle('https', req => (/themoviedb\.org/.test(req.url) ? fakeTmdb(req.url) : new Response('', { status: 404 }))));
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
/** Lo guardado del usuario (el archivo se escribe a los 300 ms) */
const savedUser = async () => { await wait(500); return JSON.parse(fs.readFileSync(path.join(ud, 'local', 'users', 'local.json'), 'utf8')); };
let failed = false;
const check = (c, m) => { console.log((c ? 'ok - ' : 'FALLO - ') + m); if (!c) failed = true; };
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(500); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => { if (l >= 2) console.log('[r]', m); });
    try {
      for (let i = 0; i < 40 && !(await js("S.lib.items.filter(i => i.meta?.tmdbId).length === 3")); i++) await wait(500);
      const dune = await js("S.lib.items.find(i => i.title === 'Dune').id");
      const heat = await js("S.lib.items.find(i => i.title === 'Heat').id");
      const bsg = await js("S.lib.items.find(i => i.type === 'series').id");
      check(dune && heat && bsg, 'biblioteca con fichas: Dune, Heat y Battlestar Galactica');

      // «Mi lista» de antes (favorites) → Watchlist
      check(heat === heatId, 'id de Heat como en el usuario antiguo');
      const w0 = JSON.parse(await js('JSON.stringify(S.lib.lists)'));
      check(w0[0].id === 'watchlist' && w0[0].name === 'Watchlist' && w0[0].items.length === 1 && w0[0].items[0].title === 'Heat', 'la Watchlist es la primera lista y trae lo que había en Mi lista (Heat)');
      check(w0.some(l => l.id === 'lviejas'), 'las listas propias se conservan');
      // «Mi lista» de las apps antiguas (toggleFavorite) añade y quita de la Watchlist
      const fav = JSON.parse(await js(`window.api.toggleFavorite('${dune}').then(f => JSON.stringify(f))`));
      check((await savedUser()).lists[0].items.some(x => x.key === 'movie:438631'), '«Mi lista» de las apps antiguas añade a la Watchlist');
      check(fav.length === 2 && fav.includes(dune) && fav.includes(heat), 'favorites (apps antiguas) = lo de la Watchlist que está en la biblioteca');
      await js(`window.api.toggleFavorite('${heat}')`);
      check(!(await savedUser()).lists[0].items.some(x => x.title === 'Heat'), 'y también quita');
      await js("window.api.scan().then(v => { S.lib.lists = v.lists; })"); await wait(300);

      // Listas: pestaña Watchlist, sin renombrar ni borrar
      await js("go('list')"); await wait(400);
      check(await js("document.querySelector('.list-tabs .gchip.on').textContent.includes('Watchlist')"), 'Listas abre en la Watchlist');
      check(await js("!document.querySelector('[data-action=list-rename]')"), 'la Watchlist no se puede renombrar ni borrar');
      let err = null; try { await js("window.api.lists.op({ op: 'delete', id: 'watchlist' })"); } catch (e) { err = e.message; }
      check(err && /no se puede borrar/.test(err), 'el servidor tampoco deja borrarla');
      await snap('watchlist-1-listas');

      // botón Watchlist en la ficha: al momento
      await js(`go('detail', { id: '${heat}' })`); await wait(400);
      const t = await js(`(() => { const t0 = performance.now(); document.querySelector('[data-action=wl-toggle]').click(); return { on: inWatchlist('movie:949'), btn: document.querySelector('[data-action=wl-toggle]').classList.contains('on'), ms: Math.round(performance.now() - t0) }; })()`);
      check(t.on && t.btn, `Watchlist en la ficha: se ve al momento (${t.ms} ms)`);
      await wait(400);
      check((await savedUser()).lists[0].items.some(x => x.key === 'movie:949'), 'y queda guardado');
      await snap('watchlist-2-ficha');

      // varios cambios seguidos en una lista propia: el final es el del último
      await js("listOp({ op: 'create', name: 'Pruebas' })"); await wait(300);
      const lid = await js('listsOf()[0].id');
      await js(`(() => { for (let i = 0; i < 5; i++) listOp({ op: 'toggle', id: '${lid}', entry: entryOf(byId('${dune}')) }); })()`); await wait(800);
      const shown = await js(`listsOf()[0].items.some(x => x.key === 'movie:438631')`);
      const saved = (await savedUser()).lists.find(l => l.id === lid).items.some(x => x.key === 'movie:438631');
      check(shown && saved, '5 cambios seguidos: queda dentro, igual en pantalla y guardado');

      // temporada entera y versiones de un episodio
      await js(`go('detail', { id: '${bsg}' }); S.season['${bsg}'] = 1; render(true)`); await wait(400);
      check(await js(`byId('${bsg}').episodes.filter(e => e.season === 1 && e.episode === 2).length`) === 2, '1x02 tiene dos archivos');
      await js("document.querySelector('[data-action=mark-season]').click()"); await wait(600);
      check(await js(`byId('${bsg}').episodes.filter(e => e.season === 1).every(e => prog(e.path)?.watched)`), 'Marcar temporada 1: todos sus archivos vistos');
      check(await js(`byId('${bsg}').episodes.filter(e => e.season === 2).every(e => !prog(e.path)?.watched)`), 'la temporada 2 no se toca');
      check(await js("document.querySelector('[data-action=mark-season]').textContent.includes('no vista')"), 'el botón pasa a «como no vista»');
      check(await js("continueList().some(c => c.it.type === 'series' && c.ep.season === 2 && c.ep.episode === 1)"), 'Continuar viendo: sigue por el 2x01');
      await snap('watchlist-3-temporada');
      // con una sola versión vista, el episodio cuenta como visto y no sale en Continuar viendo
      const one = await js(`byId('${bsg}').episodes.find(e => e.season === 1 && e.episode === 2 && !/Dual/.test(e.path)).path`);
      await js(`window.api.markProgress({ paths: [${JSON.stringify(one)}], watched: false }).then(p => { S.lib.progress = p; render(true); })`); await wait(400);
      check(await js(`epSeen(byId('${bsg}'), byId('${bsg}').episodes.find(e => e.season === 1 && e.episode === 2))`), 'una versión vista: el episodio cuenta como visto');
      // desmarcar el episodio desde su botón: quita las dos versiones
      await js(`document.querySelector('.episode[data-ep="' + byId('${bsg}').episodes.find(e => e.season === 1 && e.episode === 2).id + '"] [data-action=mark]').click()`); await wait(500);
      check(await js(`byId('${bsg}').episodes.filter(e => e.season === 1 && e.episode === 2).every(e => !prog(e.path)?.watched)`), 'desmarcar el episodio quita todas sus versiones');
      await js("document.querySelector('[data-action=mark-season]').click()"); await wait(500);
      check(await js(`byId('${bsg}').episodes.filter(e => e.season === 1).every(e => prog(e.path)?.watched)`), 'volver a marcar la temporada');

      // Inicio: fila Watchlist
      await js("go('home')"); await wait(400);
      check(await js("[...document.querySelectorAll('.row')].some(r => r.textContent.includes('Watchlist'))"), 'Inicio: fila «Watchlist»');
      await snap('watchlist-4-inicio');
    } catch (e) { console.error(e); failed = true; }
    app.exit(failed ? 1 : 0);
  });
});
