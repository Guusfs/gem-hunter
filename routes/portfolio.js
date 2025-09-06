// routes/portfolio.js
import express from 'express';
import Portfolio from '../models/portfolio.js';
import { verifyToken } from '../middlewares/verifyToken.js';

// Utils CoinGecko (com cache/retry)
import { slugifyForCoingecko, getUsdPrices, getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

// POST /api/portfolio
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, symbol, image, priceAtPurchase, coingeckoId } = req.body;

    if (!name || !symbol || typeof priceAtPurchase !== 'number') {
      return res.status(400).json({ error: 'Campos obrigatórios: name, symbol, priceAtPurchase (number)' });
    }

    const doc = await Portfolio.create({
      userId: req.userId,
      name,
      symbol,
      image,
      // sempre guardamos a compra em USD (fonte canônica)
      priceAtPurchase,
      coingeckoId: coingeckoId || slugifyForCoingecko(name) || slugifyForCoingecko(symbol),
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Erro ao salvar no portfólio:', err);
    res.status(500).json({ error: 'Erro ao salvar no portfólio' });
  }
});

// GET /api/portfolio  (retorna enriquecido com USD/BRL + lucro)
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Portfolio.find({ userId: req.userId }).lean();

    const ids = list.map(
      it => it.coingeckoId || slugifyForCoingecko(it.name) || slugifyForCoingecko(it.symbol)
    );

    const [priceMap, usdbrl] = await Promise.all([
      getUsdPrices(ids), // { id: { usd: number } }
      getUsdToBrl(),     // número (ex.: 5.20)
    ]);

    const enriched = list.map(it => {
      const id = it.coingeckoId || slugifyForCoingecko(it.name) || slugifyForCoingecko(it.symbol);

      const currentUsd = Number(priceMap?.[id]?.usd);
      const currentPriceUsd = Number.isFinite(currentUsd) ? currentUsd : null;

      const buyUsd = Number(it.priceAtPurchase);
      const profitUsd  = Number.isFinite(currentPriceUsd) ? (currentPriceUsd - buyUsd) : null;
      const profitPct  = Number.isFinite(currentPriceUsd) ? ((currentPriceUsd / buyUsd - 1) * 100) : null;

      return {
        ...it,
        coingeckoId: id || null,
        usdbrl,

        // compra
        buyPriceUsd:  Number.isFinite(buyUsd) ? buyUsd : null,
        buyPriceBrl:  Number.isFinite(buyUsd) ? buyUsd * usdbrl : null,

        // preço atual
        currentPriceUsd,
        currentPriceBrl: Number.isFinite(currentPriceUsd) ? currentPriceUsd * usdbrl : null,

        // lucro
        profitUsd,
        profitBrl: Number.isFinite(profitUsd) ? profitUsd * usdbrl : null,
        profitPct,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Erro ao carregar portfólio:', err);
    res.status(500).json({ error: 'Erro ao carregar portfólio' });
  }
});

// DELETE /api/portfolio/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Cripto removida do portfólio' });
  } catch (err) {
    console.error('Erro ao remover do portfólio:', err);
    res.status(500).json({ error: 'Erro ao remover do portfólio' });
  }
});

export default router;
