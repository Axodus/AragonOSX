#  #PLAN-001 - HarmonyVoting E2E Production Rollout

**Repository:** AragonOSX (Axodus/AragonOSX)  
**End Date Goal:** 2026-02-28  
**Priority:** HIGH  
**Estimative Hours:** 160h  
**Status:** in progress

---

## Executive Summary

Complete HarmonyVoting E2E flow across contracts, indexing, backend, and app with focus on production reliability, safety, and observability. This master plan coordinates Sprint 1 (2026-01-21 to 2026-02-28) across all repositories.

### Key Metrics

- **Total Planned Work:** 160h
- **Completion:** 69% (11 of 16 sprint items done)
- **Active Features:** 4 (Indexing, Uninstall, Metadata, Native-Token)
- **Open Bugs:** 3 (1 fixed, 2 under investigation)
- **Timeline:** 2026-01-21 → 2026-02-28

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

## Subtasks (Linked)

### FEATURE-001: Indexing Resilience
[labels:type:feature, area:indexing, area:backend] [status:IN_PROGRESS] [priority:HIGH] [estimate:52h] [start:2026-01-20] [end:2026-02-04]

- [x] Ensure backend handlers cover HarmonyVoting events (ProposalCreated, VoteCast) [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:HIGH] [estimate:6h] [start:2025-12-18] [end:2025-12-19]
- [x] Enable historical indexing for HarmonyVoting events [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:HIGH] [estimate:4h] [start:2025-12-19] [end:2025-12-20]
- [x] Add reorg-safe handling (confirmations, idempotency keys, retries) [labels:type:task, area:indexing] [status:DONE] [priority:HIGH] [estimate:12h] [start:2026-01-20] [end:2026-01-22]
- [x] Implement catch-up strategy (backfill from deployment block; checkpointing) [labels:type:task, area:indexing, area:infra] [status:DONE] [priority:HIGH] [estimate:10h] [start:2026-01-22] [end:2026-01-23]
- [x] Validate indexing scenarios — fresh sync from deployment block [labels:type:qa, area:indexing] [status:DONE] [priority:HIGH] [estimate:6h] [start:2026-01-23] [end:2026-01-23]
- [ ] Validate indexing scenarios — mid-history backfill [labels:type:qa, area:indexing] [status:TODO] [priority:HIGH] [estimate:4h] [start:2026-01-24] [end:2026-01-24]
- [ ] Validate indexing scenarios — reorg simulation (where feasible) [labels:type:qa, area:indexing] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-01-26] [end:2026-01-26]
- [ ] Monitor and verify proposals appear in UI after creation [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:HIGH] [estimate:4h] [start:2026-01-27] [end:2026-01-27]

### FEATURE-002: Plugin Uninstall (Safety & Cleanup)
[labels:type:feature, area:contracts, area:security] [status:IN_PROGRESS] [priority:HIGH] [estimate:38h] [start:2026-01-26] [end:2026-01-30]

- [ ] Define uninstall invariants (no orphan permissions, no stuck executors) [labels:type:task, area:contracts, area:security] [status:TODO] [priority:HIGH] [estimate:6h] [start:2026-01-26] [end:2026-01-26]
- [x] Verify contracts uninstall revokes permissions and clears references [labels:type:qa, area:contracts] [status:DONE] [priority:HIGH] [estimate:6h] [start:2026-01-26] [end:2026-01-27]
- [x] Ensure uninstall emits events for indexers/UI reconciliation [labels:type:task, area:contracts, area:indexing, area:frontend] [status:DONE] [priority:HIGH] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [x] Implement uninstall UX with warnings + post-uninstall state [labels:type:feature, area:frontend] [status:DONE] [priority:MEDIUM] [estimate:8h] [start:2026-01-28] [end:2026-01-28]
- [x] Handle "plugin removed" state in backend/subgraph (no stale UI) [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:HIGH] [estimate:8h] [start:2026-01-29] [end:2026-01-29]
- [ ] Test uninstall with governance permissions (not just admin) [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:HIGH] [estimate:6h] [start:2026-01-30] [end:2026-01-30]

### FEATURE-003: Metadata Redundancy (Resilient Proposal Metadata)
[labels:type:feature, area:backend, area:frontend] [status:IN_PROGRESS] [priority:MEDIUM] [estimate:24h] [start:2026-01-20] [end:2026-01-24]

- [x] Identify metadata sources (on-chain hash, backend placeholder) [labels:type:docs, area:backend] [status:DONE] [priority:MEDIUM] [estimate:2h] [start:2025-12-16] [end:2025-12-16]
- [ ] Define deterministic fallback order (on-chain → cached → placeholder) [labels:type:task, area:backend, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [x] Backend validation + TTL strategy (avoid malformed data) [labels:type:task, area:backend] [status:DONE] [priority:MEDIUM] [estimate:6h] [start:2026-01-21] [end:2026-01-22]
- [ ] App fallback fetching + graceful degradation [labels:type:feature, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-01-22] [end:2026-01-23]
- [ ] Add integrity checks (format validation, size limits) [labels:type:task, area:backend, area:security] [status:TODO] [priority:MEDIUM] [estimate:4h] [start:2026-01-23] [end:2026-01-23]
- [ ] "Metadata unavailable" state that still allows core governance [labels:type:feature, area:frontend] [status:TODO] [priority:LOW] [estimate:3h] [start:2026-01-24] [end:2026-01-24]

### FEATURE-004: Native-Token Voting Support
[labels:type:feature, area:contracts, area:backend] [status:IN_PROGRESS] [priority:HIGH] [estimate:38h] [start:2026-01-27] [end:2026-02-03]

- [x] Define requirements: wallet + staked balance via RPC [labels:type:docs, area:backend, area:infra] [status:DONE] [priority:HIGH] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [x] Implement RPC-based power provider in backend finalizer [labels:type:feature, area:backend, area:indexing] [status:DONE] [priority:HIGH] [estimate:12h] [start:2026-01-28] [end:2026-01-30]
- [x] Validate contracts execution path for native token value transfers [labels:type:qa, area:contracts] [status:DONE] [priority:HIGH] [estimate:6h] [start:2026-01-30] [end:2026-01-30]
- [x] Validate permission model for execution (who/when/conditions) [labels:type:qa, area:contracts, area:security] [status:DONE] [priority:HIGH] [estimate:6h] [start:2026-01-30] [end:2026-01-31]
- [x] Ensure indexing distinguishes native-token execution events [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:MEDIUM] [estimate:4h] [start:2026-02-02] [end:2026-02-02]
- [ ] App shows correct fee/value semantics in review/execution [labels:type:feature, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-02-03] [end:2026-02-03]

### FEATURE-005: End-to-End Testing & Release Readiness
[labels:type:feature, area:qa, area:testing] [status:TODO] [priority:HIGH] [estimate:26h] [start:2026-01-27] [end:2026-02-05]

- [ ] Contracts: install/uninstall + value transfer test cases [labels:type:test, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:8h] [start:2026-01-27] [end:2026-01-28]
- [x] Backend: handler unit tests for critical events [labels:type:test, area:backend] [status:DONE] [priority:MEDIUM] [estimate:6h] [start:2026-01-28] [end:2026-01-29]
- [ ] E2E checklist — Deploy/install plugin [labels:type:qa, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
- [ ] E2E checklist — Create proposal [labels:type:qa, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
- [ ] E2E checklist — Vote + reach outcome [labels:type:qa, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:2h] [start:2026-02-04] [end:2026-02-04]
- [x] E2E checklist — Execute (native-token path if applicable) [labels:type:qa, area:contracts] [status:DONE] [priority:MEDIUM] [estimate:2h] [start:2026-02-04] [end:2026-02-04]
- [ ] E2E checklist — Verify UI reflects indexed state [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:MEDIUM] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
- [ ] E2E checklist — Uninstall and confirm cleanup + UI state [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
- [ ] Produce operator runbook: sync start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:LOW] [estimate:4h] [start:2026-02-05] [end:2026-02-05]

### TASK-001: ProjectV2 Schema & Sync
[labels:type:task, area:planning] [status:TODO] [priority:LOW] [estimate:4h] [start:2026-01-19] [end:2026-01-19]

- [ ] Verify .gitissue/metadata.config.json at repo root [labels:type:chore, area:planning] [status:TODO] [priority:LOW] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Capture org project schema to tmp/<org>-project-schema.json [labels:type:task, area:planning] [status:TODO] [priority:LOW] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Reconcile checklist items with project items captured at tmp/mzfshark-project-15-items.json [labels:type:task, area:planning] [status:TODO] [priority:LOW] [estimate:1h] [start:2026-01-19] [end:2026-01-19]
- [ ] Generate .gitissue/metadata.generated.json from PLAN.md [labels:type:task, area:planning] [status:TODO] [priority:LOW] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Prepare gh issue create/edit commands for project sync [labels:type:docs, area:planning] [status:TODO] [priority:LOW] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Document PARENT_ISSUE limitation workaround (manual UI linking or UI automation) [labels:type:docs, area:planning] [status:TODO] [priority:LOW] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]

---

## Milestones

- **Milestone 1:** Baseline & Observability — 2026-01-13 → 2026-01-21 — ✅ DONE
- **Milestone 2:** Indexing Resilience — 2026-01-20 → 2026-02-04 — 🔄 69%
- **Milestone 3:** Plugin Uninstall — 2026-01-26 → 2026-01-30 — 🔄 67%
- **Milestone 4:** Metadata Redundancy — 2026-01-20 → 2026-01-24 — 🔄 33%
- **Milestone 5:** Native-Token Voting — 2026-01-27 → 2026-02-03 — 🔄 83%
- **Milestone 6:** E2E Testing & Release — 2026-01-27 → 2026-02-05 — 🔄 23%
- **Production Go-Live:** 2026-02-28

---

## Notes

### Project 15 Snapshot
Captured 100 project items from `mzfshark/projects/15` → `GitIssue-Manager/tmp/mzfshark-project-15-items.json`

### Cross-Repo Plans
- [aragon-app PLAN](../../../aragon-app/docs/plans/PLAN.md) — UI/UX updates
- [Aragon-app-backend PLAN](../../../Aragon-app-backend/docs/plans/PLAN.md) — Backend indexing
- [osx-plugin-foundry PLAN](../../../osx-plugin-foundry/docs/plans/PLAN.md) — Plugin contracts

---

**Version:** 2.0  
**Last Updated:** 2026-01-21  
**Template:** [PLAN.md](https://gist.github.com/mzfshark/2ab8856d6c0efc0dfa9d1f98d2a23fdf)
