const mongoose = require ("mongoose");
const crypto = require('crypto');

const petSchema = new mongoose.Schema({
  pet_id: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  species: { type: String, required: true },
  breed: { type: String },
  age: { type: Number },
  photo_url: { type: String, required: true },
},
{ timestamps: true }
);

const Pet = mongoose.model('Pet', petSchema);

module.exports = Pet;   