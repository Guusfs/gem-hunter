// utils/coingecko.js
// Cache + dedupe + rate-limit p/ CoinGecko (sem libs externas)

const PRICE_TTL_MS   = 30_000;   // 30s
const MARKET_TTL_MS  = 30_000;   // 30s
const FX_TTL_MS      = 600_000;  // 10min
const MAX_PER_MIN    = 40;       // margem segura (< 50/min do plano free)

const priceCache   = new Map();  // key: ids sorted => {v, t}
const marketCache  = new Map();  // key: `page|perPage` => {v, t}
const fxCache      = new Map();  // key: 'USD/BRL' => {v, t}
const inflight     = new Map();  // key: url => Promise   (de-dupe)

// rate-limit de 1min (janela deslizante)
const requestTimes = [];
function withinMinute() {
  const now = Date.now();
  while (requestTimes.length && now - requestTimes[0] > 60_000) requestTimes.shift();
  return requestTimes.length;
}
async function rateLimitGate() {
  while (withinMinute() >= MAX_PER_MIN) {
    await new Promise(r => setTimeout(r, 200)); // espera 200ms e re-checa
  }
  requestTimes.push(Date.now());
}

async function fetchJson(url, { retries = 2, backoffMs = 600 } = {}) {
  if (inflight.has(url)) return inflight.get(url);
  const p = (async () => {
    for (let i = 0; i <= retries; i++) {
      await rateLimitGate();
      const resp = await fetch(url);
      const ct = resp.headers.get('content-type') || '';
      if (resp.ok) {
        return ct.includes('application/json') ? resp.json() : {};
      }
      // 429 => backoff exponencial leve
      if (resp.status === 429 && i < retries) {
        await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
        continue;
      }
      // outros erros: tenta ler texto p/ log
      const txt = await resp.text().catch(() => '');
      throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
    }
    return {};
  })().finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

/** Normaliza IDs/símbolos para slug de CoinGecko */
export function slugifyForCoingecko(nameOrSymbol = '') {
  return String(nameOrSymbol)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Preços USD por id[] (cache 30s) */
export async function getUsdPrices(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (unique.length === 0) return {};

  const cacheKey = unique.sort().join(',');
  const hit = priceCache.get(cacheKey);
  if (hit && Date.now() - hit.t < PRICE_TTL_MS) return hit.v;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;
  try {
    const data = await fetchJson(url);
    priceCache.set(cacheKey, { v: data, t: Date.now() });
    return data;
  } catch (e) {
    console.warn('[CoinGecko] getUsdPrices falhou:', e.message);
    return hit?.v || {};
  }
}

/** Mercado (top moedas) por página (cache 30s) */
export async function getMarketsPage(page = 1, perPage = 50) {
  const key = `${page}|${perPage}`;
  const hit = marketCache.get(key);
  if (hit && Date.now() - hit.t < MARKET_TTL_MS) return hit.v;

  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
    `&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`;

  try {
    const data = await fetchJson(url);
    marketCache.set(key, { v: data, t: Date.now() });
    return data;
  } catch (e) {
    console.warn('[CoinGecko] getMarketsPage falhou:', e.message);
    return hit?.v || [];
  }
}

/** USD->BRL (cache 10min) usando open.er-api (sem CORS) */
export async function getUsdToBrl() {
  const key = 'USD/BRL';
  const hit = fxCache.get(key);
  if (hit && Date.now() - hit.t < FX_TTL_MS) return hit.v;

  const url = 'https://open.er-api.com/v6/latest/USD';
  try {
    const data = await fetchJson(url);
    const brl = Number(data?.rates?.BRL);
    if (Number.isFinite(brl)) {
      fxCache.set(key, { v: brl, t: Date.now() });
      return brl;
    }
  } catch (e) {
    console.warn('[FX] USD->BRL falhou:', e.message);
  }
  return 1; // fallback
}
