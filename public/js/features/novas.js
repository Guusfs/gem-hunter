// public/js/features/novas.js
let pagina = 1;
const POR_PAGINA = 12;
let cache = [];
let ultimaAtualizacao = 0;

function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function getIgnorados() {
  try { return JSON.parse(localStorage.getItem('novas_ignorados') || '[]'); } catch { return []; }
}
function addIgnorado(id) {
  if (!id) return;
  const set = new Set(getIgnorados());
  set.add(String(id));
  localStorage.setItem('novas_ignorados', JSON.stringify([...set]));
}
function isIgnorado(id) {
  return id ? getIgnorados().includes(String(id)) : false;
}

function fmtUSD(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0.000000';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(n); }
  catch { return `$${n.toFixed(6)}`; }
}
function fmtBRL(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n); }
  catch { return `R$ ${n.toFixed(2)}`; }
}

function moedaValida(c) {
  return c
    && typeof c.id === 'string' && c.id.length
    && typeof c.name === 'string' && c.name.length
    && typeof c.symbol === 'string' && c.symbol.length
    && typeof c.image === 'string' && c.image.length
    && Number.isFinite(Number(c.priceUsd ?? c.current_price));
}

function normalizar(lista) {
  const map = new Map();
  (lista || []).forEach((c) => {
    const obj = {
      id: c.id,
      coingeckoId: c.coingeckoId || c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      current_price: Number(c.current_price ?? c.priceUsd),
      brl_price: Number(c.brl_price ?? c.priceBrl),
      price_change_percentage_24h: Number(c.price_change_percentage_24h),
    };
    if (moedaValida(obj) && !map.has(obj.id)) map.set(obj.id, obj);
  });
  return [...map.values()];
}

function visiveis() {
  return cache.filter(c => !isIgnorado(c.id || c.coingeckoId || c.symbol || c.name));
}

async function postHistoricoCompra(coin, price) {
  const tk = token();
  if (!tk) return;
  try {
    await fetch('/api/historico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({
        tipo: 'COMPRA',
        nome: coin.name,
        symbol: coin.symbol,
        preco: Number(price) || 0,
        qtd: 1,
        coingeckoId: coin.id || coin.coingeckoId,
      }),
    });
  } catch (e) {
    console.warn('Falha ao registrar histórico de compra:', e);
  }
}

async function comprarCoin(coin, cardEl) {
  const tk = token();
  if (!tk) return (window.location.href = '/login.html');

  try {
    const preco = Number(coin.current_price ?? coin.priceUsd) || 0;

    const r = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        priceAtPurchase: preco,
        coingeckoId: coin.id || coin.coingeckoId,
      }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || 'Falha ao adicionar ao portfólio');
    }

    await postHistoricoCompra(coin, preco);

    addIgnorado(coin.id || coin.coingeckoId || coin.symbol || coin.name);
    cardEl?.remove();
    renderizarLista();

    alert('Compra registrada no portfólio!');
  } catch (e) {
    console.error(e);
    alert('Não foi possível concluir a compra.');
  }
}

