/**
 * repositories/workerRepository.js
 * Data access layer for Worker documents.
 */

'use strict';

const Worker = require('../models/Worker');
const { WORKER_STATUS } = require('../config/constants');

class WorkerRepository {
  async upsert(workerData) {
    return Worker.findOneAndUpdate(
      { workerId: workerData.workerId },
      { $set: workerData },
      { upsert: true, new: true }
    );
  }

  async findById(workerId) {
    return Worker.findOne({ workerId });
  }

  async findAll() {
    return Worker.find().sort({ startedAt: -1 }).lean();
  }

  async updateHeartbeat(workerId, status, currentJobId = null, currentJobType = null) {
    return Worker.findOneAndUpdate(
      { workerId },
      {
        $set: {
          lastHeartbeat: new Date(),
          status,
          currentJobId,
          currentJobType,
        },
      },
      { new: true }
    );
  }

  async incrementJobsCompleted(workerId, executionTimeMs) {
    return Worker.findOneAndUpdate(
      { workerId },
      {
        $inc: { jobsCompleted: 1, totalExecutionTimeMs: executionTimeMs },
        $set: { currentJobId: null, currentJobType: null },
      },
      { new: true }
    );
  }

  async incrementJobsFailed(workerId) {
    return Worker.findOneAndUpdate(
      { workerId },
      {
        $inc: { jobsFailed: 1 },
        $set: { currentJobId: null, currentJobType: null },
      },
      { new: true }
    );
  }

  async markOffline(workerId) {
    return Worker.findOneAndUpdate(
      { workerId },
      {
        $set: {
          status: WORKER_STATUS.OFFLINE,
          currentJobId: null,
          currentJobType: null,
          offlineSince: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Find workers whose heartbeat has not been received recently (crashed workers)
   * @param {Date} olderThan - Heartbeats older than this timestamp are considered stale
   */
  async findStaleWorkers(olderThan) {
    return Worker.find({
      status: { $in: [WORKER_STATUS.ONLINE, WORKER_STATUS.IDLE, WORKER_STATUS.BUSY] },
      lastHeartbeat: { $lt: olderThan },
    });
  }

  async countByStatus() {
    const result = await Worker.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return result.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {});
  }

  async deleteById(workerId) {
    return Worker.findOneAndDelete({ workerId });
  }
}

module.exports = new WorkerRepository();
