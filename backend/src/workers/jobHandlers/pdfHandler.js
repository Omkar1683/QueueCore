/**
 * workers/jobHandlers/pdfHandler.js
 * Simulates PDF generation (invoice, report, certificate).
 * Replace with Puppeteer or PDFKit for production.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function pdfHandler(job) {
  const { template = 'invoice', data = {}, failureRate = 0.05 } = job.payload;
  await simulateWork(randomInt(2000, 5000));
  simulateFailure(failureRate, `PDF generation failed: template "${template}" render error`);
  return {
    generated: true,
    template,
    outputUrl: `https://storage.example.com/pdfs/${template}_${Date.now()}.pdf`,
    pages: randomInt(1, 20),
    sizeKb: randomInt(50, 500),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = pdfHandler;
