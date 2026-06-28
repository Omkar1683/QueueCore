/**
 * models/Job.js
 *
 * Core job document. This is the heart of the queue.
 *
 * Key design decisions:
 * - Compound index on (status, priority, lockedUntil) is the exact index
 *   used by the atomic claimNextJob query — critical for performance at scale.
 * - lockedUntil implements the "visibility timeout" pattern: a claimed job
 *   is invisible to other workers until this timestamp expires.
 * - logs[] is an embedded array for quick retrieval; for very high-volume
 *   jobs, this could be moved to a separate Logs collection (Phase 2).
 * - cronExpression enables recurring jobs without external scheduler tooling.
 */

'use strict';

const mongoose = require('mongoose');
const { JOB_STATUS, PRIORITY_LABELS } = require('../config/constants');

const logEntrySchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    jobType: {
      type: String,
      required: [true, 'jobType is required'],
      trim: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PENDING,
      index: true,
    },
    // Numeric priority for sorting: 0=critical, 1=high, 2=medium, 3=low
    priority: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: PRIORITY_LABELS.medium,
    },
    priorityLabel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // ---- Scheduling ----
    // Delay: job becomes pending X milliseconds after creation
    delay: { type: Number, default: 0 },
    // Absolute datetime to run the job
    scheduledAt: { type: Date, default: null },
    // Cron expression for recurring jobs (e.g. "0 * * * *")
    cronExpression: { type: String, default: null },
    // Next run time for cron jobs
    nextRunAt: { type: Date, default: null },

    // ---- Retry ----
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    // When a failed job will next become available for pickup (backoff)
    lockedUntil: { type: Date, default: null },

    // ---- Worker assignment ----
    workerId: { type: String, default: null, index: true },

    // ---- Timing ----
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // Execution duration in milliseconds
    executionTime: { type: Number, default: null },

    // ---- Failure tracking ----
    failureReason: { type: String, default: null },

    // ---- Embedded logs (recent events for this job) ----
    logs: { type: [logEntrySchema], default: [] },

    // ---- Webhook support ----
    webhookUrl: { type: String, default: null },
    webhookHeaders: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ============================================================
// INDEXES
// The most important index in the entire system:
// Workers query: status=pending AND (lockedUntil IS NULL OR lockedUntil < now)
// sorted by priority ASC (lower number = higher priority), then createdAt ASC.
// This compound index makes that query O(log n) instead of O(n).
// ============================================================
jobSchema.index({ status: 1, priority: 1, lockedUntil: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ workerId: 1, status: 1 });
jobSchema.index({ scheduledAt: 1, status: 1 });
jobSchema.index({ nextRunAt: 1, status: 1 });

// Virtual: human-readable execution time
jobSchema.virtual('executionTimeFormatted').get(function () {
  if (!this.executionTime) return null;
  if (this.executionTime < 1000) return `${this.executionTime}ms`;
  return `${(this.executionTime / 1000).toFixed(2)}s`;
});

module.exports = mongoose.model('Job', jobSchema);
