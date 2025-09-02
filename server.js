// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import scannerRoutes from './routes/scanner.js';
import portfolioRoutes from './routes/portfolio.js';
import novasRoutes from './routes/novas.js';
import atualizacoesRoutes from './routes/atualizacoes.js';
import sentimentosRoutes from './routes/sentimentos.js';
import fluxoRoutes from './routes/fluxo.js';
import historicoRoutes from './routes/historico.js';
import configuracoesRoutes from './routes/configuracoes.js';
import fxRoutes from './routes/fx.js';

// Se quiser proteger no nível do app, importe, mas aqui não vamos usar
// import { verifyToken } from './middlewares/verifyToken.js';

process.on('unhandledRejection', (r) => { console.error('UNHANDLED REJECTION:', r); });
process.on('uncaughtException', (e) => { console.error('UNCAUGHT EXCEPTION:', e); process.exit(1); });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname para ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors({
  origin: true, // permite acessar via http://IP:PORT do celular
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas API (públicas e utilitários)
app.use('/api/auth', authRoutes);
app.use('/api/fx', fxRoutes);

// Rotas API protegidas (cada router já valida token internamente)
app.use('/api/scanner', scannerRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/novas', novasRoutes);
app.use('/api/atualizacoes', atualizacoesRoutes);
app.use('/api/sentimentos', sentimentosRoutes);
app.use('/api/fluxo', fluxoRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/configuracoes', configuracoesRoutes);

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI, {
  // em Mongoose 7, useNewUrlParser/useUnifiedTopology já são padrão
}).then(() => {
  console.log('✅ Conectado ao MongoDB');
}).catch(err => {
  console.error('❌ Erro ao conectar ao MongoDB:', err.message);
});

// Arquivos estáticos (depois das APIs)
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Fallback SPA SEGURO:
 * - Não intercepta requisições a arquivos .html (ex.: /cadastro.html, /login.html)
 * - Não intercepta assets (.js, .css, .png, .svg, .ico etc.)
 * - Qualquer outra rota “limpa” volta para index.html (SPA)
 */
app.get('*', (req, res, next) => {
  if (req.path.endsWith('.html')) return next();
  if (/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|map|txt|json)$/i.test(req.path)) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
