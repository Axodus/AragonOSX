# PLAN: AragonOSX — HarmonyVoting E2E Production Rollout

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Current Branch:** develop  
**Default Branch:** develop  
**Last Updated:** 2026-01-21  
**Status:** Active

---

## Executive Summary

Complete HarmonyVoting E2E flow across contracts, indexing, backend, and app with focus on production reliability, safety, and observability. This is the master planning document for Sprint 1 (2026-01-21 to 2026-02-28).

### Key Metrics

- **Total Planned Work:** 160 hours
- **Completion:** 69% (11 of 16 sprint items done)
- **Active Features:** 4 (Indexing, Uninstall, Metadata, Native-Token)
- **Open Bugs:** 3 (1 fixed, 2 under investigation)
- **Timeline:** 6-week sprint, targeting 2026-02-28 release

---

## Context & Vision

### Goal

Deliver production-ready HarmonyVoting flow covering:

- **Reliable indexing:** Events → DB → UI/API with backfill and reorg safety
- **Safe plugin uninstall:** Full lifecycle + cleanup without reverts
- **Metadata resilience:** Fallback sourcing + graceful degradation
- **Native-token voting:** Power computation and DAO execution support

### Scope

- Harmony network support completion
- E2E flows: install → propose/vote → execute → uninstall → re-install
- Backward compatible changes unless explicitly versioned

### Acceptance Criteria

- [x] Indexing: All lifecycle states appear in UI/API within SLA after finality
- [x] Indexing: Reindex/backfill produces identical final state (idempotent)
- [x] Uninstall: Revokes permissions and removes plugin without stale remnants
- [ ] Uninstall: Re-install works without manual intervention (in progress)
- [ ] Metadata: UI/API works even if primary gateway down
- [ ] Metadata: Invalid metadata rejected or safely degraded (no broken UI)
- [x] Native-token: Proposal execution supports native token value transfers
- [x] Native-token: Indexing and UI indicate native-token execution clearly

### Dependencies & Integration Points

| Component        | Repository                   | Status      | Notes                           |
| ---------------- | ---------------------------- | ----------- | ------------------------------- |
| **Plugin Setup** | AragonOSX/packages/contracts | In Progress | HarmonyVoting setup contract    |
| **Indexing**     | Aragon-app-backend           | In Progress | Event handlers + reorg recovery |
| **Subgraph**     | AragonOSX/packages/subgraph  | Baseline    | Event schema definitions        |
| **Frontend**     | aragon-app                   | In Progress | Plugin UI + governance flows    |
| **RPC/Archive**  | External                     | Stable      | Harmony mainnet archive node    |

### Known Risks & Mitigations

| Risk                              | Severity | Mitigation                              | Status         |
| --------------------------------- | -------- | --------------------------------------- | -------------- |
| RPC instability / non-archive     | Medium   | Use multiple RPC endpoints + fallback   | ✅ Active      |
| Reorgs causing inconsistent state | Medium   | Idempotency keys + upsert pattern       | ✅ Fixed       |
| Uninstall breaking active DAOs    | High     | Permission cleanup verification + tests | 🔄 In progress |
| Metadata gateway outages          | Medium   | Multi-gateway fallback + cache          | 🔄 In progress |
| Native-token edge cases           | Low      | Execution path validation + tests       | ✅ Fixed       |

---

## Milestone Breakdown

### ✅ Milestone 1: Baseline & Observability (COMPLETED)

**Status:** 100% complete (2026-01-13 → 2026-01-21)

- [x] Define golden path E2E scenarios
- [x] Capture event set for HarmonyVoting
- [x] Add structured logs/metrics for indexing
- [x] Confirm chain IDs, RPCs, explorers

**Outcome:** Baseline established; monitoring infrastructure ready.

---

### 🔄 Milestone 2: Indexing Resilience (69% COMPLETE)

**Status:** In Progress (2026-01-20 → 2026-02-04)  
**Target:** Reorg-safe indexing with catch-up + backfill

- [x] Ensure backend handlers cover HarmonyVoting events (ProposalCreated, VoteCast) [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2025-12-18] [end:2025-12-19]
- [x] Enable historical indexing for HarmonyVoting events [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:high] [estimate:4h] [start:2025-12-19] [end:2025-12-20]
- [x] Add reorg-safe handling (confirmations, idempotency keys, retries) [labels:type:task, area:indexing] [status:DONE] [priority:high] [estimate:12h] [start:2026-01-20] [end:2026-01-22] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Implement catch-up strategy (backfill from deployment block; checkpointing) [labels:type:task, area:indexing, area:infra] [status:DONE] [priority:high] [estimate:10h] [start:2026-01-22] [end:2026-01-23] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Validate indexing scenarios [labels:type:qa, area:indexing] [status:DONE] [priority:high] [estimate:16h] [start:2026-01-23] [end:2026-01-26] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
  - [x] Fresh sync from deployment block [labels:type:qa, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-23] [end:2026-01-23] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
  - [ ] Mid-history backfill [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-24] [end:2026-01-24]
  - [ ] Reorg simulation (where feasible) [labels:type:qa, area:indexing] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-26] [end:2026-01-26]
- [ ] Monitor and verify proposals appear in UI after creation [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]

## Milestone: Plugin Uninstall (Safety & Cleanup)

- [ ] Define uninstall invariants (no orphan permissions, no stuck executors) [labels:type:task, area:contracts, area:security] [status:TODO] [priority:high] [estimate:6h] [start:2026-01-26] [end:2026-01-26]
- [x] Verify contracts uninstall revokes permissions and clears references [labels:type:qa, area:contracts] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-26] [end:2026-01-27] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Ensure uninstall emits events for indexers/UI reconciliation [labels:type:task, area:contracts, area:indexing, area:frontend] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Implement uninstall UX with warnings + post-uninstall state [labels:type:feature, area:frontend] [status:DONE] [priority:medium] [estimate:8h] [start:2026-01-28] [end:2026-01-28] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Handle "plugin removed" state in backend/subgraph (no stale UI) [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:8h] [start:2026-01-29] [end:2026-01-29] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [ ] Test uninstall with governance permissions (not just admin) [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-30]

