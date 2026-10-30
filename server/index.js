// CineLocal Server: la interfaz de CineLocal como servicio web del NAS, alternativa a Video Station / DS Video.
// Se entra con los usuarios de DSM; cada usuario tiene su propio progreso y su lista.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Library } = require('./library');
const { Auth } = require('./auth');
const { Requests } = require('./requests');
const { AccessLog, clientOf } = require('./accesslog');
const media = require('./media');
const { store } = require('./store');
const { IntroDB, flatten } = require('../src/main/introdb');

const env = process.env;
const PORT = +env.PORT || 8095;
const HOST = env.HOST || '0.0.0.0';
const DATA = env.CINELOCAL_DATA || path.join(__dirname, 'data');
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const TRUST_PROXY = env.TRUST_PROXY === '1';   // detrás del proxy inverso de DSM: la IP real va en X-Forwarded-For
const VERSION = require('../package.json').version;

const RENDERER = path.join(__dirname, '..', 'src', 'renderer');
const WEB = path.join(__dirname, 'web');

const library = new Library(DATA);
const auth = new Auth({
  dsmUrl: env.DSM_URL || 'http://127.0.0.1:5000',
  store: store(DATA, 'sessions.json', { sessions: {} }),
  allowed: list(env.CINELOCAL_USERS),
  admins: list(env.CINELOCAL_ADMINS),
  // grupos de DSM: «cinelocal-admin» y «cinelocal-user» deciden quién entra y qué puede hacer
  groupFile: env.CINELOCAL_GROUP_FILE || null,
  adminGroup: env.CINELOCAL_ADMIN_GROUP || 'cinelocal-admin',
  userGroup: env.CINELOCAL_USER_GROUP || 'cinelocal-user',
  // sólo para desarrollo: sin DSM, todo el mundo entra como este usuario
  devUser: env.CINELOCAL_AUTH === 'none' ? (env.CINELOCAL_DEV_USER || 'dev') : null,
  devRole: env.CINELOCAL_DEV_ROLE === 'user' ? 'user' : 'admin'
});
if (auth.devUser) console.warn(`¡Atención! CINELOCAL_AUTH=none: no se pide contraseña (usuario «${auth.devUser}»). Sólo para desarrollo.`);
const requests = new Requests(DATA);
const access = new AccessLog(DATA, { months: +env.CINELOCAL_LOG_MONTHS || 12 });
const introDb = new IntroDB({ fetch: globalThis.fetch, store: store(DATA, 'introdb.json', { entries: {} }), userAgent: `CineLocal-Server/${VERSION}` });

// ---------- utilidades HTTP ----------
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://image.tmdb.org; style-src 'self' 'unsafe-inline'; script-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};

function json(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  // la biblioteca con miles de títulos: comprimida ocupa unas 6 veces menos
  if (body.length > 16384 && /gzip/.test(res.req?.headers['accept-encoding'] || '')) {
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    return res.end(zlib.gzipSync(body, { level: 6 }));
  }
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(httpError(413, 'Petición demasiado grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(httpError(400, 'JSON no válido')); }
    });
    req.on('error', reject);
  });
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Sesión del navegador (cookie) o de una app (Authorization: Bearer) */
function sessionToken(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  return m ? m[1] : cookies(req).cl_session;
}

const isHttps = req => req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
const clientIp = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';

