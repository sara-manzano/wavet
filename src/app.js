const express = require('express');

const authRouter = require('./routes/auth');
const petsRouter = require('./routes/pets');
const appointmentsRouter = require('./routes/appointments');

const app = express();

app.use(express.json());

app.use('/auth', authRouter);
app.use('/pets', petsRouter);
app.use('/appointments', appointmentsRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} does not exist.` });
});

module.exports = app;