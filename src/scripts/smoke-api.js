const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

function randomEmail() {
  return `smoke.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

function buildAppointmentSlot(offsetHours, minuteOffset) {
  const date = new Date(Date.now() + (7 * 24 + offsetHours) * 60 * 60 * 1000);
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(minuteOffset % 60).padStart(2, '0');

  date.setUTCMinutes(minuteOffset % 60, 0, 0);

  return {
    date: date.toISOString(),
    hour: `${hour}:${minute}`,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body,
  };
}

function assertStatus(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, received ${response.status}. Body: ${JSON.stringify(response.body)}`);
  }
}

async function login(email, password) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  assertStatus(response, 200, `login ${email}`);
  return response.body;
}

async function main() {
  const email = randomEmail();
  const password = 'Test1234!';
  const runMinuteSeed = Date.now() % 60;
  const firstAppointmentSlot = buildAppointmentSlot(1, runMinuteSeed);
  const secondAppointmentSlot = buildAppointmentSlot(2, runMinuteSeed + 1);
  const thirdAppointmentSlot = buildAppointmentSlot(3, runMinuteSeed + 2);

  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: 'Smoke User',
      email,
      password,
      telephone: '600000000',
    }),
  });

  assertStatus(register, 201, 'register user');

  const userLogin = await login(email, password);
  const adminLogin = await login('admin@wavet.local', 'admin123');
  const vetLogin = await login('marcos@wavet.local', 'vet123');

  const invalidPet = await request('/pets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({
      name: 'Glitch',
      species: 'Dog',
      age: 'abc',
      photo_url: 'https://example.com/pet.jpg',
    }),
  });

  assertStatus(invalidPet, 400, 'reject invalid pet age');

  const createdPet = await request('/pets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({
      name: 'Smoke Pet',
      species: 'Dog',
      age: 3,
      photo_url: 'https://example.com/pet.jpg',
    }),
  });

  assertStatus(createdPet, 201, 'create pet');

  const orphanPet = await request('/pets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminLogin.token}` },
    body: JSON.stringify({
      user_id: 'missing-user-id',
      name: 'Ghost Pet',
      species: 'Cat',
      photo_url: 'https://example.com/ghost.jpg',
    }),
  });

  assertStatus(orphanPet, 404, 'reject orphan pet owner');

  const invalidVetAppointment = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({
      pet_id: createdPet.body.pet.pet_id,
      veterinarian_id: adminLogin.user.user_id,
      date: firstAppointmentSlot.date,
      hour: firstAppointmentSlot.hour,
      reason: 'Checkup',
    }),
  });

  assertStatus(invalidVetAppointment, 404, 'reject non-veterinary appointment assignee');

  const forbiddenInitialState = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({
      pet_id: createdPet.body.pet.pet_id,
      veterinarian_id: vetLogin.user.user_id,
      date: secondAppointmentSlot.date,
      hour: secondAppointmentSlot.hour,
      reason: 'Checkup',
      state: 'completed',
    }),
  });

  assertStatus(forbiddenInitialState, 403, 'reject user-defined initial state');

  const validAppointment = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({
      pet_id: createdPet.body.pet.pet_id,
      veterinarian_id: vetLogin.user.user_id,
      date: thirdAppointmentSlot.date,
      hour: thirdAppointmentSlot.hour,
      reason: 'Checkup',
    }),
  });

  assertStatus(validAppointment, 201, 'create valid appointment');

  const userStatePatch = await request(`/appointments/${validAppointment.body.appointment.appointment_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userLogin.token}` },
    body: JSON.stringify({ state: 'completed' }),
  });

  assertStatus(userStatePatch, 403, 'reject user appointment state patch');

  const invalidDatePatch = await request(`/appointments/${validAppointment.body.appointment.appointment_id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminLogin.token}` },
    body: JSON.stringify({ date: 'not-a-date' }),
  });

  assertStatus(invalidDatePatch, 400, 'reject invalid appointment date');

  console.log('Smoke API passed.');
}

main().catch((error) => {
  console.error('Smoke API failed:', error.message);
  process.exit(1);
});