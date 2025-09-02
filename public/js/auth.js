const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

// LOGIN
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log('Resposta:', res.status);
    console.log('Dados:', data);

    if (res.ok) {
      localStorage.setItem('token', data.token);
      window.location.href = '/index.html';
    } else {
      alert(data.message || 'Falha no login');
    }
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    alert('Erro de conexão com o servidor.');
  }
});

// REGISTRO
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();

  if (!email || !password) {
    alert('Preencha todos os campos para se cadastrar.');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log('Cadastro:', data);

    if (res.ok) {
      alert('Cadastro realizado com sucesso! Faça login.');
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
      showLogin.style.display = 'none';
      showRegister.style.display = 'block';
    } else {
      alert(data.message || 'Erro ao cadastrar');
    }
  } catch (err) {
    console.error('Erro ao cadastrar:', err);
    alert('Erro de conexão com o servidor.');
  }
});

// TOGGLE ENTRE LOGIN E CADASTRO
showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  showRegister.style.display = 'none';
  showLogin.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.style.display = 'none';
  loginForm.style.display = 'block';
  showLogin.style.display = 'none';
  showRegister.style.display = 'block';
});
