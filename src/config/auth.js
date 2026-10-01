const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required.');
  }

  return jwtSecret;
}

function buildAuthPayload(user) {
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    username: user.username,
  };
}

function signAuthToken(user) {
  return jwt.sign(buildAuthPayload(user), getJwtSecret(), { expiresIn: '7d' });
}

module.exports = {
  buildAuthPayload,
  getJwtSecret,
  signAuthToken,
};