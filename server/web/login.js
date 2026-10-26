// Inicio de sesión con el usuario de DSM (si tiene verificación en dos pasos, se pide el código después)
const $ = id => document.getElementById(id);
$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), go = $('go');
  err.classList.add('hidden');
  go.disabled = true; go.textContent = 'Entrando…';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CineLocal': '1' },
      body: JSON.stringify({ user: $('user').value, password: $('password').value, otp: $('otp').value || undefined })
    });
    const r = await res.json();
    if (r.ok) { location.href = '/'; return; }
    if (r.otp) { $('otpBox').classList.remove('hidden'); $('otp').focus(); }
    err.textContent = r.error || 'No se pudo iniciar sesión';
    err.classList.remove('hidden');
  } catch {
    err.textContent = 'No se puede contactar con el servidor';
    err.classList.remove('hidden');
  } finally {
    go.disabled = false; go.textContent = 'Entrar';
  }
});
