// public/js/core/init.js

import { carregarNovasCriptos } from '../features/novas.js';
import { atualizarPortfolio } from '../features/portfolio.js';
import { startScanner, stopScanner } from '../features/scanner.js';
import { carregarAtualizacoes } from '../features/atualizacoes.js';
import { carregarSentimentos } from '../features/sentimentos.js';
import { carregarFluxo, carregarPainelEntradaSaida } from '../features/entradaSaida.js';
import { carregarHistorico } from '../features/historico.js';
import { carregarConfiguracoes } from '../features/configuracoes.js';
import { i18n } from '../utils/i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) idioma
  i18n.setLanguage(localStorage.getItem('lang') || 'pt-BR');

  // 2) navegação entre seções
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.dataset.section;

      // esconde todas e remove "active" do menu
      document.querySelectorAll('.section').forEach((sec) => sec.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

      // mostra a seção alvo e marca o item de menu
      const section = document.getElementById(sectionId);
      if (!section) return;
      section.classList.add('active');
      item.classList.add('active');

      // ações específicas por seção
      switch (sectionId) {
        case 'novas':          carregarNovasCriptos();   break;
        case 'portfolio':      atualizarPortfolio();     break;
        case 'atualizacoes':   carregarAtualizacoes();   break;
        case 'sentimento':     carregarSentimentos();    break;
        case 'entradaSaida':   carregarFluxo();          break;
        case 'historico':      carregarHistorico();      break;
        case 'configuracoes':  carregarConfiguracoes();  break;
        case 'dashboard':
        default:
          break;
      }
    });
  });

  // 3) botões do scanner
  const btnStart = document.getElementById('startScannerBtn');
  const btnStop  = document.getElementById('stopScannerBtn');
  if (btnStart) btnStart.addEventListener('click', startScanner);
  if (btnStop)  btnStop.addEventListener('click',  stopScanner);

  // 4) logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login.html';
    });

    // glow dinâmico no botão sair (segue o dedo/mouse)
    logoutBtn.addEventListener('mousemove', (e) => {
      const r = logoutBtn.getBoundingClientRect();
      logoutBtn.style.setProperty('--x', `${e.clientX - r.left}px`);
      logoutBtn.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  }

  // 5) menu hambúrguer com overlay + backdrop + fecha ao navegar
  (function setupMobileMenu() {
    // tenta vários seletores para achar o trigger do menu
    let burger =
      document.getElementById('menuToggle') ||
      document.querySelector('.hamburger') ||
      document.querySelector('[data-hamburger]') ||
      document.querySelector('.navbar .fa-bars');

    if (!burger) return;
    // se for o ícone <i>, usa o container clicável mais próximo
    if (burger.classList.contains('fa-bars') && burger.closest('a,button,div')) {
      burger = burger.closest('a,button,div');
    }

    let open = false;
    let menuEl = null;
    let backdropEl = null;

    const links = [
      { id: 'dashboard',     label: 'Dashboard' },
      { id: 'scanner',       label: 'Scanner' },
      { id: 'novas',         label: 'Novas Criptos' },
      { id: 'atualizacoes',  label: 'Atualizações' },
      { id: 'portfolio',     label: 'Portfólio' },
      { id: 'sentimento',    label: 'Sentimento' },
      { id: 'entradaSaida',  label: 'Entrada/Saída' },
      { id: 'historico',     label: 'Histórico' },
      { id: 'configuracoes', label: 'Configurações' },
    ];

    function closeMenu() {
      if (!open) return;
      open = false;
      menuEl?.remove();
      backdropEl?.remove();
      menuEl = null;
      backdropEl = null;
      document.body.classList.remove('no-scroll');
    }

    function openMenu() {
      if (open) return;
      open = true;

      // backdrop (clique-fora)
      backdropEl = document.createElement('div');
      backdropEl.className = 'mobile-backdrop';
      backdropEl.addEventListener('click', closeMenu);
      document.body.appendChild(backdropEl);

      // menu
      menuEl = document.createElement('div');
      menuEl.className = 'mobile-menu';
      menuEl.innerHTML = links.map(l => `<a href="#" data-section="${l.id}">${l.label}</a>`).join('');
      document.body.appendChild(menuEl);

      // ao clicar em um item: fecha e navega
      menuEl.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const id = a.dataset.section;
          closeMenu();

          // usa a mesma lógica do menu desktop
          const target = document.querySelector(`.nav-item[data-section="${id}"]`);
          if (target) {
            target.click();
          } else {
            // fallback
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            const sec = document.getElementById(id);
            if (sec) sec.classList.add('active');
          }
        });
      });

      // trava o scroll do fundo
      document.body.classList.add('no-scroll');
    }

    burger.addEventListener('click', (e) => {
      e.preventDefault();
      open ? closeMenu() : openMenu();
    });
    window.addEventListener('resize', closeMenu);
    window.addEventListener('orientationchange', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  })();

  // 6) carregamentos iniciais
  atualizarPortfolio();          // para preencher cards ao abrir
  carregarPainelEntradaSaida();  // números de Entrada/Saída no topo
});
