const express = require('express');

const Appointment = require('../models/appointments');
const Pet = require('../models/pets');
const User = require('../models/users');
const { isAuth, hasRole } = require('../middlewares/auth');
const { sendMessage, sendRouteError } = require('../utils/http');
const { validateRequiredFields } = require('../utils/validation');

const appointmentsRouter = express.Router();

function buildAppointmentsQuery(user) {
  if (user.role === 'user') {
    return { userId: user.userId };
  }

  if (user.role === 'veterinarian') {
    return { veterinarianId: user.userId };
  }

  return {};
}

function buildAppointmentUpdate(payload) {
  const fields = ['veterinarianId', 'date', 'hour', 'reason', 'state', 'medicalNotes'];

  return fields.reduce((update, field) => {
    if (payload[field] !== undefined) {
      update[field] = payload[field];
    }

    return update;
  }, {});
}

function findVeterinaryUser(veterinarianId) {
  return User.findOne({ userId: veterinarianId, role: 'veterinarian' });
}

function normalizeAppointmentDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function validateAppointmentPayload(date, state) {
  const normalizedDate = normalizeAppointmentDate(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return { error: { status: 400, message: 'Enter a valid appointment date.' } };
  }

  if (state !== undefined && !['pending', 'completed', 'canceled'].includes(state)) {
    return { error: { status: 400, message: 'Choose a valid appointment status.' } };
  }

  return { normalizedDate };
}

function validateCreatePermissions(user, payload) {
  if (user.role === 'user' && payload.state !== undefined) {
    return { status: 403, message: 'Clients cannot choose the appointment status when booking.' };
  }

  if (user.role === 'user' && payload.medicalNotes !== undefined) {
    return { status: 403, message: 'Medical notes can only be added by the clinic team.' };
  }

  return null;
}

function validateUpdatePermissions(user, appointment, payload) {
  if (user.role === 'admin') {
    return null;
  }

  if (user.role === 'user') {
    if (payload.veterinarianId !== undefined || payload.state !== undefined || payload.medicalNotes !== undefined) {
      return { status: 403, message: 'Clients cannot change the vet, status, or medical notes.' };
    }

    return null;
  }

  if (user.role === 'veterinarian') {
    if (appointment.veterinarianId !== user.userId) {
      return { status: 403, message: 'You are not assigned to this appointment.' };
    }

    if (payload.veterinarianId !== undefined || payload.date !== undefined || payload.hour !== undefined || payload.reason !== undefined) {
      return { status: 403, message: 'Vets can only update the status or medical notes.' };
    }
  }

  return null;
}

function findActiveAppointmentConflict({ veterinarianId, date, hour, excludeId }) {
  return Appointment.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    veterinarianId,
    date,
    hour,
    state: { $ne: 'canceled' },
  });
}

async function loadAuthorizedAppointment(id, user) {
  const appointment = await Appointment.findOne({ appointmentId: id });

  if (!appointment) {
    return { error: { status: 404, message: 'We could not find that appointment.' } };
  }

  const isOwner = appointment.userId === user.userId;
  const isVet = appointment.veterinarianId === user.userId;

  if (user.role !== 'admin' && !isOwner && !isVet) {
    return {
      error: {
        status: 403,
        message: 'You do not have access to this appointment.',
      },
    };
  }

  return { appointment };
}

