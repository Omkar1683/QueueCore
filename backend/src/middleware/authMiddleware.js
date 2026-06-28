/**
 * middleware/authMiddleware.js
 *
 * JWT verification middleware and role-based access guard.
 * Attaches req.user to every authenticated request.
 */

'use strict';

const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const env     = require('../config/env');

/**
 * Verifies the Bearer JWT in Authorization header.
 * Attaches the full user document to req.user.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    );
  }

  const user = await User.findById(payload.userId).select('-passwordHash');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User not found or deactivated');
  }

  req.user = user;
  next();
});

/**
 * Role guard — must be used AFTER authenticate().
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'viewer')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted for this action`));
  }
  next();
};

const requireAdmin = requireRole('admin');

module.exports = { authenticate, requireRole, requireAdmin };
