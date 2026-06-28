'use strict';

const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Queue
 *   description: Queue statistics and real-time metrics
 */

/**
 * @swagger
 * /api/queue/stats:
 *   get:
 *     summary: Get aggregate job queue statistics
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue stats — counts per status, totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     pending:
 *                       type: integer
 *                     processing:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     dead_letter:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, queueController.getStats);

/**
 * @swagger
 * /api/queue/metrics:
 *   get:
 *     summary: Get the current real-time metrics snapshot
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current metrics snapshot
 *       401:
 *         description: Unauthorized
 */
router.get('/metrics', authenticate, queueController.getMetrics);

/**
 * @swagger
 * /api/queue/metrics/history:
 *   get:
 *     summary: Get historical metrics for the last N minutes
 *     tags: [Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minutes
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Number of minutes of history to retrieve
 *     responses:
 *       200:
 *         description: Historical metrics array
 *       401:
 *         description: Unauthorized
 */
router.get('/metrics/history', authenticate, queueController.getRecentMetrics);

module.exports = router;
