const { Player, findMpv } = require('../src/main/player');
const net = require('net'); const os = require('os'); const path = require('path');
const file = process.argv[2];
const cases = [
  { audioLang: 'spa', subLang: 'spa', subMode: 'foreign', expect: { aid: 'spa', sid: false } },
  { audioLang: 'spa', subLang: 'spa', subMode: 'always', expect: { aid: 'spa', sid: 'spa' } },
  { audioLang: 'eng', subLang: 'spa', subMode: 'foreign', expect: { aid: 'eng', sid: 'spa' } },
  { audioLang: 'original', subLang: 'none', subMode: 'always', expect: { aid: 'eng', sid: false } },
  { audioLang: 'jpn', subLang: 'eng', subMode: 'always', expect: { aid: 'eng', sid: 'eng' } }
];
(async () => {
  const mpv = findMpv();
  for (const c of cases) {
    const p = new Player();
    const res = await new Promise(resolve => {
      p.on('started', () => setTimeout(() => {
        const s = net.connect(path.join(os.tmpdir(), `cinelocal-mpv-${process.pid}.sock`));
        s.on('connect', () => s.write(JSON.stringify({ command: ['get_property', 'track-list'], request_id: 9 }) + '\n'));
        let b = ''; s.on('data', d => { b += d; for (const l of b.split('\n')) { try { const m = JSON.parse(l); if (m.request_id === 9) { s.destroy(); p.stop(); resolve(m.data); } } catch {} } });
      }, 1200));
      p.on('closed', x => resolve({ closed: x }));
      p.play({ mpv, playlist: [{ path: file, title: 'Test', start: 3 }], settings: { ...c, playerFullscreen: false, extraMpvArgs: '--vo=null --ao=null' } });
    });
    if (!Array.isArray(res)) { console.log('FAIL', c, res); continue; }
    const a = res.find(t => t.type === 'audio' && t.selected)?.lang || false;
    const s = res.find(t => t.type === 'sub' && t.selected)?.lang || false;
    console.log((a === c.expect.aid && s === c.expect.sid) ? 'OK  ' : 'FAIL', JSON.stringify(c), '-> audio', a, 'sub', s);
    await new Promise(r => setTimeout(r, 1000));
  }
  process.exit(0);
})();
