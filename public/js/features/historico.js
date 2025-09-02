// public/js/features/historico.js
function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function fmtTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

function linha(item) {
  const cor = item.tipo === 'VENDA' ? '#ff4d4d' : '#00ff88';
  const icone = item.tipo === 'VENDA' ? '🔴' : '🟢';
  const preco = Number(item.preco);
  const precoStr = Number.isFinite(preco)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco)
    : '—';

  return `[${fmtTime(new Date(item.ts || Date.now()))}] ${icone} ` +
         `${item.tipo} de ${item.qtd || 1}x ${item.nome} (${(item.symbol||'').toUpperCase()}) ` +
         `a ${precoStr}`;
}

export async function carregarHistorico() {
  const log = document.getElementById('historico-log');
  if (!log) return;
  log.innerHTML = '<div>Carregando histórico…</div>';

  try {
    const token = getToken();
    const resp = await fetch('/api/historico', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'same-origin',
    });

    if (resp.status === 401) {
      log.innerHTML = '<div>Faça login para ver seu histórico.</div>';
      // opcional: redirecionar
      // window.location.href = '/login.html';
      return;
    }

    const data = await resp.json();
    const itens = Array.isArray(data) ? data : [];

    if (!itens.length) {
      log.innerHTML = '<div>Nenhum evento ainda.</div>';
      return;
    }

    log.innerHTML = itens
      .sort((a,b) => (b.ts||0) - (a.ts||0))
      .map(linha)
      .map(t => `<div style="color:#00ff88">${t}</div>`)
      .join('');
  } catch (e) {
    console.error('historico:', e);
    log.innerHTML = '<div>Erro ao carregar histórico.</div>';
  }
}
