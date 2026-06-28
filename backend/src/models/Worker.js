/**
 * models/Worker.js
 *
 * Tracks registered worker processes and their health.
 *
 * Heartbeat-based health detection:
 * - Workers update lastHeartbeat every WORKER_HEARTBEAT_INTERVAL_MS
 * - The WorkerService's supervisor loop marks workers offline if their
 *   lastHeartbeat is older than (2 * WORKER_HEARTBEAT_INTERVAL_MS)
 * - This ensures crashed workers are detected and their in-flight jobs
 *   are unlocked within one heartbeat cycle
 */

'use strict';

const mongoose = require('mongoose');
const { WORKER_STATUS } = require('../config/constants');

const workerSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Human-friendly name: "Worker-1", "Worker-2", etc.
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WORKER_STATUS),
      default: WORKER_STATUS.IDLE,
      index: true,
    },
    currentJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    currentJobType: {
      type: String,
      default: null,
    },
    jobsCompleted: { type: Number, default: 0 },
    jobsFailed: { type: Number, default: 0 },
    totalExecutionTimeMs: { type: Number, default: 0 },
    // ISO timestamp of last heartbeat ping
    lastHeartbeat: { type: Date, default: Date.now },
    startedAt: { type: Date, default: Date.now },
    // Track when worker went offline (for downtime calculation)
    offlineSince: { type: Date, default: null },
    // Process metadata
    pid: { type: Number, default: null },
    hostname: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

// Virtual: average job execution time
workerSchema.virtual('avgExecutionTimeMs').get(function () {
  const total = this.jobsCompleted + this.jobsFailed;
  if (total === 0) return 0;
  return Math.round(this.totalExecutionTimeMs / total);
});

workerSchema.index({ status: 1 });
workerSchema.index({ lastHeartbeat: 1 });

module.exports = mongoose.model('Worker', workerSchema);
