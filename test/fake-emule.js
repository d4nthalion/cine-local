// Servidor web de eMule 0.50a simulado para pruebas: carga la plantilla como WebServer.cpp
// (_LoadTemplate) y rellena las marcas de la cabecera, la lista de servidores y Kad igual que
// _GetHeader, _GetServerList y _GetKadDlg. Sirve para probar el parser y capturar la interfaz
// sin un eMule real.
//   node test/fake-emule.js <puerto> [plantilla] [contraseña]   (servidor suelto)
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

/** _LoadTemplate: el contenido entre <--NOMBRE--> y <--NOMBRE_END-->, sin el salto final */
function loadTemplate(all, name) {
  let start = all.indexOf('<--' + name + '-->');
  const end = all.indexOf('<--' + name + '_END-->');
  if (start === -1 || end === -1 || start >= end) return '';
  start += name.length + 7;
  return all.substr(start, end - start - 1);
}

function loadTemplates(file) {
  // CStdioFile::ReadString quita "\r\n" y eMule vuelve a unir con "\n"
  const all = fs.readFileSync(file, 'latin1').split(/\r?\n/).join('\n') + '\n';
  const t = {};
  for (const n of ['TMPL_LOGIN', 'TMPL_HEADER', 'TMPL_FOOTER', 'TMPL_TRANSFER_LIST', 'TMPL_SERVER_LIST', 'TMPL_SERVER_LINE',
    'TMPL_ADDSERVERBOX', 'TMPL_KADDLG', 'TMPL_BOOTSTRAPLINE']) t[n] = loadTemplate(all, n);
  return t;
}

const special = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** CastItoIShort con 2 decimales y separador "." (configuración regional "C") */
function short(n) {
  if (n <= 0) return '0';
  if (n < 1e3) return n.toFixed(0);
  for (const [d, s] of [[1e6, 'k'], [1e9, 'M'], [1e12, 'G']]) if (n < d) return (n / (d / 1e3)).toFixed(2) + ' ' + s;
  return (n / 1e12).toFixed(2) + ' T';
}
const SHORT_LENGTH = 40;
const acronym = (s) => s.length > SHORT_LENGTH ? `<acronym title="${s}">${s.slice(0, SHORT_LENGTH - 3)}...</acronym>` : s;

const SAMPLE_SERVERS = [
  { name: 'eMule Security No1', ip: '45.82.80.155', port: 5687, desc: 'www.emule-security.org', ping: 38, users: 312456, maxUsers: 600000, files: 48123456, prio: 'Normal', static: true },
  { name: 'eMule Sunrise', ip: '176.123.5.89', port: 4725, desc: 'https://emule-sunrise.org', ping: 61, users: 41234, maxUsers: 100000, files: 9123456, prio: 'High', static: false },
  { name: 'GrupoTS Server', ip: '46.105.126.71', port: 4661, desc: 'GrupoTS Server — servidor de la comunidad hispana con una descripción muy larga', ping: 44, users: 18990, maxUsers: 50000, files: 4501234, prio: 'Normal', static: false },
  { name: '!! Sharing-Devils No.1 !!', ip: '91.208.162.87', port: 4232, desc: 'https://forum.sharing-devils.to', ping: 120, users: 5321, maxUsers: 0, files: 1209876, prio: 'Low', static: false },
  { name: 'Server No2 con un nombre bastante largo para recortar', ip: '80.208.228.241', port: 8369, desc: 'Fake server? <cuidado> & "comillas"', ping: 0, users: 0, maxUsers: 0, files: 0, prio: 'Normal', static: false, failed: 3 },
  { name: 'PEERATES.NET', ip: '195.123.209.40', port: 7111, desc: 'http://edk.peerates.net', ping: 92, users: 9876, maxUsers: 30000, files: 2109876, prio: 'Normal', static: false }
];

class FakeEmule {
  /** opts: { template, password, servers, state: { server, current, lowId, kad, contacts } } */
  constructor(opts = {}) {
    this.templateFile = opts.template || path.join(__dirname, '..', 'src', 'main', 'emule', 'CineLocal.tmpl');
    this.t = loadTemplates(this.templateFile);
    this.password = opts.password ?? 'test';
    this.servers = (opts.servers || SAMPLE_SERVERS).map(s => ({ failed: 0, ...s }));
    this.st = { server: 'disconnected', current: null, lowId: false, kad: 'off', contacts: 0, ...(opts.state || {}) };
    this.gzip = !!opts.gzip;
    this.ses = String(100000 + Math.floor(Math.random() * 900000));
    this.log = [];
    this.timers = [];
  }

  reload(file) { if (file) this.templateFile = file; this.t = loadTemplates(this.templateFile); }

  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  connectTo(srv) {
    this.st.server = 'connecting'; this.st.current = null;
    this.later(() => {
      const s = srv || [...this.servers].sort((a, b) => b.users - a.users)[0];
      if (!s) { this.st.server = 'disconnected'; return; }
      this.st.server = 'connected'; this.st.current = s.ip + ':' + s.port;
    }, 1500);
  }

  header(q) {
    const st = this.st, ses = this.ses;
    const c = (q.get('c') || '').toLowerCase();
    let con, text;
    if ((st.server === 'connecting' && c !== 'disconnect') || c === 'connect') { con = 'connecting'; text = 'Conectando'; }
    else if (st.server === 'connected' && c !== 'disconnect') {
      con = st.lowId ? 'low' : 'high';
      const s = this.servers.find(x => x.ip + ':' + x.port === st.current);
      text = (s ? (s.name.length > SHORT_LENGTH ? s.name.slice(0, SHORT_LENGTH - 3) + '...' : s.name) : '') + ` (<a href="?ses=${ses}&w=server&c=disconnect">Desconectar</a>)`;
    } else { con = 'disconnected'; text = `Desconectado (<a href="?ses=${ses}&w=server&c=connect">Conectar a cualquier servidor</a>)`; }
    const kad = st.kad === 'firewalled' ? `Con cortafuegos (<a href="?ses=${ses}&w=kad&c=rcfirewall">Volver a comprobar</a>, <a href="?ses=${ses}&w=kad&c=disconnect">Desconectar</a>)`
      : st.kad === 'ok' ? `Conectado (<a href="?ses=${ses}&w=kad&c=disconnect">Desconectar</a>)`
      : st.kad === 'connecting' ? 'Conectando'
      : `Desconectado (<a href="?ses=${ses}&w=kad&c=connect">Conectar</a>)`;
    return this.t.TMPL_HEADER.replaceAll('[Session]', ses).replaceAll('[ConState]', con).replaceAll('[ConText]', text)
      .replaceAll('[KadConText]', kad).replaceAll('[CurDownload]', '125.4').replaceAll('[CurUpload]', '18.0');
  }

