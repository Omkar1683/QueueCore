'use strict';

const jobService = require('../services/jobService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/jobs
 * Create a new job and enqueue it.
 */
const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.body);
  return res.status(201).json({
    success: true,
    data: job,
  });
});

/**
 * GET /api/jobs
 * List jobs with filtering, pagination, and sorting from query params.
 */
const listJobs = asyncHandler(async (req, res) => {
  const result = await jobService.listJobs(req.query);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/jobs/:id
 * Retrieve a single job by its ID.
 */
const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJob(req.params.id);
  return res.status(200).json({
    success: true,
    data: job,
  });
});

/**
 * PATCH /api/jobs/:id/cancel
 * Cancel a pending or waiting job.
 */
const cancelJob = asyncHandler(async (req, res) => {
  const job = await jobService.cancelJob(req.params.id);
  return res.status(200).json({
    success: true,
    data: job,
  });
});

/**
 * DELETE /api/jobs/:id
 * Permanently delete a job record. Requires admin role.
 */
const deleteJob = asyncHandler(async (req, res) => {
  const result = await jobService.deleteJob(req.params.id);
  return res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createJob,
  listJobs,
  getJob,
  cancelJob,
  deleteJob,
};
