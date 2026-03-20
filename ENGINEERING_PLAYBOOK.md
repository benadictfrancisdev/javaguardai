# FrameworkGuard AI - Engineering Playbook

> Complete guide to test, run, and validate the application in production-like environments.

---

## Table of Contents

1. [Application Setup & Run](#1-application-setup--run)
2. [Testing Strategy](#2-testing-strategy)
3. [Test Execution Workflow](#3-test-execution-workflow)
4. [Alerts & Monitoring System](#4-alerts--monitoring-system)
5. [Settings & Configuration Management](#5-settings--configuration-management)
6. [Debugging & Error Handling](#6-debugging--error-handling)
7. [Final Validation Checklist](#7-final-validation-checklist)

---

## 1. Application Setup & Run

### 1.1 Prerequisites

| Tool | Version | Check Command | Install |
|------|---------|---------------|---------|
| Python | 3.11+ | `python --version` | [python.org](https://python.org) |
| Node.js | 20+ | `node --version` | [nodejs.org](https://nodejs.org) |
| Yarn | 1.22+ | `yarn --version` | `npm install -g yarn` |
| Docker | 24+ | `docker --version` | [docker.com](https://docker.com) |
| Git | 2.40+ | `git --version` | [git-scm.com](https://git-scm.com) |

### 1.2 Clone & Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/frameworkguard.git
cd frameworkguard

# Verify structure
ls -la
# Should see: backend/ frontend/ docker-compose.yml README.md
```

### 1.3 Environment Configuration

#### Backend (.env)

```bash
# Create backend environment file
cp .env.example backend/.env

# Edit with your values
nano backend/.env
```

**Required Variables:**
```env
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# AI (REQUIRED)
EMERGENT_LLM_KEY=sk-emergent-your-key-here

# Optional
REDIS_URL=redis://localhost:6379
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENTRY_DSN=https://xxx@sentry.io/xxx
ENV=development
CORS_ORIGINS=http://localhost:3000
```

#### Frontend (.env)

```bash
# Create frontend environment file
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > frontend/.env
```

### 1.4 Database Setup (Supabase)

```sql
-- Run in Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  password_hash TEXT,
  api_key TEXT UNIQUE DEFAULT ('fg_' || replace(gen_random_uuid()::text, '-', '')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create incidents table
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

-- 3. Create metrics table
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

-- 4. Create indexes
CREATE INDEX idx_incidents_customer ON incidents(customer_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_metrics_customer ON metrics(customer_id);
```

### 1.5 Running Locally

#### Option A: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

#### Option B: Manual Setup

**Terminal 1 - Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend

# Install dependencies
yarn install

# Start dev server
yarn start
```

### 1.6 Verify Setup

```bash
# 1. Check backend health
curl http://localhost:8000/api/health
# Expected: {"status":"healthy","database":"connected",...}

# 2. Check frontend
open http://localhost:3000
# Expected: Login page loads

# 3. Test registration
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","company_name":"Test Co"}'
# Expected: {"token":"...","customer":{...}}
```

### 1.7 Common Setup Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `SUPABASE_URL not found` | Missing .env | `cp .env.example backend/.env` and fill values |
| `Connection refused :8000` | Backend not running | Start backend: `uvicorn main:app --port 8000` |
| `CORS error in browser` | CORS not configured | Add frontend URL to `CORS_ORIGINS` in .env |
| `Table not found` | Database not set up | Run SQL schema in Supabase |
| `Invalid API key` | Wrong Supabase key | Use service_role key, not anon key |
| `Module not found` | Dependencies missing | `pip install -r requirements.txt` |
| `yarn: command not found` | Yarn not installed | `npm install -g yarn` |

---

## 2. Testing Strategy

### 2.1 Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │  ← Fewest (slow, expensive)
                   ─┴─────────────┴─
                  ┌─────────────────┐
                  │Integration Tests│  ← Medium
                 ─┴─────────────────┴─
                ┌───────────────────────┐
                │     Unit Tests        │  ← Most (fast, cheap)
                └───────────────────────┘
```

### 2.2 Unit Tests

**What:** Test individual functions/components in isolation.

**Location:** `backend/tests/`

**Framework:** pytest

#### Sample Unit Tests

**test_risk_scorer.py:**
```python
import pytest
from services.risk_scorer import enhance_risk_score, get_risk_level

class TestEnhanceRiskScore:
    """Unit tests for risk scoring logic."""
    
    def test_base_score_unchanged_when_no_rules_match(self):
        """Base score returns unchanged when no enhancement rules apply."""
        result = enhance_risk_score(
            base_score=50,
            exception_class='java.lang.RuntimeException',
            heap_used_percent=50,
            stack_trace='at com.example.Test.run(Test.java:10)'
        )
        assert result == 50
    
    def test_heap_above_80_adds_20_points(self):
        """Heap usage above 80% adds 20 points."""
        result = enhance_risk_score(
            base_score=50,
            exception_class='java.lang.RuntimeException',
            heap_used_percent=85,
            stack_trace=''
        )
        assert result == 70  # 50 + 20
    
    def test_outofmemoryerror_minimum_85(self):
        """OutOfMemoryError has minimum score of 85."""
        result = enhance_risk_score(
            base_score=20,
            exception_class='java.lang.OutOfMemoryError',
            heap_used_percent=50,
            stack_trace=''
        )
        assert result >= 85
    
    def test_score_capped_at_100(self):
        """Score never exceeds 100."""
        result = enhance_risk_score(
            base_score=95,
            exception_class='java.lang.OutOfMemoryError',
            heap_used_percent=90,
            stack_trace='PaymentController'
        )
        assert result <= 100

class TestGetRiskLevel:
    """Unit tests for risk level labeling."""
    
    @pytest.mark.parametrize("score,expected", [
        (0, "LOW"),
        (29, "LOW"),
        (30, "MEDIUM"),
        (59, "MEDIUM"),
        (60, "HIGH"),
        (84, "HIGH"),
        (85, "CRITICAL"),
        (100, "CRITICAL"),
    ])
    def test_risk_levels(self, score, expected):
        assert get_risk_level(score) == expected
```

**test_http_sender.py:**
```python
import pytest
from ai.frameworkguard import HttpSender

class TestJsonEscape:
    """Unit tests for JSON string escaping."""
    
    def test_escapes_quotes(self):
        assert HttpSender.escapeJson('say "hello"') == 'say \\"hello\\"'
    
    def test_escapes_newlines(self):
        assert HttpSender.escapeJson('line1\nline2') == 'line1\\nline2'
    
    def test_handles_null(self):
        assert HttpSender.escapeJson(None) == ''
```

### 2.3 Integration Tests

**What:** Test multiple components working together (API endpoints, database).

**Location:** `backend/tests/test_*_router.py`

**Framework:** pytest + httpx

#### Sample Integration Tests

**test_incidents_integration.py:**
```python
import pytest
from fastapi.testclient import TestClient
from main import app

class TestIncidentsAPI:
    """Integration tests for incidents endpoints."""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self, client):
        # Register and get token
        response = client.post('/api/auth/register', json={
            'email': f'test_{uuid.uuid4()}@example.com',
            'password': 'testpass123',
            'company_name': 'Integration Test Co'
        })
        token = response.json()['token']
        return {'Authorization': f'Bearer {token}'}
    
    def test_create_and_retrieve_incident(self, client, auth_headers):
        """Full flow: create incident, then retrieve it."""
        # Get API key
        me = client.get('/api/auth/me', headers=auth_headers)
        api_key = me.json()['api_key']
        
        # Create incident
        create_response = client.post('/api/exceptions', json={
            'api_key': api_key,
            'exception_class': 'java.lang.NullPointerException',
            'message': 'Test integration',
            'stack_trace': 'at Test.main(Test.java:10)',
            'heap_used_mb': 512,
            'thread_count': 10
        })
        assert create_response.status_code == 200
        incident_id = create_response.json()['incident_id']
        
        # Retrieve incidents
        list_response = client.get('/api/incidents', headers=auth_headers)
        assert list_response.status_code == 200
        incidents = list_response.json()['incidents']
        assert any(i['id'] == incident_id for i in incidents)
    
    def test_multi_tenant_isolation(self, client):
        """Verify customers can't see each other's data."""
        # Create two customers
        customer1 = client.post('/api/auth/register', json={
            'email': f'user1_{uuid.uuid4()}@test.com',
            'password': 'pass1',
            'company_name': 'Company 1'
        }).json()
        
        customer2 = client.post('/api/auth/register', json={
            'email': f'user2_{uuid.uuid4()}@test.com',
            'password': 'pass2',
            'company_name': 'Company 2'
        }).json()
        
        # Customer 1 creates incident
        client.post('/api/exceptions', json={
            'api_key': customer1['customer']['api_key'],
            'exception_class': 'Customer1Exception',
            'message': 'Private data',
            'stack_trace': 'secret'
        })
        
        # Customer 2 should NOT see Customer 1's incident
        headers2 = {'Authorization': f'Bearer {customer2["token"]}'}
        incidents = client.get('/api/incidents', headers=headers2).json()
        
        for incident in incidents['incidents']:
            assert 'Customer1Exception' not in incident['exception_class']
```

### 2.4 End-to-End (E2E) Tests

**What:** Test complete user flows through the browser.

**Location:** `tests/e2e/`

**Framework:** Playwright

#### Sample E2E Tests

**test_user_flow.py:**
```python
import pytest
from playwright.sync_api import Page, expect

class TestUserFlow:
    """E2E tests for complete user journeys."""
    
    @pytest.fixture
    def page(self, browser):
        page = browser.new_page()
        yield page
        page.close()
    
    def test_registration_to_dashboard(self, page: Page):
        """User can register and see dashboard."""
        # Go to login page
        page.goto('http://localhost:3000/login')
        
        # Click register tab
        page.click('[data-testid="toggle-auth-mode"]')
        
        # Fill registration form
        page.fill('[data-testid="company-input"]', 'E2E Test Company')
        page.fill('[data-testid="email-input"]', f'e2e_{int(time.time())}@test.com')
        page.fill('[data-testid="password-input"]', 'testpass123')
        
        # Submit
        page.click('[data-testid="submit-btn"]')
        
        # Should redirect to dashboard
        page.wait_for_url('**/dashboard')
        expect(page.locator('[data-testid="dashboard-page"]')).to_be_visible()
    
    def test_incident_resolution_flow(self, page: Page, auth_token):
        """User can view and resolve an incident."""
        # Set auth
        page.evaluate(f'localStorage.setItem("fg_token", "{auth_token}")')
        
        # Go to incidents
        page.goto('http://localhost:3000/incidents')
        page.wait_for_selector('[data-testid="incidents-page"]')
        
        # Click first incident
        page.click('[data-testid^="view-incident-"]')
        
        # Side panel should open
        expect(page.locator('[data-testid="close-panel"]')).to_be_visible()
        
        # Click resolve
        page.click('[data-testid="resolve-btn"]')
        
        # Status should change
        page.wait_for_timeout(1000)
        expect(page.locator('text=resolved')).to_be_visible()
```

### 2.5 Test Coverage Goals

| Test Type | Coverage Target | Priority |
|-----------|-----------------|----------|
| Unit Tests | 80%+ | P0 |
| Integration Tests | 60%+ | P1 |
| E2E Tests | Critical paths | P1 |

---

## 3. Test Execution Workflow

### 3.1 Running Tests Locally

#### All Backend Tests
```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run specific file
pytest tests/test_risk_scorer.py -v

# Run specific test
pytest tests/test_risk_scorer.py::TestEnhanceRiskScore::test_heap_above_80_adds_20_points -v

# Run tests matching pattern
pytest tests/ -k "risk" -v
```

#### Frontend Tests
```bash
cd frontend

# Run Jest tests
yarn test

# Run with coverage
yarn test --coverage

# Run in watch mode (for development)
yarn test --watch
```

#### E2E Tests
```bash
# Install Playwright
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

### 3.2 CI/CD Integration

**.github/workflows/test.yml:**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio
      
      - name: Run unit tests
        run: |
          cd backend
          pytest tests/ -v --cov=. --cov-report=xml
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
          cache-dependency-path: frontend/yarn.lock
      
      - name: Install dependencies
        run: |
          cd frontend
          yarn install --frozen-lockfile
      
      - name: Run tests
        run: |
          cd frontend
          yarn test --coverage --watchAll=false

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:8000/api/health; do sleep 2; done'
      
      - name: Run Playwright tests
        run: npx playwright test
      
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### 3.3 Interpreting Test Results

#### Pytest Output
```
tests/test_risk_scorer.py::TestEnhanceRiskScore::test_base_score PASSED  [20%]
tests/test_risk_scorer.py::TestEnhanceRiskScore::test_heap_adds_20 PASSED  [40%]
tests/test_risk_scorer.py::TestEnhanceRiskScore::test_oom_minimum FAILED  [60%]
```

**Interpreting:**
- `PASSED` ✅ - Test succeeded
- `FAILED` ❌ - Assertion failed (bug found)
- `ERROR` 💥 - Test code crashed (fixture/setup issue)
- `SKIPPED` ⏭️ - Test was skipped (usually intentional)

#### Coverage Report
```
Name                    Stmts   Miss  Cover
-------------------------------------------
services/risk_scorer.py    45      3    93%
services/ai_engine.py     120     25    79%
routers/incidents.py       89     12    87%
-------------------------------------------
TOTAL                     254     40    84%
```

**Target:** Aim for >80% overall, >90% for critical paths.

### 3.4 Test Reports Location

| Report | Location | Command |
|--------|----------|---------|
| pytest HTML | `backend/htmlcov/index.html` | `pytest --cov-report=html` |
| Jest coverage | `frontend/coverage/lcov-report/index.html` | `yarn test --coverage` |
| Playwright | `playwright-report/index.html` | `npx playwright show-report` |

---

## 4. Alerts & Monitoring System

### 4.1 Application Monitoring Stack

```
┌──────────────────────────────────────────────────────────┐
│                     Monitoring Stack                      │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Sentry  │  │ Railway │  │  Slack  │  │ Custom  │     │
│  │ Errors  │  │  Logs   │  │ Alerts  │  │ Health  │     │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │            │           │
│       └────────────┴─────┬──────┴────────────┘           │
│                          │                               │
│              ┌───────────▼───────────┐                   │
│              │   FrameworkGuard AI   │                   │
│              │      Application      │                   │
│              └───────────────────────┘                   │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Error Tracking (Sentry)

**Setup:**
```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=os.environ.get('ENV', 'development')
)
```

**Alert Configuration (in Sentry Dashboard):**

| Alert | Condition | Action |
|-------|-----------|--------|
| New Error | First occurrence of error | Slack + Email |
| Error Spike | >10 errors in 5 min | Slack + PagerDuty |
| Unhandled Exception | Any unhandled exception | Slack |

### 4.3 Slack Alerts Configuration

**Setup Slack Webhook:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create app → "Incoming Webhooks"
3. Add to channel → Copy webhook URL
4. Add to `.env`: `SLACK_WEBHOOK_URL=https://hooks.slack.com/...`

**Alert Types:**

```python
# backend/services/alerts.py

# High-risk incident alert (automatic)
async def send_slack_alert(incident_id):
    """Sends alert when risk_score > 50"""
    payload = {
        "text": f"🔴 HIGH RISK INCIDENT",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": f"Risk: {risk_score}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Exception:* {exception_class}"}},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Root Cause:* {root_cause}"}}
        ]
    }
```

### 4.4 Health Check Monitoring

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "claude_api": "available",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**External Monitor Setup (UptimeRobot):**
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: HTTP(s) → `https://your-app.railway.app/api/health`
3. Interval: 5 minutes
4. Alert contacts: Email, Slack

### 4.5 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Response Time | >500ms | >2000ms | Scale up / Investigate |
| Error Rate | >1% | >5% | Investigate immediately |
| Memory Usage | >70% | >90% | Restart / Scale |
| Database Connections | >80% pool | >95% pool | Increase pool size |
| Health Check | 1 failure | 3 consecutive | Auto-restart |

### 4.6 Escalation Flow

```
Level 1 (Automatic):
  → Slack #alerts channel
  → Wait 15 minutes

Level 2 (If unresolved):
  → Page on-call engineer
  → Email team lead

Level 3 (If critical):
  → Phone call to on-call
  → Notify management
```

---

## 5. Settings & Configuration Management

### 5.1 Environment Structure

```
environments/
├── development.env    # Local development
├── staging.env        # Staging/QA
├── production.env     # Production
└── .env.example       # Template
```

### 5.2 Configuration Hierarchy

```
Priority (highest to lowest):
1. Environment variables (runtime)
2. .env file
3. Default values in code
```

### 5.3 Environment-Specific Settings

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `ENV` | development | staging | production |
| `DEBUG` | true | true | false |
| `LOG_LEVEL` | DEBUG | INFO | WARNING |
| `CORS_ORIGINS` | * | staging-url | production-url |
| `SENTRY_DSN` | (empty) | staging-dsn | production-dsn |
| `REDIS_URL` | localhost | staging-redis | production-redis |

### 5.4 Feature Flags

```python
# backend/core/features.py

class FeatureFlags:
    """Simple feature flag system."""
    
    # Define flags with defaults
    FLAGS = {
        'AI_ANALYSIS_ENABLED': True,
        'SLACK_ALERTS_ENABLED': True,
        'DEDUPLICATION_ENABLED': True,
        'NEW_DASHBOARD_UI': False,  # Gradual rollout
    }
    
    @classmethod
    def is_enabled(cls, flag_name: str) -> bool:
        # Check environment variable first
        env_value = os.environ.get(f'FF_{flag_name}')
        if env_value is not None:
            return env_value.lower() == 'true'
        return cls.FLAGS.get(flag_name, False)

# Usage
if FeatureFlags.is_enabled('AI_ANALYSIS_ENABLED'):
    await analyse_incident(incident_id)
```

### 5.5 Secrets Management

**DO:**
- Store secrets in environment variables
- Use Railway/Vercel secrets management
- Rotate keys regularly
- Use different keys per environment

**DON'T:**
- Commit secrets to git
- Log secrets
- Share production keys
- Use same keys across environments

### 5.6 Configuration Validation

```python
# backend/core/config.py

from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    EMERGENT_LLM_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    ENV: str = "development"
    
    @validator('SUPABASE_URL')
    def validate_supabase_url(cls, v):
        if not v.startswith('https://'):
            raise ValueError('SUPABASE_URL must be HTTPS')
        return v
    
    @validator('EMERGENT_LLM_KEY')
    def validate_llm_key(cls, v):
        if not v.startswith('sk-'):
            raise ValueError('Invalid LLM key format')
        return v
    
    class Config:
        env_file = '.env'

# Validate on startup
settings = Settings()
```

---

## 6. Debugging & Error Handling

### 6.1 Common Errors & Fixes

#### Backend Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid/missing token | Check Authorization header format |
| `404 Not Found` | Wrong endpoint or ID | Verify URL and resource exists |
| `422 Validation Error` | Invalid request body | Check request JSON schema |
| `500 Internal Server Error` | Unhandled exception | Check backend logs |
| `CORS Error` | Missing CORS config | Add frontend URL to CORS_ORIGINS |
| `Connection refused` | Service not running | Start backend/database |

#### Database Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `relation does not exist` | Table missing | Run schema SQL in Supabase |
| `duplicate key violation` | Unique constraint | Check for existing record |
| `foreign key violation` | Invalid reference | Verify parent record exists |
| `connection timeout` | Network/firewall | Check Supabase URL and key |

#### Frontend Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Network Error` | Backend unreachable | Check REACT_APP_BACKEND_URL |
| `JSON parse error` | Invalid API response | Check backend logs |
| `undefined is not an object` | Null data access | Add null checks |
| `Module not found` | Missing import | Run `yarn install` |

### 6.2 Logging Strategy

#### Log Levels

```python
import logging

# DEBUG - Detailed debugging info
logger.debug(f"Processing incident {incident_id}")

# INFO - Normal operations
logger.info(f"Incident {incident_id} analysed, risk={risk_score}")

# WARNING - Unexpected but handled
logger.warning(f"Redis unavailable, skipping cache")

# ERROR - Failures requiring attention
logger.error(f"Failed to analyse incident: {e}")

# CRITICAL - System failures
logger.critical(f"Database connection lost")
```

#### Structured Logging

```python
# backend/core/logging.py
import json
import logging

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, 'customer_id'):
            log_data['customer_id'] = record.customer_id
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data)
```

### 6.3 Debugging Tools

#### Backend Debugging

```bash
# View live logs
docker-compose logs -f backend

# Check specific error
docker-compose logs backend 2>&1 | grep ERROR

# Interactive debugging
python -c "
import pdb
from main import app
# Set breakpoints and debug
"

# Test single endpoint
curl -v http://localhost:8000/api/health
```

#### Frontend Debugging

```javascript
// Browser console
localStorage.getItem('fg_token')  // Check auth token
console.log(process.env.REACT_APP_BACKEND_URL)  // Check API URL

// React DevTools
// Install: Chrome extension "React Developer Tools"
// Inspect component state and props

// Network tab
// Check API requests/responses in DevTools > Network
```

### 6.4 Tracing Issues in Production

#### Step 1: Identify the Error
```bash
# Check Sentry for error details
# Or check Railway logs
railway logs --tail 100
```

#### Step 2: Find the Request
```python
# Each request logs:
# REQUEST | customer_id=xxx | endpoint=/api/incidents | status=500

# Search logs by customer
grep "customer_id=abc123" /var/log/app.log
```

#### Step 3: Reproduce Locally
```bash
# Copy the request
curl -X POST http://localhost:8000/api/incidents/exceptions \
  -H "Content-Type: application/json" \
  -d '{"api_key":"...", ...}'  # Same payload as production
```

#### Step 4: Fix and Verify
```bash
# Make fix
# Run tests
pytest tests/ -v

# Deploy to staging first
git push staging

# Verify in staging
curl https://staging.example.com/api/health
```

---

## 7. Final Validation Checklist

### 7.1 Pre-Deployment Checklist

#### Code Quality
- [ ] All tests passing (`pytest tests/ -v`)
- [ ] No linting errors (`ruff check .`)
- [ ] Code reviewed and approved
- [ ] No TODO/FIXME in critical paths
- [ ] Documentation updated

#### Security
- [ ] No secrets in code or git history
- [ ] All inputs validated
- [ ] SQL injection protected (using ORM)
- [ ] XSS protected (React escapes by default)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Authentication on all protected routes
- [ ] Multi-tenant isolation verified

#### Performance
- [ ] Database queries optimized (check N+1)
- [ ] Indexes on frequently queried columns
- [ ] API response time <500ms (p95)
- [ ] No memory leaks (check heap over time)
- [ ] Static assets compressed/cached

#### Reliability
- [ ] Health check endpoint working
- [ ] Graceful shutdown implemented
- [ ] Error handling for all external calls
- [ ] Retry logic for transient failures
- [ ] Circuit breaker for AI API

### 7.2 Deployment Checklist

#### Environment
- [ ] All environment variables set
- [ ] Secrets rotated from staging
- [ ] Database migrated/schema updated
- [ ] Redis/cache cleared if needed

#### Monitoring
- [ ] Sentry configured and tested
- [ ] Health check monitor active
- [ ] Slack alerts configured
- [ ] Log aggregation working

#### Rollback Plan
- [ ] Previous version tagged
- [ ] Rollback command documented
- [ ] Database rollback script ready (if migrations)

### 7.3 Post-Deployment Validation

```bash
# 1. Health check
curl https://production.example.com/api/health
# Expected: {"status":"healthy",...}

# 2. Smoke test - Registration
curl -X POST https://production.example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke-test@example.com","password":"test123","company_name":"Smoke Test"}'
# Expected: 200 OK with token

# 3. Smoke test - Exception reporting
curl -X POST https://production.example.com/api/exceptions \
  -H "Content-Type: application/json" \
  -d '{"api_key":"API_KEY","exception_class":"SmokeTest","message":"test","stack_trace":"at Test.java:1"}'
# Expected: 200 OK with incident_id

# 4. Check Sentry for new errors
# Should be clean (no new errors)

# 5. Check metrics dashboard
# Response times should be normal
```

### 7.4 Validation Sign-Off

| Area | Validated By | Date | Status |
|------|--------------|------|--------|
| Functional Testing | | | ☐ |
| Security Review | | | ☐ |
| Performance Testing | | | ☐ |
| Monitoring Setup | | | ☐ |
| Documentation | | | ☐ |
| Rollback Tested | | | ☐ |

---

## Quick Reference

### Essential Commands

```bash
# Start everything
docker-compose up -d

# Run tests
cd backend && pytest tests/ -v

# Check logs
docker-compose logs -f backend

# Deploy
git push origin main  # CI/CD handles the rest

# Rollback
git revert HEAD && git push origin main
```

### Key URLs

| Service | Local | Production |
|---------|-------|------------|
| Frontend | http://localhost:3000 | https://your-app.pages.dev |
| Backend | http://localhost:8000 | https://your-app.railway.app |
| API Docs | http://localhost:8000/docs | https://your-app.railway.app/docs |
| Health | http://localhost:8000/api/health | https://your-app.railway.app/api/health |

### Emergency Contacts

| Issue | Contact | Method |
|-------|---------|--------|
| Production Down | On-Call Engineer | PagerDuty |
| Security Incident | Security Team | security@company.com |
| Customer Escalation | Support Lead | Slack #support |

---

*Last updated: March 2026*
