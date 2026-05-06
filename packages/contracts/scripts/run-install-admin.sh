#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DOTENV_CONFIG_PATH="${DOTENV_CONFIG_PATH:-$ROOT_DIR/.env.install}"

cd "$ROOT_DIR"

echo "Using env: $DOTENV_CONFIG_PATH"
echo "Running admin install script on Harmony..."

yarn hardhat run scripts/install-admin-into-dao.ts --network harmony
