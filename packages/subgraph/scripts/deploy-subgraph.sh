#!/usr/bin/env bash

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
SUBGRAPH_NAME="${SUBGRAPH_NAME%$'\r'}"
SUBGRAPH_VERSION="${SUBGRAPH_VERSION%$'\r'}"

if [ -z "${NETWORK_NAME:-}" ] || [ -z "${SUBGRAPH_NAME:-}" ] || [ -z "${GRAPH_KEY:-}" ] || [ -z "${SUBGRAPH_VERSION:-}" ]; then
  echo "env variables are not set properly, exiting..."
  exit 1
fi

set -o errexit

echo ''
echo '> Building manifest file subgraph.yaml'
bash ./scripts/build-manifest.sh

echo ''
echo '> Building subgraph'
bash ./scripts/build-subgraph.sh

if [ "${STUDIO:-}" ]; then
  # Studio subgraphs are typically created without a network suffix.
  FULLNAME="${SUBGRAPH_NAME}"
else
  FULLNAME="${SUBGRAPH_NAME}-${NETWORK_NAME}"
fi

if [ "${STAGING:-}" ]; then
  FULLNAME="${FULLNAME}-staging"
fi

echo ''
echo "> Deploying subgraph: ${FULLNAME}"
echo "> Subgraph version: ${SUBGRAPH_VERSION}"

if [ "${LOCAL:-}" ]; then
  graph deploy "${FULLNAME}" \
    --version-label "${SUBGRAPH_VERSION}" \
    --ipfs http://localhost:5001 \
    --node http://localhost:8020
elif [ "${STUDIO:-}" ]; then
  if [ "${NETWORK_NAME}" = "harmony" ]; then
    echo ""
    echo "ERROR: The Graph Studio registrar does not support network 'harmony'."
    echo "It expects an Ethereum ecosystem network (e.g., mainnet/sepolia) and rejects Harmony deployments."
    echo ""
    echo "Workarounds:"
    echo "- Deploy to Alchemy Subgraphs instead (unset STUDIO)"
    echo "- Or run your own graph-node with Harmony RPC (LOCAL=true)"
    exit 1
  fi

  # The Graph Studio deployment.
  # Note: graph-cli@0.98.x does NOT support a `--studio` flag.
  # Use Studio's deploy endpoint via `--node` and The Graph hosted IPFS API via `--ipfs`.
  # Docs: https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-studio/
  graph deploy "${FULLNAME}" \
    --version-label "${SUBGRAPH_VERSION}" \
    --ipfs "${IPFS_URL:-https://api.thegraph.com/ipfs/api/v0}" \
    --node "${GRAPH_NODE_URL:-https://api.studio.thegraph.com/deploy/}" \
    --deploy-key "${GRAPH_KEY}" > deploy-output.txt

  SUBGRAPH_ID=$(grep "Build completed:" deploy-output.txt | grep -oE "Qm[a-zA-Z0-9]{44}" || true)
  rm deploy-output.txt
  if [ -n "${SUBGRAPH_ID}" ]; then
    echo "The Graph Studio deployment complete: ${SUBGRAPH_ID}"
  else
    echo "The Graph Studio deployment completed (CID not captured in output)."
  fi
else
  graph deploy "${FULLNAME}" \
    --version-label "${SUBGRAPH_VERSION}" \
    --ipfs "${IPFS_URL:-https://api.thegraph.com/ipfs/api/v0}" \
    --node "${GRAPH_NODE_URL:-https://subgraphs.alchemy.com/api/subgraphs/deploy}" \
    --deploy-key "${GRAPH_KEY}" > deploy-output.txt

  SUBGRAPH_ID=$(grep "Build completed:" deploy-output.txt | grep -oE "Qm[a-zA-Z0-9]{44}")
  rm deploy-output.txt
  echo "The Graph deployment complete: ${SUBGRAPH_ID}"
fi