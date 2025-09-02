export async function carregarAtualizacoes() {
  const container = document.getElementById('atualizacoes-lista');
  container.innerHTML = '<p style="color: #aaa;">Carregando notícias...</p>';

  try {
    const res = await fetch('/api/atualizacoes');
    const noticias = await res.json();

    container.innerHTML = '';

    noticias.forEach(noticia => {
      const card = document.createElement('div');
      card.className = 'news-card';

      const dataFormatada = new Date(noticia.published_on).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      card.innerHTML = `
        <img src="${noticia.imageUrl}" alt="Imagem da notícia" style="max-width: 100%; border-radius: 6px; margin-bottom: 10px;" />
        <h3 style="margin: 10px 0; font-size: 1.1rem; color: #fff;">${noticia.title}</h3>
        <div style="font-size: 0.9rem; color: #ccc; margin-bottom: 8px;">${dataFormatada}</div>
        <a href="${noticia.url}" target="_blank" style="color: #00aaff; text-decoration: none; display: inline-block; margin-bottom: 16px;">
          🔗 Ler mais
        </a>
      `;

      container.appendChild(card);
    });

    if (noticias.length === 0) {
      container.innerHTML = '<p style="color: #ccc;">Nenhuma notícia encontrada.</p>';
    }
  } catch (err) {
    console.error('❌ Erro ao carregar atualizações:', err);
    container.innerHTML = '<p style="color: red;">Erro ao buscar notícias.</p>';
  }
}