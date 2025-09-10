import express from 'express';
import { getMarketsSnapshot, getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 60, 60);
    const [snap, usdbrl] = await Promise.all([
      getMarketsSnapshot(limit), // 1 snapshot compartilhado p/ todos
      getUsdToBrl(),
    ]);

    const lista = (snap || []).slice(0, limit).map(c => ({
      id: c.id,
      coingeckoId: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      priceUsd: Number(c.current_price),
      priceBrl: Number(c.current_price) * usdbrl,
      price_change_percentage_24h: Number(c.price_change_percentage_24h),
    }));

    res.json(lista);
  } catch (e) {
    console.error('[NOVAS] erro:', e);
    res.status(200).json([]); // devolve vazio p/ não quebrar UI
  }
});

export default router;
