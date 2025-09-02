import express from 'express';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser();

router.get('/', async (req, res) => {
  try {
    const feed = await parser.parseURL('https://cointelegraph.com/rss');

    const noticias = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      url: item.link,
      imageUrl: item.enclosure?.url || 'https://cointelegraph.com/favicon.ico',
      published_on: item.pubDate,
    }));

    res.json(noticias);
  } catch (err) {
    console.error('Erro ao carregar atualizações:', err);
    res.status(500).json({ error: 'Erro ao carregar notícias.' });
  }
});

export default router;