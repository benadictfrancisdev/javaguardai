# Java AI – Intelligent Debugging & Code Analysis Platform

A production-ready SaaS application that allows users to paste or upload Java code to receive AI-powered error detection, explanations, and code fixes.

![Architecture](https://img.shields.io/badge/Architecture-Fullstack-blue) ![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green) ![React](https://img.shields.io/badge/Frontend-React%20%2F%20Tailwind-cyan) ![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue) ![AI](https://img.shields.io/badge/AI-Gemini%20API-purple)

## Features

- **VS Code-like Editor** — Monaco Editor with syntax highlighting, error markers, and dark theme
- **AI-Powered Debugging** — Error explanation, code fixes, and optimization suggestions via Gemini API
- **Secure Java Sandbox** — Isolated Java compilation and execution with timeout and memory limits
- **Real-time Feedback** — Instant compilation/runtime output with error parsing
- **User Dashboard** — Error statistics, activity charts, resolution rates, and submission history
- **JWT Authentication** — Secure register/login with token refresh
- **Project Management** — Organize code snippets into projects
- **Smart Caching** — Repeated AI queries served from cache to reduce token usage
- **Input Validation** — Sanitization of dangerous Java patterns (Runtime.exec, ProcessBuilder, etc.)

## System Architecture

```
┌────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   React Frontend│────▶│  Node.js/Express API │────▶│  PostgreSQL  │
│ Monaco Editor   │     │  JWT Auth + Routes   │     │  5 Tables    │
│ Tailwind CSS    │◀────│  Rate Limiting       │◀────│              │
└────────────────┘     └──────┬──────┬────────┘     └──────────────┘
                              │      │
                    ┌─────────┘      └─────────┐
                    ▼                           ▼
             ┌─────────────┐          ┌─────────────────┐
             │ Java Sandbox │          │ AI Service       │
             │ javac + java │          │ Gemini/OpenAI    │
             │ Temp dirs    │          │ Structured prompts│
             │ Timeout guard│          │ Cache layer      │
             └─────────────┘          └─────────────────┘
```

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, Tailwind CSS, Monaco Editor, Recharts |
| Backend   | Node.js, Express.js, Sequelize ORM  |
| Database  | PostgreSQL 16                       |
| AI        | OpenAI-compatible API (Gemini 2.0 Flash) |
| Auth      | JWT (access + refresh tokens)       |
| Security  | Helmet, CORS, Rate Limiting, Input Sanitization |

## Database Schema

| Table          | Description                    |
|----------------|--------------------------------|
| `users`        | User accounts with stats       |
| `projects`     | Code organization              |
| `code_snippets`| Submitted code + execution results |
| `error_logs`   | Parsed compilation/runtime errors |
| `ai_responses` | AI analysis results + metadata |

## Prerequisites

- **Node.js** >= 18
- **Docker** (for PostgreSQL) or local PostgreSQL
- **Java JDK** >= 11 (for sandbox execution)
- **AI API Key** (Gemini or OpenAI-compatible)

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/benadictfrancisdev/javaguardai.git
cd javaguardai/platform
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set your AI_API_KEY
npm install
```

### 4. Start Backend

```bash
npm run dev
# Server runs on http://localhost:8000
```

### 5. Configure & Start Frontend

```bash
cd ../frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### 6. Open the App

Navigate to `http://localhost:5173`, register an account, and start analyzing Java code!

## API Endpoints

### Authentication

| Method | Endpoint             | Description          | Auth |
|--------|----------------------|----------------------|------|
| POST   | `/api/auth/register` | Register new user    | No   |
| POST   | `/api/auth/login`    | Login                | No   |
| POST   | `/api/auth/refresh`  | Refresh JWT token    | No   |
| GET    | `/api/auth/me`       | Get current user     | Yes  |
| PUT    | `/api/auth/profile`  | Update profile       | Yes  |

### Code Analysis

| Method | Endpoint                  | Description              | Auth |
|--------|---------------------------|--------------------------|------|
| POST   | `/api/code/submit`        | Submit code for analysis | Yes  |
| POST   | `/api/code/upload`        | Upload .java file        | Yes  |
| GET    | `/api/code/snippets`      | List user's snippets     | Yes  |
| GET    | `/api/code/snippets/:id`  | Get snippet details      | Yes  |
| POST   | `/api/code/:id/fix`       | Get AI fix for snippet   | Yes  |
| POST   | `/api/code/:id/optimize`  | Optimize code            | Yes  |
| POST   | `/api/code/:id/apply-fix` | Apply fix & re-execute   | Yes  |

### Projects

| Method | Endpoint             | Description        | Auth |
|--------|----------------------|--------------------|------|
| GET    | `/api/projects`      | List projects      | Yes  |
| POST   | `/api/projects`      | Create project     | Yes  |
| GET    | `/api/projects/:id`  | Get project detail | Yes  |
| PUT    | `/api/projects/:id`  | Update project     | Yes  |
| DELETE | `/api/projects/:id`  | Archive project    | Yes  |

### Dashboard

| Method | Endpoint                     | Description           | Auth |
|--------|------------------------------|-----------------------|------|
| GET    | `/api/dashboard/stats`       | User statistics       | Yes  |
| GET    | `/api/dashboard/recent-errors` | Recent error logs   | Yes  |
| GET    | `/api/dashboard/ai-history`  | AI analysis history   | Yes  |

### Health

| Method | Endpoint       | Description   | Auth |
|--------|----------------|---------------|------|
| GET    | `/api/health`  | Health check  | No   |

## Environment Variables

### Backend (`platform/backend/.env`)

| Variable               | Description                     | Default                      |
|------------------------|---------------------------------|------------------------------|
| `PORT`                 | Server port                     | `8000`                       |
| `NODE_ENV`             | Environment                     | `development`                |
| `DB_HOST`              | PostgreSQL host                 | `localhost`                  |
| `DB_PORT`              | PostgreSQL port                 | `5432`                       |
| `DB_NAME`              | Database name                   | `java_ai_platform`           |
| `DB_USER`              | Database user                   | `postgres`                   |
| `DB_PASSWORD`          | Database password               | `postgres`                   |
| `JWT_SECRET`           | JWT signing secret              | —                            |
| `JWT_EXPIRES_IN`       | Access token expiry             | `24h`                        |
| `JWT_REFRESH_SECRET`   | Refresh token secret            | —                            |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token expiry           | `7d`                         |
| `AI_API_KEY`           | AI API key (Gemini/OpenAI)      | —                            |
| `AI_BASE_URL`          | AI API base URL                 | Gemini endpoint              |
| `AI_MODEL`             | AI model name                   | `gemini-2.0-flash`           |
| `JAVA_EXECUTION_TIMEOUT`| Java execution timeout (ms)   | `10000`                      |
| `JAVA_MAX_MEMORY`      | Java max heap memory            | `256m`                       |
| `CACHE_TTL`            | Cache time-to-live (seconds)    | `3600`                       |
| `CORS_ORIGIN`          | Allowed CORS origin             | `*`                          |

### Frontend (`platform/frontend/.env`)

| Variable        | Description      | Default                |
|-----------------|------------------|------------------------|
| `VITE_API_URL`  | Backend API URL  | `http://localhost:8000` |

## Security Features

- **Input Sanitization** — Blocks dangerous Java patterns (Runtime.exec, ProcessBuilder, file I/O, networking, reflection)
- **Sandbox Execution** — Temp directory per execution, automatic cleanup, timeout enforcement
- **Rate Limiting** — 100 req/15min general, 10 req/min for AI endpoints
- **JWT Authentication** — Access + refresh token flow with automatic refresh
- **Helmet** — HTTP security headers
- **CORS** — Configurable origin restriction

## Project Structure

```
platform/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & app configuration
│   │   ├── middleware/      # Auth & validation middleware
│   │   ├── models/          # Sequelize models (5 tables)
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # AI, Java executor, cache services
│   │   └── index.js         # Express server entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (editor, panels, auth, layout)
│   │   ├── context/         # React context (auth)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Root component with routing
│   ├── .env
│   └── package.json
├── docker-compose.yml       # PostgreSQL setup
└── README.md
```

## License

MIT
