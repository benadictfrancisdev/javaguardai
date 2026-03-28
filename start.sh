#!/bin/bash
# JavaGuard AI — Start Script
# Runs backend + frontend together

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       JavaGuard AI — Starting        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Backend ──────────────────────────────────────────
echo "▶ Starting Backend (FastAPI)..."

cd "$BACKEND"

# Install Python deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "  Installing Python dependencies..."
  pip install -r requirements.txt anthropic --quiet
fi

# Start backend in background
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "  Waiting for backend..."
for i in {1..20}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ Backend ready at http://localhost:8000"
    break
  fi
  sleep 1
done

# ── Frontend ─────────────────────────────────────────
echo ""
echo "▶ Starting Frontend (React)..."

cd "$FRONTEND"

# Install node deps if needed
if [ ! -d "node_modules" ]; then
  echo "  Installing Node dependencies..."
  npm install --legacy-peer-deps --silent
fi

echo "  ✅ Frontend starting at http://localhost:3000"
echo ""
echo "════════════════════════════════════════"
echo "  🚀 JavaGuard AI is running!"
echo "  Frontend  → http://localhost:3000"
echo "  Backend   → http://localhost:8000"
echo "  API Docs  → http://localhost:8000/docs"
echo "  Dashboard → http://localhost:8000/dashboard"
echo "════════════════════════════════════════"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C to kill both
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start frontend (blocking)
npm start
