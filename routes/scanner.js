import express from 'express';
import { getMarketsSnapshot } from '../utils/coingecko.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const data = await getMarketsSnapshot(50); // mesmo snapshot
    // seu processamento aqui… (ex.: filtrar, sinalizar, etc.)
    res.json({ updatedAt: Date.now(), items: data });
  } catch (e) {
    console.error('[SCANNER] erro:', e);
    res.status(200).json({ updatedAt: Date.now(), items: [] });
  }
});

export default router;
