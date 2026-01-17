---
name: HarmonyVoting E2E Reliability Epic
about: Track end-to-end reliability implementation for HarmonyVoting
title: '[EPIC] HarmonyVoting E2E Reliability'
labels: ['epic', 'harmony', 'enhancement']
assignees: ''
---

## Goal
Deliver production-ready HarmonyVoting flow across contracts + indexer + backend + app, covering:
- **Reliable indexing**: Events → DB → UI/API with backfill and reorg safety
- **Safe plugin uninstall**: Full lifecycle + cleanup without reverts
- **Metadata redundancy**: Resilient sources + fallbacks for proposal metadata
- **Native-token voting**: Support for native token power computation and DAO action execution

## Current Status
- [x] HarmonyVoting contracts deployed (HIP + Delegation + Opt-In Registry)
- [x] Basic UI for validator address input and proposal creation
- [x] Backend event handlers added for ProposalCreated/VoteCast
- [ ] End-to-end validation (proposals visible in UI after indexing)
- [ ] Uninstall flow tested and reliable
- [ ] Metadata redundancy implemented
- [ ] Native token voting power computation

## Related Issues
- [ ] #TBD Backend Indexing & Backfill (Aragon-app-backend)
- [ ] #TBD UI Resilience & Fallbacks (aragon-app)
- [ ] #TBD Contract Uninstall & Native Executor (osx-plugin-foundry)

## Acceptance Criteria
- All HarmonyVoting lifecycle states appear in UI/API within defined SLA after finality
- Reindex/backfill produces identical final state (idempotent)
- Uninstall revokes permissions and removes plugin from UI/API without stale remnants
- UI/API works even if primary gateway is down (fallback succeeds)
- Proposal execution supports native token value transfers where intended

See [PLAN.md](../PLAN.md) for full details.
