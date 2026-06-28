'use strict';

const workerService = require('../services/workerService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/workers
 * Return a list of all registered workers and their current status.
 */
const listWorkers = asyncHandler(async (req, res) => {
  const workers = await workerService.getAllWorkers();
  return res.status(200).json({
    success: true,
    data: workers,
  });
});

/**
 * GET /api/workers/:workerId
 * Return details for a single worker identified by workerId.
 */
const getWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.getWorker(req.params.workerId);
  return res.status(200).json({
    success: true,
    data: worker,
  });
});

module.exports = {
  listWorkers,
  getWorker,
};
