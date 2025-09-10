// routes/scanner.js
import express from 'express';
import { getMarketsPage } from '../utils/coingecko.js';

const router = express.Router();

let lastSnap = { t: 0, data: [] };

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (now - lastSnap.t > 30_000) {       // 30s entre snapshots
      const page = await getMarketsPage(1, 50);  // 1 chamada cacheada
      lastSnap = { t: now, data: page };
    }
    // coloque aqui sua análise para "sinais" do scanner; estou retornando o snapshot cru
    res.json({ updatedAt: lastSnap.t, items: lastSnap.data });
  } catch (e) {
    console.error('[SCANNER] erro:', e);
    res.status(500).json({ error: 'Falha ao ler scanner' });
  }
});

export default router;
