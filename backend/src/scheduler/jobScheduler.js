/**
 * scheduler/jobScheduler.js
 *
 * Background scheduler that runs every SCHEDULER_INTERVAL_MS (default: 5s).
 * Responsible for transitioning time-based jobs into the active queue.
 *
 * Three responsibilities:
 *   1. Delayed jobs    — lockedUntil has elapsed → set status: pending
 *   2. Scheduled jobs  — scheduledAt has arrived → set status: pending
 *   3. Stale locks     — visibility timeout expired → unlock for re-pickup
 *
 * This is the "clock" of the distributed queue system. Even if workers
 * are busy or unavailable, scheduled jobs are queued on time, ready to
 * be processed the moment a worker becomes available.
 */

'use strict';

const jobRepository = require('../repositories/jobRepository');
const logRepository = require('../repositories/logRepository');
const { JOB_STATUS, LOG_EVENTS, SOCKET_EVENTS } = require('../config/constants');
const socketManager = require('../sockets/socketManager');
const env           = require('../config/env');
const logger        = require('../utils/logger');

class JobScheduler {
  constructor() {
    this._interval = null;
  }

  start() {
    if (this._interval) return;
    this._interval = setInterval(() => this._tick(), env.SCHEDULER_INTERVAL_MS);
    logger.info(`Job scheduler started (${env.SCHEDULER_INTERVAL_MS}ms interval)`);
    // Run immediately on startup to catch any jobs missed during downtime
    this._tick();
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
      logger.info('Job scheduler stopped');
    }
  }

  async _tick() {
    try {
      await Promise.all([
        this._promoteDelayedJobs(),
        this._promoteScheduledJobs(),
        this._unlockStaleJobs(),
      ]);
    } catch (err) {
      logger.error(`Scheduler tick error: ${err.message}`);
    }
  }

  /**
   * Promotes delayed jobs whose wait time has elapsed.
   * A delayed job has status:'delayed' and lockedUntil = createdAt + delayMs.
   * When lockedUntil passes, we promote it to 'pending'.
   */
  async _promoteDelayedJobs() {
    const jobs = await jobRepository.findExpiredDelayedJobs();
    if (jobs.length === 0) return;

    logger.info(`Scheduler: promoting ${jobs.length} delayed job(s) to pending`);

    for (const job of jobs) {
      await jobRepository.updateById(job._id, {
        status: JOB_STATUS.PENDING,
        lockedUntil: null,
      });

      await logRepository.create({
        event: LOG_EVENTS.JOB_CREATED,
        jobId: job._id,
        jobType: job.jobType,
        message: 'Delayed job promoted to pending queue',
      });

      socketManager.emit(SOCKET_EVENTS.JOB_STATUS_CHANGED, {
        jobId: job._id,
        status: JOB_STATUS.PENDING,
      });
    }
  }

  /**
   * Promotes scheduled jobs whose scheduledAt datetime has arrived.
   */
  async _promoteScheduledJobs() {
    const jobs = await jobRepository.findDueScheduledJobs();
    if (jobs.length === 0) return;

    logger.info(`Scheduler: promoting ${jobs.length} scheduled job(s) to pending`);

    for (const job of jobs) {
      await jobRepository.updateById(job._id, {
        status: JOB_STATUS.PENDING,
        lockedUntil: null,
      });

      await logRepository.create({
        event: LOG_EVENTS.JOB_CREATED,
        jobId: job._id,
        jobType: job.jobType,
        message: `Scheduled job promoted to pending (was scheduled for ${job.scheduledAt?.toISOString()})`,
      });

      socketManager.emit(SOCKET_EVENTS.JOB_STATUS_CHANGED, {
        jobId: job._id,
        status: JOB_STATUS.PENDING,
      });
    }
  }

  /**
   * Unlocks jobs that are stuck in 'processing' with an expired lockedUntil.
   * This handles the case where a worker crashed BETWEEN the heartbeat supervisor's
   * check intervals — provides a second safety net.
   */
  async _unlockStaleJobs() {
    const staleThreshold = new Date(Date.now() - env.WORKER_VISIBILITY_TIMEOUT_MS);
    const staleJobs = await jobRepository.findStaleLocks(staleThreshold);

    if (staleJobs.length === 0) return;

    logger.warn(`Scheduler: unlocking ${staleJobs.length} stale job(s) with expired visibility timeout`);

    for (const job of staleJobs) {
      await jobRepository.updateById(job._id, {
        status: JOB_STATUS.PENDING,
        workerId: null,
        lockedUntil: null,
      });

      logger.warn(`Scheduler: unlocked stale job ${job._id} (was held by worker ${job.workerId})`);
    }
  }
}

module.exports = new JobScheduler();
