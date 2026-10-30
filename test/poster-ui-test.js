// Capturas de «Cambiar carátula» (modo local, con TMDB simulado): npx electron test/poster-ui-test.js <carpetaTemporal> <carpetaCapturas>
// Elige otra carátula de TMDB para una película y sube una imagen propia para un título que no está en TMDB.
const { app, protocol, nativeImage } = require('electron');
const path = require('path'); const fs = require('fs');
const [ud, out] = process.argv.slice(-2);
fs.rmSync(ud, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const lib = path.join(ud, 'lib');
const mk = p => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.alloc(1e5)); const t = new Date(Date.now() - 3600e3); fs.utimesSync(p, t, t); };
mk(path.join(lib, 'Dune (2021).mkv'));
mk(path.join(lib, 'El coyote y el correcaminos', 'T1', 'El Coyote y El Correcaminos - 01 Rapido y Rabioso (1949).avi'));
fs.mkdirSync(path.join(ud, 'local'), { recursive: true });
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ autoUpdate: false, localMode: true }));
fs.writeFileSync(path.join(ud, 'local', 'settings.json'), JSON.stringify({ libraryPath: lib, tmdbKey: 'prueba', metaLang: 'es-ES' }));
app.setPath('userData', ud);
app.commandLine.appendSwitch('no-sandbox');

// TMDB simulado: una película (Dune) con tres carátulas; nada para el resto
const POSTERS = [['/es.png', 'es', [40, 120, 220]], ['/sintexto.png', null, [60, 170, 90]], ['/en.png', 'en', [200, 80, 60]]];
const color = p => (POSTERS.find(x => x[0] === p)?.[2]) || [120, 120, 130];
function png([r, g, b]) {
  const w = 40, h = 60, buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) buf.set([b, g, r, 255], i * 4);
  return nativeImage.createFromBitmap(buf, { width: w, height: h }).toPNG();
}
const DUNE = {
  id: 438631, title: 'Dune', original_title: 'Dune', release_date: '2021-09-15', overview: 'Prueba', poster_path: '/en.png', backdrop_path: null,
  runtime: 155, vote_average: 7.8, genres: [{ name: 'Ciencia ficción' }], credits: { cast: [], crew: [{ job: 'Director', id: 1, name: 'Denis Villeneuve' }] },
  images: { logos: [], backdrops: [] }, release_dates: { results: [] }, videos: { results: [] }, recommendations: { results: [] }
};
const json = d => new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } });
function fakeTmdb(url) {
  const u = new URL(url);
  if (u.hostname === 'image.tmdb.org') return new Response(png(color(u.pathname.replace(/^\/t\/p\/\w+/, ''))), { headers: { 'content-type': 'image/png' } });
  const p = u.pathname.replace(/^\/3/, '');
  if (p === '/search/movie') return json({ results: /dune/i.test(u.searchParams.get('query')) ? [{ id: 438631, title: 'Dune', original_title: 'Dune', release_date: '2021-09-15', poster_path: '/en.png', popularity: 100, vote_count: 1000 }] : [] });
  if (p === '/search/tv' || p === '/search/person' || p === '/search/multi') return json({ results: [] });
  if (p === '/movie/438631') return json(DUNE);
  if (p === '/movie/438631/images') return json({ posters: POSTERS.map(([f, l], i) => ({ file_path: f, iso_639_1: l, vote_average: 5 - i })) });
  if (p === '/movie/438631/credits') return json(DUNE.credits);
  return new Response('{}', { status: 404 });
}

