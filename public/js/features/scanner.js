// public/js/features/scanner.js
// Consome /api/scanner (gainers/losers) e escreve no painel com status visual.

let scannerTimer = null;

function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function setStatus(ativo) {
  const dot = document.getElementById('scannerStatusDot');
  const txt = document.getElementById('scannerStatusText');
  if (!dot || !txt) return;
  dot.classList.toggle('active', !!ativo);
  dot.classList.toggle('inactive', !ativo);
  txt.textContent = ativo ? 'Ativo' : 'Inativo';
}

function log(msg, color = '#0f0') {
  const box = document.getElementById('scannerLog');
  if (!box) return;
  const line = document.createElement('div');
  line.textContent = msg;
  line.style.color = color;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

async function tickScanner() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const tk = token();
    if (tk) headers.Authorization = `Bearer ${tk}`;

    const r = await fetch('/api/scanner', { headers });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} ${t}`);
    }
    const data = await r.json();

    const { gainers = [], losers = [], total, timestamp } = data;

    const ts = new Date(timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour12: false });

    if (gainers.length === 0 && losers.length === 0) {
      log(`[${ts}] [INFO] Nenhuma cripto válida retornada agora.`, '#8be9fd');
      return;
    }

    if (gainers.length) {
      log(`\n[${ts}] 🔺 Maiores ALTAS (24h):`, '#00ffa6');
      gainers.forEach(c => {
        const p = (c.price_change_percentage_24h ?? 0).toFixed(2);
        log(`  • ${c.name} (${String(c.symbol).toUpperCase()})  +${p}%  | $${Number(c.current_price ?? 0).toFixed(6)}`, '#00ffa6');
      });
    }

    if (losers.length) {
      log(`\n[${ts}] 🔻 Maiores QUEDAS (24h):`, '#ff6b6b');
      losers.slice().reverse().forEach(c => {
        const p = (c.price_change_percentage_24h ?? 0).toFixed(2);
        log(`  • ${c.name} (${String(c.symbol).toUpperCase()})  ${p}%  | $${Number(c.current_price ?? 0).toFixed(6)}`, '#ff6b6b');
      });
    }

    if (Number.isFinite(total)) {
      log(`\n[${ts}] Total analisadas: ${total}\n`, '#cccccc');
    }
  } catch (err) {
    const m = String(err?.message || err || 'Erro');
    // destacar 429 para o usuário
    const is429 = m.includes('429');
    log(`[ERRO] ${m}`, is429 ? '#ffcc00' : '#ff5555');
  }
}

export function startScanner() {
  if (scannerTimer) return; // já está rodando
  const tk = token();
  if (!tk) return (window.location.href = '/login.html');

  setStatus(true);
  log('▶ Scanner iniciado...', '#8be9fd');
  tickScanner(); // primeira rodada imediata
  scannerTimer = setInterval(tickScanner, 30_000); // a cada 30s
}

export function stopScanner() {
  if (scannerTimer) {
    clearInterval(scannerTimer);
    scannerTimer = null;
  }
  setStatus(false);
  log('⏹ Scanner parado.', '#8be9fd');
}
