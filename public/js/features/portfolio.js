// public/js/features/portfolio.js
import { Currency } from '../utils/currency.js';

function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

export async function atualizarPortfolio() {
  const container = document.getElementById('portfolio-lista');
  if (!container) return;

  container.innerHTML = '<p>Carregando portfólio...</p>';

  try {
    const tk = token();
    if (!tk) {
      container.innerHTML = '<p>Faça login para ver seu portfólio.</p>';
      return (window.location.href = '/login.html');
    }

    const res = await fetch('/api/portfolio', {
      headers: { Authorization: `Bearer ${tk}` },
      credentials: 'same-origin',
    });

    if (res.status === 401) {
      container.innerHTML = '<p>Sessão expirada. Faça login novamente.</p>';
      return (window.location.href = '/login.html');
    }

    const dados = await res.json();
    container.innerHTML = '';

    if (!Array.isArray(dados) || dados.length === 0) {
      container.innerHTML = '<p>Nenhuma criptomoeda no portfólio.</p>';
      return;
    }

    const cur = Currency.getPref();

    dados.forEach((item) => {
      const {
        _id, name, symbol, image,
        buyPriceUsd, buyPriceBrl,
        currentPriceUsd, currentPriceBrl,
        profitUsd, profitBrl, profitPct
      } = item;

      const priceBuyShown   = cur === 'USD' ? buyPriceUsd      : buyPriceBrl;
      const priceNowShown   = cur === 'USD' ? currentPriceUsd  : currentPriceBrl;
      const profitShown     = cur === 'USD' ? profitUsd        : profitBrl;

      const lucroColor = Number(profitShown) >= 0 ? 'lime' : 'red';
      const pctText = Number.isFinite(Number(profitPct)) ? ` (${Number(profitPct).toFixed(2)}%)` : '';

      const card = document.createElement('div');
      card.classList.add('neon-card', 'portfolio-card');
      card.innerHTML = `
        <div class="card-header">
          <h2>${name} (${String(symbol).toUpperCase()})</h2>
          <img src="${image}" alt="${name}" class="coin-icon" />
        </div>
        <div class="card-info">
          <p><strong>Comprado por:</strong> ${Currency.fmt(priceBuyShown)}</p>
          <p><strong>Preço atual:</strong> ${Currency.fmt(priceNowShown)}</p>
          <p><strong>Lucro/Prejuízo:</strong>
            <span style="color:${lucroColor}">
              ${Currency.fmt(profitShown)}${pctText}
            </span>
          </p>
        </div>
        <button class="btn-remover" data-id="${_id}">Remover</button>
      `;

      card.querySelector('.btn-remover')?.addEventListener('click', async () => {
        if (!confirm(`Remover ${name} do portfólio?`)) return;
        try {
          const resp = await fetch(`/api/portfolio/${_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token()}` },
          });
          if (!resp.ok) {
            const j = await resp.json().catch(() => ({}));
            throw new Error(j?.error || 'Falha ao remover');
          }
          card.remove();
        } catch (e) {
          console.error(e);
          alert('Não foi possível remover.');
        }
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Erro ao carregar portfólio.</p>';
  }
}

// re-render ao trocar moeda
document.addEventListener('currency:changed', atualizarPortfolio);
