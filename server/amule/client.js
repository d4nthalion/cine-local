// Cliente del API REST de aMule (amuleapi, /api/v1, aMule 3.1 o posterior). Devuelve los datos con la misma forma que
// usaba la integración con eMule, para que la interfaz (Descargas, servidores, Kad) no tenga que cambiar.
const err = (msg, code) => Object.assign(new Error(msg), { code });
const HASH = /^[0-9a-f]{32}$/i;
const HOST = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** status de amuleapi → estado de la interfaz (DL_STATES en app.js) */
const STATES = {
  downloading: 'downloading', waiting: 'waiting', hashing: 'hashing', allocating: 'waiting', paused: 'paused',
  stopped: 'stopped', completing: 'completing', completed: 'complete', erroneous: 'error', insufficient_disk: 'error'
};

function toDownload(d) {
  const size = d.size_bytes || 0;
  let state = STATES[d.status] || 'waiting';
  // descargando, pero sin nadie que lo tenga: así lo enseñaba eMule
  if (state === 'downloading' && !d.sources?.total) state = 'stalled';
  return {
    hash: String(d.hash || '').toLowerCase(),
    name: d.name || '',
    size,
    done: state === 'complete' ? size : d.completed_bytes || 0,
    progress: state === 'complete' ? 1 : Math.max(0, Math.min(1, (d.progress?.percent || 0) / 100)),
    speed: d.speed_bytes_per_second || 0,
    sources: d.sources?.transferring || 0,
    sourcesTotal: d.sources?.total || 0,
    state,
    priority: d.priority_auto ? 'auto' : d.priority || 'normal',
    link: d.ed2k_link || null
  };
}

function toResult(r) {
  return {
    hash: String(r.hash || '').toLowerCase(),
    name: r.name || '',
    size: r.size_bytes || 0,
    sources: r.sources?.total || 0,
    complete: r.sources?.complete || 0,
    type: r.file_type || ''
  };
}

/** ed2k: high (ID alta) / low (ID baja) / connecting / off · kad: ok / firewalled / connecting / off */
function toStatus(s) {
  const ed = s.ed2k || {}, kad = s.kad || {};
  return {
    server: ed.state === 'connected' ? (ed.high_id ? 'high' : 'low') : ed.state === 'connecting' ? 'connecting' : 'off',
    serverName: ed.state === 'connected' ? ed.server_name || '' : '',
    serverAddr: ed.state === 'connected' ? `${ed.server_ip}:${ed.server_port}` : '',
    kad: kad.state === 'connected' ? (kad.firewalled_tcp ? 'firewalled' : 'ok') : kad.state === 'connecting' ? 'connecting' : 'off',
    kadContacts: kad.network?.node_count || 0,
    down: s.speeds?.download_speed_bytes_per_second || 0,
    up: s.speeds?.upload_speed_bytes_per_second || 0,
    freeBytes: s.disk?.incoming_free_bytes ?? null
  };
}

function toServer(s, status) {
  const connected = !!status && status.serverAddr === `${s.ip}:${s.port}`;
  return {
    name: s.name || s.address,
    ip: s.ip,
    port: s.port,
    description: s.description || '',
    ping: s.ping_ms || 0,
    users: s.user_count || 0,
    maxUsers: s.max_user_count || 0,
    files: s.file_count || 0,
    failed: s.failed_count || 0,
    priority: s.priority || 'normal',
    static: !!s.permanent,
    state: connected ? status.server : 'disconnected',
    connected,
    version: s.software_version || ''
  };
}

function checkAddr(ip, port) {
  ip = String(ip || '').trim();
  port = +port;
  if (!HOST.test(ip)) throw err('Dirección no válida: escribe la IP (p. ej. 1.2.3.4)');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw err('Puerto no válido');
  return { ip, port };
}

class AmuleClient {
  /** url: dirección de amuleapi (http://127.0.0.1:4711) · fetch: para las pruebas */
  constructor({ url, password, fetch = globalThis.fetch }) {
    this.url = String(url || '').replace(/\/+$/, '');
    this.password = password || '';
    this.fetch = fetch;
    this.token = null;
  }

  /** Las peticiones en paralelo (estado y descargas) comparten un solo inicio de sesión */
  login() {
    if (!this.url || !this.password) return Promise.reject(err('Falta configurar aMule (AMULE_URL y AMULE_PASSWORD)', 'unconfigured'));
    this.token = null;
    this.logging ||= this.raw('POST', '/auth/login?include_token=true', { password: this.password }, false)
      .then(r => { this.token = r.token; })
      .finally(() => { this.logging = null; });
    return this.logging;
  }

