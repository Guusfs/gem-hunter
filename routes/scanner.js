// routes/scanner.js
import express from 'express';
import { getMarketsPage, getUsdToBrl } from '../utils/coingecko.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// GET /api/scanner
router.get('/', /*verifyToken,*/ async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 200);

    const mkts = await getMarketsPage({
      vs: 'usd',
      order: 'market_cap_asc',
      perPage: limit,
      page: 1
    });

    if (!Array.isArray(mkts) || mkts.length === 0) {
      return res.json({ items: [] });
    }

    const usdbrl = await getUsdToBrl();

    const items = mkts.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      priceUsd: Number(c.current_price),
      priceBrl: Number(c.current_price) * usdbrl,
      change24h: Number(c.price_change_percentage_24h)
    })).filter(x => Number.isFinite(x.priceUsd));

    // Se quiser, pode filtrar para “candidatas”: p.ex. variação <= -5% etc.
    // const filtered = items.filter(x => Math.abs(x.change24h) >= 2);
    res.json({ items });
  } catch (e) {
    console.error('[SCANNER] erro:', e);
    res.json({ items: [] });
  }
});

export default router;
