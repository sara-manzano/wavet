const express = require('express');

const Pet = require('../models/pets');
const User = require('../models/users');
const { isAuth, hasRole } = require('../middlewares/auth');
const { sendMessage, sendRouteError } = require('../utils/http');
const { validateRequiredFields } = require('../utils/validation');

const petsRouter = express.Router();

function buildPetsQuery(user) {
  return user.role === 'admin' ? {} : { userId: user.userId };
}

function resolveOwnerId(user, requestedUserId) {
  if (user.role === 'admin' && requestedUserId) {
    return requestedUserId;
  }

  return user.userId;
}

function ensureOwnerExists(ownerId) {
  return User.findOne({ userId: ownerId });
}

petsRouter.get('/', isAuth, async (req, res) => {
  try {
    const pets = await Pet.find(buildPetsQuery(req.user)).sort({ createdAt: -1 });

    return res.status(200).json({ pets });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

petsRouter.post('/', isAuth, hasRole('user', 'admin'), async (req, res) => {
  try {
    const { name, species, breed, age, photoUrl, userId } = req.body;
    const requiredFieldsError = validateRequiredFields(req.body, ['name', 'species', 'photoUrl']);

    if (requiredFieldsError) {
      return sendMessage(res, requiredFieldsError.status, requiredFieldsError.message);
    }

    const ownerId = resolveOwnerId(req.user, userId);
    const owner = await ensureOwnerExists(ownerId);

    if (!owner) {
      return sendMessage(res, 404, 'We could not find the selected owner.');
    }

    const pet = await Pet.create({
      userId: ownerId,
      name,
      species,
      breed,
      age,
      photoUrl,
    });

    return res.status(201).json({ pet });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

module.exports = petsRouter;