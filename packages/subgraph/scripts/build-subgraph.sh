#!/usr/bin/env bash

set -euo pipefail

if [ ! -f "./subgraph.yaml" ]; then
  echo "The file subgraph.yaml doesn’t exist. Did you run: yarn manifest?"
  exit 1
fi

rm -rf generated
rm -rf build

graph codegen

# graph-cli@0.98.x currently generates an `Int8` import in `generated/schema.ts`,
# but `@graphprotocol/graph-ts@0.27.0` does not export it.
# This line is currently unused, so we safely remove it to unblock compilation.
if [ -f "generated/schema.ts" ]; then
  sed -i '/^[[:space:]]*Int8,[[:space:]]*$/d' generated/schema.ts
fi

graph build
