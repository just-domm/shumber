#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required on the VPS."
  exit 1
fi

if [ ! -f "${ROOT_DIR}/backend/.env.production" ]; then
  echo "Missing backend/.env.production. Create it from backend/.env.production.example."
  exit 1
fi

docker compose -f "${ROOT_DIR}/docker-compose.vps.yml" up -d --build
docker compose -f "${ROOT_DIR}/docker-compose.vps.yml" ps
