// routes/scanner.js
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { slugifyForCoingecko, getUsdPrices, getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

// Devolve uma lista simples de criptos “ativas” p/ o front brincar
router.get('/', verifyToken, async (req, res) => {
  try {
    // Fonte de exemplo — troque pela sua fonte real, DB, etc.
    const base = [
      { name: 'Aark Digital', symbol: 'aark' },
      { name: 'Stars',        symbol: 'stars' },
      { name: 'Aardvark',     symbol: 'vark' },
    ];

    const ids = base.map(x => slugifyForCoingecko(x.name || x.symbol));
    const [prices, usdbrl] = await Promise.all([getUsdPrices(ids), getUsdToBrl()]);

    const out = base.map(x => {
      const id = slugifyForCoingecko(x.name || x.symbol);
      const usd = Number(prices?.[id]?.usd);
      return {
        ...x,
        coingeckoId: id,
        priceUsd: Number.isFinite(usd) ? usd : null,
        priceBrl: Number.isFinite(usd) ? usd * usdbrl : null,
        // opcional: simular variação 24h caso não tenha
        price_change_percentage_24h: Number((Math.random() * 10 - 5).toFixed(2)),
      };
    });

    res.json(out); // sempre array
  } catch (err) {
    console.error('Erro no scanner:', err);
    res.json([]); // fallback seguro
  }
});

export default router;
