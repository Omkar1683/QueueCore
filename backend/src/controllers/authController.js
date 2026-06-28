'use strict';

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/register
 * Register a new user account.
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens.
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 * req.user is set by the authenticate middleware.
 */
const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * POST /api/auth/logout
 * Stateless JWT logout — the client is responsible for discarding tokens.
 * Server-side, we simply acknowledge the request.
 */
const logout = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard your tokens on the client.',
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  logout,
};
