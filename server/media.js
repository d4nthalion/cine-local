// Análisis y envío de los vídeos al navegador, como Plex o Video Station, en tres niveles:
//   direct     el archivo tal cual (MP4/WebM que el navegador ya sabe reproducir), con saltos por Range
//   remux      se reempaqueta en MP4 fragmentado sin tocar el vídeo; el audio se pasa a AAC si hace falta
//   transcode  se convierte también el vídeo a H.264 (con la gráfica Intel del NAS si está disponible)
// Qué nivel usar lo decide el navegador (sabe qué códecs soporta) con los datos de info().
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { findExternalSubs } = require('../src/main/subs');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const HWACCEL = (process.env.CINELOCAL_HWACCEL || 'none').toLowerCase();   // none | vaapi
const VAAPI_DEVICE = process.env.CINELOCAL_VAAPI_DEVICE || '/dev/dri/renderD128';
const MAX_JOBS = +process.env.CINELOCAL_MAX_JOBS || 3;

const TEXT_SUBS = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text']);
const SIDE_SUBS = new Set(['.srt', '.vtt', '.ass', '.ssa']);
const MIME = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska' };

const probes = new Map();   // ruta → { key, data }
const extracting = new Map();   // caché del subtítulo → promesa de la extracción en curso
let jobs = 0;

function probe(file) {
  const st = fs.statSync(file);
  const key = st.size + ':' + st.mtimeMs;
  const c = probes.get(file);
  if (c?.key === key) return Promise.resolve(c.data);
  return new Promise((resolve, reject) => {
    execFile(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
      { maxBuffer: 16 * 1024 * 1024, timeout: 60000 }, (err, out) => {
        if (err) return reject(new Error('No se pudo analizar el vídeo: ' + (err.message || '').split('\n')[0]));
        const data = JSON.parse(out);
        probes.set(file, { key, data });
        resolve(data);
      });
  });
}

const tag = (s, k) => s.tags?.[k] || s.tags?.[k.toUpperCase()] || '';

/** Lo que necesita el reproductor web para decidir cómo pedir el vídeo */
async function info(f, root) {
  const p = await probe(f.path);
  const streams = p.streams || [];
  const v = streams.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = streams.filter(s => s.codec_type === 'audio').map((s, n) => ({
    n, codec: s.codec_name, channels: s.channels || 2, lang: tag(s, 'language'), title: tag(s, 'title'), def: !!s.disposition?.default
  }));
  const subs = streams.filter(s => s.codec_type === 'subtitle').map((s, n) => ({
    key: 'i' + n, codec: s.codec_name, lang: tag(s, 'language'), title: tag(s, 'title'),
    forced: !!s.disposition?.forced || /forz|forced/i.test(tag(s, 'title')), def: !!s.disposition?.default,
    text: TEXT_SUBS.has(s.codec_name),
    // los PGS (Blu-ray) son imágenes: se mandan tal cual y los dibuja el reproductor web
    ...(s.codec_name === 'hdmv_pgs_subtitle' && { image: 'pgs' })
  }));
  externalSubs(f, root).forEach((x, i) => subs.push({ key: 'x' + i, codec: path.extname(x.path).slice(1), lang: x.lang || '', title: x.title, forced: /forz|forced/i.test(x.path), def: false, text: true, external: true }));
  return {
    duration: +p.format?.duration || 0,
    container: path.extname(f.path).toLowerCase().slice(1),
    size: +p.format?.size || 0,
    video: v ? { codec: v.codec_name, profile: v.profile || '', level: v.level || 0, width: v.width, height: v.height, pixFmt: v.pix_fmt || '' } : null,
    audio,
    subs
  };
}

