// routes/novas.js
import express from 'express';
import { getMarketsPage, getUsdToBrl } from '../utils/coingecko.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

// GET /api/novas?limit=60
router.get('/', /*verifyToken,*/ async (req, res) => {
  try {
    const limit = Math.min( Number(req.query.limit) || 60, 200 );

    // tenta CG; se 429, o util cai para CoinPaprika automaticamente
    const mkts = await getMarketsPage({
      vs: 'usd',
      order: 'market_cap_asc',
      perPage: limit,
      page: 1
    });

    if (!Array.isArray(mkts) || mkts.length === 0) {
      return res.json([]); // front mostrará "nenhuma cripto"
    }

    const usdbrl = await getUsdToBrl();

    // normaliza p/ o front atual: id, name, symbol, image, current_price, brl_price, price_change_percentage_24h
    const out = mkts.map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      current_price: Number(c.current_price),
      brl_price: Number(c.current_price) * usdbrl,
      price_change_percentage_24h: Number(c.price_change_percentage_24h)
    })).filter(x => Number.isFinite(x.current_price));

    res.json(out);
  } catch (e) {
    console.error('[NOVAS] erro:', e);
    res.json([]); // não quebra a UI
  }
});

export default router;
