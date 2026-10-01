const mongoose = require('mongoose');
const crypto = require('crypto');

const petSchema = new mongoose.Schema({
  petId: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  species: { type: String, required: true },
  breed: { type: String },
  age: { type: Number },
  photoUrl: { type: String, required: true },
},
{ timestamps: true }
);

module.exports = mongoose.model('Pet', petSchema);
