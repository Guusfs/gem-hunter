// models/Historico.js
import mongoose from 'mongoose';

const HistoricoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tipo:   { type: String, enum: ['COMPRA', 'VENDA'], required: true }, // ação do usuário
    nome:   { type: String, required: true },
    symbol: { type: String, required: true },
    preco:  { type: Number, required: true },   // preço unitário em USD (ou moeda padrão)
    qtd:    { type: Number, default: 1 },       // quantidade negociada
    // meta opcionais
    coingeckoId: { type: String },
  },
  { timestamps: true } // createdAt registra a data/hora
);

export default mongoose.model('Historico', HistoricoSchema);
