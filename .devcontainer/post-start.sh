#!/usr/bin/env bash
set -euo pipefail

echo "=== Statsbudsjettportalen: Starting services ==="

# ── Determine PostgreSQL host ───────────────────────
# In docker-compose the db container is reachable as "db".
# Locally (no docker-compose) it runs on localhost.
if getent hosts db &>/dev/null; then
  DB_HOST="db"
else
  DB_HOST="localhost"
  # Start local PostgreSQL if installed and not running
  if command -v pg_lsclusters &>/dev/null; then
    if pg_lsclusters -h | grep -q "down"; then
      echo "Starting local PostgreSQL..."
      pg_ctlcluster 16 main start || true
    fi
  fi
fi

# ── Wait for PostgreSQL ─────────────────────────────
echo "Waiting for PostgreSQL at ${DB_HOST}:5432..."
for i in {1..30}; do
  if command -v pg_isready &>/dev/null; then
    pg_isready -h "$DB_HOST" -p 5432 -q && break
  else
    # pg_isready not installed — try a raw TCP check
    (echo >/dev/tcp/"$DB_HOST"/5432) 2>/dev/null && break
  fi
  sleep 1
done
echo "PostgreSQL is ready at ${DB_HOST}:5432"

# ── Start backend (.NET API) ────────────────────────
WORKSPACE="${CODESPACE_VSCODE_FOLDER:-$(pwd)}"
BACKEND_DIR="${WORKSPACE}/backend/Statsbudsjettportalen.Api"

if [ -d "$BACKEND_DIR" ]; then
  echo "Starting backend..."
  cd "$BACKEND_DIR"
  ASPNETCORE_ENVIRONMENT=Development \
    nohup dotnet run --urls "http://0.0.0.0:5000" \
    > /tmp/backend.log 2>&1 &
  echo "Backend started (PID $!, log: /tmp/backend.log)"
fi

# ── Start frontend (Vite) ───────────────────────────
FRONTEND_DIR="${WORKSPACE}/frontend"

if [ -d "$FRONTEND_DIR" ]; then
  echo "Starting frontend..."
  cd "$FRONTEND_DIR"
  nohup npm run dev > /tmp/frontend.log 2>&1 &
  echo "Frontend started (PID $!, log: /tmp/frontend.log)"
fi

echo ""
echo "=== Services started ==="
echo "Backend:  http://localhost:5000  (log: /tmp/backend.log)"
echo "Frontend: http://localhost:5173  (log: /tmp/frontend.log)"
echo ""
