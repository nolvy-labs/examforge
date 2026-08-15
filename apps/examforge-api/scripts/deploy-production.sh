#!/usr/bin/env bash
set -Eeuo pipefail

commit_sha="${1:-}"

if [[ ! "${commit_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "A full 40-character Git commit SHA is required." >&2
  exit 1
fi

deployment_directory="/opt/examforge"
compose_file="${deployment_directory}/docker-compose.production.yml"
environment_file="${deployment_directory}/.env"

export API_IMAGE="ghcr.io/nolvy-labs/examforge-api:${commit_sha}"
export MIGRATIONS_IMAGE="ghcr.io/nolvy-labs/examforge-migrations:${commit_sha}"

compose=(
  docker compose
  --env-file "${environment_file}"
  --file "${compose_file}"
)

cd "${deployment_directory}"

echo "Pulling release ${commit_sha}..."
"${compose[@]}" pull migrations api

echo "Applying database migrations..."
"${compose[@]}" up \
  --force-recreate \
  --abort-on-container-exit \
  --exit-code-from migrations \
  migrations

"${compose[@]}" rm --force migrations

echo "Deploying API..."
"${compose[@]}" up \
  --detach \
  --no-deps \
  --force-recreate \
  api

if ! EXAMFORGE_STARTUP_TIMEOUT_SECONDS=60 \
  "${deployment_directory}/verify-production-readiness.sh"; then
  echo "Deployment health check failed." >&2
  "${compose[@]}" ps >&2
  "${compose[@]}" logs --tail 200 api >&2
  exit 1
fi

"${compose[@]}" ps
echo "ExamForge API ${commit_sha} deployed successfully."