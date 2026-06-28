/**
 * services/workerService.js
 *
 * Manages worker lifecycle: registration, heartbeats, and crash detection.
 *
 * The heartbeat supervisor runs as a background loop.
 * When a worker's lastHeartbeat is older than (2 * HEARTBEAT_INTERVAL),
 * the supervisor marks it offline and unlocks its in-flight jobs so
 * other workers can pick them up. This implements self-healing behavior.
 */

'use strict';

const workerRepository = require('../repositories/workerRepository');
const jobRepository = require('../repositories/jobRepository');
const logRepository = require('../repositories/logRepository');
const { WORKER_STATUS, JOB_STATUS, LOG_EVENTS, SOCKET_EVENTS } = require('../config/constants');
const socketManager = require('../sockets/socketManager');
const env = require('../config/env');
const logger = require('../utils/logger');

class WorkerService {
  constructor() {
    this._supervisorInterval = null;
  }

  async registerWorker(workerData) {
    const worker = await workerRepository.upsert({
      ...workerData,
      status: WORKER_STATUS.IDLE,
      lastHeartbeat: new Date(),
      startedAt: new Date(),
      jobsCompleted: 0,
      jobsFailed: 0,
    });

    await logRepository.create({
      event: LOG_EVENTS.WORKER_ONLINE,
      workerId: worker.workerId,
      message: `Worker ${worker.name} came online`,
    });

    socketManager.emit(SOCKET_EVENTS.WORKER_STATUS_CHANGED, { worker });
    logger.info(`Worker registered: ${worker.workerId} (${worker.name})`);
    return worker;
  }

  async heartbeat(workerId, status, currentJobId = null, currentJobType = null) {
    const worker = await workerRepository.updateHeartbeat(workerId, status, currentJobId, currentJobType);
    socketManager.emit(SOCKET_EVENTS.WORKER_HEARTBEAT, { worker });
    return worker;
  }

  async getAllWorkers() {
    return workerRepository.findAll();
  }

  async getWorker(workerId) {
    return workerRepository.findById(workerId);
  }

  /**
   * Starts the heartbeat supervisor loop.
   * Runs every HEARTBEAT_INTERVAL and checks for dead workers.
   */
  startSupervisor() {
    if (this._supervisorInterval) return;

    const staleCutoffMs = env.WORKER_HEARTBEAT_INTERVAL_MS * 2.5;

    this._supervisorInterval = setInterval(async () => {
      try {
        const staleThreshold = new Date(Date.now() - staleCutoffMs);
        const staleWorkers = await workerRepository.findStaleWorkers(staleThreshold);

        for (const worker of staleWorkers) {
          logger.warn(`Worker ${worker.workerId} missed heartbeat — marking offline`);

          // Unlock any jobs this worker was holding
          const staleJobs = await jobRepository.findStaleLocks(staleThreshold);
          for (const job of staleJobs) {
            if (String(job.workerId) === String(worker.workerId)) {
              await jobRepository.updateById(job._id, {
                status: JOB_STATUS.PENDING,
                workerId: null,
                lockedUntil: null,
              });
              logger.info(`Unlocked stale job ${job._id} from crashed worker ${worker.workerId}`);
            }
          }

          await workerRepository.markOffline(worker.workerId);

          await logRepository.create({
            event: LOG_EVENTS.WORKER_OFFLINE,
            workerId: worker.workerId,
            message: `Worker ${worker.workerId} marked offline (missed heartbeat)`,
          });

          socketManager.emit(SOCKET_EVENTS.WORKER_STATUS_CHANGED, {
            worker: { ...worker, status: WORKER_STATUS.OFFLINE },
          });
        }
      } catch (err) {
        logger.error(`Worker supervisor error: ${err.message}`);
      }
    }, env.WORKER_HEARTBEAT_INTERVAL_MS);

    logger.info('Worker heartbeat supervisor started');
  }

  stopSupervisor() {
    if (this._supervisorInterval) {
      clearInterval(this._supervisorInterval);
      this._supervisorInterval = null;
      logger.info('Worker heartbeat supervisor stopped');
    }
  }

  async markOffline(workerId) {
    return workerRepository.markOffline(workerId);
  }
}

module.exports = new WorkerService();
