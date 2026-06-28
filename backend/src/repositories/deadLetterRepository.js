/**
 * repositories/deadLetterRepository.js
 */

'use strict';

const DeadLetterJob = require('../models/DeadLetterJob');

class DeadLetterRepository {
  async create(data) {
    return DeadLetterJob.create(data);
  }

  async findById(id) {
    return DeadLetterJob.findById(id);
  }

  async findAll({ jobType, page = 1, limit = 20 } = {}) {
    const query = {};
    if (jobType) query.jobType = jobType;

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      DeadLetterJob.find(query).sort({ failedAt: -1 }).skip(skip).limit(limit).lean(),
      DeadLetterJob.countDocuments(query),
    ]);

    return { jobs, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
  }

  async markReplayed(id, replayedJobId) {
    return DeadLetterJob.findByIdAndUpdate(
      id,
      { $set: { replayed: true, replayedAt: new Date(), replayedJobId } },
      { new: true }
    );
  }

  async deleteById(id) {
    return DeadLetterJob.findByIdAndDelete(id);
  }

  async countTotal() {
    return DeadLetterJob.countDocuments();
  }

  async getTopFailingJobTypes(limit = 5) {
    return DeadLetterJob.aggregate([
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
}

module.exports = new DeadLetterRepository();
