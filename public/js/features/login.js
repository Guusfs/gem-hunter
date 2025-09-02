// public/js/features/login.js
document.addEventListener('DOMContentLoaded', () => {
  const togglePass = document.getElementById('togglePass');
  const passwordInput = document.getElementById('password');

  if (togglePass && passwordInput) {
    togglePass.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePass.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';
    });
  }
});
