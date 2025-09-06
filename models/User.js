// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';   // << trocar para bcryptjs

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
}, { timestamps: true });

// hash antes de salvar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// comparar senha
UserSchema.methods.comparePassword = function (senhaDigitada) {
  return bcrypt.compare(senhaDigitada, this.password);
};

export default mongoose.model('User', UserSchema);
