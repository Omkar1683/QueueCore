'use strict';

/**
 * server.js — QueueCore Entry Point
 *
 * Bootstrap sequence:
 *   1. Load environment configuration
 *   2. Connect to MongoDB
 *   3. Initialize Redis (optional)
 *   4. Build Express application
 *   5. Create HTTP server
 *   6. Attach Socket.io
 *   7. Start listening
 *   8. Start background services (workers, scheduler, metrics)
 *
 * Process-level error handlers ensure any uncaught exception is logged
 * before the process exits, rather than silently dying.
 */

const { Server } = require('socket.io');
const http = require('http');

// ─── Environment must be loaded first ─────────────────────────────────────────
const env = require('./src/config/env');

// ─── Infrastructure ────────────────────────────────────────────────────────────
const { connectDB, disconnectDB } = require('./src/config/db');
const { initRedis } = require('./src/config/redis');

// ─── Application ───────────────────────────────────────────────────────────────
const createApp = require('./src/app');

// ─── Background Services ───────────────────────────────────────────────────────
const socketManager = require('./src/sockets/socketManager');
const workerPool = require('./src/workers/workerPool');
const workerService = require('./src/services/workerService');
const jobScheduler = require('./src/scheduler/jobScheduler');
const metricsService = require('./src/services/metricsService');

// ─── Logger ─────────────────────────────────────────────────────────────────────
const logger = require('./src/utils/logger');

// ─── Process-level error handlers ──────────────────────────────────────────────
// These are the final safety net — they ensure crashes are always visible in logs.
process.on('uncaughtException', (err) => {
  logger.error(`[FATAL] Uncaught exception: ${err.message}`, {
    stack: err.stack,
    name: err.name,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`[FATAL] Unhandled promise rejection`, {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
let httpServer = null;

async function shutdown(signal) {
  logger.info(`Received ${signal} — starting graceful shutdown...`);

  // Stop accepting new connections
  if (httpServer) {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Stop background services
  jobScheduler.stop();
  metricsService.stop();
  workerService.stopSupervisor();

  // Stop all workers (waits for current jobs to finish)
  await workerPool.stop();

  // Close database connections
  await disconnectDB();

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  logger.info('==========================================================');
  logger.info('  QueueCore — Starting up');
  logger.info(`  Environment : ${env.NODE_ENV}`);
  logger.info(`  Port        : ${env.PORT}`);
  logger.info('==========================================================');

  // 1. Connect to MongoDB
  logger.info('Connecting to MongoDB...');
  await connectDB();

  // 2. Initialize Redis (gracefully degrades if disabled/unavailable)
  logger.info('Initializing Redis...');
  await initRedis();

  // 3. Build Express app
  const app = createApp();

  // 4. Create HTTP server (needed to attach Socket.io to the same port)
  httpServer = http.createServer(app);

  // 5. Attach Socket.io to the HTTP server
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL || process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Use long-polling as a fallback for environments that block WebSockets
    transports: ['websocket', 'polling'],
  });

  // 6. Initialize the socket manager singleton with the io instance
  socketManager.init(io);

  // 7. Start listening for HTTP connections
  await new Promise((resolve, reject) => {
    httpServer.listen(env.PORT, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  logger.info(`HTTP server listening on port ${env.PORT}`);

  // 8. Start background services (non-blocking — they run as internal timers)
  logger.info('Starting worker pool...');
  await workerPool.start();

  logger.info('Starting worker heartbeat supervisor...');
  workerService.startSupervisor();

  logger.info('Starting job scheduler...');
  jobScheduler.start();

  logger.info('Starting metrics collector...');
  metricsService.start();

  logger.info('==========================================================');
  logger.info(`  QueueCore is READY on http://0.0.0.0:${env.PORT}`);
  if (env.SWAGGER_ENABLED) {
    logger.info(`  API Docs    : http://localhost:${env.PORT}/api/docs`);
  }
  logger.info(`  Health      : http://localhost:${env.PORT}/health`);
  logger.info('==========================================================');

  // Register graceful shutdown handlers
  // Note: workerPool also registers SIGTERM/SIGINT via _bindShutdownHandlers,
  // but we use process.once so the second registration is a no-op.
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

// ─── Run ────────────────────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  logger.error(`[FATAL] Bootstrap failed: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