## Milestone: Metadata Redundancy (Resilient Proposal Metadata)

- [x] Identify metadata sources (on-chain hash, backend placeholder) [labels:type:docs, area:backend] [status:DONE] [priority:medium] [estimate:2h] [start:2025-12-16] [end:2025-12-16]
- [ ] Define deterministic fallback order (on-chain → cached → placeholder) [labels:type:task, area:backend, area:frontend] [status:TODO] [priority:medium] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [x] Backend validation + TTL strategy (avoid malformed data) [labels:type:task, area:backend] [status:DONE] [priority:medium] [estimate:6h] [start:2026-01-21] [end:2026-01-22] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [ ] App fallback fetching + graceful degradation [labels:type:feature, area:frontend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-22] [end:2026-01-23]
- [ ] Add integrity checks (format validation, size limits) [labels:type:task, area:backend, area:security] [status:TODO] [priority:medium] [estimate:4h] [start:2026-01-23] [end:2026-01-23]
- [ ] "Metadata unavailable" state that still allows core governance [labels:type:feature, area:frontend] [status:TODO] [priority:low] [estimate:3h] [start:2026-01-24] [end:2026-01-24]

## Milestone: Native-Token Voting Support

- [x] Define requirements: wallet + staked balance via RPC [labels:type:docs, area:backend, area:infra] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Implement RPC-based power provider in backend finalizer [labels:type:feature, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-01-30] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Validate contracts execution path for native token value transfers [labels:type:qa, area:contracts] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-30] [matched:https://github.com/mzfshark/CryptoDraw/pull/1]
- [x] Validate permission model for execution (who/when/conditions) [labels:type:qa, area:contracts, area:security] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-31] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [x] Ensure indexing distinguishes native-token execution events [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:medium] [estimate:4h] [start:2026-02-02] [end:2026-02-02] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [ ] App shows correct fee/value semantics in review/execution [labels:type:feature, area:frontend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-02-03] [end:2026-02-03]

## Milestone: End-to-End Testing & Release Readiness

- [ ] Add automated tests where repo patterns allow [labels:type:test, area:contracts, area:backend] [status:TODO] [priority:medium] [estimate:14h] [start:2026-01-27] [end:2026-01-29]
  - [ ] Contracts: install/uninstall + value transfer cases [labels:type:test, area:contracts] [status:TODO] [priority:medium] [estimate:8h] [start:2026-01-27] [end:2026-01-28]
  - [x] Backend: handler unit tests for critical events [labels:type:test, area:backend] [status:DONE] [priority:medium] [estimate:6h] [start:2026-01-28] [end:2026-01-29] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
- [ ] Run manual Harmony E2E checklist [labels:type:qa, area:testing] [status:TODO] [priority:high] [estimate:8h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Deploy/install plugin [labels:type:qa, area:contracts] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Create proposal [labels:type:qa, area:frontend] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Vote + reach outcome [labels:type:qa, area:frontend] [status:TODO] [priority:medium] [estimate:2h] [start:2026-02-04] [end:2026-02-04]
  - [x] Execute (native-token path if applicable) [labels:type:qa, area:contracts] [status:DONE] [priority:medium] [estimate:2h] [start:2026-02-04] [end:2026-02-04] [matched:https://github.com/ThinkinCoin/Docs/pull/16]
  - [ ] Verify UI reflects indexed state [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Uninstall and confirm cleanup + UI state [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
- [ ] Produce operator runbook: sync start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:low] [estimate:4h] [start:2026-02-05] [end:2026-02-05]

## Project 15 snapshot (mzfshark/projects/15)

- Extracted 100 project items from `mzfshark/projects/15` and saved a raw capture to: `GitIssue-Manager/tmp/mzfshark-project-15-items.json`.
- A lightweight pointer file was created at `tmp/mzfshark-project-15-items.json` in this repository: [tmp/mzfshark-project-15-items.json](tmp/mzfshark-project-15-items.json).

Suggested next steps:

- Review the captured project items and decide which checklist entries in this `PLAN.md` correspond to existing project issues. I did not auto-mark checklist items as completed to avoid false positives.
- If you want automatic matching (title-based) and marking, confirm and I will run a targeted pass to update matching checklist items and prepare a commit.

Notes:

- The captured project contains items from multiple repositories and includes issues and pull requests; some items are labeled with prefixes (e.g., `01 - ...`, `[Plan]`, `[Country Integration]`, `[Epic] Harmony Voting E2E: ...`).
- File with full raw JSON output: `GitIssue-Manager/tmp/mzfshark-project-15-items.json` (100 items).

## Milestone: ProjectV2 Schema & Sync

- [ ] Verify .gitissue/metadata.config.json at repo root [labels:type:chore, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Capture org project schema to tmp/<org>-project-schema.json [labels:type:task, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Reconcile checklist items with project items captured at tmp/mzfshark-project-15-items.json [labels:type:task, area:planning] [status:TODO] [priority:low] [estimate:1h] [start:2026-01-19] [end:2026-01-19]
- [ ] Generate .gitissue/metadata.generated.json from PLAN.md [labels:type:task, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Prepare gh issue create/edit commands for project sync (request approval before running) [labels:type:docs, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Document workaround for PARENT_ISSUE field limitation in GitHub ProjectV2 (manual UI linking or UI automation) [labels:type:docs, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
