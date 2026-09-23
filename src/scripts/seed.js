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
};

const appointmentIds = {
  first: crypto.randomUUID(),
  second: crypto.randomUUID(),
};

const users = [
  {
    user_id: userIds.admin,
    username: 'Sara Admin',
    email: 'admin@wavet.local',
    password: 'admin123',
    rol: 'admin',
    telephone: '600111222',
  },
  {
    user_id: userIds.client,
    username: 'Laura Perez',
    email: 'laura@wavet.local',
    password: 'laura123',
    rol: 'user',
    telephone: '600333444',
  },
  {
    user_id: userIds.vet,
    username: 'Dr. Marcos Ruiz',
    email: 'marcos@wavet.local',
    password: 'vet123',
    rol: 'veterinario',
    telephone: '600555666',
  },
];

const pets = [
  {
    pet_id: petIds.nala,
    user_id: userIds.client,
    name: 'Nala',
    species: 'Perro',
    breed: 'Labrador',
    age: 4,
    photo_url: 'https://unsplash.com/es/fotos/golden-retriever-x5oPmHmY3kQ',
  },
  {
    pet_id: petIds.milo,
    user_id: userIds.client,
    name: 'Milo',
    species: 'Gato',
    breed: 'Europeo',
    age: 2,
    photo_url: 'https://unsplash.com/es/fotos/gato-atigrado-en-el-alfeizar-blanco-de-la-ventana-DpTvVy6jgQg',
  },
   {
    pet_id: petIds.betty,
    user_id: userIds.client,
    name: 'Betty',
    species: 'Conejo',
    breed: 'Belier',
    age: 4,
    photo_url: 'https://unsplash.com/es/fotos/conejo-blanco-sobre-tela-rosa-eXLCx0XBaUE',
  },
];



const appointments = [
  {
    appointment_id: appointmentIds.first,
    pet_id: petIds.nala,
    user_id: userIds.client,
    veterinary_id: userIds.vet,
    date: new Date('2026-10-01T10:00:00.000Z'),
    hour: '10:00',
    reason: 'Vacunacion anual',
    state: 'pending',
    medical_notes: null,
  },
  {
    appointment_id: appointmentIds.second,
    pet_id: petIds.milo,
    user_id: userIds.client,
    veterinary_id: userIds.vet,
    date: new Date('2026-10-02T16:30:00.000Z'),
    hour: '16:30',
    reason: 'Revision general',
    state: 'completed',
    medical_notes: 'Sin hallazgos relevantes.',
  },
  {
    appointment_id: appointmentIds.third,
    pet_id: petIds.betty,
    user_id: userIds.client,
    veterinary_id: userIds.vet,
    date: new Date('2026-10-02T16:30:00.000Z'),
    hour: '12:00',
    reason: 'Revision general',
    state: 'completed',
    medical_notes: 'Sin hallazgos relevantes.',
  },
];

async function seedDatabase() {
  let connection;

  try {
    connection = await connectToDatabase(process.env.MONGODB_URI);

    await Appointment.deleteMany({});
    await Pet.deleteMany({});
    await User.deleteMany({});

    await User.insertMany(users);
    await Pet.insertMany(pets);
    await Appointment.insertMany(appointments);

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