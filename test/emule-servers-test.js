// Prueba del parser de servidores y Kad con respuestas generadas desde la plantilla de CineLocal
// tal como las monta el servidor web de eMule 0.50a (ver test/fake-emule.js).
//   node test/emule-servers-test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { EmuleClient, parseBlocks, toServer, kadState, parseShort, TEMPLATE_REV } = require('../src/main/emule');
const { FakeEmule } = require('./fake-emule');

let n = 0;
const ok = (name) => console.log(`  ok ${++n} - ${name}`);

(async () => {
  // ---- utilidades sueltas
  assert.strictEqual(parseShort('523'), 523);
  assert.strictEqual(parseShort('312.46 k'), 312460);
  assert.strictEqual(parseShort('48,12 M'), 48120000);
  assert.strictEqual(parseShort(''), 0);
  ok('parseShort: cifras abreviadas de CastItoIShort');

  assert.strictEqual(kadState('Con cortafuegos (<a href="?ses=1&w=kad&c=rcfirewall">x</a>, <a href="?ses=1&w=kad&c=disconnect">y</a>)'), 'firewalled');
  assert.strictEqual(kadState('Connected (<a href="?ses=1&w=kad&c=disconnect">Disconnect</a>)'), 'ok');
  assert.strictEqual(kadState('Getrennt (<a href="?ses=1&w=kad&c=connect">Verbinden</a>)'), 'off');
  assert.strictEqual(kadState('Conectando'), 'connecting');
  ok('kadState: por los enlaces de eMule, sin depender del idioma');

  // ---- respuesta generada desde la plantilla
  const fake = new FakeEmule({ state: { server: 'connected', current: '46.105.126.71:4661', kad: 'firewalled', contacts: 87 } });
  const text = fake.handle(`/?ses=${fake.ses}&w=server`);
  assert.ok(/#\/HEADER#SERVERS/.test(text) && /#\/S#S/.test(text), 'eMule pega las secciones sin salto de línea');
  const blocks = parseBlocks(text);
  assert.deepStrictEqual([...new Set(blocks.map(b => b.type))], ['HEADER', 'SERVERS', 'SRVMSG', 'S', 'FOOTER']);
  const servers = blocks.filter(b => b.type === 'S').map(b => toServer(b.data));
  assert.strictEqual(servers.length, 6);
  const [sec, , grupo, devils, longName, peer] = servers;
  assert.deepStrictEqual(sec, {
    name: 'eMule Security No1', ip: '45.82.80.155', port: 5687, description: 'www.emule-security.org', ping: 38,
    users: 312460, maxUsers: 600000, files: 48120000, failed: 0, priority: 'normal', static: true,
    state: 'disconnected', connected: false, version: '17.15'
  });
  assert.strictEqual(grupo.connected, true);
  assert.strictEqual(grupo.state, 'high');
  assert.strictEqual(grupo.description, 'GrupoTS Server — servidor de la comunidad hispana con una descripción muy larga', 'descripción completa desde <acronym title>');
  assert.strictEqual(devils.priority, 'low');
  assert.strictEqual(devils.maxUsers, 0);
  assert.strictEqual(devils.users, 5320);   // eMule la da como "5.32 k"
  assert.strictEqual(longName.name, 'Server No2 con un nombre bastante largo para recortar', 'nombre completo desde <acronym title>');
  assert.strictEqual(longName.description, 'Fake server? <cuidado> & "comillas"', 'entidades HTML decodificadas');
  assert.strictEqual(longName.users, 0);
  assert.strictEqual(longName.files, 0);
  assert.strictEqual(longName.failed, 3);
  assert.strictEqual(longName.state, 'failed');
  assert.strictEqual(peer.priority, 'normal');
  ok('toServer: lista completa (nombres largos, entidades, sin usuarios, fallos, estático, prioridad)');

  const head = EmuleClient.status(blocks.find(b => b.type === 'HEADER').data);
  assert.strictEqual(head.server, 'high', '[ConState] "high" de eMule 0.50a es ID alta');
  assert.strictEqual(head.serverName, 'GrupoTS Server');
  assert.strictEqual(head.kad, 'firewalled');
  assert.strictEqual(head.template, TEMPLATE_REV);
  ok('status: ID alta, nombre del servidor, Kad tras cortafuegos y revisión de la plantilla');

  // ---- cliente completo contra el eMule simulado (con gzip, como UseGzip=1)
  const port = 47990 + Math.floor(Math.random() * 9);
  fake.gzip = true;
  await fake.listen(port);
  const c = new EmuleClient({ port, password: 'test' });
  let r = await c.servers();
  assert.strictEqual(r.outdated, false);
  assert.strictEqual(r.servers.length, 6);
  assert.deepStrictEqual(r.kad, { text: 'Con cortafuegos', contacts: 87, searches: 0, canBootstrap: false });
  ok('servers(): lista, estado y Kad');

  r = await c.disconnectServer();
  assert.ok(fake.log.at(-2).includes('w=server') && fake.log.some(u => /w=server&c=disconnect/.test(u)));
  assert.strictEqual(r.status.server, 'off');
  assert.ok(r.servers.every(s => !s.connected));
  r = await c.connectServer('176.123.5.89', 4725);
  assert.ok(fake.log.some(u => /w=server&c=connect&ip=176\.123\.5\.89&port=4725/.test(u)));
  assert.strictEqual(r.status.server, 'connecting');
  await new Promise(res => setTimeout(res, 1700));
  r = await c.servers();
  assert.strictEqual(r.servers.find(s => s.connected).name, 'eMule Sunrise');
  r = await c.connectServer();
  assert.ok(fake.log.some(u => /w=server&c=connect$/.test(u)));
  assert.throws(() => c.connectServer('1.2.3.4; rm', 80), /no válida/);
  assert.throws(() => c.connectServer('1.2.3.4', 70000), /Puerto/);
  ok('connectServer()/disconnectServer(): comandos w=server&c=connect[&ip&port] y c=disconnect');

  let k = await c.kad('disconnect');
  assert.strictEqual(k.kad.canBootstrap, true);
  k = await c.kad('connect');
  assert.ok(fake.log.some(u => /w=kad&c=connect/.test(u)));
  k = await c.kad('bootstrap', '1.2.3.4', 4672);
  assert.ok(fake.log.some(u => /w=kad&bootstrap=1&ip=1\.2\.3\.4&port=4672/.test(u)));
  await c.kad('recheck');
  assert.ok(fake.log.some(u => /w=kad&c=rcfirewall/.test(u)));
  await assert.rejects(() => c.kad('nada'), /no válida/);
  ok('kad(): connect, disconnect, bootstrap y recheck');

  r = await c.updateServerMet('http://example.com/server.met');
  assert.ok(fake.log.some(u => /updateservermetfromurl=true&servermeturl=http%3A%2F%2Fexample\.com%2Fserver\.met/.test(u)));
  assert.strictEqual(r.servers.length, 7);
  assert.match(r.message, /server\.met/);
  assert.throws(() => c.updateServerMet('server.met'), /dirección completa/);
  ok('updateServerMet(): w=server&updateservermetfromurl=true&servermeturl=…');

  // ---- eMule con la plantilla anterior en memoria (sin «Recargar»)
  const old = path.join(os.tmpdir(), 'cinelocal-old-' + process.pid + '.tmpl');
  fs.writeFileSync(old, execFileSync('git', ['show', 'HEAD:src/main/emule/CineLocal.tmpl'], { cwd: path.join(__dirname, '..') }));
  fake.reload(old);
  const t = await c.transfers();
  assert.strictEqual(t.status.template, 1);
  r = await c.servers();
  assert.strictEqual(r.outdated, true);
  assert.strictEqual(r.servers.length, 0);
  fs.unlinkSync(old);
  ok('plantilla antigua: outdated y revisión 1 en la cabecera');

  fake.close();
  console.log(`\n${n} pruebas correctas`);
})().catch(e => { console.error(e); process.exit(1); });
