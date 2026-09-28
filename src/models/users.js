const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BCRYPT_SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

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

userSchema.pre('save', async function preSave() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await hashPassword(this.password);
});

userSchema.pre('insertMany', function preInsertMany(next, documents) {
  const done = typeof next === 'function' ? next : () => {};
  const usersToInsert = Array.isArray(documents) ? documents : Array.isArray(next) ? next : [];

  Promise.all(
    usersToInsert.map(async (document) => {
      if (!document.password) {
        return;
      }

      document.password = await hashPassword(document.password);
    }),
  )
    .then(() => done())
    .catch(done);
});

module.exports = mongoose.model('User', userSchema);
