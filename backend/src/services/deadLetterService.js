/**
 * services/deadLetterService.js
 *
 * Manages Dead Letter Queue operations.
 * Replay creates a brand-new Job referencing the original DLQ entry —
 * the DLQ entry itself is never modified or deleted (immutable audit record).
 */

'use strict';

const deadLetterRepository = require('../repositories/deadLetterRepository');
const jobRepository = require('../repositories/jobRepository');
const logRepository = require('../repositories/logRepository');
const ApiError = require('../utils/ApiError');
const { LOG_EVENTS, SOCKET_EVENTS } = require('../config/constants');
const socketManager = require('../sockets/socketManager');

class DeadLetterService {
  async moveToDeadLetter(job) {
    const dlqEntry = await deadLetterRepository.create({
      originalJobId: job._id,
      jobType: job.jobType,
      payload: job.payload,
      priority: job.priority,
      priorityLabel: job.priorityLabel,
      maxAttempts: job.maxAttempts,
      attempts: job.attempts,
      failureReason: job.failureReason || 'Max retry attempts exceeded',
      logs: job.logs,
      lastWorkerId: job.workerId,
      originalCreatedAt: job.createdAt,
      failedAt: new Date(),
    });

    await logRepository.create({
      event: LOG_EVENTS.MOVED_TO_DLQ,
      jobId: job._id,
      jobType: job.jobType,
      workerId: job.workerId,
      message: `Job moved to Dead Letter Queue after ${job.attempts} attempts`,
      metadata: { failureReason: job.failureReason },
      level: 'warn',
    });

    socketManager.emit(SOCKET_EVENTS.DLQ_UPDATED, { dlqEntry });
    return dlqEntry;
  }

  async listDeadLetterJobs(filters) {
    return deadLetterRepository.findAll(filters);
  }

  async getDeadLetterJob(id) {
    const entry = await deadLetterRepository.findById(id);
    if (!entry) throw ApiError.notFound(`Dead letter job ${id} not found`);
    return entry;
  }

  /**
   * Replays a dead letter job by creating a fresh Job document.
   * The new job starts from attempt 0 with the same payload and type.
   */
  async replayJob(id) {
    const dlqEntry = await deadLetterRepository.findById(id);
    if (!dlqEntry) throw ApiError.notFound(`Dead letter job ${id} not found`);
    if (dlqEntry.replayed) throw ApiError.conflict('This job has already been replayed');

    // Create a new job with the original payload
    const newJob = await jobRepository.create({
      jobType: dlqEntry.jobType,
      payload: dlqEntry.payload,
      priority: dlqEntry.priority,
      priorityLabel: dlqEntry.priorityLabel,
      maxAttempts: dlqEntry.maxAttempts,
      status: 'pending',
    });

    await deadLetterRepository.markReplayed(id, newJob._id);

    await logRepository.create({
      event: LOG_EVENTS.REPLAY_STARTED,
      jobId: newJob._id,
      jobType: newJob.jobType,
      message: `Job replayed from DLQ entry ${id}`,
      metadata: { originalJobId: dlqEntry.originalJobId, newJobId: newJob._id },
    });

    socketManager.emit(SOCKET_EVENTS.JOB_CREATED, { job: newJob, replayed: true });
    return { newJob, dlqEntry };
  }

  async deleteDeadLetterJob(id) {
    const entry = await deadLetterRepository.findById(id);
    if (!entry) throw ApiError.notFound(`Dead letter job ${id} not found`);
    await deadLetterRepository.deleteById(id);
    return { message: 'Dead letter job deleted' };
  }
}

module.exports = new DeadLetterService();
