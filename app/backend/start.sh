#!/usr/bin/env sh
# Production start script (used by Render via render.yaml dockerCommand).
# Applies migrations and seeds reference data before launching uvicorn.
# Both alembic upgrade and the seed are idempotent, so re-running on every
# boot is safe. This runs from the host (Render) because some local networks
# block outbound Postgres ports, preventing migrations from a dev machine.
set -e

alembic upgrade head
python -m db.seed_cli

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
