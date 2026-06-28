/**
 * workers/jobHandlers/dataSyncHandler.js
 * Simulates syncing data between two systems (CRM, ERP, DB migration).
 * Replace with real API calls / DB queries for production.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function dataSyncHandler(job) {
  const { source = 'crm', destination = 'datawarehouse', recordCount = 1000, failureRate = 0.12 } = job.payload;
  await simulateWork(randomInt(3000, 8000));
  simulateFailure(failureRate, `DataSync failed: connection timeout to ${destination}`);
  const synced = Math.floor(recordCount * (0.95 + Math.random() * 0.05));
  return {
    synced: true,
    source,
    destination,
    recordsRequested: recordCount,
    recordsSynced: synced,
    recordsSkipped: recordCount - synced,
    syncedAt: new Date().toISOString(),
    batchId: `batch_${Date.now()}`,
  };
}

module.exports = dataSyncHandler;
