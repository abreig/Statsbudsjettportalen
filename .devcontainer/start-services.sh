#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${CODESPACE_VSCODE_FOLDER:-/workspaces/Statsbudsjettportalen}"
BACKEND_DIR="${WORKSPACE}/backend/Statsbudsjettportalen.Api"
FRONTEND_DIR="${WORKSPACE}/frontend"

echo "=== Statsbudsjettportalen: Starting services ==="

# ── 1. Kill zombie processes that may block ports ───
echo "Cleaning up stale processes..."
pkill -f 'dotnet.*Statsbudsjettportalen' 2>/dev/null || true
pkill -f 'node.*vite' 2>/dev/null || true
# Give processes time to release ports
sleep 1

# ── 2. Wait for PostgreSQL (db container) ───────────
DB_HOST="db"
# Fallback: if db hostname doesn't resolve, try localhost
if ! getent hosts db &>/dev/null; then
  DB_HOST="localhost"
fi

echo "Waiting for PostgreSQL at ${DB_HOST}:5432..."
for i in $(seq 1 30); do
  if command -v pg_isready &>/dev/null; then
    pg_isready -h "$DB_HOST" -p 5432 -q 2>/dev/null && break
  else
    (echo >/dev/tcp/"$DB_HOST"/5432) 2>/dev/null && break
  fi
  [ "$i" -eq 30 ] && echo "WARNING: PostgreSQL not ready after 30s, continuing anyway..."
  sleep 1
done
echo "PostgreSQL is ready at ${DB_HOST}:5432"

# ── 3. Start backend (.NET API) ─────────────────────
if [ -d "$BACKEND_DIR" ]; then
  echo "Starting backend on http://0.0.0.0:5000 ..."
  cd "$BACKEND_DIR"
  nohup dotnet run > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  echo "Backend started (PID ${BACKEND_PID}, log: /tmp/backend.log)"

  # Wait for backend to be ready before starting frontend
  echo "Waiting for backend to accept connections..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:5000/api/health >/dev/null 2>&1; then
      echo "Backend is ready!"
      break
    fi
    [ "$i" -eq 30 ] && echo "WARNING: Backend not responding after 30s, starting frontend anyway..."
    sleep 1
  done
else
  echo "WARNING: Backend directory not found at ${BACKEND_DIR}"
fi

# ── 4. Start frontend (Vite dev server) ─────────────
if [ -d "$FRONTEND_DIR" ]; then
  echo "Starting frontend on http://0.0.0.0:5173 ..."
  cd "$FRONTEND_DIR"
  nohup npm run dev > /tmp/frontend.log 2>&1 &
  FRONTEND_PID=$!
  echo "Frontend started (PID ${FRONTEND_PID}, log: /tmp/frontend.log)"
else
  echo "WARNING: Frontend directory not found at ${FRONTEND_DIR}"
fi

echo ""
echo "=== All services started ==="
echo "Backend:  http://localhost:5000   (log: /tmp/backend.log)"
echo "Frontend: http://localhost:5173   (log: /tmp/frontend.log)"
echo ""
echo "In Codespaces, access via the forwarded URLs in the Ports panel."
echo ""
