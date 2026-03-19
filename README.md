# FrameworkGuard AI

> AI-powered production monitoring for Java applications. Automatically analyze stack traces, identify root causes, and get actionable fix suggestions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)

## Features

- **AI-Powered Analysis**: Claude AI analyzes stack traces to identify root causes and suggest fixes
- **Risk Scoring**: Automatic risk assessment (0-100) based on exception type, heap usage, and context
- **Real-time Metrics**: Monitor JVM heap, threads, GC count with live charts
- **Slack Alerts**: Instant notifications for high-risk incidents (risk > 50)
- **Deduplication**: Redis-based caching prevents duplicate AI calls for similar errors
- **Multi-Tenant**: Secure isolation between customer data
- **ROI Tracking**: Calculate debugging hours saved

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Supabase   │
│   (React)   │     │  (FastAPI)  │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  Redis  │  │  Claude │  │  Slack  │
        │ (Cache) │  │   API   │  │  Alerts │
        └─────────┘  └─────────┘  └─────────┘
```

## Prerequisites

- **Docker** & **Docker Compose** (recommended)
- **Node.js 20+** (for local frontend development)
- **Python 3.11+** (for local backend development)
- **Supabase account** (free tier works)
- **Emergent LLM Key** (for AI analysis)

## Quick Start with Docker

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-org/frameworkguard.git
cd frameworkguard

# Copy environment template
cp .env.example .env
```

### 2. Edit `.env` with your credentials

```env
# Required
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
EMERGENT_LLM_KEY=sk-emergent-your_key

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENTRY_DSN=https://...@sentry.io/...
```

### 3. Set up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor**
3. Run the schema from `backend/database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  password_hash TEXT,
  api_key TEXT UNIQUE DEFAULT ('fg_' || replace(gen_random_uuid()::text, '-', '')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  exception_class TEXT,
  message TEXT,
  stack_trace TEXT,
  risk_score INTEGER,
  status TEXT DEFAULT 'received',
  analysis JSONB,
  heap_used_mb FLOAT,
  thread_count INTEGER,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  heap_used_mb FLOAT,
  heap_max_mb FLOAT,
  thread_count INTEGER,
  gc_count BIGINT,
  jvm_uptime_ms BIGINT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/api/health
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Redis | localhost:6379 |

## Java Agent Integration

Add FrameworkGuard monitoring to your Java application:

### Option 1: SDK Integration (Recommended)

```java
// Add to your exception handler
FrameworkGuardClient client = new FrameworkGuardClient("YOUR_API_KEY");

try {
    // Your code
} catch (Exception e) {
    client.reportException(e, Map.of(
        "heap_used_mb", Runtime.getRuntime().totalMemory() / 1024 / 1024,
        "thread_count", Thread.activeCount()
    ));
    throw e;
}
```

### Option 2: JVM Agent

```bash
java -javaagent:frameworkguard-agent.jar=apiKey=YOUR_API_KEY \
     -jar your-application.jar
```

### Option 3: cURL (for testing)

```bash
# Report an exception
curl -X POST http://localhost:8000/api/exceptions \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "fg_your_api_key_here",
    "exception_class": "java.lang.NullPointerException",
    "message": "Cannot invoke method on null object",
    "stack_trace": "at com.example.Service.process(Service.java:42)",
    "heap_used_mb": 512,
    "thread_count": 48,
    "timestamp": "2024-01-01T12:00:00Z"
  }'

# Report metrics
curl -X POST http://localhost:8000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "fg_your_api_key_here",
    "heap_used_mb": 512,
    "heap_max_mb": 1024,
    "thread_count": 48,
    "gc_count": 125,
    "jvm_uptime_ms": 3600000,
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

## Development

### Local Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --port 8000
```

### Local Frontend Development

```bash
cd frontend

# Install dependencies
yarn install

# Start development server
yarn start
```

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=. --cov-report=html

# Or via Docker
docker-compose exec backend pytest tests/ -v
```

## API Reference

### Authentication

All protected endpoints require an `Authorization` header:

```
Authorization: Bearer <customer_token>
```

For SDK endpoints (`/api/exceptions`, `/api/metrics`), use the `api_key` field in the request body.

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | None |
| POST | `/api/auth/register` | Create account | None |
| POST | `/api/auth/login` | Get auth token | None |
| GET | `/api/auth/me` | Get current user | Bearer |
| POST | `/api/exceptions` | Report exception | API Key |
| GET | `/api/incidents` | List incidents | Bearer |
| GET | `/api/incidents/stats` | Get stats | Bearer |
| PATCH | `/api/incidents/{id}/resolve` | Resolve incident | Bearer |
| POST | `/api/metrics` | Report metrics | API Key |
| GET | `/api/metrics/latest` | Get latest metrics | Bearer |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `EMERGENT_LLM_KEY` | Yes | Emergent LLM key for Claude |
| `REDIS_URL` | No | Redis URL for caching |
| `SLACK_WEBHOOK_URL` | No | Slack webhook for alerts |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |
| `ENV` | No | Environment (development/production) |

## Deployment

### Production Checklist

- [ ] Set `ENV=production` in `.env`
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Set up `SLACK_WEBHOOK_URL` for alerts
- [ ] Use strong passwords and rotate API keys
- [ ] Enable Supabase RLS policies
- [ ] Set up SSL/TLS termination
- [ ] Configure backup for Redis data

### Kubernetes Deployment

Health check endpoints for K8s probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Verify your API key starts with `fg_`
- Check if the key exists in the customers table

**AI analysis not working**
- Check `EMERGENT_LLM_KEY` is configured
- View backend logs: `docker-compose logs backend`

**Redis connection failed**
- Deduplication is optional; app works without Redis
- Check Redis is running: `docker-compose ps redis`

**Database connection issues**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check tables exist in Supabase dashboard

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

Built with ❤️ by the FrameworkGuard Team
