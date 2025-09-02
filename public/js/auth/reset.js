// public/js/auth/reset.js
document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('resetForm');
  const pass     = document.getElementById('password');
  const confirm  = document.getElementById('confirm');

  function getTokenFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return p.get('token') || '';
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getTokenFromUrl();
    if (!token) return alert('Link inválido ou expirado.');

    if (pass.value !== confirm.value) {
      return alert('As senhas não coincidem.');
    }
    if (pass.value.length < 6) {
      return alert('A senha deve ter no mínimo 6 caracteres.');
    }

    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass.value })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Falha ao redefinir a senha');

      alert('Senha alterada com sucesso! Faça login novamente.');
      window.location.href = '/login.html';
    } catch (err) {
      alert(err.message || 'Erro ao redefinir a senha');
    }
  });
});
