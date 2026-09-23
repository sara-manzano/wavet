const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  user_id: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  rol: { type: String, enum: ['user','veterinario','admin'], default: 'user' },
  telephone: { type: String, trim: true },
}, 
{ timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;