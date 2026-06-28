/**
 * utils/circuitBreaker.js
 *
 * Per-job-type circuit breaker pattern.
 *
 * Prevents cascading failures when a specific job type is consistently failing
 * (e.g., an external API is down). Instead of retrying endlessly and consuming
 * worker resources, the circuit "opens" after N consecutive failures and
 * rejects new jobs of that type until the cooldown period expires.
 *
 * States:
 *   CLOSED  → Normal operation. Failures are tracked.
 *   OPEN    → Circuit tripped. New attempts are rejected immediately.
 *   HALF_OPEN → Cooldown expired. Next attempt is a probe. If it succeeds,
 *               circuit closes. If it fails again, circuit re-opens.
 */

'use strict';

const logger = require('./logger');
const env = require('../config/env');
const { LOG_EVENTS } = require('../config/constants');

const STATES = Object.freeze({ CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' });

class CircuitBreaker {
  constructor(jobType, threshold = env.CIRCUIT_BREAKER_THRESHOLD, cooldownMs = env.CIRCUIT_BREAKER_COOLDOWN_MS) {
    this.jobType = jobType;
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastOpenedAt = null;
  }

  /**
   * Returns true if the circuit is allowing traffic (CLOSED or HALF_OPEN).
   * Workers should check this before picking up a job of this type.
   */
  isAllowing() {
    if (this.state === STATES.CLOSED) return true;

    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.lastOpenedAt;
      if (elapsed >= this.cooldownMs) {
        // Transition to HALF_OPEN: let one probe attempt through
        logger.info(`Circuit HALF_OPEN for job type: ${this.jobType}`);
        this.state = STATES.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN — always allow the probe
    return true;
  }

  /**
   * Called when a job of this type succeeds.
   * Resets failure count and closes the circuit.
   */
  recordSuccess() {
    if (this.state !== STATES.CLOSED) {
      logger.info({ event: LOG_EVENTS.CIRCUIT_CLOSED, jobType: this.jobType },
        `Circuit CLOSED for job type: ${this.jobType}`);
    }
    this.failureCount = 0;
    this.state = STATES.CLOSED;
    this.lastOpenedAt = null;
  }

  /**
   * Called when a job of this type fails.
   * Opens the circuit after threshold consecutive failures.
   */
  recordFailure() {
    this.failureCount += 1;

    if (this.state === STATES.HALF_OPEN || this.failureCount >= this.threshold) {
      this.state = STATES.OPEN;
      this.lastOpenedAt = Date.now();
      logger.warn({ event: LOG_EVENTS.CIRCUIT_OPEN, jobType: this.jobType, failureCount: this.failureCount },
        `Circuit OPENED for job type: ${this.jobType} after ${this.failureCount} failures`);
    }
  }

  getStatus() {
    return {
      jobType: this.jobType,
      state: this.state,
      failureCount: this.failureCount,
      lastOpenedAt: this.lastOpenedAt,
    };
  }
}

/**
 * CircuitBreakerRegistry
 * Singleton registry holding one CircuitBreaker per job type.
 * Workers interact with the registry, not individual breakers directly.
 */
class CircuitBreakerRegistry {
  constructor() {
    this._breakers = new Map();
  }

  getBreaker(jobType) {
    if (!this._breakers.has(jobType)) {
      this._breakers.set(jobType, new CircuitBreaker(jobType));
    }
    return this._breakers.get(jobType);
  }

  isAllowing(jobType) {
    return this.getBreaker(jobType).isAllowing();
  }

  recordSuccess(jobType) {
    this.getBreaker(jobType).recordSuccess();
  }

  recordFailure(jobType) {
    this.getBreaker(jobType).recordFailure();
  }

  getAllStatuses() {
    const statuses = [];
    this._breakers.forEach((breaker) => statuses.push(breaker.getStatus()));
    return statuses;
  }
}

// Export singleton registry
module.exports = new CircuitBreakerRegistry();
