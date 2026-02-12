#!/usr/bin/env bash
set -euo pipefail

echo "=== Statsbudsjettportalen: Codespaces setup ==="

# ── Backend dependencies ────────────────────────────
echo "Restoring .NET packages..."
dotnet restore backend/Statsbudsjettportalen.Api/Statsbudsjettportalen.Api.csproj

# ── Frontend dependencies ───────────────────────────
echo "Installing npm packages..."
cd frontend && npm ci && cd ..

echo ""
echo "=== Setup complete! ==="
echo "PostgreSQL is running as a service container (host: db, port: 5432)"
echo ""
echo "Start backend:   cd backend/Statsbudsjettportalen.Api && dotnet run"
echo "Start frontend:  cd frontend && npm run dev"
echo ""
