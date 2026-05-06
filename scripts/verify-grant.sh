#!/usr/bin/env bash
set -euo pipefail

# Verify admin grant on Harmony DAO
# Usage: ./verify-grant.sh <tx-hash> [rpc-url]
# Example: ./verify-grant.sh 0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47 https://api.harmony.one

if [ $# -lt 1 ]; then
  echo "Usage: $0 <tx-hash> [rpc-url]"
  echo "Example: $0 0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47 https://api.harmony.one"
  exit 1
fi

TX=$1
RPC=${2:-https://api.harmony.one}

# Hardcoded values for this verification task
DAO=0x4e4841FD33b0AB482C657b1e99F96e4A33E61053
PLUGIN=0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55
WHO=0x6fbbbd953da12fc08babcbdbaec6369d517d32cc
PERM=0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889

echo "=========================================="
echo "Verify Admin Grant on Harmony DAO"
echo "=========================================="
echo ""
echo "Transaction: $TX"
echo "RPC: $RPC"
echo "DAO: $DAO"
echo "Plugin: $PLUGIN"
echo "Admin: $WHO"
echo "Permission ID: $PERM"
echo ""

# Step 1: Fetch raw receipt
echo "[1/3] Fetching raw receipt..."
RECEIPT=$(cast rpc eth_getTransactionReceipt "$TX" --rpc-url "$RPC" 2>/dev/null || echo "")
if [ -z "$RECEIPT" ]; then
  echo "❌ Error: No receipt found. Transaction may not be mined yet."
  exit 2
fi

# Step 2: Check status
echo "[2/3] Checking transaction status..."
STATUS=$(echo "$RECEIPT" | jq -r '.status // empty')
if [ -z "$STATUS" ]; then
  echo "⚠️  Warning: status field missing from receipt (Harmony may omit this)."
  STATUS="unknown"
fi

if [ "$STATUS" = "0x1" ] || [ "$STATUS" = "1" ]; then
  echo "✓ Receipt status: SUCCESS (0x1)"
  STATUS_OK=1
elif [ "$STATUS" = "0x0" ] || [ "$STATUS" = "0" ]; then
  echo "❌ Receipt status: FAILED (0x0)"
  STATUS_OK=0
else
  echo "⚠️  Receipt status: UNKNOWN ($STATUS)"
  STATUS_OK=-1
fi

# Step 3: Check on-chain permission
echo "[3/3] Checking on-chain permission via hasPermission()..."
RESULT=$(cast call --rpc-url "$RPC" "$DAO" "hasPermission(address,address,bytes32,bytes)" "$PLUGIN" "$WHO" "$PERM" 0x 2>/dev/null || echo "error")

if [ "$RESULT" = "true" ]; then
  echo "✓ Permission check: GRANTED (true)"
  PERM_OK=1
else
  echo "❌ Permission check: NOT GRANTED ($RESULT)"
  PERM_OK=0
fi

echo ""
echo "=========================================="
if [ $STATUS_OK -eq 1 ] && [ $PERM_OK -eq 1 ]; then
  echo "✓ VERIFICATION PASSED"
  echo "=========================================="
  exit 0
else
  echo "❌ VERIFICATION FAILED"
  echo "=========================================="
  exit 1
fi
