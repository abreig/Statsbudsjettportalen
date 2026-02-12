#!/usr/bin/env bash
set -euo pipefail

# Ensure local PostgreSQL is running (installed via devcontainer features)
if command -v pg_lsclusters &>/dev/null; then
  if pg_lsclusters -h | grep -q "down"; then
    echo "Starting PostgreSQL..."
    pg_ctlcluster 16 main start || true
  fi
fi

# Wait for PostgreSQL to accept connections
for i in {1..10}; do
  pg_isready -h localhost -p 5432 &>/dev/null && break
  sleep 1
done

# Ensure role and database exist
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='statsbudsjett'\" | grep -q 1 || psql -c \"CREATE ROLE statsbudsjett WITH LOGIN PASSWORD 'localdev' CREATEDB;\"" 2>/dev/null || true
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='statsbudsjett'\" | grep -q 1 || psql -c \"CREATE DATABASE statsbudsjett OWNER statsbudsjett;\"" 2>/dev/null || true

echo "PostgreSQL is ready on localhost:5432"