function sessionCookie(req, token, maxAge) {
  return `cl_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}

/** Archivo estático, sin salir nunca de su carpeta */
function sendStatic(res, dir, rel) {
  const file = path.resolve(dir, '.' + path.posix.normalize('/' + rel));
  if (!file.startsWith(path.resolve(dir) + path.sep)) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

/** index.html de la app de escritorio, con el puente window.api y el reproductor web en vez de Electron */
function indexHtml() {
  return fs.readFileSync(path.join(RENDERER, 'index.html'), 'utf8')
    .replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?>/, '')
    .replace('<link rel="stylesheet" href="styles.css">', '<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="web/web.css"><link rel="icon" href="web/icon.svg">')
    .replace('<script src="app.js"></script>', '<script src="web/api.js"></script><script src="web/player.js"></script><script src="app.js"></script>');
}

// ---------- eventos en vivo (Server-Sent Events) ----------
const clients = new Set();   // { res, user }
function broadcast(event, dataFor) {
  for (const c of clients) {
    const data = typeof dataFor === 'function' ? dataFor(c.user) : dataFor;
    c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
let libTimer = null;
library.on('library', () => {
  // varias actualizaciones seguidas (metadatos) se juntan en una
  clearTimeout(libTimer);
  libTimer = setTimeout(() => {
    // sólo el aviso: cada cliente vuelve a pedir la biblioteca (comprimida) en vez de recibirla entera por aquí
    broadcast('library:changed', {});
    requests.matchLibrary(library.withMeta());
  }, 250);
});

// peticiones: cada uno recibe las suyas (los administradores, todas) y los avisos que le tocan
const requestsView = user => ({ items: requests.list(user, auth.isAdmin(user)), pending: auth.isAdmin(user) ? requests.pendingCount() : 0 });
const sendTo = (pick, event, dataFor) => {
  for (const c of clients) if (pick(c.user)) c.res.write(`event: ${event}\ndata: ${JSON.stringify(dataFor(c.user))}\n\n`);
};
requests.on('changed', () => broadcast('requests:updated', requestsView));
requests.on('created', ({ request, by }) => sendTo(
  u => auth.isAdmin(u) && u.toLowerCase() !== by.toLowerCase(), 'toast',
  () => ({ type: 'request', text: `${by} ha pedido «${request.title}»${request.year ? ` (${request.year})` : ''}`, action: 'requests' })
));
requests.on('resolved', r => {
  const names = new Set(r.users.map(u => u.name));
  const text = r.status === 'done' ? `Ya está en la biblioteca: «${r.title}», que pediste` : `Tu petición de «${r.title}» se ha rechazado${r.reply ? ': ' + r.reply : ''}`;
  sendTo(u => names.has(u.toLowerCase()), 'toast', () => ({ type: r.status === 'done' ? 'ok' : 'info', text }));
});
library.on('meta:progress', p => broadcast('meta:progress', p));
library.on('toast', t => broadcast('toast', t));
library.on('new', l => broadcast('library:new', l));
setInterval(() => { for (const c of clients) c.res.write(': ping\n\n'); }, 25000).unref();

// ---------- rutas ----------
const routes = [];
const route = (method, pattern, handler, opts = {}) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler, ...opts });

route('POST', '/api/login', async (req, res) => {
  const b = await readBody(req, 8192);
  const r = await auth.login({ user: b.user, password: b.password, otp: b.otp }, clientIp(req));
  // pedir el código de verificación no es un fallo
  if (r.ok || !r.otp || b.otp) act(req, r.ok ? r.user : String(b.user || '').slice(0, 64), r.ok ? 'login' : 'login-failed', null, r.ok ? null : r.error);
  if (!r.ok) return json(res, r.status || (r.otp ? 401 : 403), { ok: false, error: r.error, otp: !!r.otp });
  // las apps (escritorio, Android) guardan el token y lo envían como «Authorization: Bearer»; el navegador, en la cookie
  if (b.client === 'app') return json(res, 200, { ok: true, user: r.user, token: r.token, admin: auth.isAdmin(r.user), role: auth.role(r.user) });
  res.setHeader('Set-Cookie', sessionCookie(req, r.token, 30 * 86400));
  json(res, 200, { ok: true, user: r.user });
}, { public: true });

route('POST', '/api/logout', (req, res, { user }) => {
  if (user) act(req, user, 'logout');
  auth.logout(sessionToken(req));
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
  json(res, 200, { ok: true });
}, { public: true });

route('GET', '/api/me', (req, res, { user }) => json(res, 200, {
  user, role: auth.role(user), admin: auth.isAdmin(user), version: VERSION, hwaccel: media.HWACCEL,
  groups: auth.groupsActive() ? { admin: auth.adminGroup, user: auth.userGroup } : null
}));

route('GET', '/api/settings', (req, res, { user }) => json(res, 200, library.publicSettings(auth.isAdmin(user), user)));
// cada usuario cambia sus preferencias (idiomas, plataformas…); la biblioteca y TMDB, sólo un administrador
route('POST', '/api/settings', async (req, res, { user }) => {
  const patch = await readBody(req);
  if (patch.tmdbKey === '••••••••') delete patch.tmdbKey;
  const keys = Object.keys(patch);
  if (keys.length) act(req, user, 'settings', null, keys.join(', '));
  library.setPrefs(user, patch);
  if (auth.isAdmin(user)) await library.setSettings(patch);
  json(res, 200, library.publicSettings(auth.isAdmin(user), user));
});
route('POST', '/api/tmdb/test', async (req, res) => {
  const { key } = await readBody(req);
  try { await new (require('../src/main/metadata').TMDB)(key, 'es-ES').test(); json(res, 200, { ok: true }); }
  catch (e) { json(res, 200, { ok: false, error: e.message }); }
}, { admin: true });

route('GET', '/api/library', (req, res, { user, q }) => {
  const v = library.view(user, { slim: q.get('slim') === '1' });
  if (q.get('client') === 'app') withLinks(v, user);
  json(res, 200, v);
});
// ficha completa de un título (la lista ligera sólo lleva lo necesario para las carátulas)
route('GET', '/api/item/:id', (req, res, { p }) => {
  const it = library.item(p.id);
  if (!it) throw httpError(404, 'Elemento no encontrado');
  json(res, 200, it);
});

/**
 * Android (LibVLC) no puede enviar la sesión al pedir el vídeo: cada película y episodio lleva su enlace firmado
 * (7 días, sólo para ese archivo) y los de sus subtítulos externos. La app vuelve a pedir la biblioteca al abrirse.
 */
function withLinks(v, user) {
  const subsCache = new Map();
  const link = (id, filePath) => {
    const sig = auth.sign(id, user, 24 * 7);
    const f = { path: filePath };
    const subs = media.sidecarSubs(f, subsCache).map((x, i) => ({ path: x.path, lang: x.lang || null, url: `/api/media/${id}/subs/x${i}?${sig}` }));
    return { url: `/api/media/${id}/file?${sig}`, subs };
  };
  v.items = v.items.map(it => it.type === 'movie'
    ? { ...it, ...link(it.id, it.path) }
    : { ...it, episodes: it.episodes.map(e => ({ ...e, ...link(e.id, e.path) })) });
}
route('POST', '/api/scan', async (req, res, { user }) => { act(req, user, 'scan'); await library.scan(); json(res, 200, library.view(user, { slim: true })); }, { admin: true });
route('POST', '/api/meta/refresh', (req, res, { user }) => { act(req, user, 'meta-refresh'); library.fetchMissingMetadata(true); json(res, 200, true); }, { admin: true });
route('GET', '/api/person/:id', async (req, res, { p }) => json(res, 200, await library.person(+p.id)));
route('GET', '/api/providers', async (req, res) => json(res, 200, await library.providerList()));
route('GET', '/api/providers/:id', async (req, res, { p }) => json(res, 200, await library.providers(+p.id)));
route('GET', '/api/title/:type/:id', async (req, res, { p }) => {
  if (!['movie', 'series'].includes(p.type) || !/^\d{1,9}$/.test(p.id)) throw httpError(400, 'Título no válido');
  try { json(res, 200, await library.title(p.type, +p.id)); }
  catch (e) { throw e.status ? e : httpError(/404|not be found/i.test(e.message) ? 404 : 502, e.message); }
});
route('POST', '/api/meta/search', async (req, res) => json(res, 200, await library.search(await readBody(req))));
route('POST', '/api/meta/identify', async (req, res, { user }) => {
  const b = await readBody(req);
  const it = library.library.data.items.find(i => i.id === b.itemId);
  act(req, user, 'identify', it && titleOf({ item: it }), `Ficha de TMDB ${b.tmdbId}`);
  json(res, 200, await library.identify(b, user));
}, { admin: true });

route('POST', '/api/play', async (req, res, { user }) => {
  const q = await readBody(req);
  const playlist = library.playlist(user, q);
  if (!playlist?.length) return json(res, 404, { ok: false, error: 'Elemento no encontrado' });
  if (!fs.existsSync(library.file(playlist[0].id)?.path || '')) return json(res, 404, { ok: false, error: 'No se encuentra el archivo de vídeo en el servidor' });
  library.setLastPlayed(user, q.itemId, q.episodeId);
  act(req, user, 'open', playlist[0].title, q.fromStart ? 'Desde el principio' : null);
  const s = library.publicSettings(false, user);
  // las apps reproducen con mpv / LibVLC: enlaces firmados al archivo tal cual y a los subtítulos externos
  if (q.client === 'app') {
    for (const e of playlist) {
      const f = library.file(e.id);
      const sig = auth.sign(e.id, user);
      e.url = `/api/media/${e.id}/file?${sig}`;
      e.subs = media.externalSubs(f, rootOf(f.path)).map((x, i) => ({ url: `/api/media/${e.id}/subs/x${i}?${sig}`, lang: x.lang || '', title: x.title }));
    }
  }
  json(res, 200, { ok: true, playlist, prefs: { audioLang: s.audioLang, subLang: s.subLang, subMode: s.subMode, autoplayNext: s.autoplayNext } });
});
route('POST', '/api/progress', async (req, res, { user }) => {
  const { id, pos, dur } = await readBody(req);
  const prog = library.reportProgress(user, id, +pos, +dur);
  if (prog) broadcastProgress(user, prog);
  json(res, 200, { ok: !!prog });
});
route('POST', '/api/progress/mark', async (req, res, { user }) => {
  const b = await readBody(req);
  const f = [...library.index.values()].find(x => x.path === b.paths?.[0]);
  act(req, user, b.watched ? 'watched' : 'unwatched', f && (b.paths.length > 1 ? titleOf({ item: f.item }) : titleOf(f)), b.paths?.length > 1 ? `${b.paths.length} archivos` : null);
  const prog = library.markProgress(user, b);
  broadcastProgress(user, prog);
  json(res, 200, prog);
});
route('POST', '/api/favorites/toggle', async (req, res, { user }) => {
  const { id } = await readBody(req);
  const favs = library.toggleFavorite(user, id);
  const it = library.library.data.items.find(i => i.id === id);
  act(req, user, favs.includes(id) ? 'fav-add' : 'fav-remove', it ? titleOf({ item: it }) : id);
  json(res, 200, favs);
});
route('POST', '/api/lists', async (req, res, { user }) => {
  const b = await readBody(req);
  const before = library.user(user).data.lists.find(l => l.id === b.id);
  try { json(res, 200, library.listOp(user, b)); }
  catch (e) { throw e.status ? e : httpError(400, e.message); }
  const after = library.user(user).data.lists.find(l => l.id === b.id);
  const what = b.op === 'toggle' ? (after?.items.some(x => x.key === b.entry?.key) ? 'list-add' : 'list-remove') : 'list-' + b.op;
  act(req, user, what, b.op === 'toggle' ? b.entry?.title : b.name || before?.name, b.op === 'toggle' || b.op === 'rename' ? `Lista «${b.op === 'rename' ? before?.name : after?.name}»` : null);
});
route('GET', '/api/requests', (req, res, { user }) => json(res, 200, requestsView(user)));
route('POST', '/api/requests', async (req, res, { user }) => {
  const b = await readBody(req, 16384);
  const admin = auth.isAdmin(user);
  const r = requests.items.find(x => x.id === String(b.id));
  act(req, user, 'request-' + b.op, b.op === 'create' ? b.entry?.title : r?.title, b.op === 'resolve' ? { done: 'Conseguida', rejected: 'Rechazada', pending: 'Pendiente' }[b.status] : b.entry?.note);
  if (b.op === 'create') requests.create(user, b.entry);
  else if (b.op === 'cancel') requests.cancel(user, String(b.id));
  else if (b.op === 'resolve' && admin) requests.resolve(user, String(b.id), b);
  else if (b.op === 'remove' && admin) requests.remove(String(b.id));
  else throw httpError(admin ? 400 : 403, admin ? 'Operación no válida' : 'Sólo un administrador puede hacer esto');
  json(res, 200, requestsView(user));
});

route('GET', '/api/segments', async (req, res, { q }) => {
  const skip = { type: q.get('type'), tmdbId: +q.get('tmdbId'), ...(q.get('season') && { season: +q.get('season'), episode: +q.get('episode') }) };
  const dur = +q.get('dur') || 0;
  const segs = skip.tmdbId ? await introDb.get(skip, { durationMs: dur * 1000 }).catch(() => null) : null;
  json(res, 200, segs ? flatten(segs, dur) : []);
});

route('GET', '/api/media/:id/info', async (req, res, { p }) => {
  const f = mediaFile(p.id);
  json(res, 200, await media.info(f, rootOf(f.path)));
});
route('GET', '/api/media/:id/file', (req, res, { p, q, user }) => {
  const f = mediaFile(p.id);
  logAccess(req, res, user, p.id, f, q.get('dl') === '1' ? 'download' : 'play');
  media.sendFile(req, res, f.path);
}, { signed: true });
route('GET', '/api/media/:id/stream', (req, res, { p, q, user }) => {
  const f = mediaFile(p.id);
  logAccess(req, res, user, p.id, f, q.get('mode') === 'transcode' ? 'transcode' : 'remux');
  return media.sendStream(req, res, f, q);
});
route('GET', '/api/media/:id/subs/:key', (req, res, { p }) => {
  const f = mediaFile(p.id);
  if (!/^[ix]\d{1,3}$/.test(p.key)) throw httpError(400, 'Subtítulo no válido');
  return media.sendSubs(res, f, p.key, rootOf(f.path), path.join(DATA, 'cache', 'subs'));
}, { signed: true });

route('GET', '/api/access', (req, res, { q }) => json(res, 200, access.list({ days: +q.get('days') || 7, user: q.get('user') || '', q: q.get('q') || '', type: q.get('type') || '' })), { admin: true });
// errores de la interfaz (web, escritorio): se apuntan para poder ver qué le pasó a cada uno
const clientErrors = new Map();   // usuario → { n, from }
route('POST', '/api/log', async (req, res, { user }) => {
  const b = await readBody(req, 16384);
  const now = Date.now();
  const c = clientErrors.get(user);
  const n = c && now - c.from < 60000 ? c.n + 1 : 1;
  clientErrors.set(user, n === 1 ? { n, from: now } : { n, from: c.from });
  if (n <= 20) act(req, user, 'client-error', b.where, [b.message, b.stack].filter(Boolean).join('\n'));
  json(res, 200, { ok: true });
});

route('GET', '/api/events', (req, res, { user }) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': hola\n\n');
  const c = { res, user };
  clients.add(c);
  req.on('close', () => clients.delete(c));
});

function broadcastProgress(user, prog) {
  for (const c of clients) if (c.user === user) c.res.write(`event: progress:updated\ndata: ${JSON.stringify(prog)}\n\n`);
}

function mediaFile(id) {
  const f = library.file(id);
  if (!f || !fs.existsSync(f.path)) throw httpError(404, 'No se encuentra el archivo de vídeo');
  return f;
}
/** Título legible de una película, serie o episodio ({ item, episode? }) */
function titleOf(f) {
  const name = library.metadata.data[f.item.id]?.meta?.title || f.item.title;
  const e = f.episode;
  return e ? `${name} · T${e.season}:E${e.episode}` : name;
}
/** Apunta una acción en el registro de actividad */
function act(req, user, kind, title, detail) {
  access.event(kind, { user, ip: clientIp(req), client: clientOf(req), title, detail });
}
/** Apunta en el registro quién pide este vídeo y cuántos datos se le envían */
function logAccess(req, res, user, id, f, kind) {
  const add = access.touch({ user, ip: clientIp(req), client: clientOf(req), kind, id, title: titleOf(f), file: f.path });
  const write = res.write;
  res.write = function (chunk, ...rest) { if (chunk) add(chunk.length); return write.call(this, chunk, ...rest); };
}
function rootOf(p) {
  return library.roots().find(r => { const rel = path.relative(r, p); return rel && !rel.startsWith('..') && !path.isAbsolute(rel); }) || library.settings.data.libraryPath;
}

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  const url = new URL(req.url, 'http://x');
  const pathname = decodeURIComponent(url.pathname);
  let user = auth.check(sessionToken(req));
  try {
    if (pathname.startsWith('/api/')) {
      // Las peticiones que cambian algo llevan una cabecera propia: otra web no puede enviarla sin permiso (CORS),
      // y la cookie además es SameSite=Strict
      if (req.method !== 'GET' && req.headers['x-cinelocal'] !== '1') throw httpError(403, 'Petición no permitida');
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(pathname);
        if (!m) continue;
        if (!user && r.signed && m.groups?.id) user = auth.checkSigned(m.groups.id, url.searchParams);
        if (!r.public && !user) throw httpError(401, 'Inicia sesión');
        if (r.admin && !auth.isAdmin(user)) throw httpError(403, 'Sólo un administrador puede hacer esto');
        return await r.handler(req, res, { user, p: m.groups || {}, q: url.searchParams });
      }
      throw httpError(404, 'No existe');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw httpError(405, 'Método no permitido');
    if (pathname === '/login') return user ? redirect(res, '/') : sendStatic(res, WEB, 'login.html');
    if (pathname.startsWith('/web/')) return sendStatic(res, WEB, pathname.slice(5));
    if (!user) return redirect(res, '/login');
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(indexHtml());
    }
    return sendStatic(res, RENDERER, pathname.slice(1));
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(req.method, pathname, e);
    // fallos que ve alguien con sesión: los del servidor, los de acciones y los de vídeo
    if (user && status !== 401 && (status >= 500 || req.method !== 'GET' || pathname.startsWith('/api/media/'))) {
      act(req, user, 'error', `${req.method} ${pathname}`, `${status} · ${e.message}`);
    }
    if (!res.headersSent) json(res, status, { ok: false, error: e.message });
    else res.end();
  }
});

function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

server.listen(PORT, HOST, () => {
  console.log(`CineLocal Server ${VERSION} en http://${HOST}:${PORT} · datos en ${DATA} · biblioteca: ${library.roots().join(', ') || '(sin configurar)'}`);
  library.start();
});

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  access.closeIdle(true);
  for (const s of [library.settings, library.library, library.metadata, library.people, auth.store, requests.store]) s.flushSync();
  for (const u of library.users.values()) u.flushSync();
  process.exit(0);
});
