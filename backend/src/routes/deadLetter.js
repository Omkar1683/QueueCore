'use strict';

const express = require('express');
const router = express.Router();
const deadLetterController = require('../controllers/deadLetterController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: DeadLetter
 *   description: Dead-letter queue (DLQ) management
 */

/**
 * @swagger
 * /api/dead-letter:
 *   get:
 *     summary: List all dead-letter jobs
 *     tags: [DeadLetter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *         description: Filter by job type
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
 *     responses:
 *       200:
 *         description: Paginated list of dead-letter jobs
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, deadLetterController.listDLQ);

/**
 * @swagger
 * /api/dead-letter/{id}:
 *   get:
 *     summary: Get a single dead-letter job by ID
 *     tags: [DeadLetter]
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
 *         description: Dead-letter job details
 *       404:
 *         description: Dead-letter job not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticate, deadLetterController.getDLQJob);

/**
 * @swagger
 * /api/dead-letter/{id}/replay:
 *   post:
 *     summary: Replay a dead-letter job — re-enqueue it for processing (admin only)
 *     tags: [DeadLetter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Job replayed — returns new job record
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Dead-letter job not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/replay', authenticate, requireAdmin, deadLetterController.replayJob);

/**
 * @swagger
 * /api/dead-letter/{id}:
 *   delete:
 *     summary: Permanently delete a dead-letter job (admin only)
 *     tags: [DeadLetter]
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
 *         description: Dead-letter job deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Dead-letter job not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticate, requireAdmin, deadLetterController.deleteDLQJob);

module.exports = router;
