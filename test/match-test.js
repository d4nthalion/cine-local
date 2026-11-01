// Pruebas del emparejamiento con TMDB (rankResults / findBest): node test/match-test.js
// Con resultados reales de TMDB (copiados), sin conexión
const assert = require('assert');
const { TMDB, rankResults } = require('../src/main/metadata');

let failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '\n    ', e.stack || e); }
}

const r = (id, title, originalTitle, year, votes) => ({ id, title, originalTitle, year: String(year || '') || null, votes });

(async () => {
  await t('el año pesa más que el título exacto (Terminator 2 no es Shocking Dark)', () => {
    const res = [
      r(280, 'Terminator 2: Judgment Day', 'Terminator 2: Judgment Day', 1991, 15116),
      r(66664, 'Shocking Dark', 'Terminator 2', 1989, 79),
      r(473793, "The Making of 'Terminator 2: Judgment Day'", "The Making of 'Terminator 2: Judgment Day'", 1991, 46)
    ];
    assert.strictEqual(rankResults(res, 'Terminator 2', 1991)[0].id, 280);
  });

  await t('Predator (2018) es The Predator y no la de 1987', () => {
    const res = [
      r(106, 'Predator', 'Predator', 1987, 9639),
      r(346910, 'The Predator', 'The Predator', 2018, 5326),
      r(548257, 'Alien Predator', 'Alien Predator', 2018, 46)
    ];
    assert.strictEqual(rankResults(res, 'Predator', 2018)[0].id, 346910);
  });

  await t('sin año en el archivo sigue ganando el título exacto', () => {
    const res = [
      r(1242898, 'Predator: Badlands', 'Predator: Badlands', 2025, 3864),
      r(106, 'Predator', 'Predator', 1987, 9638)
    ];
    assert.strictEqual(rankResults(res, 'Predator', null)[0].id, 106);
  });

  await t('un resultado sin fecha no gana a uno del año del archivo', () => {
    const res = [r(1, 'Reflejos', 'Reflejos', null, 0), r(2, 'Mirrors', 'Mirrors', 2008, 2000)];
    assert.strictEqual(rankResults(res, 'Reflejos', 2008)[0].id, 2);
  });

  await t('findBest: año delante del título y parte antes de la coma', async () => {
    const asked = [];
    const api = new TMDB('x');
    api.search = async (type, q, year) => {
      asked.push([q, year]);
      return q === 'Godzilla 2000' ? [r(10643, 'Godzilla 2000: Millennium', 'ゴジラ2000 ミレニアム', 1999, 300)] : [];
    };
    assert.strictEqual(await api.findBest('movie', '1999 - Godzilla 2000, el dinosaurio mutante', null), 10643);
    assert.deepStrictEqual(asked[0], ['Godzilla 2000, el dinosaurio mutante', 1999]);
  });

  await t('el título en el otro idioma cuenta (La Bruja = The Witch, con las fichas en inglés)', () => {
    const res = [
      { ...r(274854, 'The Last Witch Hunter', 'The Last Witch Hunter', 2015, 5000), titles: ['The Last Witch Hunter', 'El último cazador de brujas'] },
      { ...r(310131, 'The Witch', 'The VVitch: A New-England Folktale', 2015, 6000), titles: ['The Witch', 'La bruja'] }
    ];
    assert.strictEqual(rankResults(res, 'La Bruja', 2015)[0].id, 310131);
  });

  await t('sin artículo si con él sale otra película de otro año (El Cementerio Viviente 1989)', async () => {
    const api = new TMDB('x');
    api.search = async (type, q) => q === 'El Cementerio Viviente'
      ? [r(830764, 'Pet Sematary: Bloodlines', 'Pet Sematary: Bloodlines', 2023, 463)]
      : q === 'Cementerio Viviente' ? [r(8913, 'Cementerio viviente', 'Pet Sematary', 1989, 2500)] : [];
    assert.strictEqual(await api.findBest('movie', 'El Cementerio Viviente', 1989), 8913);
  });

  await t('el título exacto vale aunque el año del archivo esté mal', async () => {
    const api = new TMDB('x');
    api.search = async (type, q) => q.startsWith('Metallica Live Shit')
      ? [r(1, 'Metallica: Live Shit - Binge & Purge, Seattle 1989', '', 1989, 20), r(2, 'Metallica: Live Shit - Binge & Purge, San Diego 1992', '', 1992, 15)] : [];
    assert.strictEqual(await api.findBest('movie', 'Metallica Live Shit Binge & Purge, Seattle 1989', 1993), 1);
  });

  await t('«SpiderMan», «AntMan», «XMen» se buscan con guion; «DogMan» no', () => {
    const { cleanQuery } = require('../src/main/metadata');
    assert.strictEqual(cleanQuery('The Amazing SpiderMan'), 'The Amazing Spider-Man');
    assert.strictEqual(cleanQuery('XMen 2'), 'X-Men 2');
    assert.strictEqual(cleanQuery('DogMan'), 'DogMan');
  });

  console.log(failed ? `\n${failed} fallos` : '\nTodo bien');
  process.exit(failed ? 1 : 0);
})();
