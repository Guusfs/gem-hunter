// utils/coingecko.js
// Node 18+ (fetch nativo) — Fallbacks: CoinGecko -> CoinPaprika / CoinCap

const marketsCache = new Map(); // key -> { v, t }
const simpleCache  = new Map();
const fxCache      = new Map();

const TTL_MARKETS_MS = 30_000;  // 30s
const TTL_SIMPLE_MS  = 60_000;  // 60s
const TTL_FX_MS      = 600_000; // 10min

let nextAllowedAt = 0;  // rate-limit CG (1 req/30s)
let inFlight = null;

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

/* ---------- Helpers ---------- */
async function guardedFetchJson(url) {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);
  if (inFlight) return inFlight;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));

  inFlight = (async () => {
    try {
      const resp = await fetch(url, { headers: { accept: 'application/json' } });
      nextAllowedAt = Date.now() + 30_000;
      if (resp.status === 429) return { __429: true };
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

/* ---------- CoinGecko primary ---------- */
async function cg_markets({ vs = 'usd', order = 'market_cap_asc', perPage = 50, page = 1 }) {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vs)}` +
    `&order=${encodeURIComponent(order)}&per_page=${perPage}&page=${page}` +
    `&sparkline=false&price_change_percentage=24h`;
  const data = await guardedFetchJson(url);
  return data;
}
async function cg_simple(ids) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;
  const data = await guardedFetchJson(url);
  return data;
}

/* ---------- CoinPaprika fallback (markets) ---------- */
async function paprika_markets(limit = 50) {
  // /v1/tickers retorna muitos; filtramos/slice local
  const url = `https://api.coinpaprika.com/v1/tickers`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const arr = await resp.json();

  // normalização p/ schema parecido com CG
  const out = (arr || []).slice(0, limit).map(x => ({
    id: x.id,                      // ex: "btc-bitcoin"
    name: x.name,                  // "Bitcoin"
    symbol: x.symbol,              // "BTC"
    image: `https://static.coinpaprika.com/coin/${x.id}/logo.png`,
    current_price: Number(x?.quotes?.USD?.price ?? null),
    price_change_percentage_24h: Number(x?.quotes?.USD?.percent_change_24h ?? null),
  })).filter(o => Number.isFinite(o.current_price));
  return out;
}

/* ---------- CoinCap fallback (simple prices) ---------- */
async function coincap_simple(ids) {
  // CoinCap usa ids tipo 'bitcoin','ethereum' (slug)
  const slugIds = ids.map(slugifyForCoingecko).join(',');
  const url = `https://api.coincap.io/v2/assets?ids=${encodeURIComponent(slugIds)}`;
  const resp = await fetch(url);
  if (!resp.ok) return {};
  const j = await resp.json();
  const map = {};
  (j?.data || []).forEach(a => {
    const id = slugifyForCoingecko(a.id);
    const usd = Number(a.priceUsd);
    if (Number.isFinite(usd)) map[id] = { usd };
  });
  return map;
}

/* ---------- API exposta ao resto do app ---------- */
export async function getMarketsPage({ vs = 'usd', order = 'market_cap_asc', perPage = 50, page = 1 } = {}) {
  const key = `mk:${vs}:${order}:${perPage}:${page}`;
  const cached = getCached(marketsCache, key, TTL_MARKETS_MS);
  if (cached) return cached;

  // 1) tenta CoinGecko
  const cg = await cg_markets({ vs, order, perPage, page });
  if (cg && !cg.__429 && Array.isArray(cg) && cg.length) {
    setCached(marketsCache, key, cg);
    return cg;
  }
  // 2) fallback CoinPaprika (sem 429)
  const p = await paprika_markets(perPage);
  setCached(marketsCache, key, p);
  return p;
}

export async function getUsdPrices(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return {};

  const key = `sp:${unique.sort().join(',')}`;
  const cached = getCached(simpleCache, key, TTL_SIMPLE_MS);
  if (cached) return cached;

  // 1) tenta CoinGecko
  const cg = await cg_simple(unique);
  if (cg && !cg.__429 && typeof cg === 'object' && Object.keys(cg).length) {
    setCached(simpleCache, key, cg);
    return cg;
  }
  // 2) fallback CoinCap (ids em slug)
  const cc = await coincap_simple(unique);
  // CoinCap mapa está como { slug: {usd} } — transforme p/ CG-like
  const out = {};
  unique.forEach(id => {
    const slug = slugifyForCoingecko(id);
    const usd = Number(cc?.[slug]?.usd);
    if (Number.isFinite(usd)) out[id] = { usd };
  });
  setCached(simpleCache, key, out);
  return out;
}

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
  } catch (e) {}
  return cached || 5;
}
