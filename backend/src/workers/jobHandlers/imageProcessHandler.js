/**
 * workers/jobHandlers/imageProcessHandler.js
 * Simulates image resize/compression/watermarking.
 * Replace with Sharp or AWS S3 calls for production.
 */
'use strict';
const { simulateWork, simulateFailure, randomInt } = require('./_simulationUtils');

async function imageProcessHandler(job) {
  const { imageUrl = 'https://example.com/image.jpg', width = 800, height = 600, failureRate = 0.08, format = 'webp' } = job.payload;
  await simulateWork(randomInt(1500, 4000));
  simulateFailure(failureRate, `Image processing failed: invalid format or corrupted source at ${imageUrl}`);
  return {
    processed: true,
    originalUrl: imageUrl,
    outputUrl: `https://cdn.example.com/processed/${Date.now()}.${format}`,
    dimensions: { width, height },
    format,
    sizeKb: randomInt(40, 400),
    processingMs: randomInt(1500, 4000),
  };
}

module.exports = imageProcessHandler;
