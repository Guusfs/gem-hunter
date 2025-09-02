// public/js/features/entradaSaida.js
import { i18n } from '../utils/i18n.js';
import { getUsdBrl, fmtUSD, fmtBRL } from '../utils/money.js';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

async function postHistorico(payload) {
  const token = getToken();
  if (!token) return;
  try {
    await fetch('/api/historico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Falha ao registrar histórico:', e);
  }
}

export async function carregarFluxo() {
  const elEntradas = document.getElementById('fluxo-entradas');
  const elSaidas   = document.getElementById('fluxo-saidas');
  const elSaldo    = document.getElementById('fluxo-saldo');
  const painel     = document.getElementById('entrada-saida-painel');

  if (elEntradas) elEntradas.textContent = '...';
  if (elSaidas)   elSaidas.textContent   = '...';
  if (elSaldo)    elSaldo.textContent    = '...';
  if (painel)     painel.innerHTML       = '<p>Carregando oportunidades...</p>';

  try {
    const token = getToken();
    const resp = await fetch('/api/fluxo', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'same-origin',
    });

    if (resp.status === 401) return (window.location.href = '/login.html');

    const { entradas = [], saidas = [] } = await resp.json();
    const usdbrl = await getUsdBrl();

    if (elEntradas) elEntradas.textContent = String(entradas.length);
    if (elSaidas)   elSaidas.textContent   = String(saidas.length);
    if (elSaldo)    elSaldo.textContent    = `${saidas.length - entradas.length}`;

    if (!painel) return;
    painel.innerHTML = '';

    // ENTRADAS
    const colE = document.createElement('div');
    colE.className = 'neon-card';
    colE.innerHTML = `<h3 data-i18n="flow_possible_entries">${i18n.t('flow_possible_entries')}</h3>`;

    entradas.forEach((e) => {
      const urlCG = makeCoinGeckoUrl(e);
      const usd = Number(e.currentPrice);
      const brl = usd * usdbrl;

      const row = document.createElement('div');
      row.className = 'flux-item';
      row.innerHTML = `
        <div class="flux-info">
          <img src="${e.image || ''}" alt="${e.name || ''}" class="flux-img"/>
          <div>
            <div class="flux-title"><strong>${e.name}</strong> (${(e.symbol || '').toUpperCase()})</div>
            <div class="flux-meta">
              Preço: ${fmtUSD(usd)} · ${fmtBRL(brl)}
              ${Number.isFinite(e.change24h) ? `· 24h: ${Number(e.change24h).toFixed(2)}%` : ''}
              ${e.motivo ? `· ${e.motivo}` : ''}
            </div>
          </div>
        </div>
        <div class="btn-group-vert">
          <button class="scanner-btn start btn-lg">${i18n.t('flow_btn_i_bought')}</button>
          <a class="scanner-btn outline btn-lg" href="${urlCG}" target="_blank" rel="noopener noreferrer">
            ${i18n.t('flow_btn_gecko')}
          </a>
        </div>
      `;
      row.querySelector('button')?.addEventListener('click', async () => {
        await compreiEntrada(e);
        await postHistorico({
          tipo: 'COMPRA',
          nome: e.name,
          symbol: e.symbol,
          preco: usd, // armazenamos em USD no histórico
          qtd: 1,
          coingeckoId: e.coingeckoId,
        });
        carregarFluxo();
      });
      colE.appendChild(row);
    });

    // SAÍDAS
    const colS = document.createElement('div');
    colS.className = 'neon-card';
    colS.innerHTML = `<h3 data-i18n="flow_possible_exits">${i18n.t('flow_possible_exits')}</h3>`;

    saidas.forEach((s) => {
      const urlCG = makeCoinGeckoUrl(s);
      const buyUsd = Number(s.buyPrice);
      const curUsd = Number(s.currentPrice);

      const row = document.createElement('div');
      row.className = 'flux-item';
      row.innerHTML = `
        <div class="flux-info">
          <img src="${s.image || ''}" alt="${s.name || ''}" class="flux-img"/>
          <div>
            <div class="flux-title"><strong>${s.name}</strong> (${(s.symbol || '').toUpperCase()})</div>
            <div class="flux-meta">
              Compra: ${fmtUSD(buyUsd)} · ${fmtBRL(buyUsd * usdbrl)}
              · Atual: ${fmtUSD(curUsd)} · ${fmtBRL(curUsd * usdbrl)}
              · Lucro: ${Number(s.profitPct).toFixed(2)}%
              ${s.motivo ? `· ${s.motivo}` : ''}
            </div>
          </div>
        </div>
        <div class="btn-group-vert">
          <button class="scanner-btn stop btn-lg">${i18n.t('flow_btn_sell')}</button>
          <a class="scanner-btn outline btn-lg" href="${urlCG}" target="_blank" rel="noopener noreferrer">
            ${i18n.t('flow_btn_gecko')}
          </a>
        </div>
      `;
      row.querySelector('button')?.addEventListener('click', async () => {
        const ok = confirm(`Vender ${s.name} (${(s.symbol||'').toUpperCase()}) agora?`);
        if (!ok) return;
        await venderSaida(s);
        await postHistorico({
          tipo: 'VENDA',
          nome: s.name,
          symbol: s.symbol,
          preco: curUsd,
          qtd: 1,
          coingeckoId: s.coingeckoId,
        });
        carregarFluxo();
      });
      colS.appendChild(row);
    });

    painel.appendChild(colE);
    painel.appendChild(colS);
  } catch (e) {
    console.error('Erro ao carregar fluxo:', e);
    if (painel) painel.innerHTML = '<p>Erro ao carregar oportunidades.</p>';
  }
}

function makeCoinGeckoUrl(obj) {
  const slug = encodeURIComponent(obj?.coingeckoId || obj?.symbol || obj?.name || '');
  return `https://www.coingecko.com/pt-br/moedas/${slug}`;
}

async function compreiEntrada(e) {
  const token = getToken();
  if (!token) return (window.location.href = '/login.html');

  const r = await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: e.name,
      symbol: e.symbol,
      image: e.image,
      priceAtPurchase: Number(e.currentPrice) || 0,
      coingeckoId: e.coingeckoId,
    }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    alert(j?.error || 'Falha ao registrar compra');
    return;
  }

  try {
    await fetch('/api/fluxo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'entrada', symbol: e.symbol, name: e.name, valorUsd: e.currentPrice, coingeckoId: e.coingeckoId, ts: Date.now() }),
    });
  } catch {}
  alert('Compra registrada no portfólio!');
}

async function venderSaida(s) {
  const token = getToken();
  if (!token) return (window.location.href = '/login.html');

  const r = await fetch(`/api/portfolio/${s.portfolioId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    alert(j?.error || 'Falha ao vender');
    return;
  }

  try {
    await fetch('/api/fluxo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'saida', symbol: s.symbol, name: s.name, valorUsd: s.currentPrice, coingeckoId: s.coingeckoId, ts: Date.now() }),
    });
  } catch {}
  alert('Venda concluída!');
}

export function carregarPainelEntradaSaida() { carregarFluxo(); }
