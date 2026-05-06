# Runbook — Harmony Admin Grant (DAO.grant)

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Status:** Active  
**Last Updated:** 2026-01-28

## Purpose

Provide a repeatable, auditable procedure to grant admin permissions on Harmony DAOs when proposal-based execution fails. This runbook documents the verified workaround that uses a ROOT-permission EOA to call `DAO.grant(...)` directly.

## Scope

- Chain: Harmony Mainnet (chainId 1666600000)
- DAO: `0x4e4841FD33b0AB482C657b1e99F96e4A33E61053`
- Plugin: `0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55`
- Admin (grantee): `0x6fbbbd953da12fc08babcbdbaec6369d517d32cc`
- Permission ID: `0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889`
- Transaction: `0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47`
- RPC: `https://api.harmony.one`

## Preconditions

- Caller EOA must have ROOT permission on the target DAO.
- Confirm network and addresses are correct.
- Use a reliable RPC (Harmony archive preferred).

## Procedure

### 1) Verify current permission state

```bash
cast call --rpc-url https://api.harmony.one \
  0x4e4841FD33b0AB482C657b1e99F96e4A33E61053 \
  "hasPermission(address,address,bytes32,bytes)" \
  0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55 \
  0x6fbbbd953da12fc08babcbdbaec6369d517d32cc \
  0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889 \
  0x
```

### 2) Execute the grant (EOA with ROOT permission)

```bash
cast send --rpc-url https://api.harmony.one \
  --private-key $ROOT_PK \
  0x4e4841FD33b0AB482C657b1e99F96e4A33E61053 \
  "grant(address,address,bytes32)" \
  0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55 \
  0x6fbbbd953da12fc08babcbdbaec6369d517d32cc \
  0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889
```

### 3) Verify receipt and on-chain state

```bash
# Raw receipt (Harmony may omit type; parse raw JSON)
cast rpc eth_getTransactionReceipt 0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47 --rpc-url https://api.harmony.one | jq '.status'

# Permission check
cast call --rpc-url https://api.harmony.one \
  0x4e4841FD33b0AB482C657b1e99F96e4A33E61053 \
  "hasPermission(address,address,bytes32,bytes)" \
  0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55 \
  0x6fbbbd953da12fc08babcbdbaec6369d517d32cc \
  0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889 \
  0x
```

## Automated Verification

Use the script in this repo:

```bash
bash scripts/verify-grant.sh 0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47 https://api.harmony.one
```

## Failure Modes / Notes

- Harmony RPC may not include EIP-2718 `type` in receipts. Use raw `eth_getTransactionReceipt` and parse JSON.
- If `executeProposal` fails but direct `DAO.grant` succeeds, the issue is likely proposal-layer validation, not permission-layer checks.

## Rollback

If needed, revoke the permission using a ROOT-permission EOA:

```bash
cast send --rpc-url https://api.harmony.one \
  --private-key $ROOT_PK \
  0x4e4841FD33b0AB482C657b1e99F96e4A33E61053 \
  "revoke(address,address,bytes32)" \
  0x7422d841107b0a0e2fc74cf22b381b06ff3c6f55 \
  0x6fbbbd953da12fc08babcbdbaec6369d517d32cc \
  0xf281525e53675515a6ba7cc7bea8a81e649b3608423ee2d73be1752cea887889
```
