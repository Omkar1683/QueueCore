/**
 * workers/jobHandlers/webhookHandler.js
 * Sends an HTTP POST to an external URL with job payload.
 * Supports webhook retry with exponential backoff via the standard retry mechanism.
 * In production this is a real fetch/axios call — only the simulation flag changes.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function webhookHandler(job) {
  const {
    url = 'https://webhook.example.com/receiver',
    headers = {},
    body = {},
    failureRate = 0.15,
    timeoutMs = 5000,
  } = job.payload;

  await simulateWork(randomInt(500, timeoutMs));
  simulateFailure(failureRate, `Webhook POST failed: ${url} returned 500`);

  return {
    delivered: true,
    url,
    statusCode: 200,
    responseTime: randomInt(200, 800),
    deliveredAt: new Date().toISOString(),
    requestId: `req_${Date.now()}`,
  };
}

module.exports = webhookHandler;
