-- Interfaz de reproducción de CineLocal, al estilo de Netflix / Prime Video / HBO Max.
-- Al mover el ratón aparece todo (sombreados, título, botón central, barra de tiempo y controles)
-- y se oculta sola. Los menús de audio, subtítulos y episodios son los de uosc.

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
    local main_title, sub_title = state.title:match('^(.-) · (.+)$')
    main_title = main_title or state.title
    text(pad + 2 * back_r + 22 * s, top_y - (sub_title and 13 * s or 0), 4, main_title, 34 * s, WHITE, alpha(0, f), true)
    if sub_title then text(pad + 2 * back_r + 22 * s, top_y + 22 * s, 4, sub_title, 23 * s, 'DDDDDD', alpha(0x10, f), false) end

    if not state.fullscreen then
      local bx = w - pad
      state.win_ctls = {}
      for _, b in ipairs({ { 'close', 'close', 'Cerrar' }, { state.maximized and 'filter_none' or 'crop_square', 'maximize', state.maximized and 'Restaurar' or 'Maximizar' }, { 'minimize', 'minimize', 'Minimizar' } }) do
        state.win_ctls[b[2]] = add_control(bx - 40 * s, top_y - 24 * s, bx, top_y + 24 * s, b[2], b[3])
        bx = bx - 52 * s
      end
    end

    -- ---------- centro: −10 s · reproducir/pausa · +10 s
    local cx, cy = w / 2, h / 2
    local big = 62 * s
    local center_play = add_control(cx - big, cy - big, cx + big, cy + big, 'play', nil)
    local skip_gap = 300 * s   -- distancia del botón central a los de ±10 s
    local center_back = add_control(cx - skip_gap - 44 * s, cy - 44 * s, cx - skip_gap + 44 * s, cy + 44 * s, 'back10', nil)
    local center_fwd = add_control(cx + skip_gap - 44 * s, cy - 44 * s, cx + skip_gap + 44 * s, cy + 44 * s, 'fwd10', nil)

    -- ---------- barra de tiempo
    local bar_y = h - 112 * s
    local bar_x1, bar_x2 = pad + 128 * s, w - pad - 128 * s   -- a los lados: tiempo transcurrido y restante
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
    if state.vol_open then add_control(vol_x1, row_y - 22 * s, vol_x2 + 10 * s, row_y + 22 * s, 'volume', nil) end

    local right = {}
    right[#right + 1] = { state.fullscreen and 'fullscreen_exit' or 'fullscreen', 'fullscreen', state.fullscreen and 'Salir de pantalla completa' or 'Pantalla completa' }
    right[#right + 1] = { 'subtitles', 'subs', 'Subtítulos' }
    if state.audio_tracks > 1 then right[#right + 1] = { 'audiotrack', 'audio', 'Audio' } end
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

    -- botón central
    local play_hover = hov == center_play
    icon_soft(cx, cy, state.pause and 'play_arrow' or 'pause', (play_hover and 104 or 96) * s, alpha(0, f), alpha(0x80, f))
    for _, b in ipairs({ { cx - skip_gap, 'replay_10', center_back }, { cx + skip_gap, 'forward_10', center_fwd } }) do
      local hv = hov == b[3]
      icon_soft(b[1], cy, b[2], (hv and 64 or 58) * s, alpha(0, f), alpha(0x80, f))
    end

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
      text(pad, bar_y, 4, fmt_time(pos), 25 * s, WHITE, alpha(0, f), false)
      text(w - pad, bar_y, 6, '-' .. fmt_time(dur - pos), 25 * s, WHITE, alpha(0, f), false)

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
    if hov and hov.tip and state.pressed == nil and hid ~= 'timeline' then
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

  overlay.res_x, overlay.res_y = w, h
  overlay.data = table.concat(A, '\n')
  overlay:update()
end

-- ---------------------------------------------------------------- bucle de animación

local function animating()
  return state.visible and state.fade < 1 or (not state.visible and state.fade > 0) or state.flash ~= nil
end

local function tick()
  local now = mp.get_time()
  -- ocultar tras unos segundos sin mover el ratón (no en pausa, ni arrastrando, ni sobre un botón)
  if state.visible and not state.pause and not state.dragging and not state.menu_open and now - state.last_move > HIDE_AFTER then
    -- sólo se mantiene si el ratón está sobre las barras de arriba o de abajo (no en el centro)
    local s = math.max(0.55, math.min(state.w / 1920, state.h / 1080))
    local on_bars = state.hover and control_at(state.mx, state.my) and (state.my > state.h - 170 * s or state.my < 110 * s)
    if not on_bars then state.visible = false; state.vol_open = false end
  end
  local step = (1 / 30) / FADE_TIME
  if state.visible then state.fade = math.min(1, state.fade + step) else state.fade = math.max(0, state.fade - step) end
  local cursor = (state.visible or state.fade > 0) and 'no' or 'always'
  if cursor ~= state.cursor then state.cursor = cursor; mp.set_property('cursor-autohide', cursor) end
  render()
  if not state.visible and state.fade <= 0 and not state.flash and timer then
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

local function timeline_time(x)
  local s = math.max(0.55, math.min(state.w / 1920, state.h / 1080))
  local x1, x2 = 52 * s, state.w - 52 * s - 128 * s
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
  subs = function() mp.commandv('script-binding', 'uosc/subtitles') end,
  audio = function() mp.commandv('script-binding', 'uosc/audio') end,
  episodes = function() mp.commandv('script-binding', 'uosc/playlist') end,
}

local function on_left(e)
  local x, y = state.mx, state.my
  if e.event == 'down' then
    show()
    local c = control_at(x, y)
    state.down_at = { x, y, c and c.id }
    if c and c.id == 'timeline' and state.dur > 0 then
      state.dragging = 'timeline'
      state.drag_time = timeline_time(x)
      mp.commandv('seek', tostring(state.drag_time), 'absolute', 'keyframes')
    elseif c and c.id == 'volume' then
      state.dragging = 'volume'
      set_volume_at(x)
    elseif c then
      state.pressed = c.id
    end
  elseif e.event == 'up' then
    if state.dragging == 'timeline' then
      mp.commandv('seek', tostring(timeline_time(x)), 'absolute', 'exact')
    elseif state.pressed then
      local c = control_at(x, y)
      if c and c.id == state.pressed and actions[c.id] then actions[c.id]() end
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
    local c = control_at(state.mx, state.my)
    if c and (c.id == 'mute' or c.id == 'volume') then
      mp.commandv('add', 'volume', tostring(dir * 5))
      show()
    else
      seek_rel(dir * 5)
    end
  end
end

mp.add_forced_key_binding('MBTN_LEFT', 'cl-left', on_left, { complex = true })
mp.add_forced_key_binding('MBTN_LEFT_DBL', 'cl-double', on_double)
mp.add_forced_key_binding('WHEEL_UP', 'cl-wheel-up', on_wheel(1))
mp.add_forced_key_binding('WHEEL_DOWN', 'cl-wheel-down', on_wheel(-1))
mp.add_key_binding(nil, 'toggle', function() if state.visible then state.visible = false else show() end; wake() end)

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
  if c and (c.id == 'mute' or c.id == 'volume') then state.vol_open = true
  elseif state.vol_open and state.dragging ~= 'volume' then state.vol_open = false end
  if moved then show() else wake() end
end)

mp.observe_property('pause', 'bool', function(_, v)
  local changed = state.pause ~= v
  state.pause = v
  if changed and state.fade < 0.05 then state.flash = { at = mp.get_time(), icon = v and 'pause' or 'play_arrow' } end
  if v then show() end
  wake()
end)
mp.observe_property('time-pos', 'number', function(_, v) state.pos = v or 0 end)
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
end)
mp.observe_property('user-data/uosc/menu/type', 'native', function(_, v)
  state.menu_open = v ~= nil
  wake()
end)

-- Al empezar cada archivo, mostrar la interfaz un momento (título y duración)
mp.register_event('file-loaded', function() show() end)
