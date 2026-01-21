# EPIC: Large Initiatives & Cross-Team Efforts — AragonOSX

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Active Epics:** 1 (HarmonyVoting E2E)  
**Last Updated:** 2026-01-21

---

## Overview

This document tracks large, multi-phase initiatives that span multiple features, teams, or repositories. For active sprint features, see [SPRINT.md](SPRINT.md).

---

## EPIC-001: HarmonyVoting E2E Production Rollout

**Status:** 🔄 IN_PROGRESS (Sprint 1 of 1)  
**Timeline:** 2026-01-21 to 2026-02-28  
**Priority:** CRITICAL  
**Effort:** 160 hours total

### Vision

Deliver production-ready HarmonyVoting plugin on Harmony mainnet with:

- Reliable indexing (reorg-safe, catch-up backfill, SLA monitoring)
- Safe plugin lifecycle (uninstall cleanup, re-install verification)
- Resilient metadata sourcing (fallback chain, graceful degradation)
- Native-token voting support (power computation, execution semantics)

### Acceptance Criteria

**Indexing:**

- [x] All HarmonyVoting events handled correctly
- [x] Reorg detection and recovery working (5-20 block reorgs)
- [ ] Backfill validates correctly (fresh + mid-history)
- [ ] Proposals appear in UI within SLA (< 30 seconds)

**Plugin Lifecycle:**

- [x] Install creates plugin in DAO
- [x] Uninstall revokes all permissions (zero orphans)
- [x] Uninstall emits events for UI reconciliation
- [ ] Re-install works without manual intervention

**Metadata:**

- [ ] Fallback chain (on-chain → cache → placeholder) implemented
- [ ] Invalid metadata rejected or safely degraded
- [ ] UI works even if primary gateway down
- [ ] No broken proposal displays

**Native-Token Voting:**

- [x] Power computation via RPC (staked balance)
- [x] Proposal execution supports value transfers
- [x] Indexing distinguishes native-token executions
- [ ] UI clearly shows fee/value semantics

### Deliverables (Features)

| Feature                          | Status | Effort  | Timeline                 |
| -------------------------------- | ------ | ------- | ------------------------ |
| FEATURE-001: Indexing Resilience | 75%    | 20h     | 2026-01-20 to 2026-02-04 |
| FEATURE-002: Plugin Uninstall    | 83%    | 26h     | 2026-01-26 to 2026-02-04 |
| FEATURE-003: Metadata Resilience | 33%    | 19h     | 2026-01-20 to 2026-02-11 |
| FEATURE-004: Native-Token Voting | 83%    | 28h     | 2026-01-27 to 2026-02-03 |
| **Total Active Features**        |        | **93h** |                          |

### Deliverables (Tasks)

| Task                               | Status | Effort  | Timeline                 |
| ---------------------------------- | ------ | ------- | ------------------------ |
| TASK-001: Testing & Validation     | 50%    | 22h     | 2026-01-27 to 2026-02-04 |
| TASK-002: Documentation & Runbooks | 0%     | 4h      | 2026-02-05 to 2026-02-05 |
| **Total Tasks**                    |        | **26h** |                          |

### Cross-Repo Dependencies

**Dependent Repositories:**

| Repo                   | Feature             | Status      | Blocking | Impact                         |
| ---------------------- | ------------------- | ----------- | -------- | ------------------------------ |
| **aragon-app**         | Plugin UI updates   | In Progress | Yes      | FEATURE-002, 004 UI items      |
| **Aragon-app-backend** | Event handlers      | In Progress | Yes      | FEATURE-001, 003, 004 indexing |
| **osx-plugin-foundry** | HarmonyVoting setup | Baseline    | No       | Not blocking                   |

**Handoff Timeline:**

1. 2026-01-22: AragonOSX contracts stabilize → share with backend
2. 2026-01-27: Backend handlers ready → share with app
3. 2026-02-04: All pieces integrate → begin E2E testing
4. 2026-02-28: Production-ready → deploy to Harmony mainnet

### Risks & Mitigations

| Risk                                        | Severity | Mitigation                             | Contingency                  |
| ------------------------------------------- | -------- | -------------------------------------- | ---------------------------- |
| RPC instability / non-archive node          | Medium   | Use multiple RPC endpoints             | Manual fallback endpoint     |
| Reorg edge cases during testing             | Medium   | Extensive simulation + testnet         | Continue testing in Q2       |
| Uninstall permission cleanup gaps           | High     | Multi-batch revoke + audit             | Manual cleanup script        |
| IPFS gateway reliability                    | Medium   | Multi-gateway fallback + cache         | On-chain metadata extraction |
| Native-token execution edge cases           | Low      | Comprehensive testing + security audit | Deployment delay             |
| Schedule slippage (multi-repo coordination) | Medium   | Weekly sync + daily standups           | Reduce Q2 scope              |

### Phase Timeline

**Phase 1: Foundation (Jan 21-26)**

