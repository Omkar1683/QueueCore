/**
 * services/authService.js
 *
 * Handles user registration, login, and JWT token management.
 * Passwords are never touched here — the User model hooks handle bcrypt.
 */

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

class AuthService {
  /**
   * Register a new user account.
   * The first registered user is automatically assigned 'admin' role.
   */
  async register({ name, email, password, role }) {
    const exists = await User.findOne({ email });
    if (exists) throw ApiError.conflict('Email already registered');

    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'admin' : (role || 'viewer');

    const user = await User.create({
      name,
      email,
      passwordHash: password, // Pre-save hook hashes this
      role: assignedRole,
    });

    const tokens = this._generateTokens(user);
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    return { user, ...tokens };
  }

  /**
   * Authenticate a user and return JWT access + refresh tokens.
   */
  async login({ email, password }) {
    // Explicitly select passwordHash since it has select:false on the schema
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw ApiError.unauthorized('Invalid credentials');
    if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

    const isValid = await user.verifyPassword(password);
    if (!isValid) throw ApiError.unauthorized('Invalid credentials');

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const tokens = this._generateTokens(user);
    return { user, ...tokens };
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refreshToken(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) throw ApiError.unauthorized('User not found');

    return this._generateTokens(user);
  }

  /**
   * Returns the user document for a given JWT (used by auth middleware)
   */
  async getUserFromToken(token) {
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive');
    return user;
  }

  // ── Private ──────────────────────────────────────────────

  _generateTokens(user) {
    const payload = { userId: user._id, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(
      { userId: user._id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
