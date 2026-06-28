/**
 * utils/ApiError.js
 *
 * Custom error class for all operational errors in QueueCore.
 *
 * Distinguishing operational errors (expected: 404, 400, 401) from
 * programming errors (unexpected: null deref, type error) is a core
 * principle of production Node.js error handling.
 *
 * Operational errors are caught by the global error handler and returned
 * as structured JSON responses. Programming errors crash the process
 * (or are logged as critical) to avoid undefined state.
 */

'use strict';

class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code
   * @param {string} message     - Human-readable error message
   * @param {boolean} isOperational - true = expected error, false = programming bug
   * @param {object} [details]   - Optional field-level validation errors or extra context
   */
  constructor(statusCode, message, isOperational = true, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    // Capture V8 stack trace, excluding the constructor frame itself
    Error.captureStackTrace(this, this.constructor);
  }

  // --- Factory helpers for common HTTP errors ---

  static badRequest(message, details = null) {
    return new ApiError(400, message, true, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static unprocessable(message, details = null) {
    return new ApiError(422, message, true, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }

  static serviceUnavailable(message = 'Service unavailable') {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