- [x] Indexing infrastructure (reorg-safe handling + catch-up)
- [x] Native-token power provider
- [x] Uninstall event emission
- **Gate:** Reorg testing passing

**Phase 2: Integration (Jan 27 - Feb 11)**

- [ ] Metadata fallback chain
- [ ] Uninstall permission cleanup
- [ ] App native-token UX
- **Gate:** All components integrated on testnet

**Phase 3: E2E Testing (Feb 12-28)**

- [ ] Manual E2E checklist
- [ ] Reorg simulation (extended)
- [ ] Performance baseline
- [ ] Operational runbook
- **Gate:** All E2E scenarios passing

**Phase 4: Release (Mar 1-7)**

- [ ] Security audit (external)
- [ ] Final testnet verification
- [ ] Production deployment
- [ ] Monitoring setup
- **Gate:** All gates passed + sign-offs

### Success Criteria

- ✅ Indexing: 0 duplicate events on testnet (across multiple reorgs)
- ✅ Uninstall: 0 orphan permissions verified by audit
- [ ] Metadata: Fallback chain responding within 2s under all scenarios
- [ ] Native-token: 100% of executions marked correctly in UI
- [ ] E2E: Full flow (install → propose → vote → execute → uninstall) verified by QA
- [ ] Production SLA: 99.9% uptime target + <2 block indexing lag

### Lessons Learned (Post-Implementation)

_To be completed at epic closure (2026-02-28)_

- Decision: [description]
- Outcome: [what happened]
- Impact: [lessons for future epics]

---

## Future Epics (Q2 & Beyond)

### EPIC-002: Plugin Marketplace Launch (Q2 2026)

**Timeline:** 2026-04-01 to 2026-06-30  
**Priority:** MEDIUM  
**Effort:** Estimated 80 hours

- Enable DAO admins to discover and install third-party plugins
- Curate approved plugins
- Revenue model for plugin developers
- Community governance for plugin approval

### EPIC-003: Advanced Governance Features (Q3 2026)

**Timeline:** 2026-07-01 to 2026-09-30  
**Priority:** LOW  
**Effort:** Estimated 120 hours

- Proposal simulation and preview
- Multi-sig voting support
- Delegate voting flows
- Advanced permission conditions

---

## How to Create an Epic

1. **Identify scope:** Multiple features / teams / repos
2. **Define vision statement:** 1-2 sentences
3. **List acceptance criteria:** 5-10 specific goals
4. **Map features & tasks:** Link all deliverables
5. **Identify risks:** 3-5 key risks + mitigations
6. **Set timeline:** Phases + gates + target dates
7. **Get approval:** Product + tech leads sign-off

### Epic Template

```markdown
## EPIC-NNN: Title

**Status:** TODO / IN_PROGRESS / DONE
**Timeline:** YYYY-MM-DD to YYYY-MM-DD
**Priority:** CRITICAL / HIGH / MEDIUM / LOW
**Effort:** XXX hours total

### Vision

[1-2 sentences describing the big picture]

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Deliverables

| Item        | Status | Effort | Timeline                 |
| ----------- | ------ | ------ | ------------------------ |
| FEATURE-XXX | 0%     | Xh     | YYYY-MM-DD to YYYY-MM-DD |

### Cross-Repo Dependencies

[List other repos and handoff points]

### Risks & Mitigations

| Risk   | Severity | Mitigation |
| ------ | -------- | ---------- |
| Risk 1 | High     | Solution 1 |

### Phase Timeline

**Phase 1: [name] (dates)**

- [ ] Item 1
- [ ] Item 2

### Success Criteria

- [ ] Measurable criterion 1
- [ ] Measurable criterion 2
```

---

## Epic Governance

### Approval Process

1. **Draft:** Product + tech lead review (< 1 week)
2. **Align:** Cross-repo leads confirm dependencies
3. **Publish:** Epic added to EPIC.md + GitHub issues created
4. **Kickoff:** Team alignment + resource allocation

### Monthly Review (Every 1st Monday)

- [ ] Check epic progress (% complete)
- [ ] Review risks + mitigations
- [ ] Identify blockers
- [ ] Adjust timeline if needed
- [ ] Update GitHub ProjectV2

### Epic Closure (At completion)

- [ ] Mark all deliverables DONE
- [ ] Document lessons learned
- [ ] Close related GitHub issues
- [ ] Archive to `epics/epic-XXX-closeout.md`

---

## References

- [SPRINT.md](SPRINT.md) — Active sprint tracking
- [PLAN.md](PLAN.md) — Master planning document
- [FEATURE.md](FEATURE.md) — Feature tracking
- [TASK.md](TASK.md) — Task tracking
- [BUG.md](BUG.md) — Issue tracking
- [GitHub Issues](https://github.com/Axodus/AragonOSX/issues) — Issue tracker
- [GitHub Project](https://github.com/users/mzfshark/projects/5) — ProjectV2 board

---

**Last Updated:** 2026-01-21  
**Maintained By:** Development Team  
**Next Review:** 2026-02-28 (Epic closure)
