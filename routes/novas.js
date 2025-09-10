// routes/novas.js
import express from 'express';
import { getMarketsPage } from '../utils/coingecko.js';

const router = express.Router();

/**
 * Agora buscamos APENAS 1 página de markets (50 itens),
 * com cache de 30s e rate-limit no util.
 */
router.get('/', async (_req, res) => {
  try {
    const page = 1;      // fixo (evitar múltiplas chamadas/páginas)
    const perPage = 50;  // suficiente p/ UI
    const data = await getMarketsPage({
      vs: 'usd',
      order: 'market_cap_asc',
      perPage,
      page,
    });

    // normalize para o front (novas.js já espera esses campos)
    const norm = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      image: c.image,
      current_price: Number(c.current_price),
      brl_price: null, // front pode converter se quiser
      price_change_percentage_24h: Number(c.price_change_percentage_24h),
    }));

    res.json(norm);
  } catch (e) {
    console.error('/api/novas error', e);
    res.json([]); // nunca quebra a UI
  }
});

export default router;
