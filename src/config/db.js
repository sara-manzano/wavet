const mongoose = require('mongoose');

async function connectToDatabase(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB Atlas');
  }

  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectToDatabase };