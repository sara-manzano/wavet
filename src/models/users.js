const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BCRYPT_SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  user_id: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  username: { type: String, required: [true, 'El nombre de usuario es obligatorio'], trim: true },
  email: { type: String, required: [true, 'El correo electrónico es obligatorio'], unique: true, trim: true, lowercase: true },
  password: { type: String, required: [true, 'La contraseña es obligatoria'], select: false },
  rol: { type: String, enum: ['user','veterinario','admin'], default: 'user' },
  telephone: { type: String, trim: true },
}, 
{ timestamps: true }
);

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.pre('save', async function preSave(next) {
 
    if (!this.isModified('password')) return next();
   
    try {
     this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
     next();
    } catch (error) {
     next(error);
    }
});


module.exports = mongoose.model('User', userSchema);
