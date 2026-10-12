#!/usr/bin/env bash
set -euo pipefail
ecc_web_port="${PORT:-5173}"

# Ensure deps exist
if [ ! -d node_modules ]; then
  npm ci
fi

# Run Vite in a way Replit can track (no early exit)
exec npm run dev:web -- --host 0.0.0.0 --port "$ecc_web_port"
