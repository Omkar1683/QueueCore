# ─── Stage 1: Build (install production dependencies) ──────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching.
# node_modules are only reinstalled when package*.json changes.
COPY package*.json ./

RUN npm ci --only=production

# ─── Stage 2: Runtime (minimal final image) ─────────────────────────────────────
FROM node:20-alpine

# Create a non-root user for security.
# Never run Node.js applications as root in production.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S queuecore -u 1001

WORKDIR /app

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source with correct ownership
COPY --chown=queuecore:nodejs . .

# Switch to non-root user
USER queuecore

# Document which port the application listens on
EXPOSE 5000

# Health check — Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]
