'use strict';

const deadLetterService = require('../services/deadLetterService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/dead-letter
 * List dead-letter jobs with optional filtering and pagination.
 */
const listDLQ = asyncHandler(async (req, res) => {
  const result = await deadLetterService.listDeadLetterJobs(req.query);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/dead-letter/:id
 * Get a single dead-letter job by ID.
 */
const getDLQJob = asyncHandler(async (req, res) => {
  const job = await deadLetterService.getDeadLetterJob(req.params.id);
  return res.status(200).json({
    success: true,
    data: job,
  });
});

/**
 * POST /api/dead-letter/:id/replay
 * Re-enqueue a dead-letter job for processing. Requires admin role.
 */
const replayJob = asyncHandler(async (req, res) => {
  const result = await deadLetterService.replayJob(req.params.id);
  return res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * DELETE /api/dead-letter/:id
 * Permanently delete a dead-letter job record. Requires admin role.
 */
const deleteDLQJob = asyncHandler(async (req, res) => {
  const result = await deadLetterService.deleteDeadLetterJob(req.params.id);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  listDLQ,
  getDLQJob,
  replayJob,
  deleteDLQJob,
};
