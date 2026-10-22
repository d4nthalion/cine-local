// Pruebas de «Saltar intro» (TheIntroDB): node test/introdb-test.js
// 1) normalización de la respuesta, tramo activo en el segundo t, caducidad de la caché
// 2) peticiones con un fetch falso: caché (también de lo que no está), 429 con Retry-After, clave opcional
// Opcional, contra la API real (3 peticiones): node test/introdb-test.js real
const assert = require('assert');
const { IntroDB, normalize, flatten, activeSegment, cacheKey, fresh, TTL_FOUND, TTL_MISSING } = require('../src/main/introdb');

let failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n    ', e.stack || e); }
}

const memStore = (data = { entries: {} }) => ({ data, saves: 0, save() { this.saves++; } });
const res = (status, body, headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: k => headers[k.toLowerCase()] ?? null },
  json: async () => body
});

async function unit() {
  await t('normaliza: start null → 0, ms → s', () => {
    const n = normalize({ tvdb_id: 70533, type: 'tv', season: 1, episode: 2, intro: [{ start_ms: null, end_ms: 91000 }] });
    assert.deepStrictEqual(n.intro, [{ start: 0, end: 91 }]);
    assert.deepStrictEqual(n.recap, []);
  });
  await t('normaliza: créditos sin final = hasta el final del archivo', () => {
    const n = normalize({ credits: [{ start_ms: 2843000, end_ms: null }] });
    assert.deepStrictEqual(n.credits, [{ start: 2843, end: null }]);
  });
  await t('normaliza: {0,0} y rangos al revés se descartan', () => {
    const n = normalize({ recap: [{ start_ms: 0, end_ms: 0 }], credits: [{ start_ms: 0, end_ms: 0 }], intro: [{ start_ms: 5000, end_ms: 3000 }] });
    assert.deepStrictEqual(n, { intro: [], recap: [], credits: [], preview: [] });
  });
  await t('normaliza: una intro sin final no se acepta (saltaría el capítulo entero)', () => {
    assert.deepStrictEqual(normalize({ intro: [{ start_ms: 1000, end_ms: null }] }).intro, []);
  });
  await t('normaliza: basura → vacío', () => {
    assert.deepStrictEqual(normalize(null).intro, []);
    assert.deepStrictEqual(normalize({ intro: 'x', recap: [null, 3, { start_ms: 'a', end_ms: 5 }] }).recap, []);
  });
  await t('lista plana: ordenada, final de créditos = duración, recorta y quita lo que empieza tras el final', () => {
    const segs = normalize({ intro: [{ start_ms: 60000, end_ms: 120000 }], recap: [{ start_ms: null, end_ms: 45000 }],
      credits: [{ start_ms: 2500000, end_ms: null }], preview: [{ start_ms: 9000000, end_ms: 9100000 }] });
    const f = flatten(segs, 2600);
    assert.deepStrictEqual(f, [
      { kind: 'recap', start: 0, end: 45 }, { kind: 'intro', start: 60, end: 120 }, { kind: 'credits', start: 2500, end: 2600 }]);
    assert.strictEqual(flatten(segs, 0).find(x => x.kind === 'credits').end, null);
  });
  await t('tramo activo en el segundo t', () => {
    const list = flatten(normalize({ intro: [{ start_ms: 10000, end_ms: 70000 }], credits: [{ start_ms: 1300000, end_ms: null }] }), 0);
    assert.strictEqual(activeSegment(list, 5, 1400), null);
    assert.strictEqual(activeSegment(list, 10, 1400).kind, 'intro');
    assert.strictEqual(activeSegment(list, 69.4, 1400).kind, 'intro');
    assert.strictEqual(activeSegment(list, 69.6, 1400), null, 'en el último medio segundo ya no');
    assert.strictEqual(activeSegment(list, 1350, 1400).kind, 'credits');
    assert.strictEqual(activeSegment(list, 1399.8, 1400), null);
  });
  await t('caducidad: datos 30 días, «no está» 7 días', () => {
    const now = 1_800_000_000_000;
    assert.ok(fresh({ at: now - TTL_FOUND + 1000, segs: { intro: [] } }, now));
    assert.ok(!fresh({ at: now - TTL_FOUND - 1000, segs: { intro: [] } }, now));
    assert.ok(fresh({ at: now - TTL_MISSING + 1000, segs: null }, now));
    assert.ok(!fresh({ at: now - TTL_MISSING - 1000, segs: null }, now));
    assert.ok(!fresh(null, now));
  });
  await t('claves de caché', () => {
    assert.strictEqual(cacheKey({ type: 'tv', tmdbId: 1920, season: 1, episode: 2 }), 'tv:1920:1:2');
    assert.strictEqual(cacheKey({ type: 'movie', tmdbId: 603 }), 'movie:603');
  });
}

