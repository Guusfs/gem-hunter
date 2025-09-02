// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema(
  {
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

    // 🔐 Campos para reset de senha
    resetPasswordTokenHash: { type: String, default: undefined },
    resetPasswordExpires: { type: Date, default: undefined },
  },
  {
    timestamps: true,
  }
);

// 🔐 Hash automático antes de salvar (executa se a senha foi modificada)
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

// 🔍 Método para comparar senha
UserSchema.methods.comparePassword = function (senhaDigitada) {
  return bcrypt.compare(senhaDigitada, this.password);
};

export default mongoose.model('User', UserSchema);
