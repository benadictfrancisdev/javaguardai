# JavaGuard AI — Local Development Guide

## Quick Start (One Command)

```bash
bash start.sh
```

This starts:
- **Backend** → http://localhost:8000
- **Frontend** → http://localhost:3000
- **API Docs** → http://localhost:8000/docs

---

## Manual Start

### Backend
```bash
cd backend
pip install -r requirements.txt anthropic
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## Environment Variables

### backend/.env (already configured)
```
EMERGENT_LLM_KEY=sk-emergent-cFf20886f2eF22cB69
OPENAI_API_KEY=sk-emergent-cFf20886f2eF22cB69
OPENAI_BASE_URL=https://api.emergent.sh/v1
AI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:///./javaguard.db
INGESTION_API_KEY=jg-test-key-123
```

### frontend/.env (already configured)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## API Endpoints

| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| GET | `/health` | Health check | None |
| GET | `/` | App info | None |
| GET | `/dashboard` | Error stats + recent errors | None |
| POST | `/fix` | AI-analyze a Java error | None |
| POST | `/error` | Ingest error (SDK use) | X-API-Key header |
| GET | `/errors/{id}` | Get error + analysis | None |

### Example — Fix an error
```bash
curl -X POST http://localhost:8000/fix \
  -H "Content-Type: application/json" \
  -d '{"input": "java.lang.NullPointerException: Cannot invoke String.length()"}'
```

### Example — Ingest from Java SDK
```bash
curl -X POST http://localhost:8000/error \
  -H "Content-Type: application/json" \
  -H "X-API-Key: jg-test-key-123" \
  -d '{"error": "java.lang.NullPointerException...", "service": "payment-service"}'
```

---

## AI Engine

The AI engine tries in this order:
1. **Emergent API** (`api.emergent.sh`) — uses your `sk-emergent-...` key
2. **Anthropic Claude** — if `ANTHROPIC_API_KEY` is set in environment
3. **Smart Mock** — realistic structured fallback for local dev

The mock gives accurate, actionable responses for:
- NullPointerException
- ClassCastException  
- StackOverflowError
- ArrayIndexOutOfBoundsException
- All other exceptions (generic but helpful)

---

## Production (Railway)

Set these env vars in Railway:
```
EMERGENT_LLM_KEY=sk-emergent-cFf20886f2eF22cB69
OPENAI_API_KEY=sk-emergent-cFf20886f2eF22cB69
OPENAI_BASE_URL=https://api.emergent.sh/v1
AI_MODEL=gpt-4o-mini
DATABASE_URL=<your postgres url from railway>
INGESTION_API_KEY=<change this in production>
CORS_ORIGINS=https://your-frontend-domain.com
ENV=production
```
