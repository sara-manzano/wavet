const jwt = require('jsonwebtoken');

const { getJwtSecret } = require('../config/auth');

function getTokenFromRequest(req) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
}

function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret());
}

function isAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required.' });
    }

    req.user = verifyJwt(token);
    return next();
  } catch (error) {
    const statusCode = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    const message = statusCode === 401 ? 'Authentication token is invalid or has expired.' : error.message;

    return res.status(statusCode).json({ message });
  }
}

function hasRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}

const isAdmin = hasRole('admin');

module.exports = {
  isAuth,
  isAdmin,
  hasRole,
};