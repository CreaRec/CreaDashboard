#!/usr/bin/env bash
# Shared helpers for the CreaDashboard scripts.

set -euo pipefail

# --- logging ---------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET="\033[0m"; C_BLUE="\033[34m"; C_GREEN="\033[32m"; C_YELLOW="\033[33m"; C_RED="\033[31m"
else
  C_RESET=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi

log()  { printf "${C_BLUE}[dashboard]${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}[ok]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[warn]${C_RESET} %s\n" "$*"; }
err()  { printf "${C_RED}[err]${C_RESET} %s\n" "$*" >&2; }

# Read a single KEY=value from a dotenv file (last match wins). Does not export or eval.
read_env_var() {
  local key="${1:?}" file="${2:-.env}"
  if [ ! -f "$file" ]; then
    return 0
  fi
  grep -E "^${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r' || true
}

# --- compose helper --------------------------------------------------------
compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

compose_prod() {
  compose -f "$COMPOSE_FILE" "$@"
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "docker is not installed or not on PATH."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    err "Docker daemon is not running. Start Docker and retry."
    exit 1
  fi
  ok "Docker daemon is running."
}

wait_postgres_healthy() {
  local cid
  cid="$(compose_prod ps -q postgres)"
  if [ -z "$cid" ]; then
    err "Could not find the 'postgres' container."
    exit 1
  fi
  log "Waiting for Postgres to become healthy..."
  for _ in $(seq 1 60); do
    local status
    status="$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "starting")"
    if [ "$status" = "healthy" ]; then
      ok "Postgres is healthy."
      return 0
    fi
    sleep 2
  done
  err "Postgres did not become healthy in time."
  compose_prod logs --tail 50 postgres || true
  exit 1
}

ensure_prod_containers() {
  log "Ensuring production containers are up..."
  compose_prod up -d
  wait_postgres_healthy
}
