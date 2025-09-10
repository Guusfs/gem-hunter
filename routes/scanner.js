// routes/scanner.js
import express from 'express';
import { getMarketsPage } from '../utils/coingecko.js';

const router = express.Router();

/**
 * Scanner simplificado: uma chamada controlada,
 * cacheada e com rate-limit global via utils.
 */
router.get('/', async (_req, res) => {
  try {
    const data = await getMarketsPage({
      vs: 'usd',
      order: 'market_cap_asc',
      perPage: 50,
      page: 1,
    });

    const result = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      price: Number(c.current_price),
      change24h: Number(c.price_change_percentage_24h),
      image: c.image,
    }));

    res.json({ items: result, ts: Date.now() });
  } catch (e) {
    console.error('/api/scanner error', e);
    res.json({ items: [], ts: Date.now() });
  }
});

export default router;
