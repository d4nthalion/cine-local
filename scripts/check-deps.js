// Comprobaciones de las dependencias de la app de escritorio.
//
//   node scripts/check-deps.js            antes de compilar (predist): para si falta alguna dependencia
//                                         de "dependencies" en node_modules, porque electron-builder solo
//                                         empaqueta lo que está instalado y la app saldría sin ella (pasó con
//                                         electron-updater en la 1.19.0 y la 1.20.0: no podían actualizarse)
//   node scripts/check-deps.js <app.asar> después: comprueba que esas dependencias están dentro del paquete
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = Object.keys(pkg.dependencies || {});
const asarPath = process.argv[2];

if (!asarPath) {
  const missing = deps.filter(d => !fs.existsSync(path.join(root, 'node_modules', d, 'package.json')));
  if (missing.length) {
    console.error(`Faltan dependencias en node_modules: ${missing.join(', ')}. Ejecuta "npm install" antes de compilar.`);
    process.exit(1);
  }
  console.log(`Dependencias instaladas: ${deps.join(', ') || '(ninguna)'}`);
} else {
  const asar = require('@electron/asar');
  const files = new Set(asar.listPackage(asarPath).map(f => f.replace(/\\/g, '/')));
  const missing = deps.filter(d => !files.has(`/node_modules/${d}/package.json`));
  if (missing.length) {
    console.error(`El paquete no lleva: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`El paquete lleva todas las dependencias: ${deps.join(', ')}`);
}
