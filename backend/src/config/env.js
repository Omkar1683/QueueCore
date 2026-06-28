/**
 * config/env.js
 * 
 * Centralized environment variable validation and access.
 * All other modules must import from this file — never read process.env directly.
 * This ensures misconfigured deployments fail fast at startup with clear error messages.
 */

'use strict';

require('dotenv').config();

/**
 * Validates that a required environment variable is set.
 * Throws on missing required vars so the process crashes with a helpful message
 * rather than silently producing undefined behavior at runtime.
 */
function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key, defaultValue) {
  return process.env[key] || defaultValue;
}

function optionalInt(key, defaultValue) {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
}

function optionalBool(key, defaultValue) {
  const val = process.env[key];
  if (val === undefined || val === null) return defaultValue;
  return val.toLowerCase() === 'true';
}

const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: optionalInt('PORT', 5000),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',

  // MongoDB
  MONGO_URI: optional('MONGO_URI', 'mongodb://localhost:27017/queuecore'),

  // JWT
  JWT_SECRET: optional('JWT_SECRET', 'dev_secret_change_in_prod'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: optional('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Redis (optional)
  REDIS_ENABLED: optionalBool('REDIS_ENABLED', false),
  REDIS_HOST: optional('REDIS_HOST', 'localhost'),
  REDIS_PORT: optionalInt('REDIS_PORT', 6379),
  REDIS_PASSWORD: optional('REDIS_PASSWORD', ''),

  // Workers
  WORKER_COUNT: optionalInt('WORKER_COUNT', 3),
  WORKER_POLL_INTERVAL_MS: optionalInt('WORKER_POLL_INTERVAL_MS', 1000),
  WORKER_HEARTBEAT_INTERVAL_MS: optionalInt('WORKER_HEARTBEAT_INTERVAL_MS', 10000),
  WORKER_VISIBILITY_TIMEOUT_MS: optionalInt('WORKER_VISIBILITY_TIMEOUT_MS', 30000),

  // Scheduler
  SCHEDULER_INTERVAL_MS: optionalInt('SCHEDULER_INTERVAL_MS', 5000),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: optionalInt('RATE_LIMIT_WINDOW_MS', 900000), // 15 min
  RATE_LIMIT_MAX: optionalInt('RATE_LIMIT_MAX', 100),

  // Circuit Breaker
  CIRCUIT_BREAKER_THRESHOLD: optionalInt('CIRCUIT_BREAKER_THRESHOLD', 5),
  CIRCUIT_BREAKER_COOLDOWN_MS: optionalInt('CIRCUIT_BREAKER_COOLDOWN_MS', 60000),

  // Logging
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
  LOG_DIR: optional('LOG_DIR', 'logs'),

  // Swagger
  SWAGGER_ENABLED: optionalBool('SWAGGER_ENABLED', true),
};

module.exports = env;
