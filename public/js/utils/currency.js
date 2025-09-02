// public/js/utils/currency.js
export const Currency = {
  getPref() {
    return localStorage.getItem('prefCurrency') || 'BRL'; // padrão BRL
  },
  setPref(v) {
    const val = v === 'USD' ? 'USD' : 'BRL';
    localStorage.setItem('prefCurrency', val);
    // avisa toda a UI para re-renderizar
    document.dispatchEvent(new CustomEvent('currency:changed', { detail: { currency: val } }));
  },
  fmt(v, cur = this.getPref()) {
    const n = Number(v);
    if (!Number.isFinite(n)) return cur === 'USD' ? '$0.00' : 'R$ 0,00';
    const locale = cur === 'USD' ? 'en-US' : 'pt-BR';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(n);
  },
};