function renderizarLista() {
  const lista = document.getElementById('novas-lista');
  const btnMais = document.getElementById('btn-carregar-mais');
  const fimMsg = document.getElementById('mensagem-fim');
  if (!lista) return;

  const itens = visiveis();
  const inicio = (pagina - 1) * POR_PAGINA;
  const slice = itens.slice(inicio, inicio + POR_PAGINA);

  if (pagina === 1) lista.innerHTML = '';

  slice.forEach((coin) => {
    const priceUsd = Number(coin.current_price);
    const priceBrl = Number(coin.brl_price);
    const change24 = Number(coin.price_change_percentage_24h);
    const isUp = Number.isFinite(change24) ? change24 >= 0 : false;

    const changeText = Number.isFinite(change24) ? `${isUp ? '📈' : '📉'} ${change24.toFixed(2)}%` : '—';
    const changeColor = Number.isFinite(change24) ? (isUp ? 'lime' : '#ff4d4d') : '#ccc';
    const geckoSlug = encodeURIComponent(coin.id || coin.coingeckoId || coin.symbol || coin.name);

    const card = document.createElement('div');
    card.className = 'neon-card';
    card.style.maxWidth = '360px';
    card.innerHTML = `
      <div style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:6px;">
        <img src="${coin.image}" alt="${coin.name}" width="56" height="56" style="border-radius:50%; background:#fff; border:1px solid #00f0ff; box-shadow:0 0 10px #00f0ff" />
        <h3 style="margin:0; font-size:1.05rem;">${coin.name} (${String(coin.symbol).toUpperCase()})</h3>
      </div>

      <p style="margin:.35rem 0">Preço (USD): <strong>${fmtUSD(priceUsd)}</strong></p>
      <p style="margin:.35rem 0">Preço (BRL): <strong>${fmtBRL(priceBrl)}</strong></p>

      <p style="margin:.5rem 0; color:${changeColor}">
        Variação 24h: <span style="font-weight:700;">${changeText}</span>
      </p>

      <div class="card-actions" style="gap:10px;">
        <button class="scanner-btn start" data-action="comprei">Comprei</button>
        <a class="scanner-btn" style="background:linear-gradient(to right,#00ffe5,#00bfbf); color:#000"
           href="https://www.coingecko.com/pt-br/moedas/${geckoSlug}" target="_blank" rel="noopener noreferrer">
          Comprar
        </a>
      </div>

      <div class="card-actions" style="margin-top:8px;">
        <button class="scanner-btn stop" data-action="ignorar" style="background:#2c2c2c; color:#eee;">Não tenho interesse</button>
      </div>
    `;

    card.querySelector('[data-action="comprei"]')?.addEventListener('click', () => comprarCoin(coin, card));
    card.querySelector('[data-action="ignorar"]')?.addEventListener('click', () => {
      addIgnorado(coin.id || coin.coingeckoId || coin.symbol || coin.name);
      card.remove();
      renderizarLista();
    });

    lista.appendChild(card);
  });

  const temMais = inicio + POR_PAGINA < itens.length;
  if (btnMais) btnMais.style.display = temMais ? 'inline-block' : 'none';
  if (fimMsg) fimMsg.style.display = temMais ? 'none' : (itens.length ? 'none' : 'block');
}

async function carregarDoServidor() {
  const lista = document.getElementById('novas-lista');
  if (cache.length === 0 && lista) lista.innerHTML = '<p>Carregando...</p>';

  try {
    const headers = token() ? { Authorization: `Bearer ${token()}` } : undefined;
    const r = await fetch('/api/novas?limit=60', { headers });
    const data = await r.json();

    const saneadas = normalizar(Array.isArray(data) ? data : []);
    cache = saneadas;
    ultimaAtualizacao = Date.now();
  } catch (e) {
    console.error('Falha ao carregar /api/novas:', e);
  }
}

export async function carregarNovasCriptos() {
  const precisa = cache.length === 0 || (Date.now() - ultimaAtualizacao) > 30_000; // 30s
  if (precisa) {
    await carregarDoServidor();
    pagina = 1;
  }
  renderizarLista();

  const btnMais = document.getElementById('btn-carregar-mais');
  if (btnMais && !btnMais._bound) {
    btnMais._bound = true;
    btnMais.addEventListener('click', async () => {
      await carregarDoServidor();
      pagina += 1;
      const totalVisiveis = visiveis().length;
      const maxPaginas = Math.max(1, Math.ceil(totalVisiveis / POR_PAGINA));
      if (pagina > maxPaginas) pagina = maxPaginas;
      renderizarLista();
    });
  }
}

// Atualização automática a cada 30 segundos
setInterval(() => {
  carregarNovasCriptos();
}, 30_000);
