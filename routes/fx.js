// routes/fx.js
import express from 'express';
import { getUsdToBrl } from '../utils/coingecko.js';

const router = express.Router();

router.get('/usdbrl', async (_req, res) => {
  try {
    const usdbrl = await getUsdToBrl();
    res.json({ usdbrl });
  } catch (e) {
    console.error('fx/usdbrl:', e);
    res.status(500).json({ usdbrl: 5.0 });
  }
});

export default router;
