'use strict';

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Create a write stream that pipes Morgan output into Winston logger
 */
const stream = {
  write: (message) => {
    // Morgan appends a newline; trim it before passing to winston
    logger.http(message.trim());
  },
};

/**
 * Skip logging for certain conditions (e.g., health checks in production)
 */
const skip = (req) => {
  if (process.env.NODE_ENV === 'test') return true;
  if (req.path === '/health') return true;
  return false;
};

/**
 * Use 'combined' format in production for full log details,
 * 'dev' in development for color-coded concise output.
 */
const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const requestLogger = morgan(format, { stream, skip });

module.exports = requestLogger;
