// routes/sentimentos.js
import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=7&format=json');
    const data = await response.json();

    const historico = data.data.map(entry => ({
      valor: parseInt(entry.value),
      classificacao: entry.value_classification,
      data: entry.timestamp * 1000 // timestamp em ms
    })).reverse(); // ordem do mais antigo para o mais novo

    // Simulação de sentimento social (exemplo fixo — pode integrar com APIs reais no futuro)
    const sentimentoSocial = {
      positivo: 58,
      neutro: 27,
      negativo: 15
    };

    res.json({
      historico,
      sentimentoAtual: historico[historico.length - 1],
      sentimentoSocial
    });
  } catch (err) {
    console.error('Erro ao buscar sentimentos:', err);
    res.status(500).json({ error: 'Erro ao buscar dados de sentimento de mercado.' });
  }
});

export default router;
