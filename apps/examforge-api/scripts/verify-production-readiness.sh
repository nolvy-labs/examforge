#!/usr/bin/env bash
set -euo pipefail

readiness_url="${EXAMFORGE_READINESS_URL:-http://127.0.0.1:5001/health/ready}"
timeout_seconds="${EXAMFORGE_STARTUP_TIMEOUT_SECONDS:-60}"
deadline=$((SECONDS + timeout_seconds))

until curl --fail --silent --show-error --max-time 3 "${readiness_url}" >/dev/null; do
  if (( SECONDS >= deadline )); then
    echo "ExamForge API did not become ready within ${timeout_seconds} seconds." >&2
    exit 1
  fi

  sleep 2
done

echo "ExamForge API is ready."
