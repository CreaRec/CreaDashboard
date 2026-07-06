#!/usr/bin/env bash
# Deploy CreaDashboard to the Debian server.
#
# Syncs the project, builds it (incl. prisma generate), runs migrations, ensures
# Postgres/Temporal containers are up, and installs/restarts systemd services.
#
# Usage: ./scripts/deploy.sh [--remote]
#
#   --remote   Connect via crearec.app instead of the local network IP (192.168.1.135).
#
# Override any of these via environment variables:
#   SERVER_HOST, SSH_USER, REMOTE_APP_DIR, API_SERVICE_NAME, WORKER_SERVICE_NAME,
#   DASHBOARD_HTTP_PORT, TEMPORAL_UI_HTTP_PORT, LAN_BIND_IP, DEPLOY_PASSWORD

set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/lib.sh
. scripts/lib.sh

USE_REMOTE=false
while [ $# -gt 0 ]; do
  case "$1" in
    --remote)
      USE_REMOTE=true
      shift
      ;;
    *)
      err "Unknown argument: $1"
      err "Usage: $0 [--remote]"
      exit 1
      ;;
  esac
done

if [ "${SERVER_HOST+set}" = set ]; then
  :
elif [ "$USE_REMOTE" = true ]; then
  SERVER_HOST="crearec.app"
else
  SERVER_HOST="192.168.1.135"
fi

SSH_USER="${SSH_USER:-crearec}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/crearec/crea-dashboard}"
API_SERVICE_NAME="${API_SERVICE_NAME:-crea-dashboard-api}"
WORKER_SERVICE_NAME="${WORKER_SERVICE_NAME:-crea-dashboard-worker}"
DASHBOARD_HTTP_PORT="${DASHBOARD_HTTP_PORT:-3080}"
TEMPORAL_UI_HTTP_PORT="${TEMPORAL_UI_HTTP_PORT:-8080}"
LAN_BIND_IP="${LAN_BIND_IP:-192.168.1.135}"

SSH_TARGET="${SSH_USER}@${SERVER_HOST}"
SSH_CONTROL_PATH="${SSH_CONTROL_PATH:-${TMPDIR:-/tmp}/dashboard-deploy-${SSH_USER}-${SERVER_HOST}}"

if [ -z "${DEPLOY_PASSWORD:-}" ]; then
  DEPLOY_PASSWORD="$(read_env_var DEPLOY_PASSWORD)"
fi

USE_SSHPASS=false
if [ -n "${DEPLOY_PASSWORD:-}" ]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    err "DEPLOY_PASSWORD is set but sshpass is not installed (e.g. brew install hudochenkov/sshpass/sshpass)."
    exit 1
  fi
  export SSHPASS="$DEPLOY_PASSWORD"
  USE_SSHPASS=true
fi

ssh_wrap() {
  if [ "$USE_SSHPASS" = true ]; then
    sshpass -e ssh "$@"
  else
    ssh "$@"
  fi
}

log "Deploying to ${SSH_TARGET}:${REMOTE_APP_DIR}"
log "Services: ${API_SERVICE_NAME}, ${WORKER_SERVICE_NAME}"

for cmd in rsync ssh; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "$cmd is required locally."
    exit 1
  fi
done

close_ssh_master() {
  ssh_wrap -S "$SSH_CONTROL_PATH" -O exit "$SSH_TARGET" 2>/dev/null || true
}

open_ssh_master() {
  if ssh_wrap -S "$SSH_CONTROL_PATH" -O check "$SSH_TARGET" 2>/dev/null; then
    return 0
  fi
  if [ "$USE_SSHPASS" = true ]; then
    log "Opening SSH connection..."
  else
    log "Opening SSH connection (enter server password once)..."
  fi
  ssh_wrap -M -S "$SSH_CONTROL_PATH" -fnNT "$SSH_TARGET"
}

open_ssh_master
trap close_ssh_master EXIT

ssh_cmd() { ssh_wrap -S "$SSH_CONTROL_PATH" "$@"; }
RSYNC_RSH="ssh -S ${SSH_CONTROL_PATH}"
if [ "$USE_SSHPASS" = true ]; then
  RSYNC_RSH="sshpass -e ssh -S ${SSH_CONTROL_PATH}"
fi

ssh_cmd "$SSH_TARGET" "mkdir -p '${REMOTE_APP_DIR}'"

log "Syncing files..."
rsync -az --delete -e "$RSYNC_RSH" \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'data/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'backend/.env' \
  ./ "${SSH_TARGET}:${REMOTE_APP_DIR}/"
ok "Files synced."

REMOTE_ENV_PATH="${REMOTE_APP_DIR}/backend/.env"
if ! ssh_cmd "$SSH_TARGET" "test -f '${REMOTE_ENV_PATH}'"; then
  warn "Remote ${REMOTE_ENV_PATH} is MISSING."
  warn "Create it on the server (copy .env.example) before services can start."
fi

log "Running remote build & service setup..."
REMOTE_SCRIPT="${REMOTE_APP_DIR}/scripts/deploy-remote.sh"
REMOTE_ENV=(
  "REMOTE_APP_DIR=$(printf '%q' "$REMOTE_APP_DIR")"
  "API_SERVICE_NAME=$(printf '%q' "$API_SERVICE_NAME")"
  "WORKER_SERVICE_NAME=$(printf '%q' "$WORKER_SERVICE_NAME")"
  "DEPLOY_USER=$(printf '%q' "$SSH_USER")"
  "DASHBOARD_HTTP_PORT=$(printf '%q' "$DASHBOARD_HTTP_PORT")"
  "TEMPORAL_UI_HTTP_PORT=$(printf '%q' "$TEMPORAL_UI_HTTP_PORT")"
  "LAN_BIND_IP=$(printf '%q' "$LAN_BIND_IP")"
)
if [ -n "${DEPLOY_PASSWORD:-}" ]; then
  REMOTE_ENV+=("DEPLOY_PASSWORD=$(printf '%q' "$DEPLOY_PASSWORD")")
fi
if [ "${CI:-}" = true ]; then
  REMOTE_ENV+=("CI=true")
fi
if [ "${GITHUB_ACTIONS:-}" = true ]; then
  REMOTE_ENV+=("GITHUB_ACTIONS=true")
fi
if [ -n "${DEPLOY_PASSWORD:-}" ]; then
  ssh_cmd -tt "$SSH_TARGET" \
    "${REMOTE_ENV[*]} bash $(printf '%q' "$REMOTE_SCRIPT")"
else
  ssh_cmd "$SSH_TARGET" \
    "${REMOTE_ENV[*]} bash $(printf '%q' "$REMOTE_SCRIPT")"
fi

ok "Deploy complete."
