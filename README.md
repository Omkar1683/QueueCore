# QueueCore

> **Production-grade Queue-as-a-Service** — A standalone distributed job queue system with real-time monitoring, built with Node.js, MongoDB, React, and Socket.io.

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      QueueCore System                        │
│                                                             │
│  ┌──────────┐    REST API    ┌─────────────────────────┐   │
│  │  Client   │ ────────────► │      Express.js App      │   │
│  │  Apps /   │ ◄──────────── │  Controllers → Services  │   │
│  │  Frontend │   WebSocket   │  Repositories → MongoDB  │   │
│  └──────────┘                └────────────┬────────────┘   │
│                                           │                  │
│                          ┌────────────────▼──────────────┐  │
│                          │         MongoDB                │  │
│                          │  Jobs  Workers  Logs  Metrics  │  │
│                          └────────────────┬──────────────┘  │
│                                           │                  │
│              ┌────────────────────────────▼───────────────┐ │
│              │            Worker Pool (3 workers default)   │ │
│              │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│              │  │ Worker-1 │  │ Worker-2 │  │ Worker-3 │  │ │
│              │  │  polling │  │  polling │  │  polling │  │ │
│              │  └──────────┘  └──────────┘  └──────────┘  │ │
│              └────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Scheduler  │   │  Circuit     │   │    Redis        │  │
│  │  (5s tick)  │   │  Breaker     │   │  (optional)     │  │
│  └─────────────┘   └──────────────┘   └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Implementation |
|---|---|
| **Distributed Job Queue** | MongoDB atomic `findOneAndUpdate` — race-condition-proof |
| **Priority Queue** | 4 levels (Critical→High→Medium→Low), processed by numeric sort |
| **Delayed Jobs** | `lockedUntil` timestamp on job document |
| **Scheduled Jobs** | `scheduledAt` field, promoted by scheduler tick |
| **Cron Jobs** | `cronExpression` on job, rescheduled after each run |
| **Exponential Backoff** | `2^attempt` seconds with ±20% jitter |
| **Dead Letter Queue** | Immutable failure snapshot, one-click replay |
| **Worker Heartbeats** | 10s interval; supervisor auto-marks dead workers offline |
| **Visibility Timeout** | 30s; crashed workers' jobs auto-unlock |
| **Circuit Breaker** | Per-job-type, opens after 5 consecutive failures |
| **Graceful Shutdown** | SIGTERM finishes current job before exiting |
| **Real-time Dashboard** | Socket.io — live job status, worker health, metrics |
| **JWT Auth** | Access + refresh tokens, role-based (admin/viewer) |
| **Rate Limiting** | Per-IP via express-rate-limit (Redis-backed if enabled) |
| **Swagger Docs** | Auto-generated from JSDoc at `/api/docs` |

---

## Project Structure

```
queuecore/
├── backend/
│   ├── src/
│   │   ├── config/          # env, db, redis, constants
│   │   ├── models/          # Mongoose schemas
│   │   ├── repositories/    # DB access (zero business logic)
│   │   ├── services/        # Business logic layer
│   │   ├── workers/         # BaseWorker, WorkerPool, job handlers
│   │   ├── scheduler/       # Delayed/scheduled job promoter
│   │   ├── sockets/         # Socket.io event manager
│   │   ├── controllers/     # Thin HTTP handlers
│   │   ├── routes/          # Express routes + Swagger docs
│   │   ├── middleware/       # Auth, errors, rate-limit, validation
│   │   └── utils/           # Logger, backoff, circuit breaker
│   ├── server.js            # Entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios + React Query hooks
│   │   ├── components/      # UI, layout, charts, jobs, workers
│   │   ├── context/         # Auth + Socket contexts
│   │   ├── hooks/           # useSocketEvents
│   │   └── pages/           # 7 pages
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
# Clone and enter the project
cd queuecore

# Start all services (MongoDB, Redis, Backend, Frontend)
docker compose up --build

# Access:
#   Frontend:   http://localhost
#   API:        http://localhost:5000/api
#   Swagger:    http://localhost:5000/api/docs
#   Health:     http://localhost:5000/health
```

### Option 2 — Local Development

**Prerequisites:** Node.js 20+, MongoDB, Redis (optional)