async function fake() {
  await t('pide una vez y usa la caché; URL con temporada, capítulo y duración; cabeceras', async () => {
    const calls = [];
    const db = new IntroDB({ store: memStore(), userAgent: 'CineLocal/9.9.9',
      fetch: async (u, o) => { calls.push({ u, o }); return res(200, { intro: [{ start_ms: null, end_ms: 91000 }] }); } });
    const m = { type: 'tv', tmdbId: 1920, season: 1, episode: 2 };
    const [a, b] = await Promise.all([db.get(m, { durationMs: 2820000.4 }), db.get(m)]);
    assert.deepStrictEqual(a.intro, [{ start: 0, end: 91 }]);
    assert.strictEqual(a, b);
    await db.get(m);
    assert.strictEqual(calls.length, 1, 'una sola petición');
    const url = new URL(calls[0].u);
    assert.strictEqual(url.origin + url.pathname, 'https://api.theintrodb.org/v4/media');
    assert.deepStrictEqual(Object.fromEntries(url.searchParams), { tmdb_id: '1920', season: '1', episode: '2', duration_ms: '2820000' });
    assert.strictEqual(calls[0].o.headers.Accept, 'application/json');
    assert.strictEqual(calls[0].o.headers['User-Agent'], 'CineLocal/9.9.9');
    assert.ok(!('Authorization' in calls[0].o.headers));
  });
  await t('película: sólo tmdb_id', async () => {
    let u0;
    const db = new IntroDB({ store: memStore(), fetch: async u => { u0 = u; return res(404, {}); } });
    assert.strictEqual(await db.get({ type: 'movie', tmdbId: 603 }), null);
    assert.deepStrictEqual(Object.fromEntries(new URL(u0).searchParams), { tmdb_id: '603' });
  });
  await t('404 y respuesta sin tramos válidos se guardan como «no está» y no se vuelven a pedir', async () => {
    let n = 0;
    const st = memStore();
    const db = new IntroDB({ store: st, fetch: async u => { n++; return /70523/.test(u) ? res(200, { recap: [{ start_ms: 0, end_ms: 0 }] }) : res(404, {}); } });
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 70523, season: 1, episode: 1 }), null);
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 1, season: 1, episode: 1 }), null);
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 70523, season: 1, episode: 1 }), null);
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 1, season: 1, episode: 1 }), null);
    assert.strictEqual(n, 2);
    assert.strictEqual(st.data.entries['tv:1:1:1'].segs, null);
    assert.ok(st.saves >= 2);
  });
  await t('429: espera Retry-After sin preguntar; después vuelve a pedir', async () => {
    let n = 0, status = 429;
    const db = new IntroDB({ store: memStore(), fetch: async () => { n++; return res(status, { intro: [{ start_ms: 0, end_ms: 30000 }] }, { 'retry-after': '120' }); } });
    const m = { type: 'tv', tmdbId: 5, season: 1, episode: 1 };
    assert.strictEqual(await db.get(m), null);
    assert.ok(db.blockedUntil - Date.now() > 110e3 && db.blockedUntil - Date.now() <= 120e3);
    assert.strictEqual(await db.get({ ...m, episode: 2 }), null);
    assert.strictEqual(n, 1, 'bloqueado: no se pide');
    db.blockedUntil = 0; status = 200;
    assert.ok((await db.get(m)).intro.length === 1);
    assert.strictEqual(n, 2);
  });
  await t('error de red: no se cachea en disco y no se repite enseguida', async () => {
    let n = 0;
    const st = memStore();
    const db = new IntroDB({ store: st, fetch: async () => { n++; throw new Error('sin red'); } });
    const m = { type: 'tv', tmdbId: 6, season: 1, episode: 1 };
    const warn = console.warn; console.warn = () => {};
    try {
      assert.strictEqual(await db.get(m), null);
      assert.strictEqual(await db.get(m), null);
    } finally { console.warn = warn; }
    assert.strictEqual(n, 1);
    assert.deepStrictEqual(st.data.entries, {});
  });
  await t('límite propio: como mucho 20 peticiones cada 10 s', async () => {
    let n = 0;
    const db = new IntroDB({ store: memStore(), fetch: async () => { n++; return res(404, {}); } });
    for (let e = 1; e <= 25; e++) await db.get({ type: 'tv', tmdbId: 7, season: 1, episode: e });
    assert.strictEqual(n, 20);
  });
  await t('clave opcional como Bearer', async () => {
    let h;
    const db = new IntroDB({ store: memStore(), apiKey: () => ' abc123 ', fetch: async (u, o) => { h = o.headers; return res(404, {}); } });
    await db.get({ type: 'movie', tmdbId: 1 });
    assert.strictEqual(h.Authorization, 'Bearer abc123');
  });
  await t('al arrancar se borra lo caducado; sin tmdbId o sin capítulo no se pide', async () => {
    const old = Date.now() - TTL_FOUND - 1;
    const st = memStore({ entries: { 'tv:1:1:1': { at: old, segs: { intro: [] } }, 'tv:1:1:2': { at: Date.now(), segs: null } } });
    let n = 0;
    const db = new IntroDB({ store: st, fetch: async () => { n++; return res(404, {}); } });
    assert.deepStrictEqual(Object.keys(st.data.entries), ['tv:1:1:2']);
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: null, season: 1, episode: 1 }), null);
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 3 }), null);
    assert.strictEqual(n, 0);
  });
}

async function real() {
  const db = new IntroDB({ store: memStore(), userAgent: 'CineLocal/test', fetch: (u, o) => fetch(u, o) });
  await t('real: Twin Peaks T1E2 → intro hasta 1:31', async () => {
    const s = await db.get({ type: 'tv', tmdbId: 1920, season: 1, episode: 2 });
    assert.deepStrictEqual(s.intro, [{ start: 0, end: 91 }]);
  });
  await t('real: Breaking Bad T1E2 → créditos desde 47:23 hasta el final', async () => {
    const s = await db.get({ type: 'tv', tmdbId: 1396, season: 1, episode: 2 });
    assert.deepStrictEqual(s.credits, [{ start: 2843, end: null }]);
  });
  await t('real: Dark T1E1 → sólo {0,0}: nada', async () => {
    assert.strictEqual(await db.get({ type: 'tv', tmdbId: 70523, season: 1, episode: 1 }), null);
  });
}

(async () => {
  await unit();
  await fake();
  if (process.argv[2] === 'real') await real();
  console.log(failed ? `\n${failed} pruebas fallidas` : '\nTodo correcto');
  process.exit(failed ? 1 : 0);
})();
