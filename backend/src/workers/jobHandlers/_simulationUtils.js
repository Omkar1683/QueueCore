/**
 * workers/jobHandlers/_simulationUtils.js
 *
 * Shared simulation utilities for all demo job handlers.
 * These are the ONLY simulation-specific files — all handler structure
 * (error handling, result shape, logging) is production-identical.
 */

'use strict';

/**
 * Simulates async I/O work (network call, file processing, etc.)
 * @param {number} ms - Duration to sleep in milliseconds
 */
function simulateWork(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms)));
}

/**
 * Randomly throws an error to simulate a real-world failure.
 * @param {number} rate     - Failure probability 0.0–1.0
 * @param {string} message  - Error message if failure occurs
 */
function simulateFailure(rate = 0.1, message = 'Simulated job failure') {
  if (Math.random() < rate) {
    throw new Error(message);
  }
}

/**
 * Generates a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { simulateWork, simulateFailure, randomInt };
