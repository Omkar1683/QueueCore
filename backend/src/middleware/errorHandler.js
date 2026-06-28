/**
 * middleware/errorHandler.js
 *
 * Centralized Express error handler — the last middleware in the chain.
 *
 * Design principles:
 *   1. Never leak stack traces to the client in production
 *   2. Distinguish operational errors (expected) from programming bugs (unexpected)
 *   3. Return consistent JSON error shape for all errors
 *   4. Log all 5xx errors with full stack trace for debugging
 */

'use strict';

const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');
const env      = require('../config/env');

// Handles Mongoose validation errors
function handleMongooseValidation(err) {
  const details = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return ApiError.unprocessable('Validation failed', details);
}

// Handles MongoDB duplicate key errors (e.g. unique email)
function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return ApiError.conflict(`${field} already exists`);
}

// Handles Mongoose CastError (invalid ObjectId format)
function handleCastError(err) {
  return ApiError.badRequest(`Invalid value for field: ${err.path}`);
}

/**
 * The global error handler Express middleware.
 * Must have exactly 4 parameters for Express to recognise it as error middleware.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize known framework errors to ApiError
  if (err.name === 'ValidationError') error = handleMongooseValidation(err);
  else if (err.code === 11000)         error = handleDuplicateKey(err);
  else if (err.name === 'CastError')   error = handleCastError(err);

  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log 5xx errors with full detail
  if (isServerError) {
    logger.error({
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: error.message || 'Internal server error',
    ...(error.details && { details: error.details }),
    // Only expose stack trace in development
    ...(env.isDevelopment && isServerError && { stack: error.stack }),
  });
}

module.exports = errorHandler;
