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
    for (const ev of ['meta:progress', 'progress:updated', 'toast', 'library:new', 'requests:updated', 'letterboxd:update', 'letterboxd:status']) {
      es.addEventListener(ev, e => emit(ev, JSON.parse(e.data)));
    }
    es.addEventListener('library:changed', reloadLibrary);
    es.onerror = () => { es.close(); setTimeout(connect, 5000); };
  }
  // la biblioteca ha cambiado en el servidor: se vuelve a pedir (varios avisos seguidos, una sola vez)
  let libTimer = null;
  function reloadLibrary() {
    clearTimeout(libTimer);
    libTimer = setTimeout(() => get('/api/library?slim=1').then(v => emit('library:updated', v)).catch(() => {}), 300);
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
    getLibrary: () => get('/api/library?slim=1'),
    getItem: id => get('/api/item/' + encodeURIComponent(id)),
    scan: () => post('/api/scan'),
    refreshMeta: () => post('/api/meta/refresh'),
    getPerson: id => get('/api/person/' + encodeURIComponent(id)),
    searchMeta: q => post('/api/meta/search', q),
    getTitle: q => get('/api/title/' + (q.type === 'series' ? 'series' : 'movie') + '/' + encodeURIComponent(q.id)),
    identify: q => post('/api/meta/identify', q),
    getPosters: id => get(`/api/item/${encodeURIComponent(id)}/posters`),
    setPoster: (id, poster) => post(`/api/item/${encodeURIComponent(id)}/poster`, { poster }),
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
    notifications: { get: () => get('/api/notifications'), seen: () => post('/api/notifications/seen', {}) },
    accessLog: q => get('/api/access?' + new URLSearchParams(q)),
    logError: e => post('/api/log', e),
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
    // Letterboxd guardado en el servidor (server/letterboxd.js): lo sube la app de escritorio o la exportación ZIP de aquí
    letterboxd: {
      get: () => get('/api/letterboxd'),
      sync: async () => ({ ok: false, error: 'Desde la web no se puede leer letterboxd.com: sincroniza en la app de escritorio o sube la exportación .zip' }),
      importZip: () => new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip,application/zip';
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return resolve({ ok: false, canceled: true });
          const res = await fetch('/api/letterboxd/import', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/zip', 'X-CineLocal': '1' }, body: file }).catch(() => null);
          const data = await res?.json().catch(() => null);
          resolve(res?.ok ? { ok: true, started: true } : { ok: false, error: data?.error || 'No se pudo subir el archivo' });
        };
        input.addEventListener('cancel', () => resolve({ ok: false, canceled: true }));
        input.click();
      }),
      clear: () => post('/api/letterboxd/clear'),
      onUpdate: on('letterboxd:update'), onStatus: on('letterboxd:status')
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
