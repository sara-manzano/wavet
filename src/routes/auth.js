const express = require('express');

const { buildAuthPayload, signAuthToken } = require('../config/auth');
const User = require('../models/users');
const { isAuth, isAdmin } = require('../middlewares/auth');
const { sendMessage, sendRouteError } = require('../utils/http');
const { isValidEmail, normalizeEmail, validateRequiredFields } = require('../utils/validation');

const authRouter = express.Router();

function buildInvalidCredentialsResponse(res) {
  return sendMessage(res, 401, 'The email or password is incorrect.');
}

function serializeUser(user) {
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    role: user.role,
    telephone: user.telephone,
  };
}

function buildAuthResponse(user) {
  const payload = buildAuthPayload(user);

  return {
    token: signAuthToken(user),
    user: payload,
  };
}

authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password, telephone, role } = req.body;
    const requiredFieldsError = validateRequiredFields(req.body, ['username', 'email', 'password']);

    if (requiredFieldsError) {
      return sendMessage(res, requiredFieldsError.status, requiredFieldsError.message);
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return sendMessage(res, 400, 'Enter a valid email address.');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return sendMessage(res, 409, 'That email is already linked to an account.');
    }

    if (role && role !== 'user') {
      return sendMessage(res, 403, 'You can only sign up with a regular user account.');
    }

    const user = await User.create({
      username,
      email: normalizedEmail,
      password,
      telephone,
      role: 'user',
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    return sendRouteError(res, error);
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const requiredFieldsError = validateRequiredFields(req.body, ['email', 'password']);

    if (requiredFieldsError) {
      return sendMessage(res, requiredFieldsError.status, requiredFieldsError.message);
    }

    if (!isValidEmail(email)) {
      return sendMessage(res, 400, 'Enter a valid email address.');
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return buildInvalidCredentialsResponse(res);
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return buildInvalidCredentialsResponse(res);
    }

    return res.status(200).json(buildAuthResponse(user));
  } catch (error) {
    return sendRouteError(res, error);
  }
});

authRouter.get('/me', isAuth, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });

    if (!user) {
      return sendMessage(res, 404, 'We could not find your account.');
    }

    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return sendRouteError(res, error);
  }
});

authRouter.get('/admin', isAuth, isAdmin, (req, res) => {
  return sendMessage(res, 200, 'Admin access granted.', { user: req.user });
});

module.exports = authRouter;