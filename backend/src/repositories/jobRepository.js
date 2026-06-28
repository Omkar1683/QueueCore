/**
 * repositories/jobRepository.js
 *
 * Data access layer for Job documents. Contains zero business logic.
 * All MongoDB query complexity lives here — services remain clean.
 *
 * The most important method here is claimNextJob() which uses a single
 * atomic findOneAndUpdate to select AND lock a job simultaneously.
 * This prevents any race condition between concurrent workers — only
 * one worker can claim any given job, guaranteed by MongoDB's document-level
 * atomic operations.
 */

'use strict';

const Job = require('../models/Job');
const { JOB_STATUS, PRIORITY_LABELS } = require('../config/constants');
const env = require('../config/env');

class JobRepository {
  /**
   * Atomically claims the next available job for a worker.
   *
   * Query selects jobs that are:
   *   1. status = 'pending'
   *   2. lockedUntil is null OR has expired (visibility timeout elapsed)
   *
   * Sorted by: priority ASC (critical=0 first), then createdAt ASC (FIFO within same priority).
   *
   * The single findOneAndUpdate call atomically finds AND locks the job.
   * No other worker can claim this job until lockedUntil expires.
   *
   * @param {string} workerId - The claiming worker's ID
   * @returns {Promise<Job|null>} The claimed job, or null if queue is empty
   */
  async claimNextJob(workerId) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + env.WORKER_VISIBILITY_TIMEOUT_MS);

    return Job.findOneAndUpdate(
      {
        status: JOB_STATUS.PENDING,
        $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
      },
      {
        $set: {
          status: JOB_STATUS.PROCESSING,
          workerId,
          lockedUntil,
          startedAt: now,
        },
        $inc: { attempts: 1 },
      },
      {
        new: true,         // Return the updated document
        sort: { priority: 1, createdAt: 1 }, // Lowest priority number = highest urgency
      }
    );
  }

  async create(data) {
    return Job.create(data);
  }

  async findById(id) {
    return Job.findById(id);
  }

  async findAll({ status, jobType, workerId, priority, page = 1, limit = 20, search, startDate, endDate } = {}) {
    const query = {};
    if (status) query.status = status;
    if (jobType) query.jobType = jobType;
    if (workerId) query.workerId = workerId;
    if (priority !== undefined) query.priority = PRIORITY_LABELS[priority] ?? priority;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { jobType: { $regex: search, $options: 'i' } },
        { workerId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(query),
    ]);

    return { jobs, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
  }

  async updateById(id, data) {
    return Job.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async appendLog(id, logEntry) {
    return Job.findByIdAndUpdate(
      id,
      { $push: { logs: { $each: [logEntry], $slice: -100 } } }, // Keep last 100 log entries
      { new: true }
    );
  }

  async markCompleted(id, executionTime) {
    return Job.findByIdAndUpdate(
      id,
      {
        $set: {
          status: JOB_STATUS.COMPLETED,
          completedAt: new Date(),
          executionTime,
          workerId: null,
          lockedUntil: null,
        },
      },
      { new: true }
    );
  }

  async markFailed(id, { failureReason, nextRetryAt }) {
    return Job.findByIdAndUpdate(
      id,
      {
        $set: {
          status: JOB_STATUS.FAILED,
          failureReason,
          workerId: null,
          lockedUntil: nextRetryAt || null,
          // If retrying, set back to pending immediately (lockedUntil controls timing)
          ...(nextRetryAt ? { status: JOB_STATUS.PENDING } : {}),
        },
      },
      { new: true }
    );
  }

  async markDeadLetter(id, failureReason) {
    return Job.findByIdAndUpdate(
      id,
      {
        $set: {
          status: JOB_STATUS.DEAD_LETTER,
          failureReason,
          workerId: null,
          lockedUntil: null,
          completedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  async cancel(id) {
    return Job.findByIdAndUpdate(
      id,
      { $set: { status: JOB_STATUS.CANCELLED, workerId: null, lockedUntil: null } },
      { new: true }
    );
  }

  async deleteById(id) {
    return Job.findByIdAndDelete(id);
  }

  /**
   * Counts jobs grouped by status — used for dashboard cards
   */
  async countByStatus() {
    const result = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return result.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {});
  }

  /**
   * Returns jobs whose delay has elapsed and are still in 'delayed' status
   */
  async findExpiredDelayedJobs() {
    const now = new Date();
    return Job.find({ status: JOB_STATUS.DELAYED, lockedUntil: { $lte: now } });
  }

  /**
   * Returns scheduled jobs whose scheduledAt time has arrived
   */
  async findDueScheduledJobs() {
    const now = new Date();
    return Job.find({ status: JOB_STATUS.SCHEDULED, scheduledAt: { $lte: now } });
  }

  /**
   * Returns cron jobs whose nextRunAt has arrived
   */
  async findDueCronJobs() {
    const now = new Date();
    return Job.find({
      cronExpression: { $ne: null },
      nextRunAt: { $lte: now },
      status: { $in: [JOB_STATUS.PENDING, JOB_STATUS.COMPLETED] },
    });
  }

  /**
   * Finds stale jobs locked by a crashed worker (workerId matches but lockedUntil expired)
   */
  async findStaleLocks(expiredBefore) {
    return Job.find({
      status: JOB_STATUS.PROCESSING,
      lockedUntil: { $lt: expiredBefore },
    });
  }

  /**
   * Returns job type statistics for the Metrics page
   */
  async getJobTypeStats() {
    return Job.aggregate([
      {
        $group: {
          _id: '$jobType',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.COMPLETED] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.FAILED] }, 1, 0] } },
          deadLetter: { $sum: { $cond: [{ $eq: ['$status', JOB_STATUS.DEAD_LETTER] }, 1, 0] } },
          avgExecutionTime: { $avg: '$executionTime' },
          maxExecutionTime: { $max: '$executionTime' },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }

  /**
   * Returns throughput data (completed jobs per minute) for the last N minutes
   */
  async getThroughputData(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return Job.aggregate([
      {
        $match: {
          status: JOB_STATUS.COMPLETED,
          completedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%dT%H:%M', date: '$completedAt' },
          },
          count: { $sum: 1 },
          avgTime: { $avg: '$executionTime' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async countAll() {
    return Job.countDocuments();
  }
}

module.exports = new JobRepository();
