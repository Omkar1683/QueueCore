'use strict';

const jobService = require('../services/jobService');
const metricsService = require('../services/metricsService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/queue/stats
 * Return aggregate statistics about the job queue
 * (counts per status, throughput, etc.).
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await jobService.getQueueStats();
  return res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/queue/metrics
 * Return the current real-time metrics snapshot.
 */
const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await metricsService.getCurrentStats();
  return res.status(200).json({
    success: true,
    data: metrics,
  });
});

/**
 * GET /api/queue/metrics/history
 * Return historical metrics for the last N minutes.
 * Query param: ?minutes=60
 */
const getRecentMetrics = asyncHandler(async (req, res) => {
  const minutes = parseInt(req.query.minutes, 10) || 60;
  const history = await metricsService.getRecentMetrics(minutes);
  return res.status(200).json({
    success: true,
    data: history,
  });
});

module.exports = {
  getStats,
  getMetrics,
  getRecentMetrics,
};
