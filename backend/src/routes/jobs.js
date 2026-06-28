'use strict';

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { validate, createJobSchema } = require('../middleware/validator');

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job queue management
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create and enqueue a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobType
 *             properties:
 *               jobType:
 *                 type: string
 *                 example: sendEmail
 *               payload:
 *                 type: object
 *                 example: { "to": "user@example.com", "subject": "Hello" }
 *               priority:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *                 example: medium
 *               delay:
 *                 type: number
 *                 description: Delay in milliseconds before the job becomes visible
 *                 example: 5000
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T23:59:00Z"
 *               maxAttempts:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 3
 *               cronExpression:
 *                 type: string
 *                 example: "0 * * * *"
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://myapp.com/webhooks/job-result"
 *     responses:
 *       201:
 *         description: Job created and enqueued
 *       422:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, validate(createJobSchema), jobController.createJob);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs with optional filtering and pagination
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled, dead_letter, delayed, scheduled]
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [critical, high, medium, low]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, jobController.listJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticate, jobController.getJob);

/**
 * @swagger
 * /api/jobs/{id}/cancel:
 *   patch:
 *     summary: Cancel a pending or waiting job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job cancelled
 *       404:
 *         description: Job not found
 *       400:
 *         description: Job cannot be cancelled in its current state
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/cancel', authenticate, jobController.cancelJob);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Permanently delete a job (admin only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticate, requireAdmin, jobController.deleteJob);

module.exports = router;
