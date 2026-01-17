# HarmonyVoting E2E Reliability Plan

## Goal

Deliver production-ready HarmonyVoting flow across contracts + indexer + backend + app, covering:

- **Reliable indexing**: Events → DB → UI/API with backfill and reorg safety
- **Safe plugin uninstall**: Full lifecycle + cleanup without reverts
- **Metadata redundancy**: Resilient sources + fallbacks for proposal metadata
- **Native-token voting**: Support for native token power computation and DAO action execution

## Scope

- Harmony network support completion
- E2E flows: install → propose/vote → execute → uninstall → re-install
- Backward compatible changes unless explicitly versioned

## Dependencies / Integration Points

- **Contracts**: AragonOSX packages/contracts (HarmonyVoting plugin + setup + executor)
- **Indexing**: Subgraph + backend indexer pipelines (event schemas, handlers, persistence)
- **App**: Network definitions, plugin UI, governance flows, uninstall UX
- **Infra**: RPC endpoints, archive access, block explorer APIs, IPFS gateways

## Current Status

- [x] HarmonyVoting contracts deployed (HIP + Delegation + Opt-In Registry)
- [x] Basic UI for validator address input and proposal creation
- [x] Backend event handlers added for ProposalCreated/VoteCast
- [ ] End-to-end validation (proposals visible in UI after indexing)
- [ ] Uninstall flow tested and reliable
- [ ] Metadata redundancy implemented
- [ ] Native token voting power computation

## Milestones & Tasks

### 1) Baseline + Observability

- [x] Define golden path E2E scenarios (install/vote/execute/uninstall)
- [x] Capture current event set for HarmonyVoting (ProposalCreated, VoteCast)
- [ ] Add structured logs/metrics for indexing gaps per event type
- [x] Confirm chain IDs, RPCs, explorers for Harmony mainnet

### 2) Indexing (E2E Correctness + Resilience)

- [x] Ensure backend handlers cover HarmonyVoting events (ProposalCreated, VoteCast)
- [x] Enable historical indexing for HarmonyVoting events
- [ ] Add reorg-safe handling (confirmations, idempotency keys, retries)
- [ ] Implement catch-up strategy (backfill from deployment block; checkpointing)
- [ ] Validate indexing on:
  - [ ] Fresh sync from deployment block
  - [ ] Mid-history backfill
  - [ ] Reorg simulation (where feasible)
- [ ] Monitor and verify proposals appear in UI after creation

### 3) Plugin Uninstall (Safety + Cleanup)

- [ ] Define uninstall invariants (no orphan permissions, no stuck executors)
- [ ] Contracts: verify uninstall path revokes permissions and clears references
- [ ] Ensure uninstall emits events needed for indexers/UI reconciliation
- [ ] App: implement uninstall UX with clear warnings + post-uninstall state
- [ ] Backend/subgraph: handle "plugin removed" state correctly (no stale UI)
- [ ] Test uninstall with governance permissions (not just admin)

### 4) Metadata Redundancy (Resilient Proposal Metadata)

- [x] Identify metadata sources (on-chain bytes32 hash, placeholder in backend)
- [ ] Define deterministic fallback order (on-chain → cached → placeholder)
- [ ] Backend: implement validation + TTL strategy (avoid serving malformed data)
- [ ] App: fallback fetching + graceful degradation (no hard crash)
- [ ] Add integrity checks (format validation, size limits)
- [ ] Add "metadata unavailable" state that still allows core governance

### 5) Native-Token Voting Support

- [ ] Define requirements: wallet balance + staked balance via RPC
- [ ] Implement RPC-based power provider in backend finalizer
- [ ] Contracts: validate execution path for native token value transfers
- [ ] Validate permission model for execution (who can execute, when, conditions)
- [ ] Indexing: ensure execution events distinguish native-token execution
- [ ] App: show correct fee/value semantics in review + execution confirmations

### 6) End-to-End Testing & Release Readiness

- [ ] Add automated tests where repo patterns allow:
  - [ ] Contracts: install/uninstall + execution value transfer cases
  - [ ] Backend: handler unit tests for critical events
- [ ] Run manual E2E checklist on Harmony:
  - [ ] Deploy/install plugin
  - [ ] Create proposal
  - [ ] Vote + reach outcome
  - [ ] Execute (native-token path if applicable)
  - [ ] Verify UI reflects indexed state
  - [ ] Uninstall and confirm cleanup + UI state
- [ ] Produce operator runbook: sync start block, reindex steps, rollback steps

## Acceptance Criteria

- **Indexing**:
  - All HarmonyVoting lifecycle states appear in UI/API within defined SLA after finality
  - Reindex/backfill produces identical final state (idempotent)
- **Uninstall**:
  - Uninstall revokes permissions and removes plugin from UI/API without stale remnants
  - Re-install works without manual intervention
- **Metadata**:
  - UI/API works even if primary gateway is down (fallback succeeds)
  - Invalid metadata is rejected or safely degraded (no broken UI)
- **Native-token voting**:
  - Proposal execution supports native token value transfers where intended
  - Indexing and UI clearly indicate native-token execution and resulting effects

## Risks / Rollback

- **RPC instability / non-archive limitations**:
  - Mitigation: configurable start blocks, checkpointing, fallback RPCs
  - Rollback: pause indexing, switch RPC, rerun backfill
- **Reorgs causing inconsistent state**:
  - Mitigation: confirmations + idempotent handlers + reorg-safe storage keys
  - Rollback: reindex from last stable checkpoint
- **Uninstall breaking active DAOs**:
  - Mitigation: explicit UX warnings + preflight checks + staged rollout
  - Rollback: disable uninstall UI, deploy hotfix to prevent execution paths
- **Metadata gateway outages**:
  - Mitigation: caching + multi-gateway strategy
  - Rollback: serve cached metadata only; temporary "read-only metadata" mode
- **Native-token execution edge cases**:
  - Mitigation: explicit tests for value handling and permission gating
  - Rollback: feature flag native-token execution; fall back to token-based executor

## Out of Scope (for this plan)

- New voting algorithms or tokenomics changes
- Major UI redesign unrelated to HarmonyVoting flows
- Non-Harmony networks unless required for shared code paths

## Related Plans

- [aragon-app/PLAN.md](../aragon-app/PLAN.md) - UI/UX updates
- [Aragon-app-backend/PLAN.md](../Aragon-app-backend/PLAN.md) - Backend indexing
- [osx-plugin-foundry/PLAN.md](../osx-plugin-foundry/PLAN.md) - Contract implementations
