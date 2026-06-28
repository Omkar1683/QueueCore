/**
 * config/constants.js
 *
 * Immutable application-wide constants.
 * Using Object.freeze() to prevent accidental mutation anywhere in the codebase.
 */

'use strict';

const JOB_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
  CANCELLED: 'cancelled',
  SCHEDULED: 'scheduled',
  DELAYED: 'delayed',
});

const JOB_PRIORITY = Object.freeze({
  CRITICAL: 0,  // processed first
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
});

const PRIORITY_LABELS = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
});

const WORKER_STATUS = Object.freeze({
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  BUSY: 'busy',
});

const LOG_EVENTS = Object.freeze({
  JOB_CREATED: 'JOB_CREATED',
  JOB_CANCELLED: 'JOB_CANCELLED',
  JOB_COMPLETED: 'JOB_COMPLETED',
  JOB_FAILED: 'JOB_FAILED',
  WORKER_PICKED: 'WORKER_PICKED',
  RETRY_SCHEDULED: 'RETRY_SCHEDULED',
  RETRY_STARTED: 'RETRY_STARTED',
  MOVED_TO_DLQ: 'MOVED_TO_DLQ',
  REPLAY_STARTED: 'REPLAY_STARTED',
  WORKER_ONLINE: 'WORKER_ONLINE',
  WORKER_OFFLINE: 'WORKER_OFFLINE',
  WORKER_HEARTBEAT: 'WORKER_HEARTBEAT',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  CIRCUIT_CLOSED: 'CIRCUIT_CLOSED',
});

const SOCKET_EVENTS = Object.freeze({
  JOB_CREATED: 'job:created',
  JOB_STATUS_CHANGED: 'job:status_changed',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  WORKER_HEARTBEAT: 'worker:heartbeat',
  WORKER_STATUS_CHANGED: 'worker:status_changed',
  METRICS_SNAPSHOT: 'metrics:snapshot',
  LOG_ENTRY: 'log:entry',
  DLQ_UPDATED: 'dlq:updated',
});

// Default job configuration
const JOB_DEFAULTS = Object.freeze({
  MAX_ATTEMPTS: 3,
  PRIORITY: 'medium',
  DELAY: 0,
});

// Valid job types — adding a new type only requires adding to this list
// and creating a corresponding handler in workers/jobHandlers/
const JOB_TYPES = Object.freeze([
  'EmailJob',
  'ImageProcessingJob',
  'PDFGenerationJob',
  'NotificationJob',
  'DataSyncJob',
  'ReportGenerationJob',
  'WebhookJob',
  'CronJob',
]);

module.exports = {
  JOB_STATUS,
  JOB_PRIORITY,
  PRIORITY_LABELS,
  WORKER_STATUS,
  LOG_EVENTS,
  SOCKET_EVENTS,
  JOB_DEFAULTS,
  JOB_TYPES,
};
