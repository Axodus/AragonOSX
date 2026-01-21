# Sprint 1: HarmonyVoting E2E Production Rollout

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Branch:** develop  
**Sprint Goal:** Deliver production-ready HarmonyVoting with safe plugin lifecycle, resilient indexing, metadata fallbacks, and native-token voting support.

**Sprint Start:** 2026-01-21  
**Sprint End:** 2026-02-28  
**Current Date:** 2026-01-21  
**Status:** Active (Week 1 of 6)

---

## Summary

| Status | Count | Hours |
|--------|-------|-------|
| ✅ DONE | 11 | ~69% complete |
| 🔄 TODO | 5 | ~47h remaining |
| **Total** | **16** | **~160h** |

---

## FEATURE-001: Indexing Resilience & Catch-Up [area:indexing, area:backend] [priority:HIGH]

**Status:** 75% complete (3/4 subtasks done, 10h remaining)  
**Completion %:** 75%  
**Remaining Effort:** 10h

- [x] Add reorg-safe handling (confirmations, idempotency keys, retries) [labels:type:task, area:indexing] [status:DONE] [priority:high] [estimate:12h] [start:2026-01-20] [end:2026-01-22]
- [x] Implement catch-up strategy (backfill from deployment block; checkpointing) [labels:type:task, area:indexing, area:infra] [status:DONE] [priority:high] [estimate:10h] [start:2026-01-22] [end:2026-01-23]
- [x] Fresh sync validation from deployment block [labels:type:qa, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-23] [end:2026-01-23]
- [ ] Mid-history backfill validation + reorg simulation [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:10h] [start:2026-01-24] [end:2026-01-26]
- [ ] Monitor and verify proposals appear in UI after creation [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]

---

## FEATURE-002: Plugin Uninstall Safety & Cleanup [area:contracts, area:frontend, area:indexing] [priority:HIGH]

**Status:** 83% complete (5/7 subtasks done, 12h remaining)  
**Completion %:** 83%  
**Remaining Effort:** 12h

- [x] Verify contracts uninstall revokes permissions and clears references [labels:type:qa, area:contracts] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-26] [end:2026-01-27]
- [x] Ensure uninstall emits events for indexers/UI reconciliation [labels:type:task, area:contracts, area:indexing, area:frontend] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [x] Implement uninstall UX with warnings + post-uninstall state [labels:type:feature, area:frontend] [status:DONE] [priority:medium] [estimate:8h] [start:2026-01-28] [end:2026-01-28]
- [x] Handle "plugin removed" state in backend/subgraph (no stale UI) [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:8h] [start:2026-01-29] [end:2026-01-29]
- [ ] Define uninstall invariants (no orphan permissions, no stuck executors) [labels:type:task, area:contracts, area:security] [status:TODO] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-30]
- [ ] Test uninstall with governance permissions (not just admin) [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:high] [estimate:6h] [start:2026-02-02] [end:2026-02-02]

---

## FEATURE-003: Metadata Redundancy & Fallback [area:backend, area:frontend] [priority:MEDIUM]

**Status:** 33% complete (2/6 subtasks done, 19h remaining)  
**Completion %:** 33%  
**Remaining Effort:** 19h

- [x] Identify metadata sources (on-chain hash, backend placeholder) [labels:type:docs, area:backend] [status:DONE] [priority:medium] [estimate:2h] [start:2025-12-16] [end:2025-12-16]
- [x] Backend validation + TTL strategy (avoid malformed data) [labels:type:task, area:backend] [status:DONE] [priority:medium] [estimate:6h] [start:2026-01-21] [end:2026-01-22]
- [ ] Define deterministic fallback order (on-chain → cached → placeholder) [labels:type:task, area:backend, area:frontend] [status:TODO] [priority:medium] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [ ] App fallback fetching + graceful degradation [labels:type:feature, area:frontend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-22] [end:2026-01-23]
- [ ] Add integrity checks (format validation, size limits) [labels:type:task, area:backend, area:security] [status:TODO] [priority:medium] [estimate:4h] [start:2026-01-23] [end:2026-01-23]
- [ ] "Metadata unavailable" state that still allows core governance [labels:type:feature, area:frontend] [status:TODO] [priority:low] [estimate:3h] [start:2026-01-24] [end:2026-01-24]

---

## FEATURE-004: Native-Token Voting Support [area:contracts, area:backend, area:frontend] [priority:HIGH]

**Status:** 83% complete (5/6 subtasks done, 6h remaining)  
**Completion %:** 83%  
**Remaining Effort:** 6h

