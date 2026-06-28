/**
 * config/redis.js
 *
 * Optional Redis client using ioredis.
 * Redis is NOT required for queue correctness — MongoDB handles all locking.
 * Redis provides: API rate limiting, response caching, optional pub/sub.
 *
 * If REDIS_ENABLED=false or Redis is unreachable, all Redis operations
 * silently no-op so the rest of the application is unaffected.
 *
 * This graceful degradation pattern is essential for production resilience:
 * a cache layer going down should never take down the primary service.
 */

'use strict';

const env = require('./env');
const logger = require('../utils/logger');

let redisClient = null;

class NoOpRedisClient {
  async get() { return null; }
  async set() { return 'OK'; }
  async del() { return 1; }
  async incr() { return 1; }
  async expire() { return 1; }
  async ttl() { return -1; }
  async keys() { return []; }
  async flushdb() { return 'OK'; }
  async ping() { return 'PONG'; }
  status = 'noop';
}

async function initRedis() {
  if (!env.REDIS_ENABLED) {
    logger.info('Redis is disabled (REDIS_ENABLED=false). Using no-op client.');
    redisClient = new NoOpRedisClient();
    return redisClient;
  }

  const Redis = require('ioredis');

  redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 5) {
        logger.warn('Redis: max reconnection attempts reached. Falling back to no-op client.');
        redisClient = new NoOpRedisClient();
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('connect', () => logger.info('Redis: connected'));
  redisClient.on('ready', () => logger.info('Redis: ready'));
  redisClient.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
  redisClient.on('close', () => logger.warn('Redis: connection closed'));

  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    // If called before init, return no-op to avoid crashes
    return new NoOpRedisClient();
  }
  return redisClient;
}

async function isRedisHealthy() {
  try {
    const client = getRedisClient();
    if (client.status === 'noop') return false;
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

module.exports = { initRedis, getRedisClient, isRedisHealthy };
