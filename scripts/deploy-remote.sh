#!/usr/bin/env bash
# Remote deploy steps (run on the server via scripts/deploy.sh).

set -euo pipefail

: "${REMOTE_APP_DIR:?REMOTE_APP_DIR is required}"
: "${API_SERVICE_NAME:?API_SERVICE_NAME is required}"
: "${WORKER_SERVICE_NAME:?WORKER_SERVICE_NAME is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"

cd "$REMOTE_APP_DIR"

DASHBOARD_HTTP_PORT="${DASHBOARD_HTTP_PORT:-3080}"
TEMPORAL_UI_HTTP_PORT="${TEMPORAL_UI_HTTP_PORT:-8080}"
LAN_BIND_IP="${LAN_BIND_IP:-192.168.1.135}"
API_PORT="3001"
BACKEND_ENV="${REMOTE_APP_DIR}/backend/.env"

if [ -f "$BACKEND_ENV" ]; then
  ENV_PORT="$(grep -E '^PORT=' "$BACKEND_ENV" | tail -1 | cut -d= -f2- | tr -d '\r' || true)"
  if [ -n "${ENV_PORT}" ]; then
    API_PORT="${ENV_PORT}"
  fi
fi

export LAN_BIND_IP TEMPORAL_UI_HTTP_PORT
export TEMPORAL_CORS_ORIGIN="http://${LAN_BIND_IP}:${TEMPORAL_UI_HTTP_PORT}"

NGINX_BIN=""
resolve_nginx_bin() {
  if command -v nginx >/dev/null 2>&1; then
    NGINX_BIN="$(command -v nginx)"
  elif [ -x /usr/sbin/nginx ]; then
    NGINX_BIN="/usr/sbin/nginx"
  fi
}

sudo_can() {
  sudo -n "$@" >/dev/null 2>&1
}

is_interactive_deploy() {
  [ -t 0 ] && [ -t 1 ] && \
    [ "${CI:-}" != true ] && [ "${GITHUB_ACTIONS:-}" != true ]
}

passwordless_sudo_ready() {
  sudo_can mkdir -p /etc/nginx/sites-available || return 1
  sudo_can mkdir -p /etc/nginx/sites-enabled || return 1
  sudo_can cp --version || return 1
  sudo_can systemctl --version || return 1
  resolve_nginx_bin
  if [ -n "$NGINX_BIN" ]; then
    sudo_can "$NGINX_BIN" -t || return 1
  fi
  return 0
}

USE_PASSWORDLESS_SUDO=false

sudo_run() {
  if [ "$USE_PASSWORDLESS_SUDO" = true ]; then
    sudo -n "$@"
  else
    sudo "$@"
  fi
}

report_passwordless_sudo_failure() {
  echo "[remote] ERROR: passwordless sudo is required for non-interactive deploy (CI)." >&2
  echo "[remote] Running as: $(whoami) (expected deploy user: ${DEPLOY_USER})" >&2
  echo "[remote] Fix: create /etc/sudoers.d/${DEPLOY_USER}-deploy with NOPASSWD for cp, mkdir, systemctl, journalctl, nginx." >&2
  echo "[remote] See README.md (GitHub Actions CI/CD)." >&2
}

start_sudo_keepalive() {
  while true; do
    if [ "$USE_PASSWORDLESS_SUDO" = true ]; then
      passwordless_sudo_ready || exit
    else
      sudo -n true || exit
    fi
    sleep 50
    kill -0 "$$" || exit
  done 2>/dev/null &
  SUDO_KEEPALIVE_PID=$!
  trap 'kill "$SUDO_KEEPALIVE_PID" 2>/dev/null' EXIT
}

if passwordless_sudo_ready; then
  USE_PASSWORDLESS_SUDO=true
elif [ -n "${DEPLOY_PASSWORD:-}" ]; then
  printf '%s\n' "$DEPLOY_PASSWORD" | sudo -S -v
  start_sudo_keepalive