  async raw(method, path, body, auth = true, timeout = 10000) {
    let res;
    try {
      res = await this.fetch(this.url + '/api/v1' + path, {
        method,
        headers: { ...(auth && { Authorization: 'Bearer ' + this.token }), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout)
      });
    } catch {
      throw err('aMule no responde', 'offline');
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.ok) return data;
    const code = data?.error?.code;
    const msg = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401) throw err(path.startsWith('/auth/') ? 'aMule ha rechazado la contraseña' : msg, 'auth');
    if (res.status === 429) throw err('aMule ha bloqueado los intentos un rato (demasiados fallos)', 'auth');
    if (code === 'ec_unavailable') throw err('aMule está arrancando o su núcleo no responde', 'offline');
    throw err(msg, code || 'error');
  }

  /**
   * Petición con sesión. El token dura 24 h y se pierde si amuleapi se reinicia: un 401 vuelve a entrar una vez
   * (nunca se repite un 401 en bucle: amuleapi bloquearía la IP)
   */
  async call(method, path, body, timeout) {
    if (this.logging) await this.logging;
    if (!this.token) await this.login();
    const used = this.token;
    try {
      return await this.raw(method, path, body, true, timeout);
    } catch (e) {
      if (e.code !== 'auth' || path.startsWith('/auth/')) throw e;
      // otra petición ya ha vuelto a entrar: basta con repetir con el token nuevo
      if (this.logging) await this.logging;
      else if (this.token === used) await this.login();
      return this.raw(method, path, body, true, timeout);
    }
  }

  async transfers() {
    const [st, dl] = await Promise.all([this.call('GET', '/status'), this.call('GET', '/downloads?status=all')]);
    if (st && st.ec_connected === false) throw err('aMule está arrancando o su núcleo no responde', 'offline');
    return { status: toStatus(st), downloads: (dl?.downloads || []).map(toDownload).filter(d => d.hash) };
  }

  /** op: pause | resume | stop | cancel | priolow | prionormal | priohigh | prioauto | clear */
  async fileOp(hash, op) {
    if (!HASH.test(hash)) throw err('Descarga no válida');
    if (op === 'clear') return this.call('POST', '/downloads_clear_completed', { hash });
    if (op === 'cancel') return this.call('DELETE', '/downloads/' + hash);
    if (/^(pause|resume|stop)$/.test(op)) return this.call('PATCH', '/downloads/' + hash, { action: op });
    const prio = /^prio(low|normal|high|auto)$/.exec(op);
    if (prio) return this.call('PATCH', '/downloads/' + hash, { priority: prio[1] });
    throw err('Operación no válida');
  }

  async addLink(link) {
    link = String(link || '').trim();
    if (!/^ed2k:\/\/\|file\|[^|]+\|\d+\|[0-9a-f]{32}\|/i.test(link)) throw err('Eso no parece un enlace ed2k de archivo');
    const r = await this.call('POST', '/downloads', { links: [link] });
    const bad = r?.results?.find(x => !x.ok);
    if (bad) throw err(bad.error?.message || 'aMule no ha aceptado el enlace');
  }

  connect() { return this.call('POST', '/networks/connect', { network: 'both' }); }

  // ---- servidores y Kad

  async servers() {
    const [st, list] = await Promise.all([this.call('GET', '/status'), this.call('GET', '/servers')]);
    const status = toStatus(st);
    return {
      status,
      outdated: false,
      servers: (list?.servers || []).map(s => toServer(s, status)),
      kad: { contacts: status.kadContacts, searches: 0, canBootstrap: true },
      message: ''
    };
  }

  /** Sin dirección: el primer servidor disponible. Con ella, uno de la lista */
  async connectServer(ip, port) {
    if (!ip) await this.call('POST', '/networks/connect', { network: 'ed2k' });
    else {
      const a = checkAddr(ip, port);
      await this.call('POST', `/servers/by-address/${a.ip}:${a.port}/connect`);
    }
    return this.servers();
  }

  async disconnectServer() {
    await this.call('POST', '/networks/disconnect', { network: 'ed2k' });
    return this.servers();
  }

  /** op: connect | disconnect | bootstrap (con la ip y el puerto UDP de un nodo) */
  async kad(op, ip, port) {
    if (op === 'connect' || op === 'disconnect') await this.call('POST', '/networks/' + op, { network: 'kad' });
    else if (op === 'bootstrap') await this.call('POST', '/kad/bootstrap', checkAddr(ip, port));
    else throw err('Operación de Kad no válida');
    const r = await this.servers();
    return { status: r.status, kad: r.kad };
  }

  /** Añade los servidores de un server.met remoto (aMule lo descarga en segundo plano) */
  async updateServerMet(url) {
    url = String(url || '').trim();
    if (!/^https?:\/\/[^\s"'<>]+$/i.test(url)) throw err('Escribe la dirección completa de un server.met (http://…)');
    await this.call('POST', '/servers_update', { url });
    const r = await this.servers();
    return { ...r, message: 'aMule está descargando la lista; los servidores aparecerán en unos segundos.' };
  }

  // ---- búsqueda: cada usuario lleva la suya (searchId); la anterior se libera al empezar otra

  /** method: global (servidores) | kademlia · min/max en MB · prev: la búsqueda anterior de quien busca */
  async search({ query, method = 'global', min, max }, prev) {
    query = String(query || '').trim();
    if (!query) throw err('Escribe qué buscar');
    if (prev) this.call('DELETE', '/search/' + prev).catch(() => {});
    const body = { query, type: method === 'kademlia' ? 'kad' : 'global', file_type: 'video' };
    if (min) body.min_size_bytes = Math.round(min * 1048576);
    if (max) body.max_size_bytes = Math.round(max * 1048576);
    const s = await this.call('POST', '/search', body);
    return { searchId: s.search_id, ...await this.searchResults(s.search_id) };
  }

  /** done: aMule ha terminado de buscar (la interfaz deja de preguntar) */
  async searchResults(id) {
    if (!id) return { message: '', results: [], done: true };
    let r;
    try { r = await this.call('GET', `/search/${+id}/results`); }
    catch (e) {
      if (e.code !== 'not_found') throw e;
      return { message: 'La búsqueda ha caducado: vuelve a buscar', results: [], done: true, expired: true };
    }
    return { message: '', results: (r.results || []).map(toResult).filter(x => x.hash), done: r.progress?.state !== 'running' };
  }

  download(hash) {
    if (!HASH.test(hash)) throw err('Resultado no válido');
    return this.call('POST', `/search/results/${hash}/download`, {});
  }
}

module.exports = { AmuleClient, toDownload, toResult, toStatus, toServer };
