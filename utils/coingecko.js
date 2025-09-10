// utils/coingecko.js
// Gate global + backoff + cache + dedupe

const TTL_MS = 60_000;         // 60s cache
const FX_TTL_MS = 600_000;     // 10min FX
const SAFE_CAP_PER_MIN = 10;   // cap global conservador (<< 50/min CG free)

// ---- caches
const priceCache = new Map();  // key(ids ordenados) -> { v, t }
let marketSnap = { v: [], t: 0 }; // snapshot de mercado (página 1)

// ---- inflight (dedupe por URL)
const inflight = new Map();

// ---- rate limit/buffer global
const requestTimes = [];
let backoffUntil = 0;
let lastAnyFetchAt = 0;

function now() { return Date.now(); }

function withinMinute() {
  const n = now();
  while (requestTimes.length && n - requestTimes[0] > 60_000) requestTimes.shift();
  return requestTimes.length;
}

async function globalGate() {
  const t = now();

  // backoff ativo? só servir cache
  if (t < backoffUntil) throw new Error('GATE_BACKOFF');

  // espaçamento mínimo rígido entre quaisquer fetches (60s)
  if (t - lastAnyFetchAt < TTL_MS) throw new Error('GATE_COOLDOWN');

  // cap por minuto
  if (withinMinute() >= SAFE_CAP_PER_MIN) throw new Error('GATE_CAP');

  requestTimes.push(t);
  lastAnyFetchAt = t;
}

async function fetchJson(url, { retries = 0 } = {}) {
  if (inflight.has(url)) return inflight.get(url);
  const p = (async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        await globalGate(); // pode lançar GATE_* -> o caller decide servir cache
      } catch (gerr) {
        // propaguemos a razão de gate p/ o caller
        throw gerr;
      }

      const resp = await fetch(url);
      if (resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        return ct.includes('application/json') ? resp.json() : {};
      }

      // 429 => ativa backoff e sai
      if (resp.status === 429) {
        const waitMs = 180_000; // 3 minutos
        backoffUntil = now() + waitMs;
        throw new Error('HTTP_429');
      }

      // outros erros: sem retry aqui
      const txt = await resp.text().catch(() => '');
      throw new Error(`[HTTP ${resp.status}] ${txt || url}`);
    }
    return {};
  })().finally(() => inflight.delete(url));

  inflight.set(url, p);
  return p;
}

// Slug util
export function slugifyForCoingecko(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ===== Mercados (snapshot único) =====
export async function getMarketsSnapshot(perPage = 50) {
  const fresh = now() - marketSnap.t < TTL_MS;
  if (fresh && marketSnap.v.length) return marketSnap.v;

  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
    `&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const data = await fetchJson(url);
    marketSnap = { v: Array.isArray(data) ? data : [], t: now() };
    return marketSnap.v;
  } catch (e) {
    // Em qualquer erro de gate/backoff/HTTP, servimos o cache que tivermos
    if (e.message === 'GATE_BACKOFF' || e.message === 'GATE_COOLDOWN' || e.message === 'GATE_CAP' || e.message === 'HTTP_429') {
      return marketSnap.v; // possivelmente “stale”, mas existente
    }
    console.warn('[CoinGecko] getMarketsSnapshot falhou:', e.message);
    return marketSnap.v;
  }
}

// ===== Preços USD (ids[]) =====
export async function getUsdPrices(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (unique.length === 0) return {};

  const cacheKey = unique.sort().join(',');
  const hit = priceCache.get(cacheKey);
  const fresh = hit && now() - hit.t < TTL_MS;
  if (fresh) return hit.v;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;
  try {
    const data = await fetchJson(url);
    priceCache.set(cacheKey, { v: data, t: now() });
    return data;
  } catch (e) {
    if (e.message === 'GATE_BACKOFF' || e.message === 'GATE_COOLDOWN' || e.message === 'GATE_CAP' || e.message === 'HTTP_429') {
      return hit?.v || {}; // serve cache antigo
    }
    console.warn('[CoinGecko] getUsdPrices falhou:', e.message);
    return hit?.v || {};
  }
}

// ===== USD -> BRL (FX) =====
const fxCache = new Map();
export async function getUsdToBrl() {
  const k = 'USD/BRL';
  const hit = fxCache.get(k);
  if (hit && now() - hit.t < FX_TTL_MS) return hit.v;

  // FX não conta p/ limite da CoinGecko; mas mantemos o cooldown global
  const url = 'https://open.er-api.com/v6/latest/USD';
  try {
    // não passa pelo globalGate para não interferir no cooldown CG
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('FX_HTTP');
    const data = await resp.json();
    const brl = Number(data?.rates?.BRL);
    if (Number.isFinite(brl)) {
      fxCache.set(k, { v: brl, t: now() });
      return brl;
    }
  } catch (e) {
    console.warn('[FX] USD->BRL falhou:', e.message);
  }
  return hit?.v ?? 1;
}
