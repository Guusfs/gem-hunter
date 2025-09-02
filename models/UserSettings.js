// models/UserSettings.js
import mongoose from 'mongoose';

const UserSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, unique: true },

  notifications: {
    email: { type: Boolean, default: false },
    push:  { type: Boolean, default: false },
  },

  ai: {
    sensitivity:   { type: Number, default: 50, min: 0, max: 100 }, // 0–100
    windowMinutes: { type: Number, default: 15, min: 1, max: 240 }, // janela de análise
  },

  prefs: {
    language: { type: String, default: 'pt-BR' },
    timezone: { type: String, default: 'America/Sao_Paulo' },
    currency: { type: String, default: 'BRL' }, // BRL | USD | EUR...
  },
}, { timestamps: true });

export default mongoose.model('UserSettings', UserSettingsSchema);
