/**
 * workers/workerPool.js
 *
 * Manages N concurrent BaseWorker instances.
 *
 * Design: Each worker is completely independent — they share no state,
 * only the MongoDB database. This means you can scale horizontally by
 * simply increasing WORKER_COUNT or starting additional Node processes
 * on different machines. No code changes required.
 *
 * The pool handles:
 *   - Starting/stopping all workers together
 *   - SIGTERM/SIGINT graceful shutdown (waits for all workers to finish)
 *   - Binding to process signals exactly once (prevents duplicate handlers)
 */

'use strict';

const BaseWorker = require('./baseWorker');
const env        = require('../config/env');
const logger     = require('../utils/logger');

class WorkerPool {
  constructor() {
    this._workers = [];
    this._shutdownBound = false;
  }

  /**
   * Starts WORKER_COUNT independent worker instances.
   * Each worker registers itself in the DB and begins polling immediately.
   */
  async start(count = env.WORKER_COUNT) {
    logger.info(`Starting worker pool with ${count} workers...`);

    const startPromises = [];
    for (let i = 1; i <= count; i++) {
      const worker = new BaseWorker(`Worker-${i}`);
      this._workers.push(worker);
      startPromises.push(worker.start());
    }

    await Promise.all(startPromises);
    logger.info(`Worker pool ready — ${count} workers active`);

    if (!this._shutdownBound) {
      this._bindShutdownHandlers();
      this._shutdownBound = true;
    }
  }

  /**
   * Gracefully stops all workers.
   * Each worker finishes its current job before stopping.
   * All workers stop concurrently to minimize shutdown time.
   */
  async stop() {
    logger.info(`Stopping worker pool (${this._workers.length} workers)...`);
    await Promise.all(this._workers.map((w) => w.stop()));
    this._workers = [];
    logger.info('Worker pool stopped');
  }

  getWorkers() {
    return this._workers;
  }

  /**
   * Binds SIGTERM and SIGINT for graceful shutdown.
   * This is the ONLY place process signals are handled — prevents duplicate handlers.
   */
  _bindShutdownHandlers() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal} — initiating graceful shutdown`);
      await this.stop();
      process.exit(0);
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT',  () => shutdown('SIGINT'));
    logger.info('Graceful shutdown handlers registered (SIGTERM, SIGINT)');
  }
}

module.exports = new WorkerPool();
