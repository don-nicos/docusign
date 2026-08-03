#!/usr/bin/env bash
set -euo pipefail

# Configuration
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-8085}
ENV_FILE="env/payment-service.env"
NGROK_API="http://127.0.0.1:4040/api/tunnels"
POLL_MAX=30
POLL_SLEEP=1

log() { printf "[ngrok-up] %s\n" "$*"; }

die() { printf "[ngrok-up][error] %s\n" "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Command not found: $1"
}

# 1) Ensure ngrok is installed
require_cmd ngrok
require_cmd curl
require_cmd python3

# 2) Ensure ngrok API is up (start dummy tunnel if needed)
if ! curl -sSf "$NGROK_API" >/dev/null 2>&1; then
  log "Starting ngrok background process..."
  nohup ngrok http ${FRONTEND_PORT} --log=stdout > ngrok-${FRONTEND_PORT}.log 2>&1 &
  ATTEMPTS=0
  until curl -sSf "$NGROK_API" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ $ATTEMPTS -ge 10 ]; then
      die "ngrok API did not become available on 4040"
    fi
    sleep 1
  done
  log "ngrok API is up"
fi

tunnel_exists() {
  local port="$1"
  curl -s "$NGROK_API" | python3 - "$port" <<'PY'
import sys, json
port = sys.argv[1]
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        addr = tunnel.get('config', {}).get('addr', '')
        if addr.endswith(':' + port) or ('localhost:' + port) in addr:
            sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
}

start_tunnel_if_missing() {
  local port="$1"
  local label="$2"
  if tunnel_exists "$port"; then
    log "${label} tunnel for port ${port} already running"
    return
  fi
  log "Starting ngrok tunnel for ${label} (port ${port})..."
  nohup ngrok http ${port} --log=stdout > "ngrok-${port}.log" 2>&1 &
}

start_tunnel_if_missing "$FRONTEND_PORT" "frontend"
start_tunnel_if_missing "$BACKEND_PORT" "backend"

# 3) Obtain HTTPS public URL for a given local port
get_https_url() {
  local port="$1"
  curl -s "$NGROK_API" | python3 - "$port" <<'PY'
import sys, json
port = sys.argv[1]
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for tunnel in tunnels:
        cfg = tunnel.get('config', {})
        if cfg.get('addr', '').endswith(':' + port):
            url = tunnel.get('public_url', '')
            if url.startswith('https'):
                print(url)
                sys.exit(0)
    # fallback: return first https
    for tunnel in tunnels:
        url = tunnel.get('public_url', '')
        if url.startswith('https'):
            print(url)
            sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
}

fetch_url_with_retry() {
  local port="$1"
  local label="$2"
  local url=""
  for i in $(seq 1 $POLL_MAX); do
    url=$(get_https_url "$port" || true)
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    sleep "$POLL_SLEEP"
  done
  die "Could not obtain ngrok public URL for ${label} (port ${port})"
}

FRONTEND_URL=$(fetch_url_with_retry "$FRONTEND_PORT" "frontend")
BACKEND_URL=$(fetch_url_with_retry "$BACKEND_PORT" "backend")

log "Frontend public URL: $FRONTEND_URL"
log "Backend public URL:  $BACKEND_URL"

# 4) Ensure env file exists
mkdir -p "$(dirname "$ENV_FILE")"
[ -f "$ENV_FILE" ] || touch "$ENV_FILE"

# 5) Upsert APP_FRONTEND_BASE_URL and MERCADOPAGO_NOTIFICATION_URL in env file (macOS sed syntax)
upsert_kv() {
  local key="$1"; shift
  local value="$1"; shift
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s#^${key}=.*#${key}=${value}#" "$ENV_FILE"
  else
    printf "%s=%s\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

upsert_kv APP_FRONTEND_BASE_URL "$FRONTEND_URL"
upsert_kv MERCADOPAGO_NOTIFICATION_URL "${BACKEND_URL}/api/payments/webhooks/mercadopago"

log "Updated $ENV_FILE with ngrok URLs"

# 6) Recreate payment-service to pick changes
log "Recreating payment-service..."
docker-compose up -d --force-recreate payment-service
log "Done."
