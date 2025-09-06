// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

// --- Configura transportador de e-mails ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Registro
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

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const senhaCorreta = await usuario.comparePassword(password);
    if (!senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign(
      { userId: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { id: usuario._id, email: usuario.email } });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// --- Esqueci minha senha ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    // cria token temporário (30min)
    const token = jwt.sign(
      { userId: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const resetLink = `${process.env.APP_URL}/reset-password.html?token=${token}`;

    // envia o e-mail
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: usuario.email,
      subject: '🔑 Recuperação de senha - Gem Hunter',
      html: `
        <p>Olá,</p>
        <p>Você solicitou a redefinição da sua senha.</p>
        <p>Clique no link abaixo para criar uma nova senha (válido por 30 minutos):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Se não foi você, ignore este e-mail.</p>
      `,
    });

    res.json({ message: 'E-mail de recuperação enviado.' });
  } catch (err) {
    console.error('Erro em forgot-password:', err);
    res.status(500).json({ error: 'Erro ao solicitar recuperação' });
  }
});

// --- Resetar senha ---
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    }

    // valida token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const usuario = await User.findById(payload.userId);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // atualiza senha (o pre-save já faz hash)
    usuario.password = password;
    await usuario.save();

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('Erro em reset-password:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

export default router;
