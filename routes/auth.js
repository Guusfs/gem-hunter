// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendMail } from '../utils/mailer.js'; // << crie utils/mailer.js conforme te passei

dotenv.config();
const router = express.Router();

// =======================
// Registro
// =======================
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existente = await User.findOne({ email });
    if (existente) return res.status(400).json({ error: 'Usuário já existe' });

    const novoUsuario = new User({ email, password });
    await novoUsuario.save();

    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// =======================
// Login
// =======================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const senhaCorreta = await usuario.comparePassword(password);
    if (!senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' });

    // 🔑 Assina com 'userId' para alinhar com verifyToken/rotas
    const token = jwt.sign({ userId: usuario._id }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({ token, user: { id: usuario._id, email: usuario.email } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// =======================
// Esqueci a Senha (gera token e envia e-mail)
// =======================
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Informe o e-mail' });

    const user = await User.findOne({ email });
    // Para não vazar se existe ou não, sempre responde OK
    if (!user) {
      return res.json({ message: 'Se existir conta, enviaremos instruções.' });
    }

    // Token bruto (não salvar o bruto no DB)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30min
    await user.save();

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset.html?token=${rawToken}`;

    const html = `
      <p>Olá!</p>
      <p>Recebemos um pedido para redefinir sua senha no Gem Hunter.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#00eaff;color:#000;text-decoration:none;border-radius:8px;">Redefinir senha</a></p>
      <p>Se você não solicitou, ignore este e-mail.</p>
    `;

    await sendMail({
      to: email,
      subject: 'Redefinição de senha - Gem Hunter',
      html,
      text: `Abra o link para redefinir sua senha: ${resetUrl}`,
    });

    res.json({ message: 'Se existir conta, enviaremos instruções.' });
  } catch (err) {
    console.error('Erro em /forgot:', err);
    res.status(500).json({ error: 'Falha ao iniciar reset' });
  }
});

// =======================
// Reset de Senha (aplica nova senha)
// =======================
// routes/auth.js (trecho /register atualizado)
router.post('/register', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    // validações simples
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    // se já existir, retorna 409 (conflito)
    const existente = await User.findOne({ email }).lean();
    if (existente) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }

    const novoUsuario = new User({ email, password });
    await novoUsuario.save();

    return res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (err) {
    // trata índice único duplicado do Mongo
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }
    console.error('Erro no registro:', err);
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});


export default router;
