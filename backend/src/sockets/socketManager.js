/**
 * sockets/socketManager.js
 *
 * Centralized Socket.io event emitter.
 * All services emit events through this singleton — they never hold a
 * direct reference to the Socket.io server instance. This decouples the
 * real-time layer from business logic cleanly.
 *
 * Architecture: The server.js initializes the Socket.io instance and
 * calls socketManager.init(io). After that, any service can call
 * socketManager.emit() without knowing anything about Socket.io internals.
 */

'use strict';

const logger = require('../utils/logger');
const env = require('../config/env');

class SocketManager {
  constructor() {
    this._io = null;
  }

  /**
   * Must be called once at startup with the Socket.io server instance.
   */
  init(io) {
    this._io = io;

    io.use((socket, next) => {
      // Allow unauthenticated dashboard connections in development
      // In production, validate JWT from socket.handshake.auth.token
      if (env.isProduction) {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }
        // Full JWT validation done in a real production setup
      }
      next();
    });

    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });

      // Allow clients to subscribe to specific job updates
      socket.on('subscribe:job', (jobId) => {
        socket.join(`job:${jobId}`);
      });

      socket.on('unsubscribe:job', (jobId) => {
        socket.leave(`job:${jobId}`);
      });
    });

    logger.info('Socket.io initialized');
  }

  /**
   * Broadcast an event to all connected dashboard clients.
   * Silent no-op if Socket.io is not yet initialized (during startup).
   */
  emit(event, data) {
    if (!this._io) return;
    try {
      this._io.emit(event, { ...data, ts: Date.now() });
    } catch (err) {
      logger.warn(`Socket emit error [${event}]: ${err.message}`);
    }
  }

  /**
   * Emit to a specific room (e.g., clients watching a particular job)
   */
  emitToJob(jobId, event, data) {
    if (!this._io) return;
    this._io.to(`job:${jobId}`).emit(event, { ...data, ts: Date.now() });
  }

  isReady() {
    return !!this._io;
  }
}

module.exports = new SocketManager();
