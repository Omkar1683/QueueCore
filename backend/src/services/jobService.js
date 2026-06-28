/**
 * services/jobService.js
 *
 * Business logic for job lifecycle management.
 * Orchestrates between jobRepository, logRepository, and socketManager.
 */

'use strict';

const jobRepository = require('../repositories/jobRepository');
const logRepository = require('../repositories/logRepository');
const ApiError = require('../utils/ApiError');
const { JOB_STATUS, JOB_PRIORITY, PRIORITY_LABELS, LOG_EVENTS, SOCKET_EVENTS, JOB_DEFAULTS } = require('../config/constants');
const socketManager = require('../sockets/socketManager');

class JobService {
  /**
   * Creates a new job and routes it to the correct initial status.
   *
   * Routing logic:
   *   - Has scheduledAt in the future → status: 'scheduled'
   *   - Has delay > 0              → status: 'delayed', lockedUntil = now + delay
   *   - Otherwise                  → status: 'pending'
   */
  async createJob({
    jobType,
    payload = {},
    priority = JOB_DEFAULTS.PRIORITY,
    delay = 0,
    scheduledAt = null,
    maxAttempts = JOB_DEFAULTS.MAX_ATTEMPTS,
    cronExpression = null,
    webhookUrl = null,
    webhookHeaders = {},
  }) {
    const priorityNum = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS.medium;
    const now = new Date();

    let status = JOB_STATUS.PENDING;
    let lockedUntil = null;
    let nextRunAt = null;

    if (scheduledAt && new Date(scheduledAt) > now) {
      status = JOB_STATUS.SCHEDULED;
    } else if (delay > 0) {
      status = JOB_STATUS.DELAYED;
      lockedUntil = new Date(now.getTime() + delay * 1000); // delay in seconds
    }

    if (cronExpression) {
      status = JOB_STATUS.SCHEDULED;
      nextRunAt = this._getNextCronTime(cronExpression);
    }

    const job = await jobRepository.create({
      jobType,
      payload,
      status,
      priority: priorityNum,
      priorityLabel: priority,
      delay,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      maxAttempts,
      lockedUntil,
      cronExpression,
      nextRunAt,
      webhookUrl,
      webhookHeaders,
    });

    // Log and broadcast
    await logRepository.create({
      event: LOG_EVENTS.JOB_CREATED,
      jobId: job._id,
      jobType: job.jobType,
      message: `Job created with status '${status}'`,
      metadata: { priority, delay, scheduledAt, maxAttempts },
    });

    socketManager.emit(SOCKET_EVENTS.JOB_CREATED, { job });

    return job;
  }

  async getJob(id) {
    const job = await jobRepository.findById(id);
    if (!job) throw ApiError.notFound(`Job ${id} not found`);
    return job;
  }

  async listJobs(filters) {
    return jobRepository.findAll(filters);
  }

  async cancelJob(id) {
    const job = await jobRepository.findById(id);
    if (!job) throw ApiError.notFound(`Job ${id} not found`);

    const cancellable = [JOB_STATUS.PENDING, JOB_STATUS.SCHEDULED, JOB_STATUS.DELAYED];
    if (!cancellable.includes(job.status)) {
      throw ApiError.badRequest(`Cannot cancel a job with status '${job.status}'`);
    }

    const updated = await jobRepository.cancel(id);

    await logRepository.create({
      event: LOG_EVENTS.JOB_CANCELLED,
      jobId: job._id,
      jobType: job.jobType,
      message: 'Job cancelled by user',
    });

    socketManager.emit(SOCKET_EVENTS.JOB_STATUS_CHANGED, {
      jobId: id,
      status: JOB_STATUS.CANCELLED,
    });

    return updated;
  }

  async deleteJob(id) {
    const job = await jobRepository.findById(id);
    if (!job) throw ApiError.notFound(`Job ${id} not found`);

    if (job.status === JOB_STATUS.PROCESSING) {
      throw ApiError.badRequest('Cannot delete a job that is currently being processed');
    }

    await jobRepository.deleteById(id);
    return { message: 'Job deleted successfully' };
  }

  async getQueueStats() {
    const [byStatus, jobTypeStats, throughput] = await Promise.all([
      jobRepository.countByStatus(),
      jobRepository.getJobTypeStats(),
      jobRepository.getThroughputData(60),
    ]);
    return { byStatus, jobTypeStats, throughput };
  }

  // ── Private ──────────────────────────────────────────────

  /**
   * Naive cron-next-run calculator for common patterns.
   * For Phase 2, replace with the 'cron-parser' npm package.
   */
  _getNextCronTime(cronExpression) {
    // Simplified: return 1 minute from now as a placeholder
    // Real implementation would parse the cron expression properly
    return new Date(Date.now() + 60000);
  }
}

module.exports = new JobService();
