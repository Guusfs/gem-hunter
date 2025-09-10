// routes/novas.js
import express from 'express';
import { getUsdToBrl } from '../utils/coinGecko.js';

const router = express.Router();

// cache em memória (30s)
const TTL_MS = 30_000;
let cache = { ts: 0, data: [] };

function mapCoin(row, usdbrl) {
  const priceUsd = Number(row.current_price);
  return {
    id: row.id,
    coingeckoId: row.id,
    name: row.name,
    symbol: row.symbol,
    image: row.image,
    priceUsd,
    priceBrl: Number.isFinite(priceUsd) ? priceUsd * usdbrl : null,
    price_change_percentage_24h: Number(row.price_change_percentage_24h),
  };
}

async function fetchJsonRetry(url, { retries = 2, backoffMs = 800 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url);
    if (resp.ok) return resp.json();
    // 429: espera incremental e tenta de novo
    if (resp.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
      continue;
    }
    const txt = await resp.text().catch(() => '');
    throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
  }
  return [];
}

/**
 * GET /api/novas?limit=60
 * Lista moedas do CoinGecko já com USD e BRL.
 * Responde do cache por 30s para reduzir chamadas externas.
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 60));

    // serve do cache se válido
    if (cache.data.length && Date.now() - cache.ts < TTL_MS) {
      return res.json(cache.data.slice(0, limit));
    }

    // USD->BRL
    const usdbrl = await getUsdToBrl();

    // uma chamada já cobre até 100; se quiser mais, junte páginas
    const url1 =
      'https://api.coingecko.com/api/v3/coins/markets'
      + '?vs_currency=usd&order=market_cap_desc&per_page=100&page=1'
      + '&sparkline=false&price_change_percentage=24h';

    const rows1 = await fetchJsonRetry(url1);
    let rows = rows1;

    if (limit > 100) {
      const url2 =
        'https://api.coingecko.com/api/v3/coins/markets'
        + '?vs_currency=usd&order=market_cap_desc&per_page=100&page=2'
        + '&sparkline=false&price_change_percentage=24h';
      const rows2 = await fetchJsonRetry(url2);
      rows = rows1.concat(rows2);
    }

    const mapped = rows.map(r => mapCoin(r, usdbrl));

    cache = { ts: Date.now(), data: mapped };
    res.json(mapped.slice(0, limit));
  } catch (err) {
    console.warn('[NOVAS] falhou:', err.message);
    // fallback: devolve cache velho se existir
    if (cache.data.length) return res.json(cache.data.slice(0, 60));
    res.status(502).json({ error: 'Falha ao consultar provedor de preços' });
  }
});

export default router;
