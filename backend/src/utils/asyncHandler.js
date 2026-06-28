/**
 * utils/asyncHandler.js
 *
 * Express async error wrapper.
 * Eliminates repetitive try/catch blocks in every controller.
 * Any thrown error (including rejected promises) is automatically
 * forwarded to Express's next(err) error handler.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await someService.fetch();
 *     res.json(data);
 *   }));
 */

'use strict';

/**
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Wrapped handler that catches and forwards errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