async function updateAppointment(req, res) {
  try {
    const { id } = req.params;
    const { date, hour, reason, state, medicalNotes, veterinarianId } = req.body;

    const { appointment, error } = await loadAuthorizedAppointment(id, req.user);

    if (error) {
      return sendMessage(res, error.status, error.message);
    }

    const permissionError = validateUpdatePermissions(req.user, appointment, {
      date,
      hour,
      reason,
      state,
      medicalNotes,
      veterinarianId,
    });

    if (permissionError) {
      return sendMessage(res, permissionError.status, permissionError.message);
    }

    if (veterinarianId !== undefined) {
      const veterinary = await findVeterinaryUser(veterinarianId);

      if (!veterinary) {
        return sendMessage(res, 404, 'We could not find the selected veterinarian.');
      }
    }

    const { normalizedDate, error: validationError } = validateAppointmentPayload(date || appointment.date, state);

    if (validationError) {
      return sendMessage(res, validationError.status, validationError.message);
    }

    const nextVeterinarianId = veterinarianId || appointment.veterinarianId;
    const nextDate = normalizedDate;
    const nextHour = hour || appointment.hour;

    if (veterinarianId || date || hour) {
      const existingAppointment = await findActiveAppointmentConflict({
        veterinarianId: nextVeterinarianId,
        date: nextDate,
        hour: nextHour,
        excludeId: appointment._id,
      });

      if (existingAppointment) {
        return sendMessage(res, 409, 'That veterinarian already has an appointment at that time.');
      }
    }

    appointment.set(buildAppointmentUpdate({
      veterinarianId,
      date: date !== undefined ? normalizedDate : undefined,
      hour,
      reason,
      state,
      medicalNotes,
    }));
    await appointment.save();

    return res.status(200).json({ appointment });
  } catch (error) {
    return sendRouteError(res, error);
  }
}

appointmentsRouter.get('/', isAuth, async (req, res) => {
  try {
    const appointments = await Appointment.find(buildAppointmentsQuery(req.user)).sort({ date: 1, hour: 1 });

    return res.status(200).json({ appointments });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

appointmentsRouter.post(
  '/',
  isAuth,
  hasRole('user', 'admin'),
  async (req, res) => {
    try {
      const { petId, date, hour, reason, state, medicalNotes, veterinarianId } = req.body;
      const requiredFieldsError = validateRequiredFields(req.body, ['petId', 'veterinarianId', 'date', 'hour', 'reason']);

      if (requiredFieldsError) {
        return sendMessage(res, requiredFieldsError.status, requiredFieldsError.message);
      }

      const permissionError = validateCreatePermissions(req.user, { state, medicalNotes });

      if (permissionError) {
        return sendMessage(res, permissionError.status, permissionError.message);
      }

      const pet = await Pet.findOne({ petId });

      if (!pet) {
        return sendMessage(res, 404, 'We could not find the selected pet.');
      }

      if (req.user.role !== 'admin' && pet.userId !== req.user.userId) {
        return sendMessage(res, 403, 'You can only book appointments for your own pets.');
      }

      const veterinary = await findVeterinaryUser(veterinarianId);

      if (!veterinary) {
        return sendMessage(res, 404, 'We could not find the selected veterinarian.');
      }

      const { normalizedDate, error: validationError } = validateAppointmentPayload(date, state);

      if (validationError) {
        return sendMessage(res, validationError.status, validationError.message);
      }

      const existingAppointment = await findActiveAppointmentConflict({
        veterinarianId,
        date: normalizedDate,
        hour,
      });

      if (existingAppointment) {
        return sendMessage(res, 409, 'That veterinarian already has an appointment at that time.');
      }

      const appointment = await Appointment.create({
        petId,
        userId: pet.userId,
        veterinarianId,
        date: normalizedDate,
        hour,
        reason,
        state,
        medicalNotes,
      });

      return res.status(201).json({ appointment });
    } catch (error) {
      return sendRouteError(res, error);
    }
  },
);

appointmentsRouter.put('/:id', isAuth, updateAppointment);

appointmentsRouter.patch('/:id', isAuth, updateAppointment);

appointmentsRouter.delete('/:id', isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment, error } = await loadAuthorizedAppointment(id, req.user);

    if (error) {
      return sendMessage(res, error.status, error.message);
    }

    await appointment.deleteOne();

    return sendMessage(res, 200, 'Appointment canceled successfully.');
  } catch (error) {
    return sendRouteError(res, error);
  }
});

module.exports = appointmentsRouter;
