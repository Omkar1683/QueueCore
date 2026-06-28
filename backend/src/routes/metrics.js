'use strict';

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Metrics
 *   description: Detailed system and job processing metrics
 */

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get a full metrics snapshot (current stats + job type breakdown + DLQ count)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full metrics snapshot
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
 *                     currentStats:
 *                       type: object
 *                     jobTypeStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                     deadLetterCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, metricsController.getMetrics);

/**
 * @swagger
 * /api/metrics/jobtypes:
 *   get:
 *     summary: Get per-job-type statistics (totals, success, failure, avg execution time)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of job type stats
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
 *                       _id:
 *                         type: string
 *                         description: Job type name
 *                       total:
 *                         type: integer
 *                       completed:
 *                         type: integer
 *                       failed:
 *                         type: integer
 *                       deadLetter:
 *                         type: integer
 *                       avgExecutionTime:
 *                         type: number
 *                       maxExecutionTime:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/jobtypes', authenticate, metricsController.getJobTypeStats);

/**
 * @swagger
 * /api/metrics/top-failures:
 *   get:
 *     summary: Get the top N job types most frequently landing in the DLQ
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of top failing job types to return
 *     responses:
 *       200:
 *         description: Array of job type + failure count pairs
 *       401:
 *         description: Unauthorized
 */
router.get('/top-failures', authenticate, metricsController.getTopFailingTypes);

module.exports = router;
