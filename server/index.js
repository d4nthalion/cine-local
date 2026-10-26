// CineLocal Server: la interfaz de CineLocal como servicio web del NAS, alternativa a Video Station / DS Video.
// Se entra con los usuarios de DSM; cada usuario tiene su propio progreso y su lista.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Library } = require('./library');
const { Auth } = require('./auth');
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
  // sólo para desarrollo: sin DSM, todo el mundo entra como este usuario
  devUser: env.CINELOCAL_AUTH === 'none' ? (env.CINELOCAL_DEV_USER || 'dev') : null
});
if (auth.devUser) console.warn(`¡Atención! CINELOCAL_AUTH=none: no se pide contraseña (usuario «${auth.devUser}»). Sólo para desarrollo.`);
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
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
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
  libTimer = setTimeout(() => broadcast('library:updated', user => library.view(user)), 250);
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
  if (!r.ok) return json(res, r.status || (r.otp ? 401 : 403), { ok: false, error: r.error, otp: !!r.otp });
  // las apps (escritorio, Android) guardan el token y lo envían como «Authorization: Bearer»; el navegador, en la cookie
  if (b.client === 'app') return json(res, 200, { ok: true, user: r.user, token: r.token, admin: auth.isAdmin(r.user) });
  res.setHeader('Set-Cookie', sessionCookie(req, r.token, 30 * 86400));
  json(res, 200, { ok: true, user: r.user });
}, { public: true });

route('POST', '/api/logout', (req, res) => {
  auth.logout(sessionToken(req));
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
  json(res, 200, { ok: true });
}, { public: true });

route('GET', '/api/me', (req, res, { user }) => json(res, 200, { user, admin: auth.isAdmin(user), version: VERSION, hwaccel: media.HWACCEL }));

route('GET', '/api/settings', (req, res, { user }) => json(res, 200, library.publicSettings(auth.isAdmin(user))));
route('POST', '/api/settings', async (req, res, { user }) => {
  const patch = await readBody(req);
  if (patch.tmdbKey === '••••••••') delete patch.tmdbKey;
  await library.setSettings(patch);
  json(res, 200, library.publicSettings(auth.isAdmin(user)));
}, { admin: true });
route('POST', '/api/tmdb/test', async (req, res) => {
  const { key } = await readBody(req);
  try { await new (require('../src/main/metadata').TMDB)(key, 'es-ES').test(); json(res, 200, { ok: true }); }
  catch (e) { json(res, 200, { ok: false, error: e.message }); }
}, { admin: true });

route('GET', '/api/library', (req, res, { user, q }) => {
  const v = library.view(user);
  if (q.get('client') === 'app') withLinks(v, user);
  json(res, 200, v);
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
route('POST', '/api/scan', async (req, res, { user }) => { await library.scan(); json(res, 200, library.view(user)); });
route('POST', '/api/meta/refresh', (req, res) => { library.fetchMissingMetadata(true); json(res, 200, true); }, { admin: true });
route('GET', '/api/person/:id', async (req, res, { p }) => json(res, 200, await library.person(+p.id)));
route('GET', '/api/providers', async (req, res) => json(res, 200, await library.providerList()));
route('GET', '/api/providers/:id', async (req, res, { p }) => json(res, 200, await library.providers(+p.id)));
route('POST', '/api/meta/search', async (req, res) => json(res, 200, await library.search(await readBody(req))));
route('POST', '/api/meta/identify', async (req, res, { user }) => json(res, 200, await library.identify(await readBody(req), user)), { admin: true });

route('POST', '/api/play', async (req, res, { user }) => {
  const q = await readBody(req);
  const playlist = library.playlist(user, q);
  if (!playlist?.length) return json(res, 404, { ok: false, error: 'Elemento no encontrado' });
  if (!fs.existsSync(library.file(playlist[0].id)?.path || '')) return json(res, 404, { ok: false, error: 'No se encuentra el archivo de vídeo en el servidor' });
  library.setLastPlayed(user, q.itemId, q.episodeId);
  const s = library.settings.data;
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
  const prog = library.markProgress(user, await readBody(req));
  broadcastProgress(user, prog);
  json(res, 200, prog);
});
route('POST', '/api/favorites/toggle', async (req, res, { user }) => json(res, 200, library.toggleFavorite(user, (await readBody(req)).id)));
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
route('GET', '/api/media/:id/file', (req, res, { p }) => media.sendFile(req, res, mediaFile(p.id).path), { signed: true });
route('GET', '/api/media/:id/stream', (req, res, { p, q }) => media.sendStream(req, res, mediaFile(p.id), q));
route('GET', '/api/media/:id/subs/:key', (req, res, { p }) => {
  const f = mediaFile(p.id);
  if (!/^[ix]\d{1,3}$/.test(p.key)) throw httpError(400, 'Subtítulo no válido');
  return media.sendSubs(res, f, p.key, rootOf(f.path), path.join(DATA, 'cache', 'subs'));
}, { signed: true });

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
  for (const s of [library.settings, library.library, library.metadata, library.people, auth.store]) s.flushSync();
  for (const u of library.users.values()) u.flushSync();
  process.exit(0);
});
