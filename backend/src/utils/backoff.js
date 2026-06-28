/**
 * utils/backoff.js
 *
 * Exponential backoff calculation for job retries.
 *
 * Strategy: 2^attempt seconds with optional jitter to prevent
 * thundering herd problems when many jobs fail simultaneously
 * and would otherwise all retry at the exact same moment.
 *
 * Example without jitter:
 *   attempt 1 → 2s
 *   attempt 2 → 4s
 *   attempt 3 → 8s
 *   attempt 4 → 16s
 *   attempt 5 → 32s
 *
 * Example with jitter (±20%):
 *   attempt 1 → ~1.6–2.4s
 *   attempt 2 → ~3.2–4.8s
 */

'use strict';

const DEFAULT_BASE_MS = 1000;    // 1 second base
const DEFAULT_MAX_MS  = 300000;  // 5 minutes maximum cap
const JITTER_FACTOR   = 0.2;     // ±20% random jitter

/**
 * Calculates the delay in milliseconds before the next retry attempt.
 *
 * @param {number} attempt       - Current attempt number (1-based)
 * @param {boolean} withJitter   - Whether to add random jitter (default: true)
 * @param {number} baseMs        - Base delay in ms (default: 1000ms)
 * @param {number} maxMs         - Maximum delay cap in ms (default: 300000ms)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, withJitter = true, baseMs = DEFAULT_BASE_MS, maxMs = DEFAULT_MAX_MS) {
  // Core exponential: 2^attempt * base
  const exponential = Math.pow(2, attempt) * baseMs;

  // Apply maximum cap
  const capped = Math.min(exponential, maxMs);

  if (!withJitter) return capped;

  // Add ±20% jitter to avoid thundering herd
  const jitter = capped * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

/**
 * Returns the Date timestamp when the job should next be retried.
 *
 * @param {number} attempt - Current attempt number (1-based)
 * @returns {Date} Future date when the job should become visible again
 */
function getNextRetryAt(attempt) {
  const delayMs = calculateBackoffDelay(attempt);
  return new Date(Date.now() + delayMs);
}

module.exports = { calculateBackoffDelay, getNextRetryAt };
