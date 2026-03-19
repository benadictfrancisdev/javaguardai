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
