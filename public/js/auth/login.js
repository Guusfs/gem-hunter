// public/js/auth/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passInput  = document.getElementById('password');
  const forgotLink = document.getElementById('forgotLink');
  const toggleBtn  = document.getElementById('togglePass');

  // Alternar visibilidade da senha
  toggleBtn?.addEventListener('click', () => {
    const isHidden = passInput.type === 'password';
    passInput.type = isHidden ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');

    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    }
  });

  // LOGIN
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passInput.value
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Falha no login');

      localStorage.setItem('token', j.token);
      sessionStorage.setItem('token', j.token);
      window.location.href = '/';
    } catch (err) {
      alert(err.message || 'Erro ao fazer login');
    }
  });

  // ESQUECI A SENHA
  forgotLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = (emailInput?.value || '').trim()
      || prompt('Informe o e-mail cadastrado para recuperar a senha:')?.trim();

    if (!email) return;

    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Não foi possível enviar o e-mail');

      alert('Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.');
    } catch (err) {
      alert(err.message || 'Erro ao solicitar redefinição de senha');
    }
  });
});
