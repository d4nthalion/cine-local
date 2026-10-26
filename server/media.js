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
    text: TEXT_SUBS.has(s.codec_name)
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
function sendFile(req, res, file) {
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
    ...(m && { 'Content-Range': `bytes ${start}-${end}/${st.size}` }), 'Cache-Control': 'private, no-store'
  });
  const stream = fs.createReadStream(file, { start, end });
  stream.pipe(res);
  res.on('close', () => stream.destroy());
}

/**
 * Vídeo reempaquetado o convertido, en MP4 fragmentado por la propia respuesta.
 * No se puede saltar dentro del flujo: para ir a otro punto el reproductor vuelve a pedirlo con ?start=
 */
async function sendStream(req, res, f, q) {
  if (jobs >= MAX_JOBS) { res.writeHead(503, { 'Retry-After': '5' }); return res.end('Demasiadas reproducciones a la vez'); }
  const meta = await info(f, null).catch(() => null);
  const mode = q.get('mode') === 'transcode' ? 'transcode' : 'remux';
  const start = Math.max(0, +q.get('start') || 0);
  const audioN = Math.max(0, +q.get('audio') || 0);
  const maxH = Math.min(2160, Math.max(360, +q.get('maxh') || 1080));
  const a = meta?.audio?.[audioN];
  const copyAudio = a && ['aac', 'mp3'].includes(a.codec) && q.get('acopy') === '1';

  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (mode === 'transcode' && HWACCEL === 'vaapi') args.push('-hwaccel', 'vaapi', '-hwaccel_device', VAAPI_DEVICE, '-hwaccel_output_format', 'vaapi');
  if (start) args.push('-ss', String(start));
  args.push('-i', f.path, '-map', '0:v:0', ...(a ? ['-map', `0:a:${audioN}`] : []), '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1');
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
  let err = '';
  ff.stderr.on('data', d => { err = (err + d).slice(-2000); });
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'X-Stream-Start': String(start) });
  ff.stdout.pipe(res);
  const stop = () => { if (ff.exitCode === null) ff.kill('SIGKILL'); };
  res.on('close', stop);
  ff.on('close', code => {
    jobs--;
    if (code && !res.destroyed && err) console.warn('ffmpeg', mode, path.basename(f.path), err.trim().split('\n').pop());
    res.end();
  });
}

/** Subtítulo en WebVTT. Los internos se extraen una vez (hay que leer todo el archivo) y se guardan en caché */
async function sendSubs(res, f, key, root, cacheDir) {
  const meta = await info(f, root);
  const sub = meta.subs.find(s => s.key === key);
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

module.exports = { info, sendFile, sendStream, sendSubs, externalSubs, sidecarSubs, HWACCEL };
