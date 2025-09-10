// routes/novas.js
import express from 'express';
import { getMarketsPage, getUsdToBrl } from '../utils/coingecko.js';
import { verifyToken } from '../middlewares/verifyToken.js'; // se a rota era pública, pode remover

const router = express.Router();

// GET /api/novas  -> devolve top N moedas "novas" da primeira página (ajuste seu critério)
router.get('/', /* verifyToken, */ async (req, res) => {
  try {
    const perPage = Math.min(Number(req.query.limit) || 60, 60);
    const [markets, usdbrl] = await Promise.all([
      getMarketsPage(1, perPage),   // 1 chamada com cache 30s
      getUsdToBrl(),
    ]);

    // Ajuste esse filtro p/ "novas" conforme seu critério (data de listagem, market_cap baixo etc.)
    const lista = (markets || []).map(c => ({
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
    res.status(500).json({ error: 'Falha ao carregar novas moedas' });
  }
});

export default router;