```bash
# Backend
cd backend
cp .env.example .env     # Edit MONGO_URI if not using Docker
npm install
npm run dev              # Starts on :5000 with nodemon

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # Starts on :5173
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/queuecore` | MongoDB connection string |
| `JWT_SECRET` | — | **Required in production** |
| `WORKER_COUNT` | `3` | Number of concurrent workers |
| `WORKER_POLL_INTERVAL_MS` | `1000` | How often workers poll for jobs |
| `WORKER_HEARTBEAT_INTERVAL_MS` | `10000` | Worker heartbeat frequency |
| `WORKER_VISIBILITY_TIMEOUT_MS` | `30000` | Job lock timeout |
| `REDIS_ENABLED` | `false` | Enable Redis for rate-limiting/caching |
| `CIRCUIT_BREAKER_THRESHOLD` | `5` | Failures before circuit opens |
| `SWAGGER_ENABLED` | `true` | Enable Swagger UI |

---

## REST API

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login, returns JWT tokens |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/me` | Get current user |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs` | Create a new job |
| `GET` | `/api/jobs` | List jobs (with filters + pagination) |
| `GET` | `/api/jobs/:id` | Get job details + logs |
| `PATCH` | `/api/jobs/:id/cancel` | Cancel a pending/scheduled job |
| `DELETE` | `/api/jobs/:id` | Delete job (admin only) |

### Workers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workers` | List all workers |
| `GET` | `/api/workers/:workerId` | Get specific worker |

### Dead Letter Queue
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dead-letter` | List DLQ entries |
| `GET` | `/api/dead-letter/:id` | Get DLQ entry details |
| `POST` | `/api/dead-letter/:id/replay` | Replay a failed job |
| `DELETE` | `/api/dead-letter/:id` | Delete DLQ entry |

### Queue & Metrics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/queue/stats` | Job counts by status |
| `GET` | `/api/queue/metrics` | Full system metrics |
| `GET` | `/api/queue/metrics/history` | Historical metrics (for charts) |
| `GET` | `/api/metrics/jobtypes` | Per-job-type breakdown |
| `GET` | `/health` | System health check |

---

## Create a Job — Example

```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "EmailJob",
    "payload": {
      "to": "user@example.com",
      "subject": "Welcome!",
      "failureRate": 0.1
    },
    "priority": "high",
    "maxAttempts": 3
  }'
```

**Create a delayed job (runs after 60 seconds):**
```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "ReportGenerationJob",
    "payload": { "reportType": "monthly_sales" },
    "delay": 60,
    "priority": "medium"
  }'
```

---

## Scaling Workers

Workers scale horizontally with zero code changes:

```bash
# Run 10 workers instead of 3
WORKER_COUNT=10 docker compose up

# Or override in .env
WORKER_COUNT=10
```

Each worker instance is completely independent — they share only the MongoDB database and race atomically to claim jobs. Increasing `WORKER_COUNT` linearly increases throughput.

---

## Socket.io Events (Dashboard)

| Event | Payload | Description |
|---|---|---|
| `job:created` | `{job}` | New job submitted |
| `job:status_changed` | `{jobId, status, workerId}` | Job state transition |
| `job:completed` | `{jobId, executionTime}` | Job finished successfully |
| `job:failed` | `{jobId, failureReason, attempts}` | Job failed (DLQ) |
| `worker:heartbeat` | `{workerId, lastHeartbeat}` | Worker alive signal |
| `worker:status_changed` | `{worker}` | Worker went online/offline |
| `metrics:snapshot` | `{pending, processing, ...}` | 60-second metric snapshot |
| `dlq:updated` | `{dlqEntry}` | New DLQ entry |

---

## Job Types

| Handler | Simulated Work | Default Failure Rate |
|---|---|---|
| `EmailJob` | 800–2000ms | 10% |
| `ImageProcessingJob` | 1500–4000ms | 8% |
| `PDFGenerationJob` | 2000–5000ms | 5% |
| `NotificationJob` | 300–1200ms | 7% |
| `DataSyncJob` | 3000–8000ms | 12% |
| `ReportGenerationJob` | 4000–10000ms | 6% |
| `WebhookJob` | 500–5000ms | 15% |

Control failure rate and processing time via job payload:
```json
{ "failureRate": 0.2, "processingMs": 3000 }
```

---

## Deployment (AWS EC2)

```bash
# On EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER

# Clone repo
git clone <your-repo> queuecore && cd queuecore

# Set production secrets
export JWT_SECRET=<strong-random-secret>
export JWT_REFRESH_SECRET=<another-strong-secret>

# Start
docker compose up -d --build

# Monitor
docker compose logs -f backend
```

---

## License

MIT
