// utils/coingecko.js
// Node 18+ (fetch nativo)

const marketsCache = new Map(); // key -> { v, t }
const simpleCache  = new Map(); // key -> { v, t }
const fxCache      = new Map(); // 'USD/BRL' -> { v, t }

const TTL_MARKETS_MS = 30_000;   // 30s
const TTL_SIMPLE_MS  = 60_000;   // 60s
const TTL_FX_MS      = 600_000;  // 10min

let nextAllowedAt = 0;           // rate-limit global (1 req / 30s)
let inFlight = null;             // evita paralelismo

function getCached(map, key, ttl) {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > ttl) return null;
  return hit.v;
}
function setCached(map, key, v) {
  map.set(key, { v, t: Date.now() });
}

async function guardedFetchJson(url) {
  // rate-limit: 1 chamada a cada 30s
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);

  // Se já existe uma chamada em curso, aguarde ela terminar (coalescing)
  if (inFlight) {
    try { return await inFlight; } finally { /* noop */ }
  }

  // Se precisa aguardar, programe a espera
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }

  // Dispare a chamada única
  inFlight = (async () => {
    let resp;
    try {
      resp = await fetch(url, { headers: { 'accept': 'application/json' } });
      // programe o próximo slot
      nextAllowedAt = Date.now() + 30_000;

      // Se 429, NÃO estoure erro para os chamadores — eles usarão cache
      if (resp.status === 429) {
        const txt = await resp.text().catch(() => '');
        console.warn('[CoinGecko] 429 em', url, txt.slice(0, 120));
        return { __429: true };
      }
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
      }
      const ct = resp.headers.get('content-type') || '';
      return ct.includes('application/json') ? resp.json() : {};
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Lista de moedas com preço/24h (UMA página apenas) */
export async function getMarketsPage({ vs = 'usd', order = 'market_cap_asc', perPage = 50, page = 1 } = {}) {
  const key = `mk:${vs}:${order}:${perPage}:${page}`;
  const cached = getCached(marketsCache, key, TTL_MARKETS_MS);
  if (cached) return cached;

  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vs)}` +
    `&order=${encodeURIComponent(order)}` +
    `&per_page=${encodeURIComponent(perPage)}` +
    `&page=${encodeURIComponent(page)}` +
    `&sparkline=false&price_change_percentage=24h`;

  const data = await guardedFetchJson(url);

  // Se tomou 429 ou falhou: devolva último cache (se houver) ou []
  if (!data || data.__429) {
    return cached || [];
  }

  setCached(marketsCache, key, data);
  return data;
}

/** Preços simples em USD */
export async function getUsdPrices(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return {};

  const key = `sp:${unique.sort().join(',')}`;
  const cached = getCached(simpleCache, key, TTL_SIMPLE_MS);
  if (cached) return cached;

  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;

  const data = await guardedFetchJson(url);
  if (!data || data.__429) {
    return cached || {};
  }

  setCached(simpleCache, key, data);
  return data;
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

/** USD->BRL por fonte pública alternativa (sem token) */
export async function getUsdToBrl() {
  const cached = getCached(fxCache, 'USD/BRL', TTL_FX_MS);
  if (cached) return cached;

  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const j = await r.json();
    const brl = Number(j?.rates?.BRL);
    if (Number.isFinite(brl)) {
      setCached(fxCache, 'USD/BRL', brl);
      return brl;
    }
  } catch (e) {
    console.warn('[FX] fallback USD->BRL', e.message);
  }
  // fallback sem travar a UI
  return cached || 5;
}
