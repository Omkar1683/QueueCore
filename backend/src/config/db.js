/**
 * config/db.js
 *
 * MongoDB connection management with retry logic.
 * Uses Mongoose's built-in connection pooling (default: 5 connections).
 * Emits lifecycle events to the logger so connection issues are visible
 * in structured logs and monitoring dashboards.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

// Mongoose global settings
mongoose.set('strictQuery', true);

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;

let retryCount = 0;

/**
 * Establishes a MongoDB connection with automatic retry.
 * Retries up to MAX_RETRIES times with a fixed delay between attempts.
 * Throws after exhausting all retries so the process crashes loudly.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      // These settings are no longer needed in Mongoose 6+ but kept for clarity
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    retryCount = 0;
    logger.info(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    retryCount += 1;
    logger.error(`MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount >= MAX_RETRIES) {
      logger.error('Max MongoDB connection retries reached. Exiting process.');
      process.exit(1);
    }

    logger.info(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB();
  }
}

// Connection event handlers for observability
mongoose.connection.on('connected', () => logger.info('Mongoose: connected'));
mongoose.connection.on('disconnected', () => logger.warn('Mongoose: disconnected'));
mongoose.connection.on('reconnected', () => logger.info('Mongoose: reconnected'));
mongoose.connection.on('error', (err) => logger.error(`Mongoose error: ${err.message}`));

/**
 * Checks whether the DB connection is currently active.
 * Used by the health check endpoint.
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Gracefully closes the MongoDB connection.
 * Called during process shutdown (SIGTERM/SIGINT).
 */
async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed gracefully');
}

module.exports = { connectDB, disconnectDB, isConnected };
