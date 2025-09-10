// routes/scanner.js
import express from 'express';
import { getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

// helper
async function fetchJson(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 429 && i < retries) {
      await new Promise(res => setTimeout(res, 800 * (i + 1)));
      continue;
    }
    return null;
  }
}

// PÚBLICO: não exige verifyToken
router.get('/', async (req, res) => {
  try {
    const usdbrl = await getUsdToBrl();

    // usa markets com order por variação 24h (top movers)
    const url = 'https://api.coingecko.com/api/v3/coins/markets'
      + '?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=60&page=1&sparkline=false&price_change_percentage=24h';

    const data = await fetchJson(url);
    const list = Array.isArray(data) ? data : [];

    const out = list.slice(0, 30).map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      current_price: Number(c.current_price),
      brl_price: Number(c.current_price) * usdbrl,
      price_change_percentage_24h: Number(c.price_change_percentage_24h),
    }));

    res.json(out);
  } catch (e) {
    console.error('Erro em /api/scanner:', e);
    res.json([]); // não quebra o front
  }
});

export default router;
