-- Interfaz de reproducción de CineLocal, al estilo de Netflix / Prime Video / HBO Max.
-- Al mover el ratón aparece todo (sombreados, título, botón central, barra de tiempo y controles)
-- y se oculta sola. Los menús de audio, subtítulos y episodios son los de uosc.
-- Con los tiempos de TheIntroDB (los manda CineLocal con «script-message cinelocal-segments <json>») muestra
-- el botón «Saltar intro» / «Saltar resumen» / «Siguiente episodio», visible aunque el resto esté oculto.

local mp = require 'mp'
local utils = require 'mp.utils'

local ICON_FONT = 'MaterialIconsRound-Regular'   -- fuente de iconos de uosc (fonts/uosc_icons.otf)
local TEXT_FONT = 'Segoe UI'
local ACCENT = 'FF6BB2'                          -- #b26bff en el orden BGR de ASS
local WHITE = 'FFFFFF'
local HIDE_AFTER = 2.6                           -- segundos sin mover el ratón
local FADE_TIME = 0.18

local overlay = mp.create_osd_overlay('ass-events')
local state = {
  w = 0, h = 0, mx = -1, my = -1, hover = false,
  visible = false, fade = 0, last_move = 0,
  pause = false, pos = 0, dur = 0, volume = 100, mute = false, fullscreen = false, maximized = false,
  title = '', chapters = {}, pl_pos = 0, pl_count = 1, audio_tracks = 0,
  menu_open = false, pressed = nil, dragging = nil, vol_open = false,
  flash = nil, pending_click = nil, ignore_up = false, down_at = nil,
  thumb = { width = 0, height = 0, disabled = true }, thumb_shown = false,
  -- saltar intro/resumen/créditos: tramos del archivo actual, tramo activo, botón y aviso
  segs = {}, seg = nil, seg_idx = nil, seg_done = {}, auto = {}, pill_fade = 0, pill_last = nil, toast = nil,
  -- panel de audio y subtítulos (dos columnas): pistas del archivo y desplazamiento de cada columna
  panel = false, tracks = {}, panel_scroll = { audio = 0, sub = 0 }, panel_cols = nil,
}

local LANG_NAMES = {
  spa = 'Español', es = 'Español', esp = 'Español', cas = 'Español', eng = 'Inglés', en = 'Inglés',
  fre = 'Francés', fra = 'Francés', fr = 'Francés', ger = 'Alemán', deu = 'Alemán', de = 'Alemán',
  ita = 'Italiano', it = 'Italiano', por = 'Portugués', pt = 'Portugués', jpn = 'Japonés', ja = 'Japonés',
  kor = 'Coreano', ko = 'Coreano', cat = 'Catalán', ca = 'Catalán', chi = 'Chino', zho = 'Chino', zh = 'Chino',
  rus = 'Ruso', ru = 'Ruso', lat = 'Español (Latinoamérica)', ['es-419'] = 'Español (Latinoamérica)',
}
local controls = {}       -- zonas pulsables de la última pintada: {x1,y1,x2,y2,id,tip}
local timer = nil

-- ---------------------------------------------------------------- utilidades ASS

local function esc(s)
  return tostring(s or ''):gsub('\\', '\\\239\187\191'):gsub('{', '\\{'):gsub('}', '\\}'):gsub('\n', '\\N')
end

local function alpha(base, f)            -- base: 0 opaco … 255 transparente; f: visibilidad 0..1
  local a = 255 - (255 - base) * f
  return string.format('%02X', math.max(0, math.min(255, math.floor(a + 0.5))))
end

