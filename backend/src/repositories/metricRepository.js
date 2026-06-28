/**
 * repositories/metricRepository.js
 */

'use strict';

const Metric = require('../models/Metric');

class MetricRepository {
  /**
   * Upsert a metric snapshot for the current minute bucket.
   * Using upsert ensures we don't create duplicates for the same minute.
   */
  async upsertSnapshot(data) {
    const bucket = Math.floor(Date.now() / 60000);
    return Metric.findOneAndUpdate(
      { bucket },
      { $set: { ...data, bucket, timestamp: new Date() } },
      { upsert: true, new: true }
    );
  }

  /**
   * Returns the last N minute snapshots for chart rendering
   */
  async getRecent(minutes = 60) {
    const cutoff = Math.floor(Date.now() / 60000) - minutes;
    return Metric.find({ bucket: { $gte: cutoff } }).sort({ bucket: 1 }).lean();
  }

  async getLatest() {
    return Metric.findOne().sort({ bucket: -1 }).lean();
  }
}

module.exports = new MetricRepository();