app.whenReady().then(() => {
  for (const s of ['https']) protocol.handle(s, req => (/themoviedb\.org|tmdb\.org/.test(req.url) ? fakeTmdb(req.url) : new Response('', { status: 404 })));
});
require('../src/main/main.js');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = false;
const check = (c, m) => { console.log((c ? 'ok - ' : 'FALLO - ') + m); if (!c) failed = true; };
app.on('browser-window-created', async (_e, win) => {
  win.webContents.once('did-finish-load', async () => {
    const js = s => win.webContents.executeJavaScript(s);
    const snap = async n => { await wait(700); fs.writeFileSync(path.join(out, n + '.png'), (await win.webContents.capturePage()).toPNG()); };
    win.webContents.on('console-message', (_e, l, m) => { if (l >= 2) console.log('[r]', m); });
    try {
      // escaneo y fichas
      for (let i = 0; i < 30 && !(await js("S.lib.items.some(i => i.meta?.tmdbId === 438631)")); i++) await wait(500);
      const dune = await js("S.lib.items.find(i => i.meta?.tmdbId === 438631)?.id");
      const coy = await js("S.lib.items.find(i => i.type === 'series')?.id");
      check(dune && coy, 'biblioteca con Dune (en TMDB) y el Coyote (sin ficha)');
      await js(`go('detail', { id: '${dune}' })`); await wait(800);
      await js("document.querySelector('[data-action=menu]').click()"); await wait(300);
      check(await js("!!document.querySelector('#detailMenu [data-action=poster]')"), 'menú ··· con «Cambiar carátula»');
      await js("document.querySelector('#detailMenu [data-action=poster]').click()");
      for (let i = 0; i < 20 && !(await js("document.querySelectorAll('.pp-item').length")); i++) await wait(250);
      const langs = await js("[...document.querySelectorAll('.pp-item span')].map(s => s.textContent).join(',')");
      check(langs === 'ES,Sin texto,Ficha', 'carátulas de TMDB en orden (la inglesa es la de la ficha): ' + langs);
      check(await js("document.querySelector('.pp-item.on span').textContent === 'Ficha'"), 'marcada la que se usa ahora');
      await snap('poster-1-tmdb');
      await js("document.querySelector('.pp-item').click()"); await wait(1200);
      const p1 = await js(`posterOf(byId('${dune}'))`);
      check(/\/es\.png$/.test(p1), 'elegida la española: ' + p1);
      check(await js(`document.querySelector('.file-info')?.textContent.includes('Elegida a mano')`), 'la ficha dice «Elegida a mano»');
      // título sin ficha: imagen propia (un PNG generado aquí, como si se eligiera en el diálogo)
      await js(`pickPoster('${coy}')`); await wait(500);
      check(await js("document.querySelector('.pp-msg')?.textContent.startsWith('Sin ficha de TMDB')"), 'sin ficha: invita a subir una imagen');
      await snap('poster-2-sinficha');
      await js(`(async () => {
        const c = document.createElement('canvas'); c.width = 900; c.height = 1350;
        const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#f59e0b'); gr.addColorStop(1, '#7c2d12');
        g.fillStyle = gr; g.fillRect(0, 0, 900, 1350); g.fillStyle = '#fff'; g.font = 'bold 110px sans-serif'; g.fillText('BEEP', 250, 700);
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        const data = await shrinkImage(new File([blob], 'coyote.png', { type: 'image/png' }), 500);
        await window.api.setPoster('${coy}', data);
      })()`); await wait(1200);
      const p2 = await js(`posterOf(byId('${coy}'))`);
      check(/^data:image\/jpeg;base64,/.test(p2) && p2.length < 200000, `imagen propia reducida a JPEG (${Math.round(p2.length / 1024)} KB)`);
      const dim = await js(`new Promise(r => { const i = new Image(); i.onload = () => r(i.width + 'x' + i.height); i.src = posterOf(byId('${coy}')); })`);
      check(dim === '500x750', 'a 500 px de ancho: ' + dim);
      await js('closeModal()');
      await js("go('home')"); await snap('poster-3-home');
      // volver a la de TMDB
      await js(`pickPoster('${dune}')`); await wait(600);
      await js("document.querySelector('#ppReset').click()"); await wait(1200);
      check(/\/en\.png$/.test(await js(`posterOf(byId('${dune}'))`)), 'restablecer: vuelve a la de la ficha');
    } catch (e) { console.error(e); failed = true; }
    app.exit(failed ? 1 : 0);
  });
});
