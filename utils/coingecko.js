// utils/coingecko.js
// Node 18+ já tem fetch nativo
// Cache simples em memória + retry com backoff e fallback do último valor ("stale-while-revalidate")

/* ======================== Cache helpers ======================== */
const caches = {
  markets: new Map(),   // key -> { v, t }
  prices:  new Map(),
  fx:      new Map(),
};

function getCached(map, key, ttlMs) {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > ttlMs) return null;
  return hit.v;
}
function setCached(map, key, v) {
  map.set(key, { v, t: Date.now() });
}

/* ======================== Utils ======================== */
export function slugifyForCoingecko(nameOrSymbol = '') {
  return String(nameOrSymbol)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * fetch JSON com retry/backoff para 429/5xx.
 * Em erro final, lança exceção.
 */
async function fetchJsonRetry(url, { retries = 2, backoffMs = 700, signal } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, { signal });
      const ct = resp.headers.get('content-type') || '';
      if (resp.ok) {
        return ct.includes('application/json') ? resp.json() : {};
      }
      // Se for 429, espera e tenta de novo
      if (resp.status === 429 && i < retries) {
        await sleep(backoffMs * (i + 1));
        continue;
      }
      // Demais erros: captura e tenta novamente se tiver retries
      const txt = await resp.text().catch(() => '');
      lastErr = new Error(`[HTTP ${resp.status}] ${txt || url}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await sleep(backoffMs * (i + 1));
  }
  throw lastErr || new Error('Request failed');
}

/* ======================== APIs CoinGecko ======================== */

/**
 * Lista de mercados (para "Novas Criptos") com cache de 30s por combinação de parâmetros.
 * Exemplo de uso na rota: getMarketsCached({ page:1, perPage:50, vsCurrency:'usd' })
 */
export async function getMarketsCached({
  page = 1,
  perPage = 50,
  vsCurrency = 'usd',
  order = 'market_cap_asc',
  sparkline = false,
  priceChangePerc = '24h',
} = {}) {
  const key = `markets:vs=${vsCurrency}:page=${page}:per=${perPage}:order=${order}:spark=${sparkline}:pc=${priceChangePerc}`;
  const TTL_MS = 30 * 1000;

  // hit de cache
  const cached = getCached(caches.markets, key, TTL_MS);
  if (cached) return cached;

  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${encodeURIComponent(vsCurrency)}` +
    `&order=${encodeURIComponent(order)}` +
    `&per_page=${encodeURIComponent(perPage)}` +
    `&page=${encodeURIComponent(page)}` +
    `&sparkline=${sparkline ? 'true' : 'false'}` +
    `&price_change_percentage=${encodeURIComponent(priceChangePerc)}`;

  try {
    const data = await fetchJsonRetry(url, { retries: 2, backoffMs: 800 });
    setCached(caches.markets, key, data);
    return data;
  } catch (e) {
    // fallback: retorna o último valor "stale" se existir
    const stale = caches.markets.get(key)?.v;
    if (stale) return stale;
    console.warn('[CoinGecko][markets] falha:', e.message);
    return [];
  }
}

/**
 * Preços simples em USD, com cache de 60s.
 * ids: array de slugs do CoinGecko (ex.: ['bitcoin','solana'])
 * retorna: { bitcoin: { usd: 12345.67 }, ... }
 */
export async function getUsdPrices(ids) {
  const arr = Array.from(new Set((ids || []).filter(Boolean)));
  if (arr.length === 0) return {};

  const key = arr.sort().join(',');
  const TTL_MS = 60 * 1000;

  const cached = getCached(caches.prices, key, TTL_MS);
  if (cached) return cached;

  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(key)}` +
    `&vs_currencies=usd`;

  try {
    const data = await fetchJsonRetry(url, { retries: 2, backoffMs: 800 });
    setCached(caches.prices, key, data);
    return data;
  } catch (e) {
    const stale = caches.prices.get(key)?.v;
    if (stale) return stale;
    console.warn('[CoinGecko][prices] falha:', e.message);
    return {};
  }
}

/**
 * Câmbio USD→BRL com cache de 120s.
 * Retorna número (ex.: 5.23). Se falhar, tenta último valor.
 */
export async function getUsdToBrl() {
  const key = 'USD/BRL';
  const TTL_MS = 120 * 1000;

  const cached = getCached(caches.fx, key, TTL_MS);
  if (cached) return cached;

  // fonte 1: open.er-api.com (estável e sem CORS para backend)
  const url = 'https://open.er-api.com/v6/latest/USD';

  try {
    const data = await fetchJsonRetry(url, { retries: 2, backoffMs: 700 });
    const brl = Number(data?.rates?.BRL);
    if (Number.isFinite(brl)) {
      setCached(caches.fx, key, brl);
      return brl;
    }
    // fallback (CoinGecko simple price para "usd" em BRL)
    const cg = await fetchJsonRetry(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=brl',
      { retries: 1, backoffMs: 700 }
    );
    const cgBrl = Number(cg?.usd?.brl);
    if (Number.isFinite(cgBrl)) {
      setCached(caches.fx, key, cgBrl);
      return cgBrl;
    }
  } catch (e) {
    // Tenta fallback antigo de cache
    const stale = caches.fx.get(key)?.v;
    if (Number.isFinite(stale)) return stale;
    console.warn('[FX] USD->BRL falhou:', e.message);
  }
  return 1; // último último fallback
}