elif is_interactive_deploy; then
  echo "[remote] sudo required for nginx/systemd setup (enter password once)..."
  sudo -v
  start_sudo_keepalive
else
  report_passwordless_sudo_failure
  exit 1
fi

echo "[remote] ensuring data directories..."
mkdir -p data/postgres

echo "[remote] starting Postgres, Temporal, and Temporal UI..."
# shellcheck source=scripts/lib.sh
. "${REMOTE_APP_DIR}/scripts/lib.sh"
ensure_prod_containers

echo "[remote] installing dependencies..."
npm ci || npm install

echo "[remote] building (backend + frontend)..."
npm run build

echo "[remote] applying Prisma migrations..."
npm run db:migrate

echo "[remote] installing nginx LAN config (dashboard on ${LAN_BIND_IP}:${DASHBOARD_HTTP_PORT})..."
TMP_NGINX="$(mktemp)"
sed -e "s#__LAN_BIND_IP__#${LAN_BIND_IP}#g" \
    -e "s#__HTTP_PORT__#${DASHBOARD_HTTP_PORT}#g" \
    -e "s#__API_PORT__#${API_PORT}#g" \
    -e "s#__APP_DIR__#${REMOTE_APP_DIR}#g" \
    deploy/nginx/crea-dashboard-lan.conf > "$TMP_NGINX"
sudo_run mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo_run cp "$TMP_NGINX" /etc/nginx/sites-available/crea-dashboard
sudo_run cp "$TMP_NGINX" /etc/nginx/sites-enabled/crea-dashboard
rm -f "$TMP_NGINX"

resolve_nginx_bin
if [ -n "$NGINX_BIN" ]; then
  if sudo_run "$NGINX_BIN" -t 2>/dev/null; then
    if sudo_run systemctl reload nginx 2>/dev/null; then
      echo "[remote] nginx reloaded."
    elif sudo_run "$NGINX_BIN" -s reload 2>/dev/null; then
      echo "[remote] nginx reloaded (nginx -s reload)."
    else
      echo "[remote] WARN: nginx config OK but reload failed. Reload nginx manually."
    fi
  else
    echo "[remote] WARN: nginx -t failed. Fix config and reload nginx manually."
  fi
else
  echo "[remote] WARN: nginx not found. Install nginx and reload manually."
fi

install_systemd_unit() {
  local service_name="$1"
  local template="$2"
  local tmp_unit
  tmp_unit="$(mktemp)"
  sed -e "s#__USER__#${DEPLOY_USER}#g" \
      -e "s#__APP_DIR__#${REMOTE_APP_DIR}#g" \
      "$template" > "$tmp_unit"
  sudo_run cp "$tmp_unit" "/etc/systemd/system/${service_name}.service"
  rm -f "$tmp_unit"
  sudo_run systemctl daemon-reload
  sudo_run systemctl enable "${service_name}"
  sudo_run systemctl restart "${service_name}"
}

echo "[remote] installing systemd unit ${API_SERVICE_NAME}..."
install_systemd_unit "$API_SERVICE_NAME" deploy/crea-dashboard-api.service

echo "[remote] installing systemd unit ${WORKER_SERVICE_NAME}..."
install_systemd_unit "$WORKER_SERVICE_NAME" deploy/crea-dashboard-worker.service

for svc in "$API_SERVICE_NAME" "$WORKER_SERVICE_NAME"; do
  echo "[remote] service status (${svc}):"
  sudo_run systemctl --no-pager --full status "${svc}" || true
  echo "[remote] recent logs (${svc}):"
  sudo_run journalctl -u "${svc}" -n 20 --no-pager || true
done

echo "[remote] Dashboard:  http://${LAN_BIND_IP}:${DASHBOARD_HTTP_PORT}"
echo "[remote] Temporal UI: http://${LAN_BIND_IP}:${TEMPORAL_UI_HTTP_PORT}"
