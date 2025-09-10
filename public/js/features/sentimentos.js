export async function carregarSentimentos() {
  const container = document.getElementById('sentimento-container');
  if (!container) return;

  container.innerHTML = '<p style="color: #ccc;">Carregando sentimento...</p>';

  try {
    const res = await fetch('/api/sentimentos');
    const data = await res.json();

    if (!data.sentimentoAtual || !data.historico || !data.sentimentoSocial) {
      throw new Error('Dados incompletos');
    }

    const { sentimentoAtual, historico, sentimentoSocial } = data;

    container.innerHTML = `
      <div class="neon-card">
        <i class="fas fa-smile-beam"></i>
        <h2>Sentimento Atual</h2>
        <p>${sentimentoAtual.classificacao} (${sentimentoAtual.valor}/100)</p>
      </div>

      <div class="neon-card">
        <canvas id="graficoMedoGanancia" width="300" height="300"></canvas>
        <h2>Índice de Medo & Ganância</h2>
        <p>${sentimentoAtual.classificacao}</p>
      </div>

      <div class="neon-card">
        <i class="fas fa-comments"></i>
        <h2>Redes Sociais</h2>
        <p>Positivo: ${sentimentoSocial.positivo} / Neutro: ${sentimentoSocial.neutro} / Negativo: ${sentimentoSocial.negativo}</p>
      </div>
    `;

    desenharGraficos(historico);

  } catch (err) {
    console.error('Erro ao carregar sentimentos:', err);
    container.innerHTML = '<p style="color:red;">Erro ao carregar dados de sentimento de mercado.</p>';
  }
}

function desenharGraficos(historico) {
  const ctx = document.getElementById('graficoMedoGanancia');
  if (!ctx) return;

  const labels = historico.map(entry => {
    const d = new Date(entry.data);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  const valores = historico.map(entry => entry.valor);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Índice F&G',
        data: valores,
        fill: false,
        borderColor: 'cyan',
        tension: 0.3
      }]
    },
    options: {
      plugins: {
        legend: {
          labels: { color: '#fff' }
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#fff' }
        }
      }
    }
  });
}

// Atualizar automaticamente a cada 30 segundos
setInterval(() => {
  carregarSentimentos();
}, 30_000);
