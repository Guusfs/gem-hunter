// routes/configuracoes.js
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import UserSettings from '../models/UserSettings.js';

const router = express.Router();

// cria doc padrão se não existir
async function getOrCreate(userId) {
  let s = await UserSettings.findOne({ userId });
  if (!s) {
    s = await UserSettings.create({ userId }); // defaults do schema
  }
  return s;
}

// GET /api/configuracoes
router.get('/', verifyToken, async (req, res) => {
  try {
    const s = await getOrCreate(req.userId);
    res.json(s);
  } catch (e) {
    console.error('GET /configuracoes', e);
    res.status(500).json({ error: 'Erro ao carregar configurações' });
  }
});

// PUT /api/configuracoes
router.put('/', verifyToken, async (req, res) => {
  try {
    const payload = req.body || {};
    const s = await getOrCreate(req.userId);

    // aplica apenas campos conhecidos (merge defensivo)
    if (payload.notifications) {
      s.notifications.email = !!payload.notifications.email;
      s.notifications.push  = !!payload.notifications.push;
    }
    if (payload.ai) {
      if (Number.isFinite(payload.ai.sensitivity))
        s.ai.sensitivity = Math.max(0, Math.min(100, Number(payload.ai.sensitivity)));
      if (Number.isFinite(payload.ai.windowMinutes))
        s.ai.windowMinutes = Math.max(1, Math.min(240, Number(payload.ai.windowMinutes)));
    }
    if (payload.prefs) {
      if (payload.prefs.language) s.prefs.language = String(payload.prefs.language);
      if (payload.prefs.timezone) s.prefs.timezone = String(payload.prefs.timezone);
      if (payload.prefs.currency) s.prefs.currency = String(payload.prefs.currency);
    }

    await s.save();
    res.json(s);
  } catch (e) {
    console.error('PUT /configuracoes', e);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

export default router;
