#!/usr/bin/env bash
set -euo pipefail

# devnet-auto-init.sh
# Automates: `clarinet integrate --no-dashboard`, waits for services,
# extracts deployed contract identifiers, and updates frontend/.env.local

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DEVNET_DIR=""
find_devnet_dir() {
  DEVNET_DIR=$(ls -td .cache/stacks-devnet-* 2>/dev/null | head -1 || true)
  echo "$DEVNET_DIR"
}

wait_for_devnet_log() {
  local timeout=${1:-300}
  local waited=0
  while [ -z "$(find_devnet_dir)" ]; do
    sleep 1
    waited=$((waited+1))
    if [ "$waited" -ge "$timeout" ]; then
      echo "Timed out waiting for devnet log dir" >&2
      return 1
    fi
  done
  DEVNET_DIR=$(find_devnet_dir)
  echo "Using devnet dir: $DEVNET_DIR"
}

wait_for_pattern_in_log() {
  local pattern="$1"
  local timeout=${2:-600}
  local elapsed=0
  until grep -q -E "$pattern" "$DEVNET_DIR/devnet.log" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed+1))
    if [ "$elapsed" -ge "$timeout" ]; then
      echo "Timed out waiting for pattern '$pattern' in devnet log" >&2
      return 1
    fi
  done
}

wait_for_http_ok() {
  local url=$1
  local timeout=${2:-180}
  local elapsed=0
  until curl -sS -o /dev/null -w "%{http_code}" "$url" | grep -q '^2\|^3'; do
    sleep 1
    elapsed=$((elapsed+1))
    if [ "$elapsed" -ge "$timeout" ]; then
      echo "Timed out waiting for HTTP $url" >&2
      return 1
    fi
  done
}

start_clarinet_integrate() {
  echo "Starting clarinet integrate --no-dashboard (may take a minute)..."
  clarinet integrate --no-dashboard &
  CLARINET_PID=$!
  echo "Clarinet PID: $CLARINET_PID"
}

find_contract_in_cache() {
  local name="$1"
  # Search cache deployments and deployments/ for contract name
  grep -R --line-number --no-messages -m1 -E "${name}" .cache deployments || true
}

update_frontend_env() {
  local key="NEXT_PUBLIC_ESCROW_CONTRACT"
  local val="$1"
  local envfile="frontend/.env.local"
  if [ ! -f "$envfile" ]; then
    touch "$envfile"
  fi
  cp "$envfile" "$envfile.bak"
  if grep -q "^${key}=" "$envfile"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$envfile"
  else
    echo "${key}=${val}" >> "$envfile"
  fi
  echo "Updated $envfile (backup at $envfile.bak)"
}

main() {
  start_clarinet_integrate

  echo "Waiting for Clarinet to create devnet log directory..."
  wait_for_devnet_log 120 || true
  DEVNET_DIR=$(find_devnet_dir)
  echo "Devnet dir: $DEVNET_DIR"

  echo "Waiting for 'Published' or 'Published contract' lines in devnet log..."
  # Wait for deployment messages
  wait_for_pattern_in_log "Published|Published contract|Deployment" 600 || true

  echo "Waiting for stacks-api (http://localhost:3999) to be available..."
  wait_for_http_ok "http://localhost:3999" 180 || true

  echo "Searching for deployed contract 'lex-nakamoto-escrow'..."
  FOUND_LINE=$(find_contract_in_cache "lex-nakamoto-escrow" | head -n1 || true)
  if [ -n "$FOUND_LINE" ]; then
    echo "Found contract reference:"
    echo "$FOUND_LINE"
    # Try to extract an ST principal (simple heuristic)
    PRINCIPAL=$(echo "$FOUND_LINE" | grep -oE 'ST[0-9A-Z]{24,66}' || true)
    if [ -n "$PRINCIPAL" ]; then
      CONTRACT_REF="${PRINCIPAL}.lex-nakamoto-escrow"
      echo "Assuming contract identifier: $CONTRACT_REF"
      update_frontend_env "$CONTRACT_REF"
    else
      echo "Could not extract principal automatically; inspect the matching file." >&2
    fi
  else
    echo "No contract match found in cache/deployments; please check devnet log or deployments files." >&2
  fi

  echo "Devnet automation completed. If frontend is running, restart it to pick up env changes:"
  echo "  cd frontend && npm run dev"
}

main "$@"
