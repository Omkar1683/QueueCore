/**
 * models/Metric.js
 *
 * Time-series metric snapshots for dashboard charts.
 *
 * The MetricsService writes a snapshot every minute. The dashboard reads
 * the last N snapshots to render throughput, failure rate, and worker
 * utilization charts. TTL index prunes data older than 7 days automatically.
 *
 * For Phase 2, this collection can be replaced with Prometheus time-series
 * storage + Grafana, with no changes to the rest of the application.
 */

'use strict';

const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
  {
    // Unix minute bucket (Math.floor(Date.now() / 60000)) for time bucketing
    bucket: { type: Number, required: true, unique: true },
    timestamp: { type: Date, default: Date.now },

    // Queue depth
    pendingCount: { type: Number, default: 0 },
    processingCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    deadLetterCount: { type: Number, default: 0 },

    // Throughput
    jobsCompletedThisMinute: { type: Number, default: 0 },
    jobsFailedThisMinute: { type: Number, default: 0 },

    // Performance
    avgExecutionTimeMs: { type: Number, default: 0 },
    maxExecutionTimeMs: { type: Number, default: 0 },

    // Worker utilization
    onlineWorkers: { type: Number, default: 0 },
    busyWorkers: { type: Number, default: 0 },
    workerUtilizationPct: { type: Number, default: 0 },

    // Success / failure rates
    successRatePct: { type: Number, default: 0 },
    failureRatePct: { type: Number, default: 0 },
  },
  { versionKey: false }
);

// TTL: keep metrics for 7 days
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
metricSchema.index({ bucket: 1 });

module.exports = mongoose.model('Metric', metricSchema);
