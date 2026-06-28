'use strict';

const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Workers
 *   description: Worker pool status and monitoring
 */

/**
 * @swagger
 * /api/workers:
 *   get:
 *     summary: List all registered workers and their current status
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of worker objects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       workerId:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [idle, processing, offline]
 *                       lastHeartbeat:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, workerController.listWorkers);

/**
 * @swagger
 * /api/workers/{workerId}:
 *   get:
 *     summary: Get details for a specific worker
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique worker identifier
 *     responses:
 *       200:
 *         description: Worker details
 *       404:
 *         description: Worker not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:workerId', authenticate, workerController.getWorker);

module.exports = router;
