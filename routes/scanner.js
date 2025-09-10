// routes/scanner.js
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

// ===== Cache em memória (30s) =====
const TTL_MS = 30_000;
let cache = { ts: 0, data: [] };

// ===== Helpers =====
async function fetchJsonRetry(url, { retries = 2, backoffMs = 800 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url);
    if (resp.ok) return resp.json();
    if (resp.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
      continue;
    }
    const txt = await resp.text().catch(() => '');
    throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
  }
  return null;
}

function mapCoin(row, usdbrl) {
  const priceUsd = Number(row.current_price);
  return {
    id: row.id,
    coingeckoId: row.id,
    name: row.name,
    symbol: row.symbol,
    image: row.image,
    current_price: priceUsd,
    brl_price: Number.isFinite(priceUsd) ? priceUsd * usdbrl : null,
    price_change_percentage_24h: Number(row.price_change_percentage_24h),
  };
}

// ===== Rota principal =====
/**
 * GET /api/scanner?limit=60
 * Retorna uma lista de moedas (com USD/BRL + variação 24h) que o front usa
 * para “sorteios” do scanner. Responde do cache (30s) para evitar rate-limit.
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 60));

    // Se o cache ainda é válido, serve direto
    if (cache.data.length && Date.now() - cache.ts < TTL_MS) {
      return res.json(cache.data.slice(0, limit));
    }

    // FX USD->BRL
    const usdbrl = await getUsdToBrl();

    // Pega até 100 por página — aqui puxamos 1 ou 2 páginas conforme necessário
    const url1 =
      'https://api.coingecko.com/api/v3/coins/markets'
      + '?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
      + '&sparkline=false&price_change_percentage=24h';

    const page1 = await fetchJsonRetry(url1);
    let rows = Array.isArray(page1) ? page1 : [];

    if (limit > 100) {
      const url2 =
        'https://api.coingecko.com/api/v3/coins/markets'
        + '?vs_currency=usd&order=market_cap_desc&per_page=100&page=2'
        + '&sparkline=false&price_change_percentage=24h';
      const page2 = await fetchJsonRetry(url2);
      if (Array.isArray(page2)) rows = rows.concat(page2);
    }

    const mapped = rows.map(r => mapCoin(r, usdbrl));

    // Atualiza cache e responde
    cache = { ts: Date.now(), data: mapped };
    res.json(mapped.slice(0, limit));
  } catch (err) {
    console.warn('[SCANNER] falhou:', err.message);
    // Fallback: devolve cache anterior se existir; senão, array vazio
    if (cache.data.length) return res.json(cache.data.slice(0, 60));
    res.json([]);
  }
});

export default router;
