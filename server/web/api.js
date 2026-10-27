// Puente window.api para la versión web: lo mismo que src/main/preload.js, pero hablando con CineLocal Server
// por HTTP en vez de con el proceso principal de Electron. app.js no nota la diferencia.
(function () {
  const listeners = {};
  const on = ev => cb => {
    (listeners[ev] ||= new Set()).add(cb);
    return () => listeners[ev].delete(cb);
  };
  const emit = (ev, data) => { for (const cb of listeners[ev] || []) try { cb(data); } catch (e) { console.error(e); } };

  async function call(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-CineLocal': '1' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {})
    });
    if (res.status === 401) { location.href = '/login'; throw new Error('Sesión caducada'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
    return data;
  }
  const get = url => call('GET', url);
  const post = (url, body) => call('POST', url, body);

  // eventos en vivo del servidor (biblioteca, metadatos, progreso desde otro dispositivo…)
  function connect() {
    const es = new EventSource('/api/events');
    for (const ev of ['library:updated', 'meta:progress', 'progress:updated', 'toast', 'library:new', 'requests:updated']) {
      es.addEventListener(ev, e => emit(ev, JSON.parse(e.data)));
    }
    es.onerror = () => { es.close(); setTimeout(connect, 5000); };
  }
  connect();

  document.addEventListener('fullscreenchange', () => emit('window:fullscreen', !!document.fullscreenElement));
  const setFs = async v => {
    try { v ? await document.documentElement.requestFullscreen() : document.fullscreenElement && await document.exitFullscreen(); } catch {}
    return !!document.fullscreenElement;
  };

  const disabled = { ok: false, error: null, code: 'disabled', status: null, downloads: [] };
  const noop = () => () => {};

  window.api = {
    platform: 'web',
    getSettings: () => get('/api/settings'),
    setSettings: patch => post('/api/settings', patch),
    testKey: key => post('/api/tmdb/test', { key }),
    testNas: async () => ({ ok: false, error: 'No disponible en la web' }),
    getLibrary: () => get('/api/library'),
    scan: () => post('/api/scan'),
    refreshMeta: () => post('/api/meta/refresh'),
    getPerson: id => get('/api/person/' + encodeURIComponent(id)),
    getProviders: id => get('/api/providers/' + encodeURIComponent(id)),
    getProviderList: () => get('/api/providers'),
    searchMeta: q => post('/api/meta/search', q),
    getTitle: q => get('/api/title/' + (q.type === 'series' ? 'series' : 'movie') + '/' + encodeURIComponent(q.id)),
    identify: q => post('/api/meta/identify', q),
    // en la web se reproduce en el navegador (web/player.js) en vez de con mpv
    play: async q => {
      const r = await post('/api/play', q);
      if (r.ok) window.webPlayer.open(r.playlist, r.prefs, () => emit('player:closed', {}));
      return { ok: r.ok, error: r.error, web: true };
    },
    markProgress: q => post('/api/progress/mark', q),
    toggleFavorite: id => post('/api/favorites/toggle', { id }),
    lists: { op: q => post('/api/lists', q) },
    requests: { get: () => get('/api/requests'), op: q => post('/api/requests', q) },
    toggleFullscreen: () => setFs(!document.fullscreenElement),
    setFullscreen: v => setFs(!!v),
    isFullscreen: async () => !!document.fullscreenElement,
    pickFolder: async () => null,
    pickMpv: async () => null,
    openExternal: async url => { if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer'); },
    showInFolder: async () => {},
    copy: text => navigator.clipboard.writeText(String(text)),
    me: () => get('/api/me'),
    logout: async () => { await post('/api/logout'); location.href = '/login'; },
    reportProgress: (id, pos, dur) => post('/api/progress', { id, pos, dur }).catch(() => {}),
    emule: {
      get: async () => disabled, info: async () => ({}), test: async () => ({ ok: false }), launch: async () => ({ ok: false }),
      refresh: async () => disabled, connect: async () => true, servers: async () => [], connectServer: async () => null,
      disconnect: async () => null, kad: async () => ({}), updateServerMet: async () => null, search: async () => null,
      results: async () => [], download: async () => true, addLink: async () => true, op: async () => true, pickExe: async () => null,
      onUpdate: noop()
    },
    letterboxd: {
      get: async () => ({ user: '', films: [], status: {} }), sync: async () => ({ ok: false }), importZip: async () => ({ ok: false, canceled: true }),
      clear: async () => ({ user: '', films: [], status: {} }), onUpdate: noop(), onStatus: noop()
    },
    discord: { status: async () => ({}), test: async () => ({ ok: false }), onStatus: noop() },
    update: { status: async () => ({ state: 'disabled' }), check: async () => ({ state: 'disabled' }), install: async () => {}, openRelease: async () => {}, onStatus: noop() },
    onLibrary: on('library:updated'),
    onMetaProgress: on('meta:progress'),
    onProgress: on('progress:updated'),
    onPlayerClosed: on('player:closed'),
    onFullscreen: on('window:fullscreen'),
    onToast: on('toast'),
    onNewItems: on('library:new'),
    onRequests: on('requests:updated'),
    onOpenItem: on('open-item')
  };
})();
