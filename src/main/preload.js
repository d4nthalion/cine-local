const { contextBridge, ipcRenderer } = require('electron');

const on = (ch) => (cb) => {
  const fn = (_e, data) => cb(data);
  ipcRenderer.on(ch, fn);
  return () => ipcRenderer.removeListener(ch, fn);
};

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  testKey: (key) => ipcRenderer.invoke('tmdb:test', key),
  testNas: (q) => ipcRenderer.invoke('nas:test', q),
  nasLogin: (q) => ipcRenderer.invoke('nas:login', q),
  session: { get: () => ipcRenderer.invoke('session:get') },
  onSessionExpired: on('session:expired'),
  remote: {
    login: (q) => ipcRenderer.invoke('remote:login', q),
    logout: () => ipcRenderer.invoke('remote:logout'),
    me: () => ipcRenderer.invoke('remote:me')
  },
  getLibrary: () => ipcRenderer.invoke('library:get'),
  getItem: (id) => ipcRenderer.invoke('library:item', id),
  scan: () => ipcRenderer.invoke('library:scan'),
  refreshMeta: () => ipcRenderer.invoke('library:refreshMeta'),
  getPerson: (id) => ipcRenderer.invoke('meta:person', id),
  getProviders: (id) => ipcRenderer.invoke('meta:providers', id),
  getProviderList: () => ipcRenderer.invoke('meta:providerList'),
  searchMeta: (q) => ipcRenderer.invoke('meta:search', q),
  getTitle: (q) => ipcRenderer.invoke('meta:title', q),
  requests: { get: () => ipcRenderer.invoke('requests:get'), op: (q) => ipcRenderer.invoke('requests:op', q) },
  accessLog: (q) => ipcRenderer.invoke('access:list', q),
  logError: (e) => ipcRenderer.invoke('log:error', e),
  identify: (q) => ipcRenderer.invoke('meta:identify', q),
  getPosters: (id) => ipcRenderer.invoke('meta:posters', id),
  setPoster: (id, poster) => ipcRenderer.invoke('meta:setPoster', { id, poster }),
  play: (q) => ipcRenderer.invoke('play', q),
  markProgress: (q) => ipcRenderer.invoke('progress:mark', q),
  toggleFavorite: (id) => ipcRenderer.invoke('favorites:toggle', id),
  lists: { op: (q) => ipcRenderer.invoke('lists:op', q) },
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  setFullscreen: (v) => ipcRenderer.invoke('window:setFullscreen', v),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  pickMpv: () => ipcRenderer.invoke('dialog:pickMpv'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  showInFolder: (p) => ipcRenderer.invoke('shell:showItem', p),
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  emule: {
    get: () => ipcRenderer.invoke('emule:get'),
    info: () => ipcRenderer.invoke('emule:info'),
    test: (q) => ipcRenderer.invoke('emule:test', q),
    launch: () => ipcRenderer.invoke('emule:launch'),
    refresh: () => ipcRenderer.invoke('emule:refresh'),
    connect: () => ipcRenderer.invoke('emule:connect'),
    servers: () => ipcRenderer.invoke('emule:servers'),
    connectServer: (ip, port) => ipcRenderer.invoke('emule:connectServer', { ip, port }),
    disconnect: () => ipcRenderer.invoke('emule:disconnect'),
    kad: (op, ip, port) => ipcRenderer.invoke('emule:kad', { op, ip, port }),
    updateServerMet: (url) => ipcRenderer.invoke('emule:updateServerMet', url),
    search: (q) => ipcRenderer.invoke('emule:search', q),
    results: () => ipcRenderer.invoke('emule:results'),
    download: (hash) => ipcRenderer.invoke('emule:download', hash),
    addLink: (link) => ipcRenderer.invoke('emule:addLink', link),
    op: (hash, op) => ipcRenderer.invoke('emule:op', { hash, op }),
    pickExe: () => ipcRenderer.invoke('dialog:pickEmule'),
    onUpdate: on('emule:update')
  },
  letterboxd: {
    get: () => ipcRenderer.invoke('letterboxd:get'),
    sync: (full = true) => ipcRenderer.invoke('letterboxd:sync', full),
    importZip: () => ipcRenderer.invoke('letterboxd:import'),
    clear: () => ipcRenderer.invoke('letterboxd:clear'),
    onUpdate: on('letterboxd:update'),
    onStatus: on('letterboxd:status')
  },
  discord: {
    status: () => ipcRenderer.invoke('discord:status'),
    test: (clientId) => ipcRenderer.invoke('discord:test', clientId),
    onStatus: on('discord:status')
  },
  update: {
    status: () => ipcRenderer.invoke('update:status'),
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    openRelease: () => ipcRenderer.invoke('update:open'),
    onStatus: on('update:status')
  },
  onLibrary: on('library:updated'),
  onMetaProgress: on('meta:progress'),
  onProgress: on('progress:updated'),
  onPlayerClosed: on('player:closed'),
  onFullscreen: on('window:fullscreen'),
  onToast: on('toast'),
  onNewItems: on('library:new'),
  onRequests: on('requests:updated'),
  onOpenItem: on('open-item')
});
