'use strict';

const metricsService = require('../services/metricsService');
const jobRepository = require('../repositories/jobRepository');
const deadLetterRepository = require('../repositories/deadLetterRepository');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/metrics
 * Full metrics snapshot — combines current stats, job type breakdown,
 * and dead-letter summary in a single response.
 */
const getMetrics = asyncHandler(async (req, res) => {
  const [currentStats, jobTypeStats, dlqCount] = await Promise.all([
    metricsService.getCurrentStats(),
    jobRepository.getJobTypeStats(),
    deadLetterRepository.countTotal(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      currentStats,
      jobTypeStats,
      deadLetterCount: dlqCount,
    },
  });
});

/**
 * GET /api/metrics/jobtypes
 * Per-job-type breakdown: totals, success/failure counts, avg execution time.
 */
const getJobTypeStats = asyncHandler(async (req, res) => {
  const stats = await jobRepository.getJobTypeStats();
  return res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/metrics/top-failures
 * Returns the top N job types that appear most frequently in the DLQ.
 * Query param: ?limit=5
 */
const getTopFailingTypes = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const topFailing = await deadLetterRepository.getTopFailingJobTypes(limit);
  return res.status(200).json({
    success: true,
    data: topFailing,
  });
});

module.exports = {
  getMetrics,
  getJobTypeStats,
  getTopFailingTypes,
};
