/**
 * models/Log.js
 *
 * Centralized event log for all significant job and worker lifecycle events.
 * Separated from the Job document for scalability — high-throughput systems
 * may generate thousands of log entries per minute. This collection can be
 * independently indexed, archived, or shipped to an external log aggregator.
 *
 * TTL index auto-expires logs after 30 days to prevent unbounded growth.
 */

'use strict';

const mongoose = require('mongoose');
const { LOG_EVENTS } = require('../config/constants');

const logSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: Object.values(LOG_EVENTS),
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
      index: true,
    },
    jobType: { type: String, default: null },
    workerId: { type: String, default: null, index: true },
    message: { type: String, required: true },
    // Arbitrary structured metadata (attempt number, error message, etc.)
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Suppress _v field
    versionKey: false,
  }
);

// TTL: automatically delete log documents older than 30 days
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound for job-specific log queries (most common dashboard query)
logSchema.index({ jobId: 1, timestamp: -1 });
logSchema.index({ event: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
