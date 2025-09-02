// public/js/features/configuracoes.js
import { i18n } from '../utils/i18n.js';

function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}
function el(id) { return document.getElementById(id); }

export async function carregarConfiguracoes() {
  const sec = document.getElementById('configuracoes');
  if (!sec) return;

  // monta UI se ainda não montou
  if (!el('cfg-form')) {
    (sec.querySelector('#configuracoes-root') || sec.querySelector('.neon-grid')).insertAdjacentHTML('beforeend', `
      <form id="cfg-form" class="neon-card" style="margin-top:20px; text-align:left; max-width:860px; margin-inline:auto;">
        <h2 style="text-align:center; margin-top:0;">Minhas Configurações</h2>

        <div class="cfg-group">
          <h3>Notificações</h3>
          <label><input type="checkbox" id="cfg-email"/> Receber alertas por e-mail</label><br/>
          <label><input type="checkbox" id="cfg-push"/> Receber notificações push</label>
        </div>

        <div class="cfg-group">
          <h3>Parâmetros da IA</h3>
          <label>Sensibilidade (0–100)
            <input type="range" id="cfg-sens" min="0" max="100" step="1"/>
            <span id="cfg-sens-val" class="muted"></span>
          </label>
          <br/>
          <label>Janela de análise (min)
            <input type="number" id="cfg-window" min="1" max="240" step="1" style="width:100px"/>
          </label>
        </div>

        <div class="cfg-group">
          <h3>Preferências</h3>
          <label>Idioma
            <select id="cfg-lang">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
            </select>
          </label>
          <label>Fuso horário
            <select id="cfg-tz">
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/Lisbon">Europe/Lisbon</option>
            </select>
          </label>
          <label>Moeda padrão
            <select id="cfg-cur">
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
        </div>

        <div style="display:flex; gap:10px; justify-content:center; margin-top:16px;">
          <button type="button" id="salvar-configuracoes" class="scanner-btn start">Salvar</button>
          <button type="button" id="reset-configuracoes"  class="scanner-btn stop">Restaurar padrão</button>
        </div>
      </form>
    `);

    el('cfg-sens')?.addEventListener('input', () => {
      el('cfg-sens-val').textContent = el('cfg-sens').value;
    });
    el('salvar-configuracoes')?.addEventListener('click', salvarConfiguracoes);
    el('reset-configuracoes')?.addEventListener('click', () => preencherForm(defaults));
  }

  // carrega do backend
  try {
    const r = await fetch('/api/configuracoes', {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (r.status === 401) return (window.location.href = '/login.html');
    const data = await r.json();
    const cfg = fromServer(data);
    preencherForm(cfg);

    // aplica idioma carregado
    i18n.setLanguage(cfg.prefs.language);
  } catch (e) {
    console.error('Erro ao carregar config:', e);
  }
}

export async function salvarConfiguracoes() {
  const payload = toServer({
    notifications: {
      email: el('cfg-email').checked,
      push:  el('cfg-push').checked,
    },
    ai: {
      sensitivity:   Number(el('cfg-sens').value),
      windowMinutes: Number(el('cfg-window').value),
    },
    prefs: {
      language: el('cfg-lang').value,
      timezone: el('cfg-tz').value,
      currency: el('cfg-cur').value,
    },
  });

  try {
    const r = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || 'Falha ao salvar');

    preencherForm(fromServer(data));

    // aplica idioma escolhido imediatamente
    i18n.setLanguage(payload.prefs.language);

    alert('Configurações salvas!');
  } catch (e) {
    console.error('Erro ao salvar config:', e);
    alert('Erro ao salvar configurações.');
  }
}

/* helpers */
const defaults = {
  notifications: { email: false, push: false },
  ai: { sensitivity: 50, windowMinutes: 15 },
  prefs: { language: 'pt-BR', timezone: 'America/Sao_Paulo', currency: 'BRL' },
};

function preencherForm(cfg) {
  const c = { ...defaults, ...cfg };
  el('cfg-email').checked = !!c.notifications.email;
  el('cfg-push').checked  = !!c.notifications.push;

  el('cfg-sens').value = Number(c.ai.sensitivity);
  el('cfg-sens-val').textContent = String(c.ai.sensitivity);
  el('cfg-window').value = Number(c.ai.windowMinutes);

  el('cfg-lang').value = c.prefs.language;
  el('cfg-tz').value   = c.prefs.timezone;
  el('cfg-cur').value  = c.prefs.currency;
}

function fromServer(s) {
  return {
    notifications: {
      email: !!s?.notifications?.email,
      push:  !!s?.notifications?.push,
    },
    ai: {
      sensitivity:   Number.isFinite(s?.ai?.sensitivity) ? s.ai.sensitivity : defaults.ai.sensitivity,
      windowMinutes: Number.isFinite(s?.ai?.windowMinutes) ? s.ai.windowMinutes : defaults.ai.windowMinutes,
    },
    prefs: {
      language: s?.prefs?.language || defaults.prefs.language,
      timezone: s?.prefs?.timezone || defaults.prefs.timezone,
      currency: s?.prefs?.currency || defaults.prefs.currency,
    },
  };
}
function toServer(c) {
  return {
    notifications: {
      email: !!c.notifications.email,
      push:  !!c.notifications.push,
    },
    ai: {
      sensitivity:   Math.max(0, Math.min(100, Number(c.ai.sensitivity))),
      windowMinutes: Math.max(1, Math.min(240, Number(c.ai.windowMinutes))),
    },
    prefs: {
      language: String(c.prefs.language || 'pt-BR'),
      timezone: String(c.prefs.timezone || 'America/Sao_Paulo'),
      currency: String(c.prefs.currency || 'BRL'),
    },
  };
}
