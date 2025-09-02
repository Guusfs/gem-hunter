import express from 'express';
import fetch from 'node-fetch';

const router = express.Router(); // ✅ mover para o topo

// Rota para notícias recentes (CoinGecko tem uma lista limitada)
router.get('/atualizacoes', async (req, res) => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/status_updates');
    const data = await response.json();

    const noticias = data.status_updates?.slice(0, 10) || [];
    res.json(noticias);
  } catch (err) {
    console.error('Erro ao buscar atualizações:', err.message);
    res.status(500).json({ error: 'Erro ao buscar atualizações' });
  }
});

export default router; // ✅ manter exportação padrão
