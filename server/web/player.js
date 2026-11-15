// Reproductor web de CineLocal Server: lo mismo que la interfaz propia de mpv (player-ui/), pero con <video>.
// El servidor manda el archivo tal cual si el navegador lo entiende, o lo reempaqueta / convierte con ffmpeg;
// en esos casos el flujo empieza en ?start= y para saltar se vuelve a pedir desde el punto nuevo.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = t => {
    t = Math.max(0, Math.floor(t || 0));
    const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };
  const LANG = { spa: ['spa', 'es', 'esp', 'cas'], eng: ['eng', 'en'], fre: ['fre', 'fra', 'fr'], ger: ['ger', 'deu', 'de'], ita: ['ita', 'it'], por: ['por', 'pt'], jpn: ['jpn', 'ja'], kor: ['kor', 'ko'], cat: ['cat', 'ca'] };
  const LANG_NAME = { spa: 'Español', eng: 'Inglés', fre: 'Francés', ger: 'Alemán', ita: 'Italiano', por: 'Portugués', jpn: 'Japonés', kor: 'Coreano', cat: 'Catalán', chi: 'Chino', rus: 'Ruso' };
  const langIs = (l, code) => !!l && (LANG[code] || [code]).includes(String(l).toLowerCase());
  const langName = l => { for (const [k, v] of Object.entries(LANG)) if (v.includes(String(l).toLowerCase())) return LANG_NAME[k]; return l ? l.toUpperCase() : ''; };

  const IC = {
    back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    rew: '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.5" font-size="6.5" text-anchor="middle" fill="currentColor" font-family="sans-serif" font-weight="700">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.5" font-size="6.5" text-anchor="middle" fill="currentColor" font-family="sans-serif" font-weight="700">10</text></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm18.6 3-2.8-2.8-1.4 1.4 2.8 2.8-2.8 2.8 1.4 1.4 2.8-2.8 2.8 2.8 1.4-1.4-2.8-2.8 2.8-2.8-1.4-1.4z" transform="translate(-3 0)"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
    subs: '<svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg>',
    episodes: '<svg viewBox="0 0 24 24"><path d="M4 6H2v14a2 2 0 0 0 2 2h14v-2H4V6zm16-4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    exitFull: '<svg viewBox="0 0 24 24"><path d="M8 4h2v6H4V8h4zm6 0h2v4h4v2h-6zM4 14h6v6H8v-4H4zm10 0h6v2h-4v4h-2z"/></svg>'
  };

  // ---------- qué sabe reproducir este navegador ----------
  const v0 = document.createElement('video');
  const can = t => !!v0.canPlayType(t).replace('no', '');
  function videoOk(v) {
    if (!v) return true;
    if (v.codec === 'h264') return !/10|12/.test(v.pixFmt) && can('video/mp4; codecs="avc1.640029"');
    if (v.codec === 'hevc') return can('video/mp4; codecs="hvc1.1.6.L150.90"') || can('video/mp4; codecs="hev1.1.6.L150.90"');
    if (v.codec === 'vp9') return can('video/webm; codecs="vp9"');
    if (v.codec === 'av1') return can('video/mp4; codecs="av01.0.08M.08"');
    if (v.codec === 'vp8') return can('video/webm; codecs="vp8"');
    return false;
  }
  function audioOk(a) {
    if (!a) return true;
    return ({ aac: can('audio/mp4; codecs="mp4a.40.2"'), mp3: can('audio/mpeg'), opus: can('audio/webm; codecs="opus"'),
      vorbis: can('audio/webm; codecs="vorbis"'), flac: can('audio/flac'), ac3: can('audio/mp4; codecs="ac-3"'), eac3: can('audio/mp4; codecs="ec-3"') })[a.codec] || false;
  }

  // ---------- estado ----------
  let P = null;   // reproducción en curso

  function open(playlist, prefs, onClose) {
    close(true);
    const el = document.createElement('div');
    el.id = 'webPlayer';
    el.className = 'wp show';
    el.innerHTML = `
      <video playsinline preload="auto"></video>
      <div class="wp-subs"></div>
      <div class="wp-spinner"><div class="spinner"></div></div>
      <div class="wp-flash"></div>
      <div class="wp-shade top"></div><div class="wp-shade bottom"></div>
      <div class="wp-top"><button class="wp-btn" data-wp="close" title="Volver (Esc)">${IC.back}</button><div class="wp-title"><b class="wp-t1"></b><span class="wp-t2"></span></div></div>
      <button class="wp-skip hidden" data-wp="skip"></button>
      <div class="wp-bottom">
        <div class="wp-seek"><div class="wp-rail"><div class="wp-buf"></div><div class="wp-fill"></div><div class="wp-knob"></div></div><div class="wp-tip"></div></div>
        <div class="wp-row">
          <button class="wp-btn" data-wp="toggle" title="Reproducir / pausa (espacio)">${IC.play}</button>
          <button class="wp-btn" data-wp="rew" title="Retroceder 10 s (←)">${IC.rew}</button>
          <button class="wp-btn" data-wp="fwd" title="Avanzar 10 s (→)">${IC.fwd}</button>
          <div class="wp-vol"><button class="wp-btn" data-wp="mute" title="Silenciar (m)">${IC.vol}</button><input type="range" min="0" max="1" step="0.02" value="1" class="wp-volbar" title="Volumen (↑ ↓)"></div>
          <span class="wp-time"></span>
          <div class="wp-spacer"></div>
          <button class="wp-btn" data-wp="next" title="Siguiente episodio (n)">${IC.next}</button>
          <button class="wp-btn" data-wp="menu-episodes" title="Episodios">${IC.episodes}</button>
          <button class="wp-btn" data-wp="menu-tracks" title="Audio y subtítulos">${IC.subs}</button>
          <button class="wp-btn" data-wp="fs" title="Pantalla completa (f)">${IC.full}</button>
        </div>
      </div>
      <div class="wp-menu hidden"></div>
      <div class="wp-note hidden"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('wp-open');
    const video = $('video', el);
    try { video.volume = +localStorage.getItem('wp-volume') || 1; video.muted = localStorage.getItem('wp-muted') === '1'; } catch {}
    P = { el, video, playlist, prefs, onClose, idx: 0, info: null, mode: 'direct', offset: 0, audio: 0, sub: null, cues: [], segs: [], hideTimer: null, lastReport: 0, seeking: false, token: 0 };
    bind();
    load(0);
  }

  async function load(idx) {
    const cur = P.playlist[idx];
    if (!cur) return close();
    const token = ++P.token;
    P.idx = idx;
    P.info = null; P.cues = []; P.segs = []; P.sub = null;
    // «Serie · T1:E2 · Nombre»: la serie y, a su lado y más tenue, «T1:E2 Nombre»
    const tm = cur.title.match(/^(.*?) · (T\d+:E\d+.*)$/);
    $('.wp-t1', P.el).textContent = tm ? tm[1] : cur.title;
    $('.wp-t2', P.el).textContent = tm ? tm[2].replace(/ · /g, ' ') : '';
    $('[data-wp="next"]', P.el).classList.toggle('hidden', idx >= P.playlist.length - 1);
    $('[data-wp="menu-episodes"]', P.el).classList.toggle('hidden', !cur.episodeId);
    $('.wp-menu', P.el).classList.add('hidden');
    $('.wp-subs', P.el).innerHTML = '';
    spinner(true);
    let info;
    try { info = await (await fetch(`/api/media/${cur.id}/info`)).json(); }
    catch { info = null; }
    if (token !== P.token) return;
    if (!info || info.error || !info.duration) return fail(info?.error || 'No se pudo abrir el vídeo');
    P.info = info;
    P.audio = pickAudio(info);
    P.sub = pickSub(info, info.audio[P.audio]);
    start(cur.start || 0, 'inicio');
    if (P.sub) loadSubs(P.sub);
    if (cur.skip) {
      const q = new URLSearchParams({ ...cur.skip, dur: info.duration });
      fetch('/api/segments?' + q).then(r => r.json()).then(s => { if (token === P.token) P.segs = Array.isArray(s) ? s : []; }).catch(() => {});
    }
  }

  function pickAudio(info) {
    const pref = P.prefs.audioLang;
    let i = pref && pref !== 'original' ? info.audio.findIndex(a => langIs(a.lang, pref)) : -1;
    if (i < 0) i = info.audio.findIndex(a => a.def);
    return Math.max(0, i);
  }

  function pickSub(info, audio) {
    const { subLang, subMode } = P.prefs;
    const subs = info.subs.filter(s => s.text && langIs(s.lang, subLang));
    if (!subs.length || subMode === 'off' || subLang === 'none') return null;
    const full = subs.find(s => !s.forced), forced = subs.find(s => s.forced);
    if (subMode === 'always') return full || forced;
    // foreign: completos si el audio está en otro idioma; si no, sólo los forzados (carteles, otros idiomas)
    return audio && langIs(audio.lang, subLang) ? forced || null : full || forced;
  }

  /** Por qué se vuelve a pedir el flujo y cómo estaba el vídeo (sale en el registro del servidor, para saber por qué se atasca) */
  function streamDiag(why) {
    const v = P.video;
    let ahead = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 1) ahead = Math.max(ahead, v.buffered.end(i) - v.currentTime);
    return { why, ahead: ahead.toFixed(1), rs: v.readyState, ns: v.networkState, err: v.error?.code || 0 };
  }

  /** Elige cómo pedir el vídeo y empieza en el segundo t */
  function start(t, why = 'inicio') {
    const diag = streamDiag(why);
    const info = P.info, a = info.audio[P.audio];
    const vOk = videoOk(info.video);
    const direct = ['mp4', 'm4v', 'webm', 'mov'].includes(info.container) && vOk && audioOk(a) && P.audio === 0;
    P.mode = direct ? 'direct' : vOk ? 'remux' : 'transcode';
    const id = P.playlist[P.idx].id;
    const v = P.video;
    P.pending = null;
    stopFeed();
    if (P.mode === 'direct') {
      P.offset = 0;
      if (!v.src.includes(`/api/media/${id}/file`)) v.src = `/api/media/${id}/file`;
      const go = () => { v.currentTime = t; v.play().catch(() => {}); };
      v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true });
    } else {
      P.pending = t;
      const seq = P.startSeq = (P.startSeq || 0) + 1;
      const go = s => {
        if (!P || P.startSeq !== seq) return;   // cerrado, u otro salto mientras tanto
        P.offset = s; P.pending = null;
        const url = streamUrl(s, diag);
        if (P.mse !== false && window.MediaSource) openFeed(url, s);
        else v.src = url;
        v.play().catch(() => {});
      };
      // al copiar el vídeo sólo se puede empezar en un fotograma clave: se arranca ahí para que el audio no se desfase
      if (P.mode === 'remux' && t > 0) v.pause();
      keyframe(t).then(go);
    }
    spinner(true);
    paint();
  }

  /** Dirección del flujo reempaquetado / convertido que empieza en el segundo s */
  function streamUrl(s, diag) {
    const a = P.info.audio[P.audio];
    const q = new URLSearchParams({ mode: P.mode, start: s.toFixed(3), audio: P.audio, acopy: a && ['aac', 'mp3'].includes(a.codec) ? 1 : 0, maxh: 1080, ...diag });
    return `/api/media/${P.playlist[P.idx].id}/stream?${q}`;
  }
  /** Al copiar el vídeo sólo se puede empezar en un fotograma clave: el de t o el anterior */
  function keyframe(t) {
    if (P.mode !== 'remux' || !(t > 0)) return Promise.resolve(t);
    return fetch(`/api/media/${P.playlist[P.idx].id}/keyframe?t=${t.toFixed(3)}`).then(r => r.json())
      .then(r => Number.isFinite(r?.t) ? r.t : t).catch(() => t);
  }

  // ---------- flujo con MediaSource ----------
  // El flujo reempaquetado no se puede pedir por trozos: si se deja al <video>, Chrome (y Brave, Edge…) a veces corta
  // la conexión y la vuelve a pedir «desde el byte N», y el servidor sólo puede volver a empezar; además guarda muy
  // poco por delante. Así lo descarga la propia página: guarda hasta AHEAD s y, si se corta, sigue desde donde llegó
  // lo descargado sin tirar nada.
  const AHEAD = 120, BEHIND = 30;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const once = (el, ev) => new Promise(r => el.addEventListener(ev, r, { once: true }));

  function stopFeed() {
    const f = P?.feed;
    if (!f) return;
    f.dead = true;
    f.ctrl.abort();
    P.feed = null;
  }

  /** El tramo descargado en el que está el punto actual del <video> */
  function curRange(v) {
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 0.5 && v.buffered.end(i) > v.currentTime) return [v.buffered.start(i), v.buffered.end(i)];
    return null;
  }
  const aheadOf = v => { const r = curRange(v); return r ? r[1] - v.currentTime : 0; };
  const bufferedEnd = v => curRange(v)?.[1] ?? v.currentTime;

  /** Códecs del segmento de inicio (ftyp + moov) para addSourceBuffer; null si aún no ha llegado entero */
  function parseInit(b) {
    const u32 = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = i => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
    let p = 0;
    while (p + 8 <= b.length) {
      let size = u32(p);
      if (size === 1) size = u32(p + 8) * 2 ** 32 + u32(p + 12);
      if (size < 8) return { error: true };
      if (type(p + 4) === 'moov') {
        if (p + size > b.length) return null;
        const m = b.subarray(p, p + size);
        const find = t => { for (let i = 4; i + 4 <= m.length; i++) if (m[i] === t.charCodeAt(0) && m[i + 1] === t.charCodeAt(1) && m[i + 2] === t.charCodeAt(2) && m[i + 3] === t.charCodeAt(3)) return i; return -1; };
        const hex = n => n.toString(16).padStart(2, '0');
        const codecs = [];
        let i;
        if ((i = find('avcC')) >= 0) codecs.push('avc1.' + hex(m[i + 5]) + hex(m[i + 6]) + hex(m[i + 7]));
        else if ((i = find('hvcC')) >= 0) {
          const x = m[i + 5], space = ['', 'A', 'B', 'C'][x >> 6], tier = x & 0x20 ? 'H' : 'L', prof = x & 0x1f;
          let compat = ((m[i + 6] << 24) | (m[i + 7] << 16) | (m[i + 8] << 8) | m[i + 9]) >>> 0, rev = 0;
          for (let k = 0; k < 32; k++) { rev = ((rev << 1) | (compat & 1)) >>> 0; compat >>>= 1; }
          const cons = [...m.subarray(i + 10, i + 16)];
          while (cons.length && !cons[cons.length - 1]) cons.pop();
          const tag = find('hev1') >= 0 ? 'hev1' : 'hvc1';
          codecs.push([tag, space + prof, rev.toString(16), tier + m[i + 16], ...cons.map(c => c.toString(16).toUpperCase())].join('.'));
        } else return { error: true };   // otros códecs de vídeo: que lo lea el <video> como antes
        if (find('mp4a') >= 0) {
          // tipo de objeto del esds: 0x40 = AAC, 0x69 / 0x6B = MP3
          const e = find('esds');
          let ot = 0x40;
          if (e >= 0) for (let k = e + 8; k < Math.min(m.length - 2, e + 40); k++) if (m[k] === 0x04) { let j = k + 1; while (m[j] & 0x80) j++; ot = m[j + 1]; break; }
          codecs.push(ot === 0x69 || ot === 0x6b ? 'mp4a.6B' : 'mp4a.40.2');
        }
        return { codecs };
      }
      p += size;
    }
    return b.length > 4 << 20 ? { error: true } : null;
  }

  /**
   * Descarga el flujo que empieza en el segundo «at» de la película. Sin MediaSource abierta crea una; con ella
   * (reconexión) añade el flujo nuevo en su sitio, detrás de lo que ya había.
   */
  async function openFeed(url, at) {
    const v = P.video;
    const feed = P.feed = { ctrl: new AbortController(), dead: false, lastData: Date.now() };
    const fresh = at === P.offset;
    try {
      if (fresh) {
        P.ms = new MediaSource(); P.sb = null;
        if (P.msUrl) URL.revokeObjectURL(P.msUrl);
        v.src = P.msUrl = URL.createObjectURL(P.ms);
        await once(P.ms, 'sourceopen');
        if (feed.dead) return;
      }
      const res = await fetch(url, { signal: feed.ctrl.signal });
      if (!res.ok) throw new Error('http ' + res.status);
      const reader = res.body.getReader();
      let head = new Uint8Array(0), init = null;
      while (!init) {
        const { done, value } = await reader.read();
        if (feed.dead) return;
        if (done) throw new Error('flujo vacío');
        const nb = new Uint8Array(head.length + value.length); nb.set(head); nb.set(value, head.length); head = nb;
        init = parseInit(head);
        if (init?.error) throw Object.assign(new Error('códec'), { noMse: true });
      }
      if (fresh) {
        const mime = 'video/mp4; codecs="' + init.codecs.join(',') + '"';
        if (!MediaSource.isTypeSupported(mime)) throw Object.assign(new Error(mime), { noMse: true });
        P.sb = P.ms.addSourceBuffer(mime);
      }
      const sb = P.sb;
      if (sb.updating) await once(sb, 'updateend');
      if (!fresh) sb.abort();   // si el anterior se cortó a mitad de un fragmento, se descarta ese trozo
      sb.timestampOffset = at - P.offset;   // cada flujo empieza en su 0: se coloca en su sitio
      await append(feed, head);
      if (fresh && v.buffered.length && v.currentTime < v.buffered.start(0)) v.currentTime = v.buffered.start(0);
      let pend = [], size = 0;
      for (;;) {
        // lo bastante por delante: se espera (el servidor también se para) y se suelta lo ya visto
        while (!feed.dead && aheadOf(v) > AHEAD) { await trim(feed, BEHIND); await sleep(500); }
        const { done, value } = await reader.read();
        if (feed.dead) return;
        if (value) { pend.push(value); size += value.length; feed.lastData = Date.now(); }
        if (size >= (512 << 10) || (done && size)) {
          const buf = new Uint8Array(size); let o = 0;
          for (const c of pend) { buf.set(c, o); o += c.length; }
          pend = []; size = 0;
          await append(feed, buf);
          P.netRetries = 0;
        }
        if (done) break;
      }
      if (feed.dead) return;
      if (sb.updating) await once(sb, 'updateend');
      // si ffmpeg se corta, el servidor cierra la respuesta como si hubiera acabado: lejos del final es un corte
      const last = v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
      if (P.offset + last < dur() - 3) throw new Error('flujo cortado');
      if (P.ms.readyState === 'open') P.ms.endOfStream();
    } catch (e) {
      if (feed.dead || !P || P.feed !== feed) return;
      console.warn('Flujo de vídeo:', e.message);
      if (e.noMse) { P.mse = false; return start(now(), 'sin-mse'); }
      if (!P.sb || P.ms.readyState !== 'open') return start(now(), 'red');
      // corte de red: se sigue desde donde llegó lo descargado, sin tirar nada
      if ((P.netRetries = (P.netRetries || 0) + 1) > 5) return fail('El vídeo no carga: revisa la conexión');
      note('Reconectando…', 3000);
      await sleep(1000 * P.netRetries);
      if (!P || P.feed !== feed) return;
      // primero se descarta el fragmento a medias, para seguir desde lo que de verdad hay
      try { if (!P.sb.updating && P.ms.readyState === 'open') P.sb.abort(); } catch {}
      const k = await keyframe(P.offset + bufferedEnd(v));
      if (!P || P.feed !== feed) return;
      openFeed(streamUrl(k, streamDiag('red')), k);
    }
  }

  async function append(feed, data) {
    const sb = P.sb;
    for (;;) {
      if (feed.dead) return;
      if (P.ms.readyState !== 'open') throw new Error('MediaSource cerrada');
      try {
        sb.appendBuffer(data);
        await once(sb, 'updateend');
        return;
      } catch (e) {
        if (e.name !== 'QuotaExceededError') throw e;
        // sin sitio: se suelta lo ya visto y se espera a que avance
        await trim(feed, 5);
        await sleep(1000);
      }
    }
  }

  async function trim(feed, keep) {
    const v = P.video, sb = P.sb;
    if (feed.dead || !sb || sb.updating || P.ms.readyState !== 'open' || !v.buffered.length) return;
    const cut = v.currentTime - keep;
    if (v.buffered.start(0) < cut - 1) { sb.remove(0, cut); await once(sb, 'updateend'); }
  }

  // P.pending: el punto pedido mientras aún no ha llegado el flujo nuevo (el vídeo sigue con el tiempo del anterior)
  const now = () => P ? P.pending ?? P.offset + (P.video.currentTime || 0) : 0;
  const dur = () => P?.info?.duration || P?.video.duration || 0;

  function seek(t) {
    t = Math.max(0, Math.min(dur() - 1, t));
    const v = P.video, rel = t - P.offset;
    let inBuf = false;
    for (let i = 0; i < v.buffered.length; i++) if (rel >= v.buffered.start(i) && rel < v.buffered.end(i) - 1) inBuf = true;
    if (P.mode === 'direct') v.currentTime = t;
    else if (P.feed && P.pending == null && inBuf) v.currentTime = rel;   // ya descargado: no se vuelve a pedir
    else start(t, 'salto');
    report(true);
    paint();
  }

  // ---------- subtítulos (se pintan aquí: sirven igual con el vídeo directo o con el flujo que empieza en ?start=) ----------
  async function loadSubs(sub) {
    const token = P.token;
    P.cues = [];
    note('Cargando subtítulos…');
    try {
      const r = await fetch(`/api/media/${P.playlist[P.idx].id}/subs/${sub.key}`);
      if (!r.ok) throw new Error();
      const cues = parseVtt(await r.text());
      if (!P || token !== P.token || P.sub !== sub) return;   // cerrado o cambiado mientras llegaban
      P.cues = cues;
      note(null);
    } catch { if (P && token === P.token) note('No se pudieron cargar los subtítulos', 3000); }
  }

  function parseVtt(text) {
    const out = [];
    const ts = s => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    for (const block of text.replace(/\r/g, '').split(/\n\n+/)) {
      const lines = block.split('\n');
      const i = lines.findIndex(l => l.includes('-->'));
      if (i < 0) continue;
      const [a, b] = lines[i].split('-->');
      const body = lines.slice(i + 1).join('\n').trim();
      if (body) out.push({ start: ts(a), end: ts(b.trim().split(/\s/)[0]), html: esc(body).replace(/&lt;(\/?)(i|b|u)&gt;/g, '<$1$2>').replace(/&lt;[^&]*?&gt;/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\n/g, '<br>') });
    }
    return out;
  }

  function paintSubs() {
    const t = now();
    const html = P.cues.filter(c => t >= c.start && t <= c.end).map(c => `<span>${c.html}</span>`).join('<br>');
    const box = $('.wp-subs', P.el);
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  // ---------- saltar intro / resumen / créditos ----------
  function activeSeg() {
    const t = now();
    return P.segs.find(s => t >= s.start && t < (s.end ?? dur()) - 0.5) || null;
  }
  function paintSkip() {
    const s = activeSeg();
    const b = $('.wp-skip', P.el);
    if (!s || s.kind === 'preview') { b.classList.add('hidden'); return; }
    const hasNext = P.idx < P.playlist.length - 1;
    b.textContent = s.kind === 'intro' ? 'Saltar intro' : s.kind === 'recap' ? 'Saltar resumen' : hasNext ? 'Siguiente episodio' : 'Saltar créditos';
    b.classList.remove('hidden');
  }
  function skip() {
    const s = activeSeg();
    if (!s) return;
    if (s.kind === 'credits' && P.idx < P.playlist.length - 1) return next();
    seek((s.end ?? dur()) + 0.5);
  }

  // ---------- progreso ----------
  function report(force) {
    if (!P?.info) return;
    const t = now(), d = dur();
    if (!force && Date.now() - P.lastReport < 10000) return;
    P.lastReport = Date.now();
    if (t > 1) window.api.reportProgress(P.playlist[P.idx].id, t, d);
  }

  function next() {
    report(true);
    if (P.idx < P.playlist.length - 1) load(P.idx + 1); else close();
  }

  // ---------- interfaz ----------
  function paint() {
    if (!P) return;
    const t = now(), d = dur();
    const v = P.video;
    $('[data-wp="toggle"]', P.el).innerHTML = v.paused ? IC.play : IC.pause;
    $('.wp-time', P.el).textContent = `${fmt(t)} / ${fmt(d)}`;
    if (!P.seeking) {
      const pct = d ? Math.min(100, t / d * 100) : 0;
      $('.wp-fill', P.el).style.width = pct + '%';
      $('.wp-knob', P.el).style.left = pct + '%';
    }
    let buf = 0;
    for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime + 1) buf = Math.max(buf, v.buffered.end(i));
    $('.wp-buf', P.el).style.width = d ? Math.min(100, (P.offset + buf) / d * 100) + '%' : '0';
    $('[data-wp="mute"]', P.el).innerHTML = v.muted || v.volume === 0 ? IC.mute : IC.vol;
    $('.wp-volbar', P.el).value = v.muted ? 0 : v.volume;
    $('[data-wp="fs"]', P.el).innerHTML = document.fullscreenElement ? IC.exitFull : IC.full;
    P.el.classList.toggle('paused', v.paused);
  }

  function showUi() {
    if (!P) return;
    P.el.classList.add('show');
    clearTimeout(P.hideTimer);
    P.hideTimer = setTimeout(() => { if (P && !P.video.paused && $('.wp-menu', P.el).classList.contains('hidden')) P.el.classList.remove('show'); }, 2500);
  }

  function spinner(on) { P?.el.classList.toggle('loading', on); }

  function note(text, ms) {
    const n = $('.wp-note', P.el);
    clearTimeout(P.noteTimer);
    if (!text) return n.classList.add('hidden');
    n.textContent = text; n.classList.remove('hidden');
    if (ms) P.noteTimer = setTimeout(() => n.classList.add('hidden'), ms);
  }

  function fail(msg) {
    spinner(false);
    note(msg);
  }

  /** Panel de audio y subtítulos (dos columnas) o de episodios; el mismo botón lo cierra */
  function menu(kind) {
    const m = $('.wp-menu', P.el);
    if (!m.classList.contains('hidden') && m.dataset.kind === kind) return m.classList.add('hidden');
    m.dataset.kind = kind;
    m.className = 'wp-menu ' + kind;
    if (kind === 'tracks') {
      const info = P.info;
      if (!info) return;
      const audio = info.audio.map((a, i) => ({ v: i, on: i === P.audio, label: [langName(a.lang) || `Pista ${i + 1}`, a.title].filter(Boolean).join(' · ') }));
      const subs = [{ v: '', on: !P.sub, label: 'Desactivados' }].concat(info.subs.map(s => ({
        v: s.key, on: P.sub?.key === s.key, off: !s.text,
        label: [langName(s.lang) || 'Subtítulos', s.title, s.forced ? 'forzados' : '', s.text ? '' : '(imagen, no disponible)'].filter(Boolean).join(' · ')
      })));
      const col = (k, title, items) => `<div class="wp-col"><div class="wp-menu-h">${title}</div>` +
        items.map(x => `<button class="wp-mi${x.on ? ' on' : ''}" ${x.off ? 'disabled' : ''} data-kind="${k}" data-wp-pick="${esc(x.v)}">${IC.check}<span>${esc(x.label)}</span></button>`).join('') + '</div>';
      m.innerHTML = col('audio', 'Audio', audio) + col('subs', 'Subtítulos', subs);
    } else {
      m.innerHTML = '<div class="wp-menu-h">Episodios</div><div class="wp-eps"><div class="wp-loading">Cargando…</div></div>';
      episodes();
    }
    m.classList.remove('hidden');
  }

  /** Episodios de la serie que se está viendo, por temporadas (la ficha completa se pide una vez) */
  async function episodes(season) {
    const cur = P.playlist[P.idx];
    const token = P.token;
    if (!P.item || P.item.id !== cur.itemId) {
      try { P.item = await (await fetch('/api/item/' + encodeURIComponent(cur.itemId))).json(); } catch { P.item = null; }
    }
    const m = $('.wp-menu', P.el);
    if (!P || token !== P.token || m.dataset.kind !== 'episodes' || !P.item?.episodes) return;
    const eps = P.item.episodes;
    const curEp = eps.find(e => e.id === cur.episodeId);
    const seasons = [...new Set(eps.map(e => e.season))].sort((a, b) => a - b);
    season = season ?? curEp?.season ?? seasons[0];
    const name = e => P.item.meta?.seasons?.[e.season]?.episodes?.[e.episode]?.name;
    m.innerHTML = '<div class="wp-menu-h">Episodios</div>' +
      (seasons.length > 1 ? `<div class="wp-seasons">${seasons.map(n => `<button class="${n === season ? 'on' : ''}" data-wp-season="${n}">T${n}</button>`).join('')}</div>` : '') +
      '<div class="wp-eps">' + eps.filter(e => e.season === season).map(e =>
        `<button class="wp-mi${e.id === cur.episodeId ? ' on' : ''}" data-wp-ep="${esc(e.id)}">${IC.check}<span><b>${e.episode}</b> ${esc(name(e) || 'Episodio ' + e.episode)}</span></button>`).join('') + '</div>';
    $('.wp-mi.on', m)?.scrollIntoView({ block: 'nearest' });
  }

  function pick(kind, value) {
    $('.wp-menu', P.el).classList.add('hidden');
    if (kind === 'audio') {
      const i = +value;
      if (i === P.audio) return;
      P.audio = i;
      start(now(), 'pista');   // el navegador no puede cambiar de pista: se vuelve a pedir el vídeo con la nueva
    } else {
      P.sub = value ? P.info.subs.find(s => s.key === value) : null;
      P.cues = [];
      $('.wp-subs', P.el).innerHTML = '';
      if (P.sub) loadSubs(P.sub);
    }
  }

  function bind() {
    const { el, video } = P;
    const seekEl = $('.wp-seek', el);
    const tip = $('.wp-tip', el);
    const posAt = e => { const r = $('.wp-rail', el).getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur(); };

    el.addEventListener('mousemove', showUi);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-wp]');
      const pk = e.target.closest('[data-wp-pick]');
      if (pk) return pick(pk.dataset.kind, pk.dataset.wpPick);
      const sn = e.target.closest('[data-wp-season]');
      if (sn) return episodes(+sn.dataset.wpSeason);
      const ep = e.target.closest('[data-wp-ep]');
      if (ep) {
        const cur = P.playlist[P.idx];
        if (ep.dataset.wpEp === cur.episodeId) return $('.wp-menu', el).classList.add('hidden');
        report(true);
        return window.api.play({ itemId: cur.itemId, episodeId: ep.dataset.wpEp, fromStart: false });
      }
      if (e.target.closest('.wp-menu')) return;
      if (!b) {
        if (e.target === video || e.target.classList.contains('wp-subs') || e.target.classList.contains('wp-shade')) {
          if (!$('.wp-menu', el).classList.contains('hidden')) return $('.wp-menu', el).classList.add('hidden');
          toggle();
        }
        return;
      }
      const a = b.dataset.wp;
      if (a === 'close') close();
      else if (a === 'toggle') toggle();
      else if (a === 'rew') seek(now() - 10);
      else if (a === 'fwd') seek(now() + 10);
      else if (a === 'next') next();
      else if (a === 'skip') skip();
      else if (a === 'mute') { video.muted = !video.muted; saveVol(); }
      else if (a === 'fs') window.api.toggleFullscreen();
      else if (a === 'menu-tracks') menu('tracks');
      else if (a === 'menu-episodes') menu('episodes');
      showUi(); paint();
    });
    video.addEventListener('dblclick', () => window.api.toggleFullscreen());
    el.addEventListener('wheel', e => { if (e.target.closest('.wp-menu')) return; e.preventDefault(); seek(now() + (e.deltaY < 0 ? 5 : -5)); showUi(); }, { passive: false });
    $('.wp-volbar', el).addEventListener('input', e => { video.volume = +e.target.value; video.muted = video.volume === 0; saveVol(); paint(); });

    seekEl.addEventListener('pointerdown', e => {
      P.seeking = true; seekEl.setPointerCapture(e.pointerId);
      const move = ev => { const t = posAt(ev); const pct = t / dur() * 100; $('.wp-fill', el).style.width = pct + '%'; $('.wp-knob', el).style.left = pct + '%'; };
      move(e);
      const up = ev => { seekEl.removeEventListener('pointermove', move); P.seeking = false; seek(posAt(ev)); };
      seekEl.addEventListener('pointermove', move);
      seekEl.addEventListener('pointerup', up, { once: true });
    });
    seekEl.addEventListener('mousemove', e => {
      const r = $('.wp-rail', el).getBoundingClientRect();
      tip.textContent = fmt(posAt(e));
      tip.style.left = Math.max(r.left + 24, Math.min(r.right - 24, e.clientX)) - r.left + 'px';
    });

    for (const ev of ['play', 'pause', 'volumechange']) video.addEventListener(ev, () => { paint(); showUi(); if (ev === 'pause') report(true); });
    video.addEventListener('waiting', () => spinner(true));
    // si el flujo se atasca (el NAS tarda en leer, se corta la conexión…) se vuelve a pedir desde donde iba
    const stallCheck = () => {
      clearTimeout(P.stallTimer);
      if (P.mode === 'direct') return;
      P.stallTimer = setTimeout(() => {
        if (!P || P.mode === 'direct' || video.paused || video.readyState >= 3) return;
        if (P.feed && Date.now() - P.feed.lastData < 5000) return stallCheck();   // llega, pero despacio
        P.stalls = (P.stalls || 0) + 1;
        if (P.stalls > 3) return fail('El vídeo no carga: revisa la conexión');
        note('Reconectando…', 3000);
        start(now(), 'atasco');
      }, 15000);
    };
    video.addEventListener('waiting', stallCheck);
    video.addEventListener('stalled', stallCheck);
    video.addEventListener('playing', () => { clearTimeout(P.stallTimer); P.stalls = 0; P.netRetries = 0; spinner(false); note(null); });
    video.addEventListener('canplay', () => { clearTimeout(P.stallTimer); spinner(false); });
    video.addEventListener('timeupdate', () => { paint(); report(false); });
    video.addEventListener('ended', () => {
      // con el flujo reempaquetado, «ended» puede llegar si se corta: sólo es el final si estamos cerca de la duración
      if (dur() - now() > 30) return start(now(), 'fin-antes');
      report(true);
      next();
    });
    video.addEventListener('error', () => {
      if (!P?.info || !video.getAttribute('src')) return;
      // un corte de red (o el servidor ocupado) no es que el navegador no entienda el vídeo: se reintenta igual,
      // en vez de pasar a convertirlo, que carga mucho más el NAS y va más a tirones
      if (video.error?.code === MediaError.MEDIA_ERR_NETWORK && P.mode !== 'direct' && (P.netRetries = (P.netRetries || 0) + 1) <= 3) {
        note('Reconectando…', 3000);
        return setTimeout(() => P && start(now(), 'red'), 1500);
      }
      // si el navegador no traga el archivo directo, se prueba reempaquetando, y si no, convirtiendo
      if (P.mode === 'direct') { P.info.container = 'mkv'; return start(now(), 'error-directo'); }
      if (P.mode === 'remux') { P.info.video = { ...P.info.video, codec: 'unsupported' }; return start(now(), 'error-remux'); }
      fail('El navegador no puede reproducir este vídeo');
    });
    P.raf = setInterval(() => { if (P) { paintSubs(); paintSkip(); } }, 200);
    P.onKey = onKey;
    document.addEventListener('keydown', onKey, true);
    P.onFs = () => paint();
    document.addEventListener('fullscreenchange', P.onFs);
    showUi(); paint();
  }

  function saveVol() {
    try { localStorage.setItem('wp-volume', P.video.volume); localStorage.setItem('wp-muted', P.video.muted ? '1' : '0'); } catch {}
  }

  function toggle() {
    const play = P.video.paused;
    play ? P.video.play().catch(() => {}) : P.video.pause();
    flash(play ? IC.play : IC.pause);
  }

  /** Al pausar o reanudar: el icono aparece en el centro y se desvanece */
  function flash(icon) {
    const f = $('.wp-flash', P.el);
    f.innerHTML = icon;
    f.classList.remove('go');
    void f.offsetWidth;   // reinicia la animación aunque se pulse seguido
    f.classList.add('go');
  }

  function onKey(e) {
    if (!P || e.target.closest?.('input:not(.wp-volbar), textarea, select')) return;
    const v = P.video;
    const k = e.key;
    const handled = {
      ' ': toggle, k: toggle, K: toggle,
      ArrowLeft: () => seek(now() - 10), ArrowRight: () => seek(now() + 10),
      ArrowUp: () => { v.volume = Math.min(1, v.volume + 0.05); v.muted = false; saveVol(); },
      ArrowDown: () => { v.volume = Math.max(0, v.volume - 0.05); saveVol(); },
      f: () => window.api.toggleFullscreen(), F: () => window.api.toggleFullscreen(),
      m: () => { v.muted = !v.muted; saveVol(); }, M: () => { v.muted = !v.muted; saveVol(); },
      n: next, N: next, s: skip, S: skip,
      Escape: () => { if (!$('.wp-menu', P.el).classList.contains('hidden')) $('.wp-menu', P.el).classList.add('hidden'); else if (document.fullscreenElement) document.exitFullscreen(); else close(); }
    }[k];
    if (!handled) return;
    e.preventDefault(); e.stopPropagation();
    handled(); showUi(); paint();
  }

  function close(silent) {
    if (!P) return;
    report(true);
    const { el, video, onClose } = P;
    clearInterval(P.raf);
    clearTimeout(P.hideTimer);
    clearTimeout(P.stallTimer);
    stopFeed();
    if (P.msUrl) URL.revokeObjectURL(P.msUrl);
    document.removeEventListener('keydown', P.onKey, true);
    document.removeEventListener('fullscreenchange', P.onFs);
    video.pause();
    video.removeAttribute('src');
    video.load();   // corta la descarga (y el ffmpeg del servidor)
    el.remove();
    document.body.classList.remove('wp-open');
    P = null;
    if (!silent) onClose?.();
  }

  window.addEventListener('beforeunload', () => report(true));
  window.webPlayer = { open, close };
})();
