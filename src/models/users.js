const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BCRYPT_SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

const userSchema = new mongoose.Schema({
  userId: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  username: { type: String, required: [true, 'Username is required.'], trim: true },
  email: { type: String, required: [true, 'Email is required.'], unique: true, trim: true, lowercase: true },
  password: { type: String, required: [true, 'Password is required.'], select: false },
  role: { type: String, enum: ['user', 'veterinarian', 'admin'], default: 'user' },
  telephone: { type: String, trim: true },
}, 
{ timestamps: true }
);

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.pre('save', async function preSave() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await hashPassword(this.password);
});

userSchema.pre('insertMany', async function preInsertMany(documents) {
  const usersToInsert = Array.isArray(documents) ? documents : [];

  await Promise.all(
    usersToInsert.map(async (document) => {
      if (!document.password) {
        return;
      }

      document.password = await hashPassword(document.password);
    }),
  );
});

module.exports = mongoose.model('User', userSchema);
