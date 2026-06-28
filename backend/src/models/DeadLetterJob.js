/**
 * models/DeadLetterJob.js
 *
 * Immutable snapshot of a job at the moment of final failure.
 *
 * Design: DLQ entries are never modified after creation — they are a
 * historical audit record. Replaying creates a brand-new Job document
 * referencing this DLQ entry as its origin.
 */

'use strict';

const mongoose = require('mongoose');

const deadLetterJobSchema = new mongoose.Schema(
  {
    // Reference to the original job _id (job document may still exist)
    originalJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      index: true,
    },
    jobType: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: Number, default: 2 },
    priorityLabel: { type: String, default: 'medium' },
    maxAttempts: { type: Number, required: true },
    attempts: { type: Number, required: true },
    failureReason: { type: String, required: true },
    // Full log history from the original job
    logs: { type: mongoose.Schema.Types.Mixed, default: [] },
    // The worker that processed the final attempt
    lastWorkerId: { type: String, default: null },
    // When the original job was first created
    originalCreatedAt: { type: Date, required: true },
    // When the last failure occurred
    failedAt: { type: Date, default: Date.now },
    // Whether a replay has been initiated (for audit purposes)
    replayed: { type: Boolean, default: false },
    replayedAt: { type: Date, default: null },
    // The new job ID created by replay
    replayedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  },
  {
    timestamps: true,
  }
);

deadLetterJobSchema.index({ failedAt: -1 });
deadLetterJobSchema.index({ jobType: 1, failedAt: -1 });

module.exports = mongoose.model('DeadLetterJob', deadLetterJobSchema);
