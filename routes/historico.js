// routes/historico.js
import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import Historico from '../models/historico.js';

const router = express.Router();

/**
 * POST /api/historico
 * body: { tipo: 'COMPRA'|'VENDA', nome, symbol, preco, qtd?, coingeckoId? }
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { tipo, nome, symbol, preco, qtd = 1, coingeckoId } = req.body;

    if (!tipo || !nome || !symbol || typeof preco !== 'number') {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, nome, symbol, preco' });
    }

    const doc = await Historico.create({
      userId: req.userId,
      tipo,
      nome,
      symbol: symbol.toUpperCase(),
      preco: Number(preco),
      qtd: Number(qtd) || 1,
      coingeckoId,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Erro ao salvar histórico:', err);
    res.status(500).json({ error: 'Erro ao salvar histórico' });
  }
});

/**
 * GET /api/historico
 * Retorna as ações do usuário, mais recentes primeiro.
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Historico.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(list);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

export default router;
