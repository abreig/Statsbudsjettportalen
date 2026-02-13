#!/usr/bin/env bash
# postStartCommand – runs every time the Codespace (re)starts.
# Delegates to start-services.sh which handles zombie cleanup,
# database readiness, and starting backend + frontend.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/start-services.sh"