  serverList(q) {
    const c = (q.get('c') || '').toLowerCase(), ip = q.get('ip'), port = +q.get('port');
    if (c === 'connect') this.connectTo(ip ? this.servers.find(s => s.ip === ip && s.port === port) : null);
    else if (c === 'disconnect') { this.st.server = 'disconnected'; this.st.current = null; }
    let msg = '';
    if (q.get('updateservermetfromurl') === 'true') {
      const url = q.get('servermeturl') || '';
      if (!url.includes('://')) msg = 'URL no válida';
      else {
        this.servers.push({ name: 'Servidor del server.met', ip: '5.6.7.8', port: 4242, desc: url, ping: 0, users: 0, maxUsers: 0, files: 0, prio: 'Normal', static: false, failed: 0 });
        msg = '\nSe han añadido 1 servidores nuevos desde server.met';
      }
    }
    const box = this.t.TMPL_ADDSERVERBOX.replace('[Message]', special(msg.trim()));
    let list = '';
    for (const s of this.servers) {
      let state = s.failed ? 'failed' : 'disconnected';
      if (this.st.server === 'connecting') state = 'connecting';
      else if (this.st.server === 'connected' && this.st.current === s.ip + ':' + s.port) state = this.st.lowId ? 'low' : 'high';
      const name = special(s.name), desc = special(s.desc);
      list += this.t.TMPL_SERVER_LINE
        .replaceAll('[admin]', 'admin').replaceAll('[session]', this.ses)
        .replaceAll('[isstatic]', s.static ? 'staticsrv' : '').replaceAll('[ServerType]', s.static ? 'static' : 'none')
        .replaceAll('[ed2k]', `ed2k://|server|${s.ip}|${s.port}|/`).replaceAll('[ip]', s.ip).replaceAll('[port]', String(s.port))
        .replaceAll('[server-priority]', s.prio)
        .replaceAll('[Servername]', acronym(name)).replaceAll('[Address]', `${s.ip}:${s.port}`).replaceAll('[Description]', acronym(desc))
        .replaceAll('[Ping]', String(s.ping))
        .replaceAll('[Users]', s.users > 0 ? (s.maxUsers > 0 ? `${short(s.users)} (${short(s.maxUsers)})` : short(s.users)) : '')
        .replaceAll('[Files]', s.files > 0 ? short(s.files) : '')
        .replaceAll('[Priority]', { Low: 'Baja', Normal: 'Normal', High: 'Alta' }[s.prio])
        .replaceAll('[Failed]', String(s.failed)).replaceAll('[Limit]', '0 (0)').replaceAll('[Version]', '17.15')
        .replaceAll('[ServerState]', state);
    }
    return this.t.TMPL_SERVER_LIST.replace('[AddServerBox]', box).replaceAll('[Session]', this.ses).replace('[ServersList]', list);
  }

  kadDlg(q) {
    const c = q.get('c');
    if (q.get('bootstrap')) { this.st.kad = 'connecting'; this.later(() => { this.st.kad = 'ok'; this.st.contacts = 120; }, 1500); }
    if (c === 'connect') { this.st.kad = 'connecting'; this.later(() => { this.st.kad = 'firewalled'; this.st.contacts = 87; }, 1500); }
    if (c === 'disconnect') { this.st.kad = 'off'; this.st.contacts = 0; }
    const st = { ok: 'Conectado', firewalled: 'Con cortafuegos', connecting: 'Conectando', off: 'Desconectado' }[this.st.kad];
    return this.t.TMPL_KADDLG.replace('[BOOTSTRAPLINE]', this.st.kad === 'ok' || this.st.kad === 'firewalled' ? '' : this.t.TMPL_BOOTSTRAPLINE)
      .replace('[KADSTATUS]', st).replace('[KADSTATSDATA]', `${this.st.contacts}<br />0`).replaceAll('[Session]', this.ses);
  }

  handle(url) {
    const q = new URL(url, 'http://x').searchParams;
    this.log.push(url);
    const w = q.get('w');
    if (w === 'password') {
      if (q.get('p') !== this.password) return this.t.TMPL_LOGIN;
      return this.header(new URLSearchParams()) + this.t.TMPL_FOOTER;
    }
    if (q.get('ses') !== this.ses) return this.t.TMPL_LOGIN;
    let out = this.header(q);
    if (w === 'server') out += this.serverList(q);
    else if (w === 'transfer') out += this.t.TMPL_TRANSFER_LIST.replace('[DownloadFilesList]', '');
    else if (w === 'kad') out += this.kadDlg(q);
    return out + this.t.TMPL_FOOTER;
  }

  listen(port) {
    this.server = http.createServer((req, res) => {
      const body = Buffer.from(this.handle(req.url), 'utf8');
      if (this.gzip) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); res.end(zlib.gzipSync(body)); }
      else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(body); }
    });
    return new Promise(r => this.server.listen(port, '127.0.0.1', () => r(this)));
  }

  close() { this.timers.forEach(clearTimeout); this.server?.close(); }
}

module.exports = { FakeEmule, loadTemplate, loadTemplates, SAMPLE_SERVERS };

if (require.main === module) {
  const [port = 4799, tmpl, pass] = process.argv.slice(2);
  new FakeEmule({ template: tmpl, password: pass }).listen(+port).then(() => console.log('eMule simulado en 127.0.0.1:' + port));
}
