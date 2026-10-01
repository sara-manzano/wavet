const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const { connectToDatabase } = require('../config/db');
const User = require('../models/users');
const Pet = require('../models/pets');
const Appointment = require('../models/appointments');

const userIds = {
  admin: crypto.randomUUID(),
  client: crypto.randomUUID(),
  vet: crypto.randomUUID(),
};

const petIds = {
  nala: crypto.randomUUID(),
  milo: crypto.randomUUID(),
  betty: crypto.randomUUID(),
};

const appointmentIds = {
  first: crypto.randomUUID(),
  second: crypto.randomUUID(),
  third: crypto.randomUUID(),
};

const DEMO_USERS = [
  {
    userId: userIds.admin,
    username: 'Sara Manzano',
    email: 'admin@wavet.local',
    password: 'admin123',
    role: 'admin',
    telephone: '600111222',
  },
  {
    userId: userIds.client,
    username: 'Laura Perez',
    email: 'laura@wavet.local',
    password: 'laura123',
    role: 'user',
    telephone: '600333444',
  },
  {
    userId: userIds.vet,
    username: 'Dr. Marcos Ruiz',
    email: 'marcos@wavet.local',
    password: 'vet123',
    role: 'veterinarian',
    telephone: '600555666',
  },
];

const DEMO_PETS = [
  {
    petId: petIds.nala,
    userId: userIds.client,
    name: 'Nala',
    species: 'Dog',
    breed: 'Labrador',
    age: 4,
    photoUrl: 'https://unsplash.com/es/fotos/golden-retriever-x5oPmHmY3kQ',
  },
  {
    petId: petIds.milo,
    userId: userIds.client,
    name: 'Milo',
    species: 'Cat',
    breed: 'European Shorthair',
    age: 2,
    photoUrl: 'https://unsplash.com/es/fotos/gato-atigrado-en-el-alfeizar-blanco-de-la-ventana-DpTvVy6jgQg',
  },
  {
    petId: petIds.betty,
    userId: userIds.client,
    name: 'Betty',
    species: 'Rabbit',
    breed: 'Lop',
    age: 4,
    photoUrl: 'https://unsplash.com/es/fotos/conejo-blanco-sobre-tela-rosa-eXLCx0XBaUE',
  },
];

const DEMO_APPOINTMENTS = [
  {
    appointmentId: appointmentIds.first,
    petId: petIds.nala,
    userId: userIds.client,
    veterinarianId: userIds.vet,
    date: new Date('2026-10-01T10:00:00.000Z'),
    hour: '10:00',
    reason: 'Booster vaccine and annual checkup',
    state: 'pending',
    medicalNotes: null,
  },
  {
    appointmentId: appointmentIds.second,
    petId: petIds.milo,
    userId: userIds.client,
    veterinarianId: userIds.vet,
    date: new Date('2026-10-02T16:30:00.000Z'),
    hour: '16:30',
    reason: 'Reduced appetite since yesterday',
    state: 'completed',
    medicalNotes: 'Stable during the visit. Advised observation and a soft diet for 24 hours.',
  },
  {
    appointmentId: appointmentIds.third,
    petId: petIds.betty,
    userId: userIds.client,
    veterinarianId: userIds.vet,
    date: new Date('2026-10-02T12:00:00.000Z'),
    hour: '12:00',
    reason: 'Follow-up after nail injury',
    state: 'completed',
    medicalNotes: 'The paw is healing well. No swelling and no signs of infection.',
  },
];

async function seedDatabase() {
  let connection;

  try {
    connection = await connectToDatabase(process.env.MONGODB_URI);

    await Appointment.deleteMany({});
    await Pet.deleteMany({});
    await User.deleteMany({});

    await User.insertMany(DEMO_USERS);
    await Pet.insertMany(DEMO_PETS);
    await Appointment.insertMany(DEMO_APPOINTMENTS);

    console.log('Seed completed successfully.');
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });