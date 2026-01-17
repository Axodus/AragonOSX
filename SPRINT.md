# Sprint Execution Checklist

## Sprint Goal
Complete HarmonyVoting E2E reliability implementation across all repositories.

## Execution Order (Linear, Coordinated)

### Phase 1: Backend Indexing Foundation (Week 1)
**Repo**: Aragon-app-backend
**Goal**: Reliable event indexing with backfill

- [ ] Add idempotency checks to event handlers
- [ ] Implement reorg detection and recovery
- [ ] Create backfill job with configurable start block
- [ ] Add monitoring metrics (lag, success rate)
- [ ] Test fresh sync from deployment block
- [ ] Test mid-history backfill
- [ ] Validate proposals appear in UI

**Acceptance**: All on-chain proposals visible in UI within 30s

### Phase 2: UI Resilience (Week 1-2)
**Repo**: aragon-app
**Goal**: Graceful degradation and fallbacks

**Can run in parallel with Phase 1:**
- [ ] Implement metadata fallback system
- [ ] Add error boundaries around plugin components
- [ ] Create loading states for all data fetches
- [ ] Handle API failures with retry logic
- [ ] Test offline mode with cached data

**Acceptance**: UI works even when backend API is down

### Phase 3: Contract Event Completeness (Week 2)
**Repo**: osx-plugin-foundry
**Goal**: Audit and enhance events for indexing

- [ ] Audit current event coverage
- [ ] Document event schemas
- [ ] Add tests for event emission
- [ ] Consider event enhancements (creator field)
- [ ] Deploy updated contracts if needed

**Acceptance**: Events provide all data needed by indexers

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
