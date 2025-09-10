// routes/novas.js
import express from 'express';
import { slugifyForCoingecko, getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

// helper com retry simples
async function fetchJson(url, { headers = {}, ...opts } = {}, retries = 2) {
  const h = {
    accept: 'application/json',
    // Se tiver chave PRO:
    // 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY || '',
    ...headers,
  };
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { ...opts, headers: h });
    if (res.ok) return res.json();
    if (res.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
      continue;
    }
    // última tentativa falhou
    try {
      const txt = await res.text();
      console.warn('[CoinGecko]', res.status, url, txt?.slice?.(0, 200));
    } catch {}
    return null;
  }
}

// markets por ranking
async function getMarkets({ vs = 'usd', per_page = 60, page = 1, ids = [] } = {}) {
  const base = 'https://api.coingecko.com/api/v3/coins/markets';
  const qs = new URLSearchParams({
    vs_currency: vs,
    order: 'market_cap_asc',
    per_page: String(per_page),
    page: String(page),
    sparkline: 'false',
    price_change_percentage: '24h',
  });
  if (ids?.length) qs.set('ids', ids.join(','));
  const url = `${base}?${qs.toString()}`;
  const data = await fetchJson(url);
  return Array.isArray(data) ? data : [];
}

async function getTrendingIds() {
  const j = await fetchJson('https://api.coingecko.com/api/v3/search/trending');
  const list = j?.coins || [];
  return list.map(c => c?.item?.id).filter(Boolean);
}

// PÚBLICO: não exige verifyToken
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 24), 100);
    const usdbrl = await getUsdToBrl();

    // 1) tenta markets “normais”
    let markets = await getMarkets({ per_page: Math.max(limit, 60), page: 1 });

    // 2) fallback: trending
    if (!markets.length) {
      const ids = await getTrendingIds();
      if (ids.length) {
        markets = await getMarkets({ ids, per_page: Math.min(ids.length, 60) });
      }
    }

    // 3) fallback final: mais uma chamada
    if (!markets.length) {
      markets = await getMarkets({ per_page: Math.max(limit, 24), page: 1 });
    }

    const out = markets.slice(0, limit).map(c => ({
      id: c.id,
      coingeckoId: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      current_price: Number(c.current_price),
      brl_price: Number(c.current_price) * usdbrl,
      price_change_percentage_24h: Number(c.price_change_percentage_24h),
    }));

    return res.json(out);
  } catch (err) {
    console.error('Erro em /api/novas:', err);
    return res.json([]);
  }
});

export default router;
