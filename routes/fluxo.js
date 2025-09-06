// routes/fluxo.js
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import Portfolio from '../models/portfolio.js';
import { slugifyForCoingecko, getUsdPrices } from '../utils/coingecko.js';

const router = express.Router();

// Regras (ajuste como preferir)
const EXIT_TAKE_PROFIT_PCT = 12;   // lucro >= 12%
const EXIT_STOP_LOSS_PCT   = -7;   // perda <= -7%
const ENTRY_DIP_PCT        = -5;   // variação 24h <= -5% (queda) -> possível entrada

// GET /api/fluxo  -> oportunidades de Entrada e Saída
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1) Carrega portfolio do usuário
    const list = await Portfolio.find({ userId: req.userId }).lean();

    // 2) Preços atuais para o portfolio
    const ids = list.map(it => it.coingeckoId || slugifyForCoingecko(it.name) || slugifyForCoingecko(it.symbol));
    const priceMap = await getUsdPrices(ids);

    // 3) Sugerir SAÍDAS (take profit / stop loss)
    const saidas = list.map((it) => {
      const id = it.coingeckoId || slugifyForCoingecko(it.name) || slugifyForCoingecko(it.symbol);
      const current = Number(priceMap?.[id]?.usd);
      if (!Number.isFinite(current)) return null;

      const buy = Number(it.priceAtPurchase);
      const profitPct = (current / buy - 1) * 100;

      const motivo =
        profitPct >= EXIT_TAKE_PROFIT_PCT ? `Lucro ≥ ${EXIT_TAKE_PROFIT_PCT}%`
      : profitPct <= EXIT_STOP_LOSS_PCT   ? `Stop ≤ ${EXIT_STOP_LOSS_PCT}%`
      : null;

      if (!motivo) return null;

      return {
        tipo: 'saida',
        portfolioId: String(it._id),
        name: it.name,
        symbol: it.symbol,
        coingeckoId: id,
        buyPrice: buy,
        currentPrice: current,
        profitPct: Number(profitPct.toFixed(2)),
        motivo,
      };
    }).filter(Boolean);

    // 4) Sugerir ENTRADAS a partir de uma lista “novas”
    //    Para simplificar: use o mesmo endpoint do CoinGecko de markets e filtre por variação 24h.
    //    (Se você já tem /api/novas no backend, pode replicar a mesma lógica aqui.)
    const url = 'https://api.coingecko.com/api/v3/coins/markets'
      + '?vs_currency=usd&order=market_cap_asc&per_page=50&page=1'
      + '&sparkline=false&price_change_percentage=24h';
    let entradas = [];
    try {
      const resp = await fetch(url);
      const data = resp.ok ? await resp.json() : [];
      entradas = (Array.isArray(data) ? data : [])
        .filter(c => Number.isFinite(c.price_change_percentage_24h) && c.price_change_percentage_24h <= ENTRY_DIP_PCT)
        .slice(0, 10)
        .map(c => ({
          tipo: 'entrada',
          name: c.name,
          symbol: c.symbol,
          coingeckoId: c.id,
          currentPrice: Number(c.current_price) || 0,
          change24h: Number(c.price_change_percentage_24h.toFixed(2)),
          motivo: `Queda 24h ≤ ${ENTRY_DIP_PCT}%`,
          image: c.image,
        }));
    } catch {
      entradas = [];
    }

    res.json({ entradas, saidas });
  } catch (err) {
    console.error('Erro em /api/fluxo:', err);
    res.status(500).json({ error: 'Erro ao gerar oportunidades' });
  }
});

// POST /api/fluxo  -> registra uma ação (opcional, log interno)
router.post('/', verifyToken, async (req, res) => {
  try {
    // payload opcional para log/telemetria
    // Ex.: { tipo, symbol, name, valorUsd, coingeckoId, ts }
    console.log('[FLUXO LOG]', req.userId, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao registrar fluxo' });
  }
});

export default router;
