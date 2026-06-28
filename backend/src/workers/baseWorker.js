/**
 * workers/baseWorker.js
 *
 * The core worker engine. Every worker instance is an independent polling loop
 * that continuously races to atomically claim and process jobs.
 *
 * Lifecycle:
 *   start() → register in DB → begin poll loop + heartbeat
 *   poll()  → claimNextJob() → execute handler → markCompleted / handleFailure
 *   stop()  → graceful shutdown (finish current job, then exit)
 *
 * Concurrency safety:
 *   The claimNextJob() repository method uses a single atomic findOneAndUpdate.
 *   Even with 100 workers polling simultaneously, each job is claimed by exactly
 *   one worker — guaranteed by MongoDB's document-level atomicity.
 *
 * Crash recovery:
 *   If this process crashes mid-job, the visibility timeout (lockedUntil) will
 *   expire. The WorkerService supervisor loop detects this and unlocks the job,
 *   making it available for another worker to pick up.
 *
 * Circuit breaker:
 *   Before picking a job, the worker checks if that job type's circuit is open.
 *   If open, the job is skipped (returned to the queue) and the worker waits.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const os = require('os');

const jobRepository       = require('../repositories/jobRepository');
const workerRepository    = require('../repositories/workerRepository');
const logRepository       = require('../repositories/logRepository');
const deadLetterService   = require('../services/deadLetterService');
const { getHandler }      = require('./jobHandlers/index');
const circuitBreaker      = require('../utils/circuitBreaker');
const { getNextRetryAt }  = require('../utils/backoff');
const socketManager       = require('../sockets/socketManager');
const logger              = require('../utils/logger');
const env                 = require('../config/env');

const {
  JOB_STATUS,
  WORKER_STATUS,
  LOG_EVENTS,
  SOCKET_EVENTS,
} = require('../config/constants');

class BaseWorker {
  /**
   * @param {string} name - Human-readable worker name (e.g. "Worker-1")
   */
  constructor(name) {
    this.workerId    = uuidv4();
    this.name        = name;
    this.isRunning   = false;
    this.isShuttingDown = false;
    this.currentJob  = null;
    this._pollTimer  = null;
    this._heartbeatTimer = null;
  }

  // ── Startup ──────────────────────────────────────────────────────────────

  async start() {
    this.isRunning = true;

    // Register this worker in the database
    await workerRepository.upsert({
      workerId: this.workerId,
      name: this.name,
      status: WORKER_STATUS.IDLE,
      pid: process.pid,
      hostname: os.hostname(),
      lastHeartbeat: new Date(),
      startedAt: new Date(),
    });

    await logRepository.create({
      event: LOG_EVENTS.WORKER_ONLINE,
      workerId: this.workerId,
      message: `${this.name} started (pid: ${process.pid})`,
    });

    socketManager.emit(SOCKET_EVENTS.WORKER_STATUS_CHANGED, {
      workerId: this.workerId,
      name: this.name,
      status: WORKER_STATUS.IDLE,
    });

    logger.info(`[${this.name}] Started — workerId: ${this.workerId}`);

    this._startHeartbeat();
    this._schedulePoll();
  }

  // ── Poll Loop ─────────────────────────────────────────────────────────────

  _schedulePoll() {
    if (this.isShuttingDown) return;
    this._pollTimer = setTimeout(() => this._poll(), env.WORKER_POLL_INTERVAL_MS);
  }

  async _poll() {
    if (this.isShuttingDown) return;

    try {
      const job = await jobRepository.claimNextJob(this.workerId);

      if (!job) {
        // Queue is empty — stay idle
        await this._setStatus(WORKER_STATUS.IDLE);
        this._schedulePoll();
        return;
      }

      // Circuit breaker check — skip job type if circuit is open
      if (!circuitBreaker.isAllowing(job.jobType)) {
        logger.warn(`[${this.name}] Circuit OPEN for ${job.jobType} — releasing job ${job._id}`);
        // Release the job back to pending
        await jobRepository.updateById(job._id, {
          status: JOB_STATUS.PENDING,
          workerId: null,
          lockedUntil: new Date(Date.now() + 30000), // hold off 30s
        });
        this._schedulePoll();
        return;
      }

      await this._processJob(job);
    } catch (err) {
      logger.error(`[${this.name}] Poll error: ${err.message}`);
    }

    this._schedulePoll();
  }

  // ── Job Execution ─────────────────────────────────────────────────────────

  async _processJob(job) {
    this.currentJob = job;
    const startTime = Date.now();

    logger.info(`[${this.name}] Picked job ${job._id} (type: ${job.jobType}, attempt: ${job.attempts})`);

    // Update worker status to BUSY
    await this._setStatus(WORKER_STATUS.BUSY, job._id, job.jobType);

    // Append job-level log
    await this._appendJobLog(job._id, LOG_EVENTS.WORKER_PICKED, `Picked up by ${this.name} (attempt ${job.attempts})`);

    // Broadcast status change
    socketManager.emit(SOCKET_EVENTS.JOB_STATUS_CHANGED, {
      jobId: job._id,
      status: JOB_STATUS.PROCESSING,
      workerId: this.workerId,
      workerName: this.name,
    });

    // Emit job-specific room event for detail page
    socketManager.emitToJob(job._id, SOCKET_EVENTS.JOB_STATUS_CHANGED, {
      jobId: job._id,
      status: JOB_STATUS.PROCESSING,
    });

    try {
      const handler = getHandler(job.jobType);
      const result  = await handler(job);
      const executionTime = Date.now() - startTime;

      await this._onSuccess(job, result, executionTime);
      circuitBreaker.recordSuccess(job.jobType);
    } catch (err) {
      const executionTime = Date.now() - startTime;
      await this._onFailure(job, err, executionTime);
      circuitBreaker.recordFailure(job.jobType);
    } finally {
      this.currentJob = null;
      await this._setStatus(WORKER_STATUS.IDLE);
    }
  }

  // ── Success Path ──────────────────────────────────────────────────────────

  async _onSuccess(job, result, executionTime) {
    await jobRepository.markCompleted(job._id, executionTime);
    await workerRepository.incrementJobsCompleted(this.workerId, executionTime);

    await logRepository.create({
      event: LOG_EVENTS.JOB_COMPLETED,
      jobId: job._id,
      jobType: job.jobType,
      workerId: this.workerId,
      message: `Completed in ${executionTime}ms`,
      metadata: { result, executionTime },
    });

    await this._appendJobLog(job._id, LOG_EVENTS.JOB_COMPLETED,
      `Completed successfully in ${executionTime}ms by ${this.name}`);

    socketManager.emit(SOCKET_EVENTS.JOB_COMPLETED, {
      jobId: job._id,
      jobType: job.jobType,
      executionTime,
      workerId: this.workerId,
    });

    socketManager.emitToJob(job._id, SOCKET_EVENTS.JOB_COMPLETED, { result, executionTime });

    logger.info(`[${this.name}] ✓ Job ${job._id} completed in ${executionTime}ms`);

    // If this is a cron job, schedule the next run
    if (job.cronExpression) {
      await this._scheduleNextCronRun(job);
    }
  }

  // ── Failure Path ──────────────────────────────────────────────────────────

  async _onFailure(job, err, executionTime) {
    const failureReason = err.message || 'Unknown error';
    const hasRetriesLeft = job.attempts < job.maxAttempts;

    logger.warn(`[${this.name}] ✗ Job ${job._id} failed (attempt ${job.attempts}/${job.maxAttempts}): ${failureReason}`);

    await workerRepository.incrementJobsFailed(this.workerId);

    if (hasRetriesLeft) {
      // Schedule retry with exponential backoff
      const nextRetryAt = getNextRetryAt(job.attempts);

      await jobRepository.markFailed(job._id, { failureReason, nextRetryAt });

      await logRepository.create({
        event: LOG_EVENTS.RETRY_SCHEDULED,
        jobId: job._id,
        jobType: job.jobType,
        workerId: this.workerId,
        message: `Retry ${job.attempts}/${job.maxAttempts} scheduled at ${nextRetryAt.toISOString()}`,
        metadata: { failureReason, nextRetryAt, attempt: job.attempts },
        level: 'warn',
      });

      await this._appendJobLog(job._id, LOG_EVENTS.RETRY_SCHEDULED,
        `Failed (attempt ${job.attempts}/${job.maxAttempts}). Retry at ${nextRetryAt.toISOString()}. Error: ${failureReason}`);

      socketManager.emit(SOCKET_EVENTS.JOB_STATUS_CHANGED, {
        jobId: job._id, status: JOB_STATUS.PENDING, retrying: true, nextRetryAt,
      });
    } else {
      // No retries left — move to Dead Letter Queue
      await jobRepository.markDeadLetter(job._id, failureReason);

      // Fetch updated job for DLQ snapshot
      const failedJob = await jobRepository.findById(job._id);
      await deadLetterService.moveToDeadLetter({ ...failedJob.toObject(), workerId: this.workerId });

      await this._appendJobLog(job._id, LOG_EVENTS.MOVED_TO_DLQ,
        `Moved to Dead Letter Queue after ${job.attempts} failed attempts. Final error: ${failureReason}`);

      socketManager.emit(SOCKET_EVENTS.JOB_FAILED, {
        jobId: job._id, jobType: job.jobType, failureReason, attempts: job.attempts,
      });

      socketManager.emitToJob(job._id, SOCKET_EVENTS.JOB_FAILED, { failureReason });
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  _startHeartbeat() {
    this._heartbeatTimer = setInterval(async () => {
      try {
        await workerRepository.updateHeartbeat(
          this.workerId,
          this.currentJob ? WORKER_STATUS.BUSY : WORKER_STATUS.IDLE,
          this.currentJob?._id || null,
          this.currentJob?.jobType || null
        );
        socketManager.emit(SOCKET_EVENTS.WORKER_HEARTBEAT, {
          workerId: this.workerId,
          name: this.name,
          lastHeartbeat: new Date(),
          currentJobId: this.currentJob?._id || null,
        });
      } catch (err) {
        logger.warn(`[${this.name}] Heartbeat failed: ${err.message}`);
      }
    }, env.WORKER_HEARTBEAT_INTERVAL_MS);
  }

  // ── Graceful Shutdown ─────────────────────────────────────────────────────

  async stop() {
    logger.info(`[${this.name}] Shutdown requested — finishing current job...`);
    this.isShuttingDown = true;

    // Stop scheduling new polls
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }

    // Stop heartbeat
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    // Wait for current job to finish (max 30s)
    const deadline = Date.now() + 30000;
    while (this.currentJob && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }

    if (this.currentJob) {
      logger.warn(`[${this.name}] Shutdown timeout — job ${this.currentJob._id} will be requeued by supervisor`);
    }

    // Mark offline in DB
    await workerRepository.markOffline(this.workerId);

    await logRepository.create({
      event: LOG_EVENTS.WORKER_OFFLINE,
      workerId: this.workerId,
      message: `${this.name} shut down gracefully`,
    });

    socketManager.emit(SOCKET_EVENTS.WORKER_STATUS_CHANGED, {
      workerId: this.workerId,
      status: WORKER_STATUS.OFFLINE,
    });

    logger.info(`[${this.name}] Shutdown complete`);
    this.isRunning = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async _setStatus(status, currentJobId = null, currentJobType = null) {
    await workerRepository.updateHeartbeat(this.workerId, status, currentJobId, currentJobType);
  }

  async _appendJobLog(jobId, event, message) {
    await jobRepository.appendLog(jobId, {
      event,
      message,
      metadata: { workerId: this.workerId, workerName: this.name },
      timestamp: new Date(),
    });
  }

  async _scheduleNextCronRun(job) {
    // For cron jobs: reset to pending with a future lockedUntil
    // A real implementation would parse the cron expression
    const nextRunAt = new Date(Date.now() + 60000);
    await jobRepository.updateById(job._id, {
      status: JOB_STATUS.PENDING,
      attempts: 0,
      startedAt: null,
      completedAt: null,
      executionTime: null,
      failureReason: null,
      lockedUntil: nextRunAt,
      nextRunAt,
    });
    logger.info(`[${this.name}] Cron job ${job._id} scheduled for next run at ${nextRunAt.toISOString()}`);
  }
}

module.exports = BaseWorker;
