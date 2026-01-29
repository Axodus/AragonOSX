#!/usr/bin/env bash

set -euo pipefail

load_dotenv() {
  local dotenv_file="$1"

  [ -f "$dotenv_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    if [ -z "${line//[[:space:]]/}" ]; then
      continue
    fi

    if [[ "$line" != *"="* ]]; then
      continue
    fi

    local key="${line%%=*}"
    local value="${line#*=}"

    # Handle CRLF dotenv files (common when workspace lives on Windows filesystem)
    key="${key%$'\r'}"
    value="${value%$'\r'}"

    # Handle CRLF dotenv files (common when workspace lives on Windows filesystem)
    value="${value%$'\r'}"

    key="${key//[[:space:]]/}"
    # Don't override a variable already provided by the environment
    if [ -z "${!key:-}" ]; then
      export "${key}=${value}"
    fi
  done < "$dotenv_file"
}

load_dotenv .env

# Normalize potential CRLF leftovers
NETWORK_NAME="${NETWORK_NAME%$'\r'}"

if [ -z "${NETWORK_NAME:-}" ]; then
  echo "env is not set, exiting..."
  exit 1
else
  echo "env Network is set to: ${NETWORK_NAME}"
fi

FILE="${NETWORK_NAME}.json"
DATA="manifest/data/${FILE}"

if [ -d "../contracts/artifacts" ]; then
  # Prefer local workspace artifacts (Hardhat output) to avoid relying on npm package layout.
  ARAGON_OSX_MODULE="../contracts"
else
  ARAGON_OSX_MODULE=$(node -e 'console.log(require("path").dirname(require.resolve("@aragon/osx-artifacts/package.json")))')
fi

echo "Generating manifest from data file: ${DATA}"
cat "${DATA}"

mustache \
  "${DATA}" \
  manifest/subgraph.placeholder.yaml \
  | sed -e "s#\$ARAGON_OSX_MODULE#${ARAGON_OSX_MODULE}#g" \
  > subgraph.yaml
