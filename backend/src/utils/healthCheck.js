'use strict';

const { isConnected } = require('../config/db');
const { isRedisHealthy } = require('../config/redis');
const workerPool = require('../workers/workerPool');

/**
 * GET /health
 *
 * Returns a health snapshot of all critical services.
 * Overall status is 'degraded' if MongoDB is not connected.
 */
const healthCheck = async (req, res) => {
  try {
    const mongoConnected = isConnected();
    const redisHealthy = await isRedisHealthy();

    const activeWorkerCount = workerPool.getActiveCount
      ? workerPool.getActiveCount()
      : (workerPool.workers ? workerPool.workers.length : 0);

    const overallStatus = mongoConnected ? 'ok' : 'degraded';

    const payload = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      services: {
        mongodb: {
          status: mongoConnected ? 'ok' : 'disconnected',
          connected: mongoConnected,
        },
        redis: {
          status: redisHealthy ? 'ok' : 'unavailable',
          enabled: redisHealthy,
        },
        workers: {
          count: activeWorkerCount,
        },
      },
    };

    const httpStatus = overallStatus === 'ok' ? 200 : 503;
    return res.status(httpStatus).json(payload);
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      message: err.message,
    });
  }
};

module.exports = healthCheck;
