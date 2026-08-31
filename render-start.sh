#!/bin/sh
# Start the Node API in the background, then nginx in the foreground.
# Render sends traffic to $PORT (default 10000); nginx listens on it.
# The API listens on API_PORT (3000, fixed) and nginx proxies /api to it.

set -e

PORT="${PORT:-10000}"
export PORT

# Template the port into the nginx config
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Start the API in the background on the internal port
echo "Starting API on :${API_PORT:-3000}…"
cd /api
PORT="${API_PORT:-3000}" node server.js &

# Wait a moment for the API to bind
sleep 1

# Start nginx in the foreground on $PORT (Render's public port)
echo "Starting nginx on :${PORT}…"
exec nginx -g "daemon off;"