- [x] Define requirements (RPC endpoint, contract path, permission validation) [labels:type:docs, area:contracts] [status:DONE] [priority:high] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [x] Verify contract RPC provider setup for power reading [labels:type:qa, area:contracts] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-21] [end:2026-01-21]
- [x] Validate plugin contract path resolution [labels:type:qa, area:backend] [status:DONE] [priority:high] [estimate:3h] [start:2026-01-21] [end:2026-01-21]
- [x] Verify permission validation in indexing [labels:type:qa, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-22] [end:2026-01-22]
- [x] Implement native-token proposal execution marking in indexer [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-23] [end:2026-01-23]
- [ ] Display fee/value semantics in app UI [labels:type:feature, area:frontend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-24] [end:2026-01-24]

---

## TASK-001: Backend Indexing Handler Tests [area:backend, area:testing] [priority:HIGH]

**Status:** 50% complete (1/2 subtasks done, 20h remaining)  
**Completion %:** 50%  
**Remaining Effort:** 20h

- [x] Write unit tests for HarmonyVoting event handlers [labels:type:test, area:backend, area:testing] [status:DONE] [priority:high] [estimate:20h] [start:2026-01-20] [end:2026-01-24]
- [ ] Validate execution path against on-chain state [labels:type:qa, area:backend, area:testing] [status:TODO] [priority:high] [estimate:20h] [start:2026-01-25] [end:2026-01-30]

---

## TASK-002: E2E Documentation & Guides [area:docs, area:testing] [priority:MEDIUM]

**Status:** 0% complete (0/1 subtask done, 4h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 4h

- [ ] Document E2E flow (install → propose → vote → execute → uninstall) [labels:type:docs, area:docs, area:testing] [status:TODO] [priority:medium] [estimate:4h] [start:2026-02-01] [end:2026-02-02]

---

## Sprint Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|------|----------|-----------|-------|
| RPC instability on Harmony | Medium | Multiple RPC endpoints + fallback | Backend |
| Permission revoke batch limits | High | Idempotent multi-batch revoke | Contracts |
| Metadata gateway outages | Medium | Multi-gateway fallback + cache | Backend |
| Schedule slippage (features overlap) | Medium | Daily standups + prioritized backlog | PM |
| Reorg handling edge cases | Medium | Testnet simulation + monitoring | Indexing |

---

## Cross-Repository Dependencies

| Dependency | Repository | Target | Owner | ETA |
|-----------|-----------|--------|-------|-----|
| HarmonyVoting plugin setup | AragonOSX | Feature branch | Contracts | 2026-01-22 |
| Event indexing handlers | Aragon-app-backend | PR ready | Backend | 2026-01-27 |
| Plugin UI + governance UX | aragon-app | PR review | Frontend | 2026-02-04 |

---

## Weekly Status Update Template

**Week 1 (2026-01-21 to 2026-01-27):**
- FEATURE-001 (Indexing): 75% → TARGET 85%
- FEATURE-002 (Uninstall): 83% → TARGET 95%
- FEATURE-003 (Metadata): 33% → TARGET 50%
- FEATURE-004 (Native-Token): 83% → TARGET 95%
- Blockers: BUG-001 investigation ongoing
- Next week focus: Validation tasks, metadata fallback implementation

---

## FEATURE-004: Native-Token Voting & Execution [area:backend, area:contracts, area:frontend] [priority:HIGH]

**Description:** Enable native-token power computation and execution flow with clear fee/value semantics.

- [x] Define requirements: wallet + staked balance via RPC [labels:type:docs, area:backend, area:infra] [status:DONE] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [x] Implement RPC-based power provider in backend finalizer [labels:type:feature, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-01-30]
- [x] Validate contracts execution path for native token value transfers [labels:type:qa, area:contracts] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-30]
- [x] Validate permission model for execution (who/when/conditions) [labels:type:qa, area:contracts, area:security] [status:DONE] [priority:high] [estimate:6h] [start:2026-01-30] [end:2026-01-31]
- [x] Ensure indexing distinguishes native-token execution events [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:medium] [estimate:4h] [start:2026-02-02] [end:2026-02-02]
- [ ] App shows correct fee/value semantics in review/execution [labels:type:feature, area:frontend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-02-03] [end:2026-02-03]

---

## TASK-001: Testing & Validation [area:contracts, area:backend, area:testing] [priority:MEDIUM]

**Description:** Add automated tests and run manual E2E checklist for all flows.

- [ ] Add automated tests where repo patterns allow [labels:type:test, area:contracts, area:backend] [status:TODO] [priority:medium] [estimate:14h] [start:2026-01-27] [end:2026-01-29]
  - [ ] Contracts: install/uninstall + value transfer cases [labels:type:test, area:contracts] [status:TODO] [priority:medium] [estimate:8h] [start:2026-01-27] [end:2026-01-28]
  - [x] Backend: handler unit tests for critical events [labels:type:test, area:backend] [status:DONE] [priority:medium] [estimate:6h] [start:2026-01-28] [end:2026-01-29]
