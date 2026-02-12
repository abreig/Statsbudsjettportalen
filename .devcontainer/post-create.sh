#!/usr/bin/env bash
set -euo pipefail

echo "=== Statsbudsjettportalen: Codespaces setup ==="

# ── PostgreSQL ──────────────────────────────────────
echo "Setting up PostgreSQL..."
sudo apt-get update -qq && sudo apt-get install -y -qq postgresql postgresql-client > /dev/null

sudo pg_ctlcluster 14 main start 2>/dev/null || sudo service postgresql start

# Create role and database (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='statsbudsjett'" \
  | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER statsbudsjett WITH PASSWORD 'localdev' CREATEDB;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='statsbudsjett'" \
  | grep -q 1 \
  || sudo -u postgres createdb -O statsbudsjett statsbudsjett

echo "PostgreSQL ready (statsbudsjett/localdev)"

# ── Backend dependencies ────────────────────────────
echo "Restoring .NET packages..."
dotnet restore backend/Statsbudsjettportalen.Api/Statsbudsjettportalen.Api.csproj

# ── Frontend dependencies ───────────────────────────
echo "Installing npm packages..."
cd frontend && npm ci && cd ..

echo ""
echo "=== Setup complete! ==="
echo "Start backend:   cd backend/Statsbudsjettportalen.Api && dotnet run"
echo "Start frontend:  cd frontend && npm run dev"
echo ""
