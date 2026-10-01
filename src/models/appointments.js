const mongoose = require('mongoose');
const crypto = require('crypto');

const appointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  petId: { type: String, required: true },
  userId: { type: String, required: true },
  veterinarianId: { type: String, required: true },
  date: { type: Date, required: true },
  hour: { type: String, required: true },
  reason: { type: String, required: true, trim: true },
  state: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' },
  medicalNotes: { type: String, default: null, trim: true },
},
{ timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
