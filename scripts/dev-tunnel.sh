#!/usr/bin/env bash
#
# Single-command dev tunnel: starts ngrok v3 (~/.local/bin/ngrok) on port 8081,
# waits for the public URL via ngrok's local inspector API, then launches
# `expo start` with EXPO_PACKAGER_PROXY_URL + REACT_NATIVE_PACKAGER_HOSTNAME
# set so phones connect via the tunnel.
#
# Why this exists: @expo/ngrok bundles ngrok v2.3 which is below ngrok's
# current free-tier minimum (v3.20). `npx expo start --tunnel` therefore
# fails with a cryptic 'body' undefined error. This script does the same
# thing manually using a standalone v3 binary.
#
# Usage:
#   chmod +x scripts/dev-tunnel.sh   (one-time)
#   ./scripts/dev-tunnel.sh
#
# Stop with Ctrl+C — ngrok is cleaned up on exit.

set -euo pipefail

NGROK_BIN="${NGROK_BIN:-$HOME/.local/bin/ngrok}"
METRO_PORT="${METRO_PORT:-8081}"
INSPECTOR_URL="http://127.0.0.1:4040/api/tunnels"

if [ ! -x "$NGROK_BIN" ]; then
  echo "ngrok v3 binary not found at $NGROK_BIN" >&2
  echo "Install it once with:" >&2
  echo "  curl -sL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar xz -C ~/.local/bin/" >&2
  echo "  chmod +x ~/.local/bin/ngrok" >&2
  echo "  ~/.local/bin/ngrok config add-authtoken <YOUR_TOKEN>" >&2
  exit 1
fi

# Kill any previous ngrok on the same port to avoid 'port in use'
pkill -f "ngrok.*http ${METRO_PORT}" 2>/dev/null || true
sleep 0.5

# Start ngrok in the background, logging to a tmp file
LOG_FILE=$(mktemp -t ngrok.XXXXXX.log)
echo "Starting ngrok → log: $LOG_FILE"
"$NGROK_BIN" http "$METRO_PORT" > "$LOG_FILE" 2>&1 &
NGROK_PID=$!

cleanup() {
  echo ""
  echo "Cleaning up tunnel (pid $NGROK_PID)..."
  kill "$NGROK_PID" 2>/dev/null || true
  wait "$NGROK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for the inspector API to expose a public URL (up to 20s)
URL=""
for _ in $(seq 1 20); do
  sleep 1
  URL=$(
    curl -s "$INSPECTOR_URL" 2>/dev/null \
      | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for t in data.get('tunnels', []):
        if t.get('public_url', '').startswith('https://'):
            print(t['public_url'])
            break
except Exception:
    pass
" 2>/dev/null
  )
  [ -n "$URL" ] && break
done

if [ -z "$URL" ]; then
  echo "Failed to acquire ngrok URL within 20s. Last log lines:" >&2
  tail -20 "$LOG_FILE" >&2
  exit 1
fi

HOST="${URL#https://}"

echo ""
echo "==========================================================="
echo "Tunnel:   $URL"
echo "Host:     $HOST"
echo "Inspect:  http://127.0.0.1:4040"
echo "==========================================================="
echo ""

# Pass any extra args (--clear, --no-dev, etc.) through to expo start
EXPO_PACKAGER_PROXY_URL="$URL" \
REACT_NATIVE_PACKAGER_HOSTNAME="$HOST" \
  npx expo start "$@"