/** Subtítulos externos: junto al vídeo con el mismo nombre ("Película.es.srt") o en una carpeta "Subtítulos" */
function externalSubs(f, root) {
  const out = sidecarSubs(f);
  if (f.item?.type === 'movie') {
    for (const x of findExternalSubs(root, { ...f.item, meta: f.item.meta })) if (SIDE_SUBS.has(path.extname(x.path).toLowerCase())) out.push(x);
  }
  return out;
}
/** Sólo los que están junto al vídeo (van primero en externalSubs, así que sus índices coinciden). dirs: caché de listados */
function sidecarSubs(f, dirs = new Map()) {
  const out = [];
  const dir = path.dirname(f.path);
  const base = path.basename(f.path, path.extname(f.path)).toLowerCase();
  if (!dirs.has(dir)) {
    let names = [];
    try { names = fs.readdirSync(dir).filter(n => SIDE_SUBS.has(path.extname(n).toLowerCase())); } catch {}
    dirs.set(dir, names);
  }
  for (const name of dirs.get(dir)) {
    if (!name.toLowerCase().startsWith(base)) continue;
    const extra = name.slice(base.length, -path.extname(name).length).replace(/^[._\s-]+/, '');
    out.push({ path: path.join(dir, name), lang: langOf(extra), title: extra ? `Externo (${extra})` : 'Externo' });
  }
  return out;
}

const langOf = s => {
  const t = s.toLowerCase();
  if (/\b(es|spa|esp|castellano|espa[nñ]ol|latino)\b/.test(t)) return 'spa';
  if (/\b(en|eng|ingl[eé]s|english)\b/.test(t)) return 'eng';
  return '';
};

// ---------- envío ----------
/** Archivo tal cual, con soporte de Range para poder saltar */
/** «attachment» con el nombre en ASCII para los navegadores viejos y el de verdad (tildes, eñes) en filename* */
function attachment(name) {
  const ascii = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** download: el navegador lo guarda con su nombre en vez de abrirlo (botón «Descargar» de la web) */
function sendFile(req, res, file, { download = false } = {}) {
  const st = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  let start = 0, end = st.size - 1;
  if (m) {
    if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(+m[2], end); }
    else if (m[2]) start = Math.max(0, st.size - +m[2]);
    if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
  }
  res.writeHead(m ? 206 : 200, {
    'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
    ...(m && { 'Content-Range': `bytes ${start}-${end}/${st.size}` }), 'Cache-Control': 'private, no-store',
    ...(download && { 'Content-Disposition': attachment(path.basename(file)) })
  });
  const stream = fs.createReadStream(file, { start, end });
  stream.pipe(res);
  res.on('close', () => stream.destroy());
}

/**
 * Punto donde puede empezar el flujo reempaquetado para el segundo t: el fotograma clave al que salta el archivo
 * (su índice; no todos los fotogramas clave están en él). El vídeo copiado sólo puede empezar ahí, así que el audio
 * se recorta en ese mismo instante y el reproductor lo toma como su cero. Se leen paquetes, no se decodifica.
 */
function keyframeBefore(file, t) {
  if (!(t > 0)) return Promise.resolve(0);
  return new Promise(resolve => {
    execFile(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-read_intervals', `${t.toFixed(3)}%+#1`,
      '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file], { timeout: 20000 }, (err, out) => {
      const k = parseFloat(String(out || '').split('\n')[0]);
      resolve(Number.isFinite(k) && k <= t + 0.001 && k >= 0 ? k : t);
    });
  });
}
// ffmpeg, con -ss, busca 3/23 s antes del punto pedido si el vídeo lleva fotogramas B (por si el orden de
// decodificación va adelantado), y caería en el fotograma clave anterior: se le pide un poco después y se compensa
const SEEK_PAD = 0.135;

/** Una reproducción por persona y vídeo: si vuelve a pedirlo (salto, cambio de pista) se corta la anterior ya */
const streams = new Map();   // usuario|vídeo → ffmpeg

/**
 * Vídeo reempaquetado o convertido, en MP4 fragmentado por la propia respuesta.
 * No se puede saltar dentro del flujo: para ir a otro punto el reproductor vuelve a pedirlo con ?start=
 * (en remux, ?start= tiene que ser un fotograma clave: lo da /keyframe)
 */
