/**
 * workers/jobHandlers/reportHandler.js
 * Simulates generating analytics/business reports.
 * Replace with real DB aggregation + Excel/CSV generation for production.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function reportHandler(job) {
  const { reportType = 'monthly_sales', dateRange = {}, failureRate = 0.06 } = job.payload;
  await simulateWork(randomInt(4000, 10000));
  simulateFailure(failureRate, `Report generation failed: data source unavailable for ${reportType}`);
  return {
    generated: true,
    reportType,
    dateRange,
    rowCount: randomInt(500, 50000),
    outputUrl: `https://storage.example.com/reports/${reportType}_${Date.now()}.xlsx`,
    generatedAt: new Date().toISOString(),
    sizeKb: randomInt(100, 2000),
  };
}

module.exports = reportHandler;
