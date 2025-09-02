// public/js/utils/i18n.js
const DICTS = {
  'pt-BR': {
    // navbar
    nav_dashboard: 'Dashboard',
    nav_scanner: 'Scanner',
    nav_new: 'Novas Criptos',
    nav_updates: 'Atualizações',
    nav_portfolio: 'Portfólio',
    nav_sentiment: 'Sentimento',
    nav_flow: 'Entrada/Saída',
    nav_history: 'Histórico',
    nav_settings: 'Configurações',
    nav_logout: 'Sair',

    // titles / subtitles
    title_dashboard: 'DASHBOARD',
    title_scanner: 'SCANNER DE MERCADO',
    title_new: 'NOVAS CRIPTOS',
    title_updates: 'ATUALIZAÇÕES',
    title_portfolio: 'MEU PORTFÓLIO',
    subtitle_portfolio: 'Acompanhe suas criptomoedas compradas',
    title_sentiment: 'SENTIMENTO DE MERCADO',
    title_flow: 'ENTRADA / SAÍDA',
    title_history: 'HISTÓRICO',
    title_settings: 'CONFIGURAÇÕES',

    // cards / buttons
    flow_big_entries: 'Grandes Entradas',
    flow_big_exits: 'Saídas Relevantes',
    flow_net_flow: 'Fluxo Líquido',
    btn_start_scanner: 'INICIAR SCANNER',
    btn_stop_scanner: 'PARAR SCANNER',
    btn_more_coins: 'Mostrar mais criptos',

    // fluxo (dinâmico)
    flow_possible_entries: 'Possíveis Entradas',
    flow_possible_exits: 'Possíveis Saídas',
    flow_btn_i_bought: 'Comprei',
    flow_btn_sell: 'Vender',
    flow_btn_gecko: 'Ver na CoinGecko',
  },

  'en-US': {
    nav_dashboard: 'Dashboard',
    nav_scanner: 'Scanner',
    nav_new: 'New Coins',
    nav_updates: 'Updates',
    nav_portfolio: 'Portfolio',
    nav_sentiment: 'Sentiment',
    nav_flow: 'Inflow/Outflow',
    nav_history: 'History',
    nav_settings: 'Settings',
    nav_logout: 'Logout',

    title_dashboard: 'DASHBOARD',
    title_scanner: 'MARKET SCANNER',
    title_new: 'NEW COINS',
    title_updates: 'UPDATES',
    title_portfolio: 'MY PORTFOLIO',
    subtitle_portfolio: 'Track your purchased cryptocurrencies',
    title_sentiment: 'MARKET SENTIMENT',
    title_flow: 'INFLOW / OUTFLOW',
    title_history: 'HISTORY',
    title_settings: 'SETTINGS',

    flow_big_entries: 'Major Inflows',
    flow_big_exits: 'Relevant Outflows',
    flow_net_flow: 'Net Flow',
    btn_start_scanner: 'START SCANNER',
    btn_stop_scanner: 'STOP SCANNER',
    btn_more_coins: 'Show more coins',

    flow_possible_entries: 'Possible Entries',
    flow_possible_exits: 'Possible Exits',
    flow_btn_i_bought: 'I Bought',
    flow_btn_sell: 'Sell',
    flow_btn_gecko: 'Open on CoinGecko',
  },
};

let currentLang = localStorage.getItem('lang') || 'pt-BR';

function t(key) {
  return (DICTS[currentLang] && DICTS[currentLang][key]) || key;
}

function setLanguage(lang) {
  if (!DICTS[lang]) lang = 'pt-BR';
  currentLang = lang;
  localStorage.setItem('lang', lang);

  // aplica nos elementos marcados
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
      if ('value' in el) el.value = val;
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
}

export const i18n = { t, setLanguage, get lang(){ return currentLang; } };