- [ ] Run manual Harmony E2E checklist [labels:type:qa, area:testing] [status:TODO] [priority:high] [estimate:8h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Deploy/install plugin [labels:type:qa, area:contracts] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Create proposal [labels:type:qa, area:frontend] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Vote + reach outcome [labels:type:qa, area:frontend] [status:TODO] [priority:medium] [estimate:2h] [start:2026-02-04] [end:2026-02-04]
  - [x] Execute (native-token path if applicable) [labels:type:qa, area:contracts] [status:DONE] [priority:medium] [estimate:2h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Verify UI reflects indexed state [labels:type:qa, area:frontend, area:indexing] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]
  - [ ] Uninstall and confirm cleanup + UI state [labels:type:qa, area:contracts, area:frontend] [status:TODO] [priority:medium] [estimate:1h] [start:2026-02-04] [end:2026-02-04]

---

## TASK-002: Documentation & Runbooks [area:ops, area:docs] [priority:LOW]

**Description:** Produce operational documentation for production deployment and incident response.

- [ ] Produce operator runbook: sync start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:low] [estimate:4h] [start:2026-02-05] [end:2026-02-05]

---

## Sprint Status

- **Total items:** 16
- **Completed:** 11
- **In progress:** 0
- **Not started:** 5
- **Completion:** 69%

### Phase 4: Uninstall Safety (Week 2-3)

**Repo**: osx-plugin-foundry
**Goal**: Reliable uninstall flow

- [ ] Review and enhance prepareUninstallation
- [ ] Add comprehensive permission revocation
- [ ] Test uninstall via governance
- [ ] Test install → uninstall → reinstall cycle
- [ ] Document uninstall requirements

**Blocked by**: Phase 3 completion

**Acceptance**: Uninstall works via governance, no orphan permissions

### Phase 5: UI Uninstall Integration (Week 3)

**Repo**: aragon-app
**Goal**: Uninstall UX with state cleanup

- [ ] Implement uninstall warnings
- [ ] Handle post-uninstall state cleanup
- [ ] Prevent stale plugin data
- [ ] Test re-install flow
- [ ] Add uninstall error handling

**Blocked by**: Phase 4 completion

**Acceptance**: Clean uninstall UX with proper warnings

### Phase 6: Native Token Voting (Week 3-4)

**Repo**: osx-plugin-foundry + Aragon-app-backend
**Goal**: Native token power computation

**Contracts:**

- [ ] Design native token power provider interface
- [ ] Implement wallet + staked balance queries
- [ ] Add DAO action execution support
- [ ] Test execution flow

**Backend:**

- [ ] Extend finalizer with native token mode
- [ ] Implement RPC-based power queries
- [ ] Add caching for power computation
- [ ] Test with mainnet data

**Blocked by**: Phase 1-5 completion

**Acceptance**: Native token voting works with wallet + staked power

### Phase 7: E2E Validation (Week 4)

**All Repos**
**Goal**: Complete end-to-end testing

- [ ] Run full E2E checklist on Harmony mainnet
- [ ] Deploy/install plugin
- [ ] Create and index proposal
- [ ] Vote with various power types
- [ ] Execute proposal
- [ ] Uninstall cleanly
- [ ] Reinstall successfully
- [ ] Document any issues found
- [ ] Fix critical issues
- [ ] Re-test fixed flows

**Blocked by**: All previous phases

**Acceptance**: All acceptance criteria met across all repos

## Daily Standups

Document progress daily:

```bash
# Update PLAN.md checkboxes
# Sync with GitHub issue
gh issue edit <issue-number> --body-file PLAN.md
```

## Blockers & Dependencies

Track blockers here:

- [ ] GitHub CLI authentication (immediate)
- [ ] Archive RPC access (Phase 1)
- [ ] Harmony mainnet RPC rate limits (Phase 6)

## Rollback Plan

If critical issues found:

1. Identify affected phase
2. Revert to last stable checkpoint
3. Document issue in GitHub
4. Create hotfix plan
5. Re-test after fix

## Success Metrics

- [ ] All proposals indexed within 30s
- [ ] UI works offline with cached data
- [ ] Uninstall success rate: 100%
- [ ] Native token voting power accurate
- [ ] Zero orphan permissions after uninstall
- [ ] Reindex produces identical state

## Post-Sprint

- [ ] Update documentation
- [ ] Create operator runbook
- [ ] Schedule retrospective
- [ ] Plan next sprint
