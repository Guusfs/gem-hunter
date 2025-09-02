// public/js/utils/money.js
let _usdbrl = null;
let _ts = 0;

export async function getUsdBrl() {
  if (_usdbrl && Date.now() - _ts < 60_000) return _usdbrl;
  try {
    const r = await fetch('/api/fx/usdbrl');
    const j = await r.json();
    _usdbrl = Number(j?.usdbrl) || 5.0;
  } catch {
    _usdbrl = 5.0;
  }
  _ts = Date.now();
  return _usdbrl;
}

export function fmtUSD(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(n);
}

export function fmtBRL(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}
