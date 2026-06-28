/**
 * utils/logger.js
 *
 * Structured Winston logger with daily log rotation.
 * All log output is JSON-structured for easy ingestion by log aggregators
 * (e.g., Datadog, CloudWatch, ELK stack) — a Phase 2 enhancement.
 *
 * Log levels: error > warn > info > http > debug
 */

'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const env = require('../config/env');

// Custom log format: timestamp + level + message + metadata
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Human-readable format for development console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const transports = [
  // Always log to console
  new winston.transports.Console({
    format: env.isProduction ? logFormat : consoleFormat,
    silent: false,
  }),
];

// File transports in production or when LOG_DIR is set
if (env.LOG_DIR) {
  const logDir = path.resolve(env.LOG_DIR);

  // All logs
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: 'queuecore-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );

  // Error-only logs
  transports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: 'queuecore-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
  // Don't crash the process on unhandled exceptions — log them instead
  exceptionHandlers: transports,
  rejectionHandlers: transports,
});

module.exports = logger;
