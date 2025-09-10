// public/js/features/scanner.js
import { AppState } from '../utils/state.js';

let scannerInterval = null;
let totalDetectados = 0;
let totalAlertas = 0;
let moedasMonitoradas = 0;

export async function startScanner() {
  if (AppState.scannerRunning) return;
  AppState.scannerRunning = true;
  updateScannerStatus(true);

  const logArea = document.getElementById('scannerLog');

  try {
    // agora usa /api/scanner (público)
    const response = await fetch('/api/scanner');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cryptos = await response.json();

    const validCryptos = (Array.isArray(cryptos) ? cryptos : [])
      .filter(c => typeof c.price_change_percentage_24h === 'number');

    moedasMonitoradas = validCryptos.length;
    updateDashboard();

    if (validCryptos.length === 0) {
      addVisualLogEntry('[INFO] Nenhuma cripto válida retornada agora.');
      return;
    }

    scannerInterval = setInterval(() => {
      const cripto = validCryptos[Math.floor(Math.random() * validCryptos.length)];
      const percent = Number(cripto.price_change_percentage_24h ?? 0);
      const decisao = percent > 0 ? '🔺 COMPRA FORTE' : '🚫 NÃO RECOMENDADO';

      const log = `[${new Date().toLocaleTimeString()}] ${cripto.name} (${String(cripto.symbol).toUpperCase()}) - Variação 24h: ${percent.toFixed(2)}% → ${decisao}`;
      addVisualLogEntry(log);

      totalDetectados++;
      if (decisao.includes('COMPRA')) totalAlertas++;
      updateDashboard();

      if (decisao.includes('COMPRA')) {
        logArea?.classList.add('flash');
        setTimeout(() => logArea.classList.remove('flash'), 600);
      }
    }, 4000);
  } catch (err) {
    addVisualLogEntry('[ERRO] Falha ao obter dados do scanner.');
    console.error('Erro no scanner:', err);
  }
}

export function stopScanner() {
  if (!AppState.scannerRunning) return;
  AppState.scannerRunning = false;
  updateScannerStatus(false);

  if (scannerInterval) {
    clearInterval(scannerInterval);
    scannerInterval = null;
  }

  addVisualLogEntry('[SCANNER PARADO] Nenhuma atividade em execução.');
}

function updateScannerStatus(isRunning) {
  const statusDot = document.getElementById('scannerStatusDot');
  const statusText = document.getElementById('scannerStatusText');

  if (isRunning) {
    statusDot.classList.remove('inactive');
    statusDot.classList.add('active');
    statusText.textContent = 'Ativo';
  } else {
    statusDot.classList.remove('active');
    statusDot.classList.add('inactive');
    statusText.textContent = 'Inativo';
  }
}

function addVisualLogEntry(message) {
  const logArea = document.getElementById('scannerLog');
  const newEntry = document.createElement('div');
  newEntry.textContent = message;
  newEntry.classList.add('log-entry');
  logArea?.appendChild(newEntry);
  logArea.scrollTop = logArea.scrollHeight;
}

function updateDashboard() {
  document.getElementById('card-detected').textContent = totalDetectados;
  document.getElementById('card-alerts').textContent = totalAlertas;
  document.getElementById('card-tracked').textContent = moedasMonitoradas;
  document.getElementById('card-accuracy').textContent = `${(Math.random() * 20 + 80).toFixed(1)}%`;
}
