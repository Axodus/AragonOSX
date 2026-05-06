# Scripts

## verify-grant.sh

Validates the Harmony admin grant transaction by checking the receipt status and on-chain permission state.

**Location:** scripts/verify-grant.sh

### Usage

```bash
bash scripts/verify-grant.sh <tx-hash> [rpc-url]
```

### Example

```bash
bash scripts/verify-grant.sh 0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47 https://api.harmony.one
```

### Output

- ✅ Verification passed when receipt status is `0x1` and `hasPermission(...)` returns `true`.
- ❌ Verification failed for any other result.

### Notes

- Harmony receipts may omit the `type` field; the script reads raw JSON via `cast rpc` and validates the status field if present.
