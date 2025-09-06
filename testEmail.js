import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function enviarEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true", 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: "seuemailpessoal@gmail.com", // coloque um e-mail seu para testar
    subject: "Teste - Gem Hunter",
    text: "Este é um e-mail de teste do Gem Hunter!",
  });

  console.log("✅ E-mail enviado:", info.messageId);
}

enviarEmail().catch(console.error);
