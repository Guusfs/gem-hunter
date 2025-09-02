// utils/coinGecko.js (Node 18+)

const priceCache = new Map();
const fxCache = new Map();
const TTL_PRICES_MS = 60_000;   // 1 min
const TTL_FX_MS     = 600_000;  // 10 min

function getCached(map, key, ttl) {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > ttl) return null;
  return hit.v;
}
function setCached(map, key, v) {
  map.set(key, { v, t: Date.now() });
}

export function slugifyForCoingecko(nameOrSymbol = '') {
  return String(nameOrSymbol)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchJsonRetry(url, { retries = 2, backoffMs = 800 } = {}) {
  for (let i = 0; i <= retries; i++) {
    const resp = await fetch(url, { headers: { accept: 'application/json' } });
    const ct = resp.headers.get('content-type') || '';
    if (resp.ok) return ct.includes('application/json') ? resp.json() : {};
    if (resp.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
      continue;
    }
    const txt = await resp.text().catch(() => '');
    throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
  }
  return {};
}

export async function getUsdPrices(ids) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  const cacheKey = unique.sort().join(',');
  const cached = getCached(priceCache, cacheKey, TTL_PRICES_MS);
  if (cached) return cached;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;
  try {
    const data = await fetchJsonRetry(url, { retries: 2, backoffMs: 800 });
    setCached(priceCache, cacheKey, data);
    return data;
  } catch (e) {
    console.warn('[CoinGecko] preços falharam:', e.message);
    return priceCache.get(cacheKey)?.v || {};
  }
}

export async function getUsdToBrl() {
  const cached = getCached(fxCache, 'USD/BRL', TTL_FX_MS);
  if (cached) return cached;

  // Fonte estável, sem CORS no front
  const url = 'https://open.er-api.com/v6/latest/USD';
  try {
    const data = await fetchJsonRetry(url, { retries: 2, backoffMs: 800 });
    const brl = Number(data?.rates?.BRL);
    if (Number.isFinite(brl)) {
      setCached(fxCache, 'USD/BRL', brl);
      return brl;
    }
  } catch (e) {
    console.warn('[FX] USD->BRL falhou:', e.message);
  }
  // fallback mais realista que 1
  return 5.0;
}
