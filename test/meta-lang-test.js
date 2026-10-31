// Pruebas de las fichas en varios idiomas (server/library.js): node test/meta-lang-test.js
// Con un TMDB falso: cada usuario ve las suyas, los otros idiomas usan el mismo id (sin volver a emparejar)
// y un idioma nuevo se descarga al elegirlo
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Library } = require('../server/library');

let failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n    ', e.stack || e); }
}

const TITLES = { 'es-ES': 'Terminator 2: El juicio final', 'en-US': 'Terminator 2: Judgment Day', 'fr-FR': 'Terminator 2 : Le Jugement dernier' };
const calls = [];
const fakeFetch = async (url) => {
  const u = new URL(url);
  const lang = u.searchParams.get('language');
  calls.push(u.pathname + ' ' + (lang || ''));
  const body = u.pathname.endsWith('/search/movie')
    ? { results: [{ id: 280, title: TITLES[lang], original_title: 'Terminator 2: Judgment Day', release_date: '1991-07-03', vote_count: 15000 }] }
    : u.pathname.endsWith('/movie/280') ? { id: 280, title: TITLES[lang], release_date: '1991-07-03', overview: 'x', genres: [] }
    : {};
  return { status: 200, ok: true, json: async () => body };
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-lang-'));
  const media = path.join(dir, 'media');
  fs.mkdirSync(media);
  fs.writeFileSync(path.join(media, 'Terminator 2 (1991).mkv'), 'x');
  fs.utimesSync(path.join(media, 'Terminator 2 (1991).mkv'), new Date(2020, 0, 1), new Date(2020, 0, 1));
  const lib = new Library(path.join(dir, 'data'), { defaults: { libraryPath: media, tmdbKey: 'k', metaLang: 'en-US', autoWatch: false }, fetch: fakeFetch });
  await lib.scan();
  while (lib.fetching) await new Promise(r => setTimeout(r, 20));
  const id = lib.library.data.items[0].id;
  const titleFor = u => lib.view(u).items[0].meta?.title;

  await t('el principal y los descargados (español) con la misma ficha de TMDB', () => {
    assert.strictEqual(titleFor('ana'), TITLES['en-US']);
    assert.strictEqual(lib.langStore('es-ES').data[id].tmdbId, 280);
    assert.strictEqual(calls.filter(c => c.startsWith('/3/search')).length, 1);   // se emparejó una sola vez
  });

  await t('cada usuario ve su idioma (lista y ficha completa)', () => {
    lib.setPrefs('luis', { userMetaLang: 'es-ES' });
    assert.strictEqual(titleFor('luis'), TITLES['es-ES']);
    assert.strictEqual(lib.item(id, 'luis').meta.title, TITLES['es-ES']);
    assert.strictEqual(titleFor('ana'), TITLES['en-US']);
  });

  await t('un idioma nuevo se descarga al elegirlo, sin volver a buscar en TMDB', async () => {
    const before = calls.length;
    lib.setPrefs('eva', { userMetaLang: 'fr-FR' });
    assert.ok(lib.settings.data.metaLangs.includes('fr-FR'));
    while (lib.fetching || !lib.langStore('fr-FR').data[id]) await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(titleFor('eva'), TITLES['fr-FR']);
    assert.deepStrictEqual(calls.slice(before).filter(c => c.startsWith('/3/search')), []);
  });

  await t('volver al del servidor y un valor no válido', () => {
    lib.setPrefs('luis', { userMetaLang: '' });
    assert.strictEqual(titleFor('luis'), TITLES['en-US']);
    lib.setPrefs('luis', { userMetaLang: '../x' });
    assert.strictEqual(lib.langOf('luis'), 'en-US');
  });

  lib.watcher.stop();
  console.log(failed ? `\n${failed} fallos` : '\nTodo bien');
  process.exit(failed ? 1 : 0);
})();
