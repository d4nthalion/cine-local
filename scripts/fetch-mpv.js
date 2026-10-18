// Descarga mpv para Windows (compilación de shinchiro, la misma que instala winget) en mpv/,
// que electron-builder incluye en el instalador como resources\mpv.
// Si ya está descargado no hace nada; con --update baja la última versión.
// Se usa la variante x86_64 genérica: la x86_64-v3 necesita AVX2 y no arranca en CPUs antiguas.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { path7za } = require('7zip-bin');

const REPO = 'shinchiro/mpv-winbuild-cmake';
const ASSET = /^mpv-x86_64-\d{8}-git-[0-9a-f]+\.7z$/;
const KEEP = ['mpv.exe', 'd3dcompiler_43.dll', 'mpv/fonts.conf'];
const DIR = path.join(__dirname, '..', 'mpv');
const VERSION = path.join(DIR, 'VERSION');

async function main() {
  const update = process.argv.includes('--update');
  if (!update && fs.existsSync(path.join(DIR, 'mpv.exe'))) {
    const v = fs.existsSync(VERSION) ? fs.readFileSync(VERSION, 'utf8').split(/\r?\n/)[0] : 'desconocida';
    console.log(`mpv ya está en mpv/ (${v}). Para actualizarlo: npm run fetch-mpv -- --update`);
    return;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'User-Agent': 'cinelocal-build' } });
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} al pedir la última versión de mpv`);
  const release = await res.json();
  const asset = release.assets.find(a => ASSET.test(a.name));
  if (!asset) throw new Error(`No hay ningún mpv-x86_64 en la versión ${release.tag_name}`);

  console.log(`Descargando ${asset.name} (${(asset.size / 1048576).toFixed(0)} MB)…`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinelocal-mpv-'));
  try {
    const archive = path.join(tmp, asset.name);
    const dl = await fetch(asset.browser_download_url);
    if (!dl.ok) throw new Error(`Descarga fallida: ${dl.status}`);
    fs.writeFileSync(archive, Buffer.from(await dl.arrayBuffer()));

    const out = path.join(tmp, 'x');
    execFileSync(path7za, ['x', '-bd', '-y', archive, `-o${out}`, ...KEEP], { stdio: 'ignore' });

    for (const f of KEEP) fs.rmSync(path.join(DIR, f), { force: true });
    for (const f of KEEP) {
      const src = path.join(out, f);
      if (!fs.existsSync(src)) throw new Error(`Falta ${f} en ${asset.name}`);
      fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true });
      fs.copyFileSync(src, path.join(DIR, f));
    }
    fs.writeFileSync(VERSION, `${asset.name}\n${asset.browser_download_url}\n`);
    console.log(`mpv listo en mpv/ (${release.tag_name})`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch(e => { console.error('No se pudo descargar mpv:', e.message); process.exit(1); });
