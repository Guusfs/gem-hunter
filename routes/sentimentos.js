// routes/sentimentos.js
import express from 'express';

const router = express.Router();

// cache em memória (30s)
const TTL_MS = 30_000;
let cache = { ts: 0, payload: null };

function classifica(v) {
  if (v >= 75) return 'Ganância Extrema';
  if (v >= 55) return 'Ganância';
  if (v >= 45) return 'Neutro';
  if (v >= 25) return 'Medo';
  return 'Medo Extremo';
}

async function fetchJsonRetry(url, { retries = 2, backoffMs = 800 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url);
    if (resp.ok) return resp.json();
    if (resp.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
      continue;
    }
    const txt = await resp.text().catch(() => '');
    throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
  }
  return null;
}

/**
 * GET /api/sentimentos
 * Usa Alternative.me (Fear & Greed) + um social sentiment simples derivado.
 * Responde do cache por 30s.
 */
router.get('/', async (_req, res) => {
  try {
    if (cache.payload && Date.now() - cache.ts < TTL_MS) {
      return res.json(cache.payload);
    }

    // 14 dias de histórico
    const url = 'https://api.alternative.me/fng/?limit=14&format=json';
    const data = await fetchJsonRetry(url);

    const items = Array.isArray(data?.data) ? data.data : [];
    // último valor
    const last = items[0] || { value: '50', timestamp: Math.floor(Date.now() / 1000) };

    const valor = Number(last.value) || 50;
    const sentimentoAtual = {
      valor,
      classificacao: classifica(valor),
    };

    const historico = items
      .slice() // cópia
      .reverse() // do mais antigo ao mais novo
      .map(it => ({
        data: new Date(Number(it.timestamp) * 1000).toISOString(),
        valor: Number(it.value) || 50,
      }));

    // "sentimento social" simples (derivado do valor)
    const positivo = Math.max(0, Math.min(100, Math.round(valor)));
    const neutro = 100 - Math.abs(50 - valor); // quanto mais perto de 50, mais neutro
    const negativo = Math.max(0, 100 - positivo);

    const payload = {
      sentimentoAtual,
      historico,
      sentimentoSocial: {
        positivo,
        neutro,
        negativo,
      },
    };

    cache = { ts: Date.now(), payload };
    res.json(payload);
  } catch (err) {
    console.warn('[SENTIMENTOS] falhou:', err.message);
    if (cache.payload) return res.json(cache.payload);
    // fallback mínimo
    res.json({
      sentimentoAtual: { valor: 50, classificacao: 'Neutro' },
      historico: Array.from({ length: 14 }, (_, i) => ({
        data: new Date(Date.now() - (13 - i) * 86_400_000).toISOString(),
        valor: 50,
      })),
      sentimentoSocial: { positivo: 50, neutro: 100, negativo: 50 },
    });
  }
});

export default router;
