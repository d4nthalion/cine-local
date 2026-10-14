// Reproductor integrado en Windows: mpv dibuja dentro de la ventana de CineLocal (--wid), pero
// Chromium pinta su contenido por encima. Este ayudante sube la ventana de mpv al frente con
// SetWindowPos. Es un proceso de PowerShell que se arranca una vez y recibe órdenes por stdin,
// para no pagar el arranque de PowerShell en cada reproducción ni añadir módulos nativos.
const { spawn } = require('child_process');

const SCRIPT = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class CineLocalWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr p, EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] static extern bool EnableWindow(IntPtr h, bool enable);
  // Pone encima de sus hermanas las ventanas de clase "mpv" hijas de 'parent' y las habilita:
  // mpv crea su ventana incrustada deshabilitada y Windows le pasaría el ratón a Chromium. Devuelve cuántas.
  public static int Raise(long parent) {
    int n = 0;
    EnumChildWindows(new IntPtr(parent), (h, l) => {
      var c = new StringBuilder(64);
      GetClassName(h, c, 64);
      // SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_SHOWWINDOW, HWND_TOP
      if (c.ToString() == "mpv") { EnableWindow(h, true); SetWindowPos(h, IntPtr.Zero, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0010 | 0x0040); n++; }
      return true;
    }, IntPtr.Zero);
    return n;
  }
}
"@
[Console]::Out.WriteLine("ready")
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $p = $line.Split(" ")
  try { [Console]::Out.WriteLine($p[0] + " " + [CineLocalWin]::Raise([long]$p[1])) } catch { [Console]::Out.WriteLine($p[0] + " -1") }
}
`;

class WinEmbed {
  constructor() {
    this.proc = null;
    this.ready = null;
    this.pending = new Map();
    this.seq = 0;
  }

  get supported() { return process.platform === 'win32'; }

  /** Arranca el ayudante (en segundo plano, al abrir la app) */
  start() {
    if (!this.supported || this.proc) return this.ready;
    const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', Buffer.from(SCRIPT, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    this.proc = proc;
    let buf = '';
    this.ready = new Promise(resolve => {
      proc.stdout.on('data', d => {
        buf += d.toString();
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (line === 'ready') { resolve(true); continue; }
          const [id, n] = line.split(' ');
          const cb = this.pending.get(id);
          if (cb) { this.pending.delete(id); cb(+n); }
        }
      });
      proc.on('exit', () => { resolve(false); this.proc = null; this.ready = null; for (const cb of this.pending.values()) cb(-1); this.pending.clear(); });
      proc.on('error', () => resolve(false));
    });
    return this.ready;
  }

  /** Sube la ventana de mpv; devuelve cuántas ha encontrado (0 si aún no existe) */
  async raise(hwnd) {
    if (!(await this.start())) return -1;
    const id = String(++this.seq);
    return new Promise(resolve => {
      this.pending.set(id, resolve);
      this.proc.stdin.write(`${id} ${hwnd}\n`);
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); resolve(-1); } }, 3000);
    });
  }

  /** Reintenta hasta que mpv haya creado su ventana (tarda unos cientos de ms) */
  async raiseWhenReady(hwnd, timeoutMs = 8000) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if ((await this.raise(hwnd)) > 0) return true;
      await new Promise(r => setTimeout(r, 150));
    }
    return false;
  }

  stop() { try { this.proc?.kill(); } catch {} this.proc = null; }
}

module.exports = { WinEmbed };
