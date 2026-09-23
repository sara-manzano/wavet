const mongoose = require('mongoose');
const crypto = require('crypto');

const appointmentSchema = new mongoose.Schema({
  appointment_id: { type: String, default: () => crypto.randomUUID(), required: true, unique: true },
  pet_id: { type: String, required: true },
  user_id: { type: String, required: true },
  veterinary_id: { type: String, required: true},
  date: { type: Date, required: true },
  hour: { type: String, required: true },
  reason: { type: String, required: true, trim: true, },
  state: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' },
  medical_notes: { type: String, default: null, trim: true },
},
{ timestamps: true }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;