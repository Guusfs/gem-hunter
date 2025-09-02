export function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();

      // Remove 'active' de todas as seções e itens do menu
      navItems.forEach(i => i.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      // Ativa a nova seção
      const targetId = item.dataset.section;
      document.getElementById(targetId).classList.add('active');
      item.classList.add('active');
    });
  });
}
