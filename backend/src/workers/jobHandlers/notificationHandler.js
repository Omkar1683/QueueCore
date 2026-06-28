/**
 * workers/jobHandlers/notificationHandler.js
 * Simulates push/SMS/in-app notification dispatch.
 * Replace with FCM, Twilio, or OneSignal SDK for production.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function notificationHandler(job) {
  const { channel = 'push', userId, title = 'Notification', body = '', failureRate = 0.07 } = job.payload;
  await simulateWork(randomInt(300, 1200));
  simulateFailure(failureRate, `Notification delivery failed via ${channel} for user ${userId}`);
  return {
    delivered: true,
    channel,
    userId,
    title,
    notificationId: `notif_${Date.now()}`,
    deliveredAt: new Date().toISOString(),
  };
}

module.exports = notificationHandler;
