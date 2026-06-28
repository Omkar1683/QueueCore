/**
 * src/app.js
 *
 * Express application factory. Creates and configures the Express app
 * without starting the server — separation allows easy testing.
 */

'use strict';

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const swaggerJsdoc  = require('swagger-jsdoc');
const swaggerUi     = require('swagger-ui-express');

const env           = require('./config/env');
const errorHandler  = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const healthCheck   = require('./utils/healthCheck');

const authRoutes       = require('./routes/auth');
const jobRoutes        = require('./routes/jobs');
const workerRoutes     = require('./routes/workers');
const queueRoutes      = require('./routes/queue');
const deadLetterRoutes = require('./routes/deadLetter');
const metricsRoutes    = require('./routes/metrics');

function createApp() {
  const app = express();

  // ── Security ─────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cors({
    origin: env.isProduction ? (process.env.FRONTEND_URL || 'http://localhost') : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Parsers ───────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Logging ───────────────────────────────────────────────
  app.use(requestLogger);

  // ── Rate Limiting ─────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Health (unauthenticated) ──────────────────────────────
  app.get('/health', healthCheck);

  // ── API Routes ────────────────────────────────────────────
  app.use('/api/auth',        authRoutes);
  app.use('/api/jobs',        jobRoutes);
  app.use('/api/workers',     workerRoutes);
  app.use('/api/queue',       queueRoutes);
  app.use('/api/dead-letter', deadLetterRoutes);
  app.use('/api/metrics',     metricsRoutes);

  // ── Swagger Docs ──────────────────────────────────────────
  if (env.SWAGGER_ENABLED) {
    const swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'QueueCore API',
          version: '1.0.0',
          description: 'Production Job Queue Service — REST API Documentation',
          contact: { name: 'QueueCore' },
        },
        servers: [{ url: '/api', description: 'Current environment' }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ['./src/routes/*.js'],
    });

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'QueueCore API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    }));
  }

  // ── 404 ───────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // ── Global Error Handler (must be last) ───────────────────
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