local A = {}                             -- líneas ASS de la pintada en curso
local function push(s) A[#A + 1] = s end

-- Rectángulo (redondeado con el truco del borde: libass une los bordes en curva)
local function rect(x1, y1, x2, y2, color, a, r, blur)
  r = r or 0
  local bx1, by1, bx2, by2 = x1 + r, y1 + r, x2 - r, y2 - r
  if bx2 < bx1 then bx1, bx2 = (x1 + x2) / 2, (x1 + x2) / 2 end
  if by2 < by1 then by1, by2 = (y1 + y2) / 2, (y1 + y2) / 2 end
  push(string.format('{\\an7\\pos(0,0)\\shad0\\bord%.2f\\blur%.2f\\1c&H%s&\\3c&H%s&\\1a&H%s&\\3a&H%s&\\p1}m %.1f %.1f l %.1f %.1f %.1f %.1f %.1f %.1f{\\p0}',
    r, blur or 0, color, color, a, a, bx1, by1, bx2, by1, bx2, by2, bx1, by2))
end

-- Rectángulo de esquinas redondeadas trazado con curvas (admite borde de otro color)
local function rrect(x1, y1, x2, y2, r, fill, fill_a, border, border_a, bord)
  local c = r * 0.4477    -- 1 - 0.5523: puntos de control de un cuarto de círculo
  push(string.format('{\\an7\\pos(0,0)\\shad0\\blur0\\bord%.2f\\1c&H%s&\\3c&H%s&\\1a&H%s&\\3a&H%s&\\p1}' ..
    'm %.1f %.1f l %.1f %.1f b %.1f %.1f %.1f %.1f %.1f %.1f l %.1f %.1f b %.1f %.1f %.1f %.1f %.1f %.1f ' ..
    'l %.1f %.1f b %.1f %.1f %.1f %.1f %.1f %.1f l %.1f %.1f b %.1f %.1f %.1f %.1f %.1f %.1f{\\p0}',
    bord or 0, fill, border or fill, fill_a, border_a or fill_a,
    x1 + r, y1, x2 - r, y1, x2 - c, y1, x2, y1 + c, x2, y1 + r,
    x2, y2 - r, x2, y2 - c, x2 - c, y2, x2 - r, y2,
    x1 + r, y2, x1 + c, y2, x1, y2 - c, x1, y2 - r,
    x1, y1 + r, x1, y1 + c, x1 + c, y1, x1 + r, y1))
end

local function circle(x, y, radius, color, a)
  rect(x - radius, y - radius, x + radius, y + radius, color, a, radius)
end

local function text(x, y, an, s, size, color, a, bold, font)
  push(string.format('{\\an%d\\pos(%.1f,%.1f)\\fn%s\\fs%.1f\\b%d\\bord0\\shad0\\1c&H%s&\\1a&H%s&}%s',
    an, x, y, font or TEXT_FONT, size, bold and 1 or 0, color or WHITE, a, esc(s)))
end

local function icon(x, y, name, size, color, a)
  push(string.format('{\\an5\\pos(%.1f,%.1f)\\fn%s\\fs%.1f\\bord0\\shad0\\1c&H%s&\\1a&H%s&}%s',
    x, y, ICON_FONT, size, color or WHITE, a, name))
end

-- Icono con sombra difuminada detrás, para que se lea sobre escenas claras sin necesidad de un fondo
local function icon_soft(x, y, name, size, a, shadow_a)
  push(string.format('{\\an5\\pos(%.1f,%.1f)\\fn%s\\fs%.1f\\bord%.1f\\shad0\\blur%.1f\\1c&H000000&\\3c&H000000&\\1a&H%s&\\3a&H%s&}%s',
    x, y, ICON_FONT, size, size * 0.06, size * 0.12, shadow_a, shadow_a, name))
  icon(x, y, name, size, WHITE, a)
end

local function fmt_time(t)
  t = math.max(0, math.floor(t or 0))
  local h, m, s = math.floor(t / 3600), math.floor(t / 60) % 60, t % 60
  if h > 0 then return string.format('%d:%02d:%02d', h, m, s) end
  return string.format('%d:%02d', m, s)
end

local function inside(c, x, y) return x >= c[1] and x <= c[3] and y >= c[2] and y <= c[4] end

local function control_at(x, y)
  for i = #controls, 1, -1 do if inside(controls[i], x, y) then return controls[i] end end
  return nil
end

local function add_control(x1, y1, x2, y2, id, tip)
  local c = { x1, y1, x2, y2, id = id, tip = tip }
  controls[#controls + 1] = c
  return c
end

-- ---------------------------------------------------------------- miniaturas (thumbfast)

mp.register_script_message('thumbfast-info', function(json)
  local data = utils.parse_json(json)
  if type(data) == 'table' then state.thumb = data end
end)

local function thumb_clear()
  if state.thumb_shown then mp.commandv('script-message-to', 'thumbfast', 'clear'); state.thumb_shown = false end
end

-- ---------------------------------------------------------------- saltar intro / resumen / créditos

local SEG_LABELS = { intro = 'Saltar intro', recap = 'Saltar resumen' }
local SEG_TOASTS = { intro = 'Intro saltada', recap = 'Resumen saltado' }

-- final del tramo en segundos (sin final = hasta el final del archivo)
local function seg_end(sg)
  local e = sg['end']
  if not e or (state.dur > 0 and e > state.dur) then e = state.dur end
  return e or 0
end

-- texto del botón para un tramo; nil = sin botón (créditos del último capítulo o de una película)
local function seg_label(sg)
  if SEG_LABELS[sg.kind] then return SEG_LABELS[sg.kind] end
  if (sg.kind == 'credits' or sg.kind == 'preview') and state.pl_pos < state.pl_count - 1 then return 'Siguiente episodio' end
  return nil
end

local function find_segment(t)
  for i, sg in ipairs(state.segs) do
    local e = seg_end(sg)
    if e > 0 and t >= (sg.start or 0) and t < e - 0.5 and seg_label(sg) then return sg, i end
  end
  return nil, nil
end

-- longitud aproximada del texto (en caracteres UTF-8)
local function ulen(s) return select(2, s:gsub('[^\128-\191]', '')) end

-- nombre de una pista: el idioma y, si lo tiene, su título («Español · Castellano», «Inglés · Comentarios»)
local function track_label(t)
  local title = t.title and t.title ~= '' and t.title or nil
  local code = t.lang
  -- pista externa sin idioma ni título propio: mpv pone el nombre del archivo («Peli.es.srt»)
  if title and title:match('%.%w%w%w?%w?$') then
    code = code or title:match('%.(%a%a%a?)%.%w+$') or title:match('^(%a%a%a?)%.%w+$')
    title = nil
  end
  local lang = code and (LANG_NAMES[code:lower()] or code:upper()) or nil
  if title and lang and title:lower():find(lang:lower(), 1, true) then title = nil end
  local label = lang or title or ('Pista ' .. t.id)
  if lang and title then label = label .. ' · ' .. title end
  if t.forced then label = label .. ' (forzados)' end
  if ulen(label) > 30 then label = label:sub(1, 30):gsub('[\128-\255]*$', '') .. '…' end
  return label
end

-- ---------------------------------------------------------------- pintado

local function render()
  controls = {}
  A = {}
  local w, h, f = state.w, state.h, state.fade
  if w <= 0 or h <= 0 then return end
  local s = math.max(0.55, math.min(w / 1920, h / 1080))
  local mx, my = state.mx, state.my

  -- Indicador central breve al pausar/reanudar con el teclado (con la interfaz oculta)
  if state.flash and f < 0.05 then
    local k = 1 - math.min(1, (mp.get_time() - state.flash.at) / 0.6)
    if k > 0 then
      icon_soft(w / 2, h / 2, state.flash.icon, 96 * s * (1.1 - 0.1 * k), alpha(0, k), alpha(0x80, k))
    else
      state.flash = nil
    end
  end

  if f > 0.001 and not state.menu_open then
    -- sombreados superior e inferior (rectángulos negros muy difuminados)
    rect(-50, -50, w + 50, h * 0.17, '000000', alpha(0x50, f), 0, h * 0.09)
    rect(-50, h * 0.66, w + 50, h + 80, '000000', alpha(0x30, f), 0, h * 0.11)

    local pad = 52 * s

    -- ---------- arriba: volver + título · controles de ventana
    local top_y = 58 * s
    local back_r = 26 * s
    local back_ctl = add_control(pad - 14 * s, top_y - back_r - 8 * s, pad + 2 * back_r + 8 * s, top_y + back_r + 8 * s, 'back', 'Volver a CineLocal')
    -- «Serie · T1:E2 · Nombre»: la serie y, a su lado y más tenue, «T1:E2 Nombre»
    local main_title, sub_title = state.title:match('^(.-) · (T%d+:E%d+.*)$')
    main_title = main_title or state.title
    local tx0 = pad + 2 * back_r + 22 * s
    text(tx0, top_y, 4, main_title, 36 * s, WHITE, alpha(0, f), true)
    if sub_title then
      text(tx0 + ulen(main_title) * 36 * s * 0.47 + 18 * s, top_y, 4, sub_title:gsub(' · ', ' '), 36 * s, 'B4B4B4', alpha(0, f), false)
    end

    if not state.fullscreen then
      local bx = w - pad
      state.win_ctls = {}
      for _, b in ipairs({ { 'close', 'close', 'Cerrar' }, { state.maximized and 'filter_none' or 'crop_square', 'maximize', state.maximized and 'Restaurar' or 'Maximizar' }, { 'minimize', 'minimize', 'Minimizar' } }) do
        state.win_ctls[b[2]] = add_control(bx - 40 * s, top_y - 24 * s, bx, top_y + 24 * s, b[2], b[3])
        bx = bx - 52 * s
      end
    end

    -- ---------- barra de tiempo, de lado a lado (el tiempo va en la fila de abajo)
    local bar_y = h - 112 * s
    local bar_x1, bar_x2 = pad, w - pad
    state.bar = { bar_x1, bar_x2 }   -- timeline_time() usa estos mismos extremos
    add_control(bar_x1 - 6 * s, bar_y - 20 * s, bar_x2 + 6 * s, bar_y + 20 * s, 'timeline', nil)

    -- ---------- fila inferior
    local row_y = h - 54 * s
    local x = pad + 20 * s
    local left_buttons = {
      { state.pause and 'play_arrow' or 'pause', 'play', state.pause and 'Reproducir' or 'Pausa' },
      { 'replay_10', 'back10', 'Retroceder 10 s' },
      { 'forward_10', 'fwd10', 'Avanzar 10 s' },
      { (state.mute or state.volume == 0) and 'volume_off' or (state.volume < 50 and 'volume_down' or 'volume_up'), 'mute', state.mute and 'Activar sonido' or 'Silenciar' },
    }
    local row_icons = {}
    for _, b in ipairs(left_buttons) do
      local c = add_control(x - 26 * s, row_y - 26 * s, x + 26 * s, row_y + 26 * s, b[2], b[3])
      row_icons[#row_icons + 1] = { x, b[1], c }
      x = x + 66 * s
    end
    -- control de volumen: se despliega al pasar por el altavoz
    local vol_x1, vol_x2 = x - 30 * s, x + 120 * s
    -- la zona empieza justo donde acaba el altavoz (sin hueco que la cierre) y es igual de alta
    if state.vol_open then add_control(x - 40 * s, row_y - 30 * s, vol_x2 + 16 * s, row_y + 30 * s, 'volume', nil) end
    -- tiempo «11:19 / 1:00:37» tras el volumen (se aparta al desplegarlo)
    local time_x = (state.vol_open and vol_x2 + 30 * s or x - 6 * s)

    -- derecha, de derecha a izquierda: pantalla completa · audio y subtítulos · episodios · siguiente
    local right = {}
    right[#right + 1] = { state.fullscreen and 'fullscreen_exit' or 'fullscreen', 'fullscreen', state.fullscreen and 'Salir de pantalla completa' or 'Pantalla completa' }
    right[#right + 1] = { 'subtitles', 'tracks', 'Audio y subtítulos' }
    if state.pl_count > 1 then right[#right + 1] = { 'video_library', 'episodes', 'Episodios' } end
    if state.pl_pos < state.pl_count - 1 then right[#right + 1] = { 'skip_next', 'next', 'Siguiente episodio' } end
    local rx = w - pad - 20 * s
    for _, b in ipairs(right) do
      local c = add_control(rx - 26 * s, row_y - 26 * s, rx + 26 * s, row_y + 26 * s, b[2], b[3])
      row_icons[#row_icons + 1] = { rx, b[1], c }
      rx = rx - 66 * s
    end

    -- con las zonas ya conocidas, decidir qué está bajo el ratón
    local hov = state.hover and control_at(mx, my) or nil
    local hid = hov and hov.id

    -- volver
    local back_hover = hov == back_ctl
    if back_hover then circle(pad + back_r, top_y, back_r + 6 * s, WHITE, alpha(0xD8, f)) end
    icon(pad + back_r, top_y, 'arrow_back', 40 * s, WHITE, alpha(0, f))

    -- ventana
    if not state.fullscreen then
      local bx = w - pad
      for _, b in ipairs({ { 'close', 'close' }, { state.maximized and 'filter_none' or 'crop_square', 'maximize' }, { 'minimize', 'minimize' } }) do
        local hv = hov == state.win_ctls[b[2]]
        if hv then rect(bx - 42 * s, top_y - 22 * s, bx + 2 * s, top_y + 22 * s, b[2] == 'close' and '2B11E8' or WHITE, alpha(b[2] == 'close' and 0x20 or 0xD8, f), 6 * s) end
        icon(bx - 20 * s, top_y, b[1], 26 * s, WHITE, alpha(0, f))
        bx = bx - 52 * s
      end
    end

    -- barra de tiempo
    local tl_hover = hid == 'timeline' or state.dragging == 'timeline'
    local th = (tl_hover and 9 or 5) * s
    local dur = state.dur
    local pos = state.dragging == 'timeline' and state.drag_time or state.pos
    rect(bar_x1, bar_y - th / 2, bar_x2, bar_y + th / 2, WHITE, alpha(0xAA, f), th / 2)
    if dur > 0 then
      local px = bar_x1 + (bar_x2 - bar_x1) * math.max(0, math.min(1, pos / dur))
      if tl_hover and mx >= bar_x1 and mx <= bar_x2 then
        local hx = math.max(bar_x1, math.min(bar_x2, mx))
        rect(bar_x1, bar_y - th / 2, hx, bar_y + th / 2, WHITE, alpha(0x90, f), th / 2)
      end
      rect(bar_x1, bar_y - th / 2, math.max(bar_x1 + th, px), bar_y + th / 2, ACCENT, alpha(0, f), th / 2)
      for _, ch in ipairs(state.chapters) do
        if ch.time and ch.time > 0 and ch.time < dur then
          local chx = bar_x1 + (bar_x2 - bar_x1) * ch.time / dur
          rect(chx - 1.5 * s, bar_y - th / 2, chx + 1.5 * s, bar_y + th / 2, '000000', alpha(0x40, f))
        end
      end
      circle(px, bar_y, (tl_hover and 13 or 9) * s, ACCENT, alpha(0, f))
      text(time_x, row_y, 4, fmt_time(pos) .. ' / ' .. fmt_time(dur), 26 * s, WHITE, alpha(0, f), true)

      -- tiempo y miniatura bajo el ratón
      if tl_hover and mx >= bar_x1 - 6 * s and mx <= bar_x2 + 6 * s then
        local t = dur * math.max(0, math.min(1, (mx - bar_x1) / (bar_x2 - bar_x1)))
        local tx = math.max(bar_x1 + 40 * s, math.min(bar_x2 - 40 * s, mx))
        local label_y = bar_y - 34 * s
        local tw_, th_ = state.thumb.width or 0, state.thumb.height or 0
        if not state.thumb.disabled and tw_ > 0 and th_ > 0 then
          local x0 = math.floor(math.max(pad, math.min(w - pad - tw_, mx - tw_ / 2)))
          local y0 = math.floor(bar_y - 52 * s - th_)
          rect(x0 - 3 * s, y0 - 3 * s, x0 + tw_ + 3 * s, y0 + th_ + 3 * s, '000000', alpha(0x10, f), 6 * s)
          mp.commandv('script-message-to', 'thumbfast', 'thumb', tostring(t), tostring(x0), tostring(y0))
          state.thumb_shown = true
          label_y = bar_y - 30 * s
        end
        rect(tx - 40 * s, label_y - 16 * s, tx + 40 * s, label_y + 16 * s, '141414', alpha(0x18, f), 8 * s)
        text(tx, label_y, 5, fmt_time(t), 22 * s, WHITE, alpha(0, f), true)
      else
        thumb_clear()
      end
    end

    -- fila inferior: iconos
    for _, it in ipairs(row_icons) do
      local hv = hov == it[3]
      icon(it[1], row_y, it[2], (hv and 44 or 40) * s, hv and ACCENT or WHITE, alpha(0, f))
    end
    -- panel de audio y subtítulos: dos columnas sobre la fila de botones, a la derecha
    state.panel_cols = nil
    if state.panel then
      local audio, subs = {}, { { id = 'no', label = 'Desactivados', on = true } }
      for _, t in ipairs(state.tracks) do
        if t.type == 'audio' then audio[#audio + 1] = { id = t.id, label = track_label(t), on = t.selected }
        elseif t.type == 'sub' then
          subs[#subs + 1] = { id = t.id, label = track_label(t), on = t.selected }
          if t.selected then subs[1].on = false end
        end
      end
      local col_w, row_h, head_h, px = 330 * s, 62 * s, 92 * s, 40 * s
      local px2, py2 = w - pad, bar_y - 34 * s   -- encima de la barra de tiempo
      local fit = math.max(2, math.floor((py2 - 150 * s - head_h - 24 * s) / row_h))
      local rows = math.min(fit, math.max(#audio, #subs))
      local px1, py1 = px2 - 2 * col_w - 2 * px, py2 - head_h - rows * row_h - 24 * s
      add_control(px1, py1, px2, py2, 'panel', nil)   -- dentro del panel, un clic en el hueco no lo cierra
      rrect(px1, py1, px2, py2, 6 * s, '2E2222', alpha(0x08, f), '4A3C3C', alpha(0x20, f), 1.5 * s)
      state.panel_cols = {}
      for ci, col in ipairs({ { 'audio', 'Audio', audio }, { 'sub', 'Subtítulos', subs } }) do
        local cx1 = px1 + px + (ci - 1) * col_w
        state.panel_cols[col[1]] = { cx1, py1 + head_h, cx1 + col_w, py2, #col[3], rows }
        text(cx1 + 22 * s, py1 + head_h / 2 + 6 * s, 4, col[2], 32 * s, WHITE, alpha(0, f), true)
        local off = math.max(0, math.min(state.panel_scroll[col[1]], #col[3] - rows))
        state.panel_scroll[col[1]] = off
        for i = 1, rows do
          local it = col[3][i + off]
          if not it then break end
          local ry = py1 + head_h + (i - 0.5) * row_h
          local c = add_control(cx1, ry - row_h / 2, cx1 + col_w - 10 * s, ry + row_h / 2, 'pick', nil)
          c.pick = { col[1], it.id }
          local hv = hov == c or (state.hover and inside(c, mx, my))
          if it.on then icon(cx1 - 2 * s, ry, 'check', 30 * s, ACCENT, alpha(0, f)) end
          text(cx1 + 22 * s, ry, 4, it.label, 26 * s, (it.on or hv) and WHITE or 'AAAAAA', alpha(0, f), it.on)
        end
        if #col[3] > rows then
          text(cx1 + col_w - 20 * s, py1 + head_h / 2 + 6 * s, 6, (off + 1) .. '–' .. math.min(#col[3], off + rows) .. ' de ' .. #col[3], 18 * s, '888888', alpha(0, f), false)
        end
      end
    end

    -- volumen desplegado
    if state.vol_open then
      local vol = state.mute and 0 or math.min(100, state.volume)
      local sx1, sx2 = vol_x1 + 12 * s, vol_x2
      rect(sx1, row_y - 3 * s, sx2, row_y + 3 * s, WHITE, alpha(0xAA, f), 3 * s)
      local vx = sx1 + (sx2 - sx1) * vol / 100
      rect(sx1, row_y - 3 * s, math.max(sx1 + 6 * s, vx), row_y + 3 * s, WHITE, alpha(0, f), 3 * s)
      circle(vx, row_y, 9 * s, WHITE, alpha(0, f))
      state.vol_slider = { sx1, sx2 }
    end

    -- texto de ayuda del botón bajo el ratón
    if hov and hov.tip and state.pressed == nil and hid ~= 'timeline' and not state.panel then
      local ty = hov[2] - 22 * s
      if ty < 40 * s then ty = hov[4] + 24 * s end
      local tx = math.max(80 * s, math.min(w - 80 * s, (hov[1] + hov[3]) / 2))
      local tw = (#hov.tip * 10 + 24) * s
      rect(tx - tw / 2, ty - 16 * s, tx + tw / 2, ty + 16 * s, '141414', alpha(0x18, f), 8 * s)
      text(tx, ty, 5, hov.tip, 20 * s, WHITE, alpha(0, f), false)
    end
  else
    thumb_clear()
  end

  -- botón «Saltar intro» / «Saltar resumen» / «Siguiente episodio»: abajo a la derecha, sobre la barra de tiempo,
  -- visible durante todo el tramo aunque el resto de la interfaz esté oculta
  local pill_y2 = h - 162 * s
  local pf = state.pill_fade
  if pf > 0.001 and state.pill_last and not state.menu_open then
    local label = state.pill_last
    local fs = 25 * s
    local x2 = w - 52 * s
    local x1 = x2 - (24 * s + 32 * s + 12 * s + ulen(label) * fs * 0.55 + 28 * s)
    local y1, y2 = pill_y2 - 58 * s, pill_y2
    local ctl = state.seg and add_control(x1, y1, x2, y2, 'skip', nil)
    local hv = ctl and state.hover and control_at(mx, my) == ctl
    rrect(x1, y1, x2, y2, 8 * s, hv and ACCENT or '1A1414', alpha(hv and 0 or 0x40, pf), hv and ACCENT or WHITE, alpha(hv and 0 or 0x40, pf), 2 * s)
    icon(x1 + 24 * s + 16 * s, (y1 + y2) / 2, 'skip_next', 34 * s, WHITE, alpha(0, pf))
    text(x1 + 24 * s + 32 * s + 12 * s, (y1 + y2) / 2, 4, label, fs, WHITE, alpha(0, pf), true)
    pill_y2 = y1 - 14 * s
  end

  -- aviso breve tras saltar solo la intro o el resumen
  if state.toast then
    local k = mp.get_time() - state.toast.at
    if k > 2.4 then
      state.toast = nil
    else
      local ta = math.max(0, math.min(1, k / 0.15, (2.4 - k) / 0.4))
      local fs = 23 * s
      local x2 = w - 52 * s
      local x1 = x2 - (20 * s + 30 * s + 10 * s + ulen(state.toast.text) * fs * 0.52 + 24 * s)
      local y1, y2 = pill_y2 - 50 * s, pill_y2
      rrect(x1, y1, x2, y2, 8 * s, '1A1414', alpha(0x40, ta))
      icon(x1 + 20 * s + 15 * s, (y1 + y2) / 2, 'check_circle', 30 * s, ACCENT, alpha(0, ta))
      text(x1 + 20 * s + 30 * s + 10 * s, (y1 + y2) / 2, 4, state.toast.text, fs, WHITE, alpha(0, ta), false)
    end
  end

  overlay.res_x, overlay.res_y = w, h
  overlay.data = table.concat(A, '\n')
  overlay:update()
end

-- ---------------------------------------------------------------- bucle de animación

local function animating()
  return state.visible and state.fade < 1 or (not state.visible and state.fade > 0) or state.flash ~= nil
    or state.seg ~= nil or state.pill_fade > 0 or state.toast ~= nil
end

local function tick()
  local now = mp.get_time()
  -- ocultar tras unos segundos sin mover el ratón (no en pausa, ni arrastrando, ni sobre un botón)
  if state.visible and not state.pause and not state.dragging and not state.menu_open and not state.panel and now - state.last_move > HIDE_AFTER then
    -- sólo se mantiene si el ratón está sobre las barras de arriba o de abajo (no en el centro)
    local s = math.max(0.55, math.min(state.w / 1920, state.h / 1080))
    local on_bars = state.hover and control_at(state.mx, state.my) and (state.my > state.h - 170 * s or state.my < 110 * s)
    if not on_bars then state.visible = false; state.vol_open = false end
  end
  local step = (1 / 30) / FADE_TIME
  if state.visible then state.fade = math.min(1, state.fade + step) else state.fade = math.max(0, state.fade - step) end
  if state.seg and not state.menu_open then state.pill_fade = math.min(1, state.pill_fade + step) else state.pill_fade = math.max(0, state.pill_fade - step) end
  local cursor = (state.visible or state.fade > 0) and 'no' or 'always'
  if cursor ~= state.cursor then state.cursor = cursor; mp.set_property('cursor-autohide', cursor) end
  render()
  if not state.visible and state.fade <= 0 and not state.flash and not state.seg and state.pill_fade <= 0 and not state.toast and timer then
    timer:kill()
  end
end

timer = mp.add_periodic_timer(1 / 30, tick)
timer:kill()

local function wake()
  if not timer:is_enabled() then timer:resume() end
end

local function show()
  state.visible = true
  state.last_move = mp.get_time()
  wake()
end

-- ---------------------------------------------------------------- acciones

local function seek_rel(sec) mp.commandv('seek', tostring(sec), 'relative', 'exact') end

-- Saltar el tramo: intro y resumen, al final del tramo (+0,5 s); créditos, al siguiente capítulo
local function do_skip(sg)
  if not sg then return false end
  if SEG_LABELS[sg.kind] then
    local target = seg_end(sg) + 0.5
    if state.dur > 0 then target = math.min(target, state.dur - 1) end
    mp.commandv('seek', tostring(target), 'absolute', 'exact')
  else
    mp.commandv('playlist-next')
  end
  state.seg = nil          -- el botón se desvanece ya (seg_idx se conserva hasta salir del tramo)
  wake()
  return true
end

-- Al cambiar la posición: ¿empieza o acaba un tramo? Con el salto automático activado se salta una vez por archivo
local function update_segment()
  local sg, i = find_segment(state.pos)
  if i == state.seg_idx then return end
  state.seg, state.seg_idx = sg, i
  if sg then
    state.pill_last = seg_label(sg)
    if state.auto[sg.kind] and not state.seg_done[i] and state.dragging ~= 'timeline' then
      state.seg_done[i] = true
      do_skip(sg)
      state.toast = { text = SEG_TOASTS[sg.kind], at = mp.get_time() }
    end
  end
  wake()
end

-- Tiempo bajo el ratón, con los extremos de la barra tal y como se dibujó
local function timeline_time(x)
  if not state.bar then return state.pos end
  local x1, x2 = state.bar[1], state.bar[2]
  return state.dur * math.max(0, math.min(1, (x - x1) / (x2 - x1)))
end

local function set_volume_at(x)
  local sl = state.vol_slider
  if not sl then return end
  local v = math.floor(100 * math.max(0, math.min(1, (x - sl[1]) / (sl[2] - sl[1]))) + 0.5)
  mp.set_property_number('volume', v)
  if state.mute and v > 0 then mp.set_property_bool('mute', false) end
end

local actions = {
  play = function() mp.commandv('cycle', 'pause') end,
  back10 = function() seek_rel(-10) end,
  fwd10 = function() seek_rel(10) end,
  mute = function() mp.commandv('cycle', 'mute') end,
  back = function() mp.commandv('quit') end,
  close = function() mp.commandv('quit') end,
  minimize = function() mp.commandv('cycle', 'window-minimized') end,
  maximize = function() mp.commandv('cycle', 'window-maximized') end,
  fullscreen = function() mp.commandv('cycle', 'fullscreen') end,
  next = function() mp.commandv('playlist-next') end,
  tracks = function() state.panel = not state.panel; state.panel_scroll = { audio = 0, sub = 0 } end,
  episodes = function() state.panel = false; mp.commandv('script-binding', 'uosc/playlist') end,
  skip = function() do_skip(state.seg) end,
}

-- elegir una pista del panel: { 'audio' | 'sub', id | 'no' }
local function pick_track(p)
  mp.set_property(p[1] == 'audio' and 'aid' or 'sid', tostring(p[2]))
end

local function on_left(e)
  local x, y = state.mx, state.my
  if e.event == 'down' then
    show()
    local c = control_at(x, y)
    -- con el panel abierto, un clic fuera de él (y de su botón) sólo lo cierra
    if state.panel and not (c and (c.id == 'panel' or c.id == 'pick' or c.id == 'tracks')) then
      state.panel = false
      state.down_at, state.ignore_up = { x, y, 'panel' }, true
      wake()
      return
    end
    state.down_at = { x, y, c and c.id }
    if c and c.id == 'timeline' and state.dur > 0 then
      state.dragging = 'timeline'
      state.drag_time = timeline_time(x)
      mp.commandv('seek', tostring(state.drag_time), 'absolute', 'keyframes')
    elseif c and c.id == 'volume' then
      state.dragging = 'volume'
      set_volume_at(x)
    elseif c then
      state.pressed, state.pressed_pick = c.id, c.pick
    end
  elseif e.event == 'up' then
    if state.dragging == 'timeline' then
      mp.commandv('seek', tostring(timeline_time(x)), 'absolute', 'exact')
    elseif state.pressed then
      local c = control_at(x, y)
      if c and c.id == state.pressed then
        if c.pick then
          local p = state.pressed_pick
          if p and p[1] == c.pick[1] and p[2] == c.pick[2] then pick_track(c.pick) end
        elseif actions[c.id] then actions[c.id]() end
      end
    elseif state.down_at and not state.down_at[3] and not state.ignore_up then
      -- clic en el vídeo: pausa (esperando por si es un doble clic, que pone pantalla completa)
      if state.pending_click then state.pending_click:kill() end
      state.pending_click = mp.add_timeout(0.24, function() state.pending_click = nil; mp.commandv('cycle', 'pause') end)
    end
    state.dragging, state.pressed, state.down_at, state.ignore_up = nil, nil, nil, false
  end
  wake()
end

local function on_double(e)
  local c = control_at(state.mx, state.my)
  if c then return end
  if state.pending_click then state.pending_click:kill(); state.pending_click = nil end
  state.ignore_up = true
  mp.commandv('cycle', 'fullscreen')
end

local function on_wheel(dir)
  return function()
    -- en una columna del panel con más pistas de las que caben: desplazarla
    for kind, col in pairs(state.panel and state.panel_cols or {}) do
      if inside(col, state.mx, state.my) then
        if col[5] > col[6] then state.panel_scroll[kind] = math.max(0, math.min(col[5] - col[6], state.panel_scroll[kind] - dir)) end
        show()
        return
      end
    end
    local c = control_at(state.mx, state.my)
    if c and (c.id == 'mute' or c.id == 'volume') then
      mp.commandv('add', 'volume', tostring(dir * 5))
      show()
    else
      seek_rel(dir * 5)
    end
  end
end

-- Botón izquierdo en una sección propia (como uosc): sobre la barra de tiempo o la de volumen se activa sin
-- allow-vo-dragging, para que en ventana aparte arrastrarlas no mueva la ventana; en el resto, el vídeo la sigue moviendo.
mp.set_key_bindings({ { 'mbtn_left', function() on_left({ event = 'up' }) end, function() on_left({ event = 'down' }) end } }, 'cl-left', 'force')
local function update_window_drag()
  local c = state.hover and control_at(state.mx, state.my)
  local block = state.dragging ~= nil or (c and (c.id == 'timeline' or c.id == 'volume'))
  local flags = block and '' or 'allow-vo-dragging+allow-hide-cursor'
  if flags ~= state.left_flags then
    mp.enable_key_bindings('cl-left', flags)
    state.left_flags = flags
  end
end
update_window_drag()
mp.add_forced_key_binding('MBTN_LEFT_DBL', 'cl-double', on_double)
mp.add_forced_key_binding('WHEEL_UP', 'cl-wheel-up', on_wheel(1))
mp.add_forced_key_binding('WHEEL_DOWN', 'cl-wheel-down', on_wheel(-1))
mp.add_key_binding(nil, 'toggle', function() if state.visible then state.visible = false else show() end; wake() end)
-- tecla s (input.conf): pulsa el botón «Saltar…» si está a la vista; si no, la captura de pantalla de siempre
mp.add_key_binding(nil, 'skip', function() if not do_skip(state.seg) then mp.commandv('screenshot') end end)

-- Tiempos de TheIntroDB para el archivo actual: {path, segments = [{kind, start, end}], autoIntro, autoRecap}
mp.register_script_message('cinelocal-segments', function(json)
  local d = utils.parse_json(json)
  if type(d) ~= 'table' then return end
  if d.path and d.path ~= mp.get_property('path') then return end   -- llegó tarde: ya se reproduce otro
  state.segs = type(d.segments) == 'table' and d.segments or {}
  state.auto = { intro = d.autoIntro == true, recap = d.autoRecap == true }
  state.seg, state.seg_idx, state.seg_done = nil, nil, {}
  update_segment()
end)

mp.register_event('start-file', function()
  state.panel = false
  state.segs, state.seg, state.seg_idx, state.seg_done, state.pill_last = {}, nil, nil, {}, nil
end)

-- ---------------------------------------------------------------- propiedades

mp.observe_property('osd-dimensions', 'native', function(_, d)
  if d then state.w, state.h = d.w or 0, d.h or 0; wake() end
end)

mp.observe_property('mouse-pos', 'native', function(_, m)
  if not m then return end
  local moved = math.abs((m.x or 0) - state.mx) > 1 or math.abs((m.y or 0) - state.my) > 1
  state.mx, state.my, state.hover = m.x or 0, m.y or 0, m.hover ~= false
  if not state.hover then
    if not state.pause then state.last_move = 0 end
    state.vol_open = false
    wake()
    return
  end
  if state.dragging == 'timeline' then
    state.drag_time = timeline_time(state.mx)
    mp.commandv('seek', tostring(state.drag_time), 'absolute', 'keyframes')
  elseif state.dragging == 'volume' then
    set_volume_at(state.mx)
  end
  -- abrir/cerrar el volumen según el ratón
  local c = control_at(state.mx, state.my)
  if c and (c.id == 'mute' or c.id == 'volume') then
    state.vol_open = true
    if state.vol_close then state.vol_close:kill(); state.vol_close = nil end
  elseif state.vol_open and state.dragging ~= 'volume' and not state.vol_close then
    -- se cierra si el ratón sigue fuera un momento: al ir del altavoz a la barra no desaparece
    state.vol_close = mp.add_timeout(0.45, function()
      state.vol_close = nil
      local c2 = control_at(state.mx, state.my)
      if state.dragging ~= 'volume' and not (c2 and (c2.id == 'mute' or c2.id == 'volume')) then state.vol_open = false; wake() end
    end)
  end
  update_window_drag()
  if moved then show() else wake() end
end)

mp.observe_property('pause', 'bool', function(_, v)
  local changed = state.pause ~= v
  state.pause = v
  if changed and state.fade < 0.05 then state.flash = { at = mp.get_time(), icon = v and 'pause' or 'play_arrow' } end
  if v then show() end
  wake()
end)
mp.observe_property('time-pos', 'number', function(_, v) state.pos = v or 0; if #state.segs > 0 then update_segment() end end)
mp.observe_property('duration', 'number', function(_, v) state.dur = v or 0 end)
mp.observe_property('volume', 'number', function(_, v) state.volume = v or 100; wake() end)
mp.observe_property('mute', 'bool', function(_, v) state.mute = v; wake() end)
mp.observe_property('fullscreen', 'bool', function(_, v) state.fullscreen = v; wake() end)
mp.observe_property('window-maximized', 'bool', function(_, v) state.maximized = v; wake() end)
mp.observe_property('media-title', 'string', function(_, v) state.title = v or '' end)
mp.observe_property('chapter-list', 'native', function(_, v) state.chapters = v or {} end)
mp.observe_property('playlist-pos', 'number', function(_, v) state.pl_pos = v or 0 end)
mp.observe_property('playlist-count', 'number', function(_, v) state.pl_count = v or 1 end)
mp.observe_property('track-list', 'native', function(_, list)
  local n = 0
  for _, t in ipairs(list or {}) do if t.type == 'audio' then n = n + 1 end end
  state.audio_tracks = n
  state.tracks = list or {}
  wake()
end)
mp.observe_property('user-data/uosc/menu/type', 'native', function(_, v)
  state.menu_open = v ~= nil
  wake()
end)

-- Al empezar cada archivo, mostrar la interfaz un momento (título y duración)
mp.register_event('file-loaded', function() show() end)
