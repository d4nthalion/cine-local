// Persistencia sencilla en JSON (como store() de src/main/main.js, sin Electron)
const fs = require('fs');
const path = require('path');

function store(dir, name, fallback) {
  const file = path.join(dir, name);
  let data = structuredClone(fallback);
  try { data = { ...data, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  let timer = null;
  const write = () => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify(data));
      fs.renameSync(file + '.tmp', file);
    } catch (e) { console.error('No se pudo guardar', name, e.message); }
  };
  const save = () => { clearTimeout(timer); timer = setTimeout(write, 300); };
  return { get data() { return data; }, set data(v) { data = v; save(); }, save, flushSync() { clearTimeout(timer); write(); } };
}

module.exports = { store };