async function sendStream(req, res, f, q, owner = '') {
  const slot = owner + '|' + f.path;
  const prev = streams.get(slot);
  if (prev) {
    // se espera a que termine («exit»), no a «close»: si el navegador había dejado de leer, su salida se queda a medio
    // leer y «close» no llegaría nunca (y la reproducción nueva se quedaría colgada)
    const running = prev.exitCode === null && prev.signalCode === null;
    const exited = running && new Promise(r => { prev.once('exit', r); setTimeout(r, 3000); });
    killStream(prev);
    if (running) await exited;
  }
  if (jobs >= MAX_JOBS) { res.writeHead(503, { 'Retry-After': '5' }); return res.end('Demasiadas reproducciones a la vez'); }
  const meta = await info(f, null).catch(() => null);
  const mode = q.get('mode') === 'transcode' ? 'transcode' : 'remux';
  const start = Math.max(0, +q.get('start') || 0);
  const audioN = Math.max(0, +q.get('audio') || 0);
  const maxH = Math.min(2160, Math.max(360, +q.get('maxh') || 1080));
  const a = meta?.audio?.[audioN];
  // empezando a mitad en remux el audio sale de una segunda lectura del archivo, recortado al instante exacto:
  // copiado no se podría recortar, así que entonces se convierte
  const split = mode === 'remux' && start > 0;
  const copyAudio = a && !split && ['aac', 'mp3'].includes(a.codec) && q.get('acopy') === '1';

  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (mode === 'transcode' && HWACCEL === 'vaapi') args.push('-hwaccel', 'vaapi', '-hwaccel_device', VAAPI_DEVICE, '-hwaccel_output_format', 'vaapi');
  if (split) {
    // vídeo: desde el fotograma clave «start» (ver SEEK_PAD); audio: desde «start» exacto. Los dos empiezan en 0
    args.push('-itsoffset', String(SEEK_PAD), '-ss', (start + SEEK_PAD).toFixed(3), '-i', f.path);
    if (a) args.push('-ss', start.toFixed(3), '-i', f.path);
  } else {
    if (start) args.push('-ss', String(start));
    args.push('-i', f.path);
  }
  args.push('-map', '0:v:0', ...(a ? ['-map', `${split ? 1 : 0}:a:${audioN}`] : []), '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1');
  if (mode === 'remux') {
    args.push('-c:v', 'copy');
    if (meta?.video?.codec === 'hevc') args.push('-tag:v', 'hvc1');   // Safari sólo reconoce HEVC en MP4 con esta etiqueta
  } else if (HWACCEL === 'vaapi') {
    args.push('-vf', `scale_vaapi=w=-2:h='min(${maxH},ih)':format=nv12`, '-c:v', 'h264_vaapi', '-qp', '23', '-g', '48');
  } else {
    args.push('-vf', `scale=-2:'min(${maxH},ih)'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', '48', '-threads', '0');
  }
  if (a) args.push(...(copyAudio ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-ac', '2', '-b:a', '192k']));
  args.push('-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1');

  jobs++;
  const ff = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  streams.set(slot, ff);
  // la plaza se libera al terminar el proceso, aunque su salida no llegue a cerrarse
  let counted = true;
  const release = () => { if (counted) { counted = false; jobs--; } if (streams.get(slot) === ff) streams.delete(slot); };
  ff.on('exit', release);
  ff.on('error', release);
  let err = '';
  ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  // sin búfer en el proxy de DSM: lo que se envía llega ya al navegador, que es quien decide cuánto guarda
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', 'X-Stream-Start': String(start) });
  ff.stdout.pipe(res);
  res.on('close', () => killStream(ff));
  ff.on('close', code => {
    release();
    if (code && !res.destroyed && err) console.warn('ffmpeg', mode, path.basename(f.path), err.trim().split('\n').pop());
    res.end();
  });
}

/** Corta un ffmpeg del flujo y suelta su salida (si estaba a medio leer, no se cerraría nunca) */
function killStream(ff) {
  if (ff.exitCode === null && ff.signalCode === null) ff.kill('SIGKILL');
  ff.stdout?.destroy();
}

/** Subtítulo en WebVTT. Los internos se extraen una vez (hay que leer todo el archivo) y se guardan en caché */
async function sendSubs(res, f, key, root, cacheDir) {
  const meta = await info(f, root);
  const sub = meta.subs.find(s => s.key === key);
  if (sub?.image === 'pgs') return sendPgs(res, f, key, cacheDir);
  if (!sub || !sub.text) { res.writeHead(404); return res.end(); }
  let vtt;
  if (sub.external) {
    const x = externalSubs(f, root)[+key.slice(1)];
    vtt = await externalToVtt(x.path);
  } else {
    const st = fs.statSync(f.path);
    const cache = path.join(cacheDir, crypto.createHash('sha1').update(`${f.path}|${st.size}|${st.mtimeMs}|${key}`).digest('hex') + '.vtt');
    try { vtt = fs.readFileSync(cache, 'utf8'); } catch {
      // si ya se está extrayendo (el usuario ha vuelto a abrir el vídeo), se espera a esa misma extracción
      if (!extracting.has(cache)) {
        extracting.set(cache, ffmpegVtt(['-i', f.path, '-map', `0:s:${+key.slice(1)}`]).then(out => {
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cache, out);
          return out;
        }).finally(() => extracting.delete(cache)));
      }
      vtt = await extracting.get(cache);
    }
  }
  res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'private, max-age=3600' });
  res.end(vtt);
}

/**
 * Subtítulo PGS (imágenes de Blu-ray) tal cual, en .sup: se extrae una vez (hay que leer todo el archivo), se guarda
 * en caché y lo dibuja el reproductor web
 */
async function sendPgs(res, f, key, cacheDir) {
  const st = fs.statSync(f.path);
  const cache = path.join(cacheDir, crypto.createHash('sha1').update(`${f.path}|${st.size}|${st.mtimeMs}|${key}`).digest('hex') + '.sup');
  if (!fs.existsSync(cache)) {
    if (!extracting.has(cache)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      const tmp = cache + '.' + process.pid + '.tmp';
      extracting.set(cache, new Promise((resolve, reject) => {
        execFile(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', f.path, '-map', `0:s:${+key.slice(1)}`, '-c:s', 'copy', '-f', 'sup', tmp],
          { timeout: 10 * 60e3 }, err => {
            if (err) { fs.rmSync(tmp, { force: true }); return reject(new Error('No se pudo extraer el subtítulo')); }
            fs.renameSync(tmp, cache);
            resolve();
          });
      }).finally(() => extracting.delete(cache)));
    }
    await extracting.get(cache);
  }
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(cache).size, 'Cache-Control': 'private, max-age=3600' });
  fs.createReadStream(cache).pipe(res);
}

async function externalToVtt(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.ass' || ext === '.ssa') return ffmpegVtt(['-i', file]);
  const buf = fs.readFileSync(file);
  // muchos .srt en español vienen en Windows-1252
  let text = buf.toString('utf8');
  if (text.includes('\uFFFD')) text = buf.toString('latin1');
  text = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
  if (ext === '.vtt') return text;
  return 'WEBVTT\n\n' + text.replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
}

function ffmpegVtt(input) {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...input, '-f', 'webvtt', 'pipe:1'],
      { maxBuffer: 32 * 1024 * 1024, timeout: 10 * 60e3 }, (err, out) => err ? reject(new Error('No se pudo extraer el subtítulo')) : resolve(out));
  });
}

module.exports = { info, sendFile, sendStream, keyframeBefore, sendSubs, externalSubs, sidecarSubs, HWACCEL };
