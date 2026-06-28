/**
 * repositories/logRepository.js
 */

'use strict';

const Log = require('../models/Log');

class LogRepository {
  async create(data) {
    return Log.create(data);
  }

  async findByJobId(jobId, limit = 100) {
    return Log.find({ jobId }).sort({ timestamp: -1 }).limit(limit).lean();
  }

  async findRecent(limit = 50, event = null) {
    const query = event ? { event } : {};
    return Log.find(query).sort({ timestamp: -1 }).limit(limit).lean();
  }

  async findAll({ event, jobId, workerId, level, page = 1, limit = 50 } = {}) {
    const query = {};
    if (event) query.event = event;
    if (jobId) query.jobId = jobId;
    if (workerId) query.workerId = workerId;
    if (level) query.level = level;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      Log.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Log.countDocuments(query),
    ]);

    return { logs, total, page: Number(page), limit: Number(limit) };
  }
}

module.exports = new LogRepository();
