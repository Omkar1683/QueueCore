/**
 * services/metricsService.js
 *
 * Collects system-wide metrics and writes time-series snapshots.
 * Runs as a background interval, capturing a snapshot every minute.
 * The snapshot is broadcast over Socket.io for the live dashboard.
 */

'use strict';

const jobRepository = require('../repositories/jobRepository');
const workerRepository = require('../repositories/workerRepository');
const deadLetterRepository = require('../repositories/deadLetterRepository');
const metricRepository = require('../repositories/metricRepository');
const { SOCKET_EVENTS, WORKER_STATUS } = require('../config/constants');
const socketManager = require('../sockets/socketManager');
const logger = require('../utils/logger');

class MetricsService {
  constructor() {
    this._interval = null;
    // Rolling window for jobs completed/failed in the last minute
    this._lastSnapshot = { completedCount: 0, failedCount: 0 };
  }

  /**
   * Collects current queue state and writes a metric snapshot.
   * Called every 60 seconds by the background interval.
   */
  async collectSnapshot() {
    try {
      const [byStatus, workersByStatus, dlqCount] = await Promise.all([
        jobRepository.countByStatus(),
        workerRepository.countByStatus(),
        deadLetterRepository.countTotal(),
      ]);

      const onlineWorkers = (workersByStatus.online || 0) + (workersByStatus.idle || 0) + (workersByStatus.busy || 0);
      const busyWorkers = workersByStatus.busy || 0;
      const workerUtilizationPct = onlineWorkers > 0 ? Math.round((busyWorkers / onlineWorkers) * 100) : 0;

      const completedCount = byStatus.completed || 0;
      const failedCount = byStatus.failed || 0;
      const jobsCompletedThisMinute = Math.max(0, completedCount - this._lastSnapshot.completedCount);
      const jobsFailedThisMinute = Math.max(0, failedCount - this._lastSnapshot.failedCount);
      this._lastSnapshot = { completedCount, failedCount };

      const totalDone = completedCount + failedCount;
      const successRatePct = totalDone > 0 ? Math.round((completedCount / totalDone) * 100) : 0;
      const failureRatePct = 100 - successRatePct;

      const snapshot = {
        pendingCount: byStatus.pending || 0,
        processingCount: byStatus.processing || 0,
        completedCount,
        failedCount,
        deadLetterCount: dlqCount,
        jobsCompletedThisMinute,
        jobsFailedThisMinute,
        onlineWorkers,
        busyWorkers,
        workerUtilizationPct,
        successRatePct,
        failureRatePct,
      };

      await metricRepository.upsertSnapshot(snapshot);
      socketManager.emit(SOCKET_EVENTS.METRICS_SNAPSHOT, snapshot);

      return snapshot;
    } catch (err) {
      logger.error(`MetricsService snapshot error: ${err.message}`);
    }
  }

  async getRecentMetrics(minutes = 60) {
    return metricRepository.getRecent(minutes);
  }

  async getCurrentStats() {
    const [byStatus, workersByStatus, dlqCount, jobTypeStats, throughput] = await Promise.all([
      jobRepository.countByStatus(),
      workerRepository.countByStatus(),
      deadLetterRepository.countTotal(),
      jobRepository.getJobTypeStats(),
      jobRepository.getThroughputData(60),
    ]);

    const onlineWorkers = (workersByStatus.online || 0) + (workersByStatus.idle || 0) + (workersByStatus.busy || 0);
    const totalJobs = Object.values(byStatus).reduce((a, b) => a + b, 0);

    return {
      queue: { ...byStatus, deadLetter: dlqCount, total: totalJobs },
      workers: { ...workersByStatus, online: onlineWorkers },
      jobTypeStats,
      throughput,
    };
  }

  start() {
    if (this._interval) return;
    this.collectSnapshot(); // immediate first snapshot
    this._interval = setInterval(() => this.collectSnapshot(), 60000);
    logger.info('Metrics collector started (60s interval)');
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = new MetricsService();
