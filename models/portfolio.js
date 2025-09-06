import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:   { type: String, required: true },
    symbol: { type: String, required: true },
    image:  { type: String },
    priceAtPurchase: { type: Number, required: true },
    // opcional, mas MUITO útil para buscar preço com precisão
    coingeckoId: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Portfolio', portfolioSchema);
