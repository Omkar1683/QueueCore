/**
 * workers/jobHandlers/index.js
 *
 * Handler registry. Maps jobType strings to handler functions.
 * Adding a new job type = add one line here + create the handler file.
 * Zero changes needed anywhere else in the codebase.
 */

'use strict';

const emailHandler          = require('./emailHandler');
const imageProcessHandler   = require('./imageProcessHandler');
const pdfHandler            = require('./pdfHandler');
const notificationHandler   = require('./notificationHandler');
const dataSyncHandler       = require('./dataSyncHandler');
const reportHandler         = require('./reportHandler');
const webhookHandler        = require('./webhookHandler');

const handlers = {
  EmailJob:           emailHandler,
  ImageProcessingJob: imageProcessHandler,
  PDFGenerationJob:   pdfHandler,
  NotificationJob:    notificationHandler,
  DataSyncJob:        dataSyncHandler,
  ReportGenerationJob: reportHandler,
  WebhookJob:         webhookHandler,
};

/**
 * Resolves a handler for the given jobType.
 * @throws {Error} if no handler is registered for that type
 */
function getHandler(jobType) {
  const handler = handlers[jobType];
  if (!handler) {
    throw new Error(`No handler registered for job type: "${jobType}". Register it in workers/jobHandlers/index.js`);
  }
  return handler;
}

module.exports = { getHandler, handlers };
