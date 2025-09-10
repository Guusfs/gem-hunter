// routes/novas.js
import express from 'express';
import fetch from 'node-fetch'; // se ainda não tiver, adicione ou use global fetch no Node 18+

const router = express.Router();

// ====== CONFIG ======
const TTL_MS = 90_000;         // 90s de validade normal do cache
const COOLDOWN_MS = 180_000;    // 3min de pausa após 429
const MAX_COINS = 60;           // limite total
const PAGE_SIZE = 30;           // por página
const PAGES = Math.ceil(MAX_COINS / PAGE_SIZE);

// cache compartilhado
let NOVAS_CACHE = {
  data: [],
  t: 0,
  cooldownUntil: 0,
};

// helper para saber se cache está fresco
function cacheFresco() {
  return Date.now() - NOVAS_CACHE.t < TTL_MS;
}
function emCooldown() {
  return Date.now() < NOVAS_CACHE.cooldownUntil;
}

router.get('/', async (req, res) => {
  try {
    // Se ainda em cooldown ou cache fresco -> devolve cache
    if (emCooldown() || cacheFresco()) {
      return res.json(NOVAS_CACHE.data);
    }

    // Monta as páginas (reduzido para não estourar limite)
    const urls = Array.from({ length: PAGES }, (_, i) =>
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_asc&per_page=${PAGE_SIZE}&page=${i+1}&sparkline=false&price_change_percentage=24h`
    );

    // busca em série (menos agressivo) — se quiser, faça em paralelo com Promise.all
    const results = [];
    for (const url of urls) {
      const r = await fetch(url);
      // Tratamento explícito de 429
      if (r.status === 429) {
        // entra em cooldown e devolve cache antigo
        NOVAS_CACHE.cooldownUntil = Date.now() + COOLDOWN_MS;
        return res.json(NOVAS_CACHE.data);
      }
      if (!r.ok) {
        // se outro erro, usa cache se existir
        if (NOVAS_CACHE.data.length) return res.json(NOVAS_CACHE.data);
        const txt = await r.text().catch(() => '');
        return res.status(502).json({ error: 'Falha ao consultar CoinGecko', detail: txt });
      }
      const json = await r.json();
      results.push(...json);
    }

    // Limita ao máximo desejado e salva no cache
    NOVAS_CACHE.data = results.slice(0, MAX_COINS);
    NOVAS_CACHE.t = Date.now();
    NOVAS_CACHE.cooldownUntil = 0; // limpamos cooldown se obteve dados
    return res.json(NOVAS_CACHE.data);

  } catch (err) {
    console.error('[NOVAS] erro:', err);
    // No erro, devolve cache se existir
    if (NOVAS_CACHE.data.length) return res.json(NOVAS_CACHE.data);
    return res.status(500).json({ error: 'Erro ao carregar novas criptos' });
  }
});

export default router;
