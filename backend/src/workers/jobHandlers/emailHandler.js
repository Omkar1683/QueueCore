/**
 * workers/jobHandlers/emailHandler.js
 *
 * Simulates sending an email. Replace the body with a real Nodemailer/SendGrid
 * call to go production without changing any worker infrastructure code.
 *
 * Simulation parameters (from job.payload):
 *   to          - recipient address
 *   subject     - email subject
 *   body        - email body
 *   failureRate - 0.0–1.0, probability of simulated failure (default 0.1)
 *   processingMs - simulated processing time in ms (default 800–2000)
 */

'use strict';

const { simulateWork, simulateFailure } = require('./_simulationUtils');

async function emailHandler(job) {
  const { to = 'user@example.com', subject = 'No Subject', failureRate = 0.1, processingMs } = job.payload;

  await simulateWork(processingMs || Math.random() * 1200 + 800);
  simulateFailure(failureRate, `SMTP delivery failed for recipient: ${to}`);

  return {
    delivered: true,
    to,
    subject,
    messageId: `msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

module.exports = emailHandler;
