#!/usr/bin/env bash
set -euo pipefail
START=83578597
END=83579597
STEP=100
PROCESSOR=0x6300477942944d2501db08cD5b7e37DC6423E77C
RPC="https://api.harmony.one"
DAO="0x4e4841fd33b0ab482c657b1e99f96e4a33e61053"
TMPFILE=$(mktemp)
jq_filter=' .[] |
  select(
    (.topics[0] == "0x74e616c7264536b98a5ec234d051ae6ce1305bf05c85f9ddc112364440ccf129")
    or (.topics[0] == "0x24565610ddf61ee73e8501d7f0454657c71f5944882f5c586d7246bf43e13cda")
    or (.topics[0] == "0xa0e5d4ce6420a0e7a5f0ac10c47b3a672fb661c11f5609bb21b68644d81e17aa")
  ) |
  select((.topics[1] | ascii_downcase) | endswith($dao)) |
  (.topics[2] | sub("^0x";"") | .[-40:] | "0x" + .) '

for ((b=START; b<=END; b+=STEP)); do
  to=$((b+STEP-1))
  if [ "$to" -gt "$END" ]; then to=$END; fi
  echo "querying blocks $b-$to" >&2
  cast logs --address "$PROCESSOR" --rpc-url "$RPC" --from-block "$b" --to-block "$to" --json 2>/dev/null \
    | jq -r --arg dao "$DAO" "$jq_filter" >> "$TMPFILE" || true
  sleep 0.2
done
sort -u "$TMPFILE"
rm -f "$TMPFILE"
