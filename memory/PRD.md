# FrameworkGuard AI - Product Requirements Document

## Original Problem Statement
Build a full-stack AI production monitoring app called FrameworkGuard AI with:
- Backend: Python FastAPI + Supabase + Celery + Redis
- Frontend: React + Tailwind CSS + Recharts
- Auth: Supabase Auth
- AI: Anthropic Claude API (claude-sonnet-4-20250514)

## User Personas
1. **DevOps Engineer** - Monitors production Java applications, needs quick incident resolution
2. **Java Developer** - Debugs application errors, needs root cause analysis
3. **SRE** - Tracks system health metrics, needs proactive alerting

## Core Requirements (Static)
- Exception reporting via API key authentication
- AI-powered stack trace analysis with risk scoring
- Real-time JVM metrics visualization (heap, threads, GC)
- Incident management with resolution workflow
- ROI tracking for debugging time saved

## What's Been Implemented (March 2026)

### Backend
- FastAPI server with `/api` prefix routing
- Supabase integration for customers, incidents, metrics tables
- Authentication system (register/login with API keys)
- Claude AI integration via Emergent LLM Key for stack trace analysis
- Risk scoring with enhancement rules (OOM, NPE, heap thresholds)
- Background task processing for AI analysis

### Frontend
- Dark theme (#0A0D13 background, #00E5A0 green accent)
- Login/Register flow with form validation
- Dashboard with stats cards, heap gauge, metrics chart
- Incidents list with search, filtering, side panel details
- Stack Trace Analyzer for manual testing
- Alerts & Settings with Slack webhook and ROI calculator
- Responsive sidebar navigation

### Database Schema
- `customers` - User accounts with API keys
- `incidents` - Exception reports with AI analysis
- `metrics` - JVM performance metrics

## Prioritized Backlog

### P0 (Critical)
- [x] User authentication
- [x] Exception reporting API
- [x] AI analysis integration
- [x] Dashboard visualization

### P1 (Important)
- [ ] Real Celery/Redis for production
- [ ] Supabase Auth JWT integration
- [ ] Email notifications
- [ ] Incident trending/patterns

### P2 (Nice to Have)
- [ ] Multi-service support
- [ ] Custom alerting rules
- [ ] Team management
- [ ] Export/reporting

## Next Tasks
1. Add Sentry error tracking to backend
2. Implement proper password hashing (bcrypt)
3. Add email alerts for critical incidents
4. Build Java SDK for easy integration

## Update: March 2026 - Feature Additions

### New Features Implemented

#### 1. Slack Alerts Service (`backend/services/alerts.py`)
- `send_slack_alert(incident_id)` function
- Rich Slack message with blocks: header (risk score), business impact, root cause, fix suggestion
- Only fires if `risk_score > 50`
- Requires `SLACK_WEBHOOK_URL` environment variable
- Gracefully handles missing webhook configuration

#### 2. Deduplication (`backend/services/ai_engine.py`)
- Computes `dedup_key` from `hash(exception_class + file_name:line_number)`
- Redis cache: `GET dedup:{customer_id}:{dedup_key}`
- Cache TTL: 600 seconds (10 minutes)
- Logs "CACHE HIT — skipped Claude call" or "CACHE MISS — calling Claude"
- Gracefully disabled when Redis unavailable

#### 3. Multi-Tenant Security (all routers)
- All Supabase queries include `.eq('customer_id', current_customer.id)` filter
- Defense in depth - double-checks customer_id after query
- Request logging middleware: logs customer_id, endpoint, timestamp, response_code
- No customer can access another customer's data

#### 4. Incident Stats Endpoint (`GET /api/incidents/stats`)
- Returns: `{total_today, total_week, critical_count, avg_risk_score, hours_saved_estimate}`
- `hours_saved_estimate = total_incidents * 2`

### Testing & CI/CD

#### Unit Tests (`backend/tests/`)
- `test_risk_scorer.py` - 9 tests for risk scoring logic
- `test_incidents_router.py` - 6 tests for incidents endpoints
- `test_metrics_router.py` - 6 tests for metrics endpoints
- All tests pass: 21/21

#### GitHub Actions (`.github/workflows/test.yml`)
- Triggers on push to main and PRs
- Python 3.11, pytest with coverage
- Linting with ruff

### Monitoring

#### Sentry Integration (`backend/main.py`)
- `sentry_sdk.init()` with FastAPI integration
- `traces_sample_rate=0.1` (10% sampling)
- `before_send` filter: redacts emails and phone numbers
- Environment tag: `development` or `production`
