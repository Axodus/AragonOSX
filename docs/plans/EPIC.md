# #EPIC-001 - HarmonyVoting Production Release — E2E Reliability & Stability

**Repository:** AragonOSX (Axodus/AragonOSX)  
**End Date Goal:** 2026-02-28  
**Priority:** HIGH  
**Estimative Hours:** 160h  
**Status:** in progress

---

## Executive Summary

Cross-repository epic to deliver HarmonyVoting as production-ready voting plugin on Harmony blockchain. Focus: reliability, safety, observability, backward compatibility.

**Vision:** Enable DAOs to use HarmonyVoting with confidence — robust indexing, safe uninstall/reinstall, resilient metadata, native-token support.

**Timeline:** 6-week sprint (2026-01-21 → 2026-02-28)

---

## Subtasks (Linked)

### EPIC-001: HarmonyVoting E2E Production Release

[labels:type:epic, area:contracts, area:backend, area:frontend] [status:IN_PROGRESS] [priority:HIGH] [estimate:160h] [start:2026-01-20] [end:2026-02-28]

**Vision:** Deliver production-ready HarmonyVoting plugin on Harmony mainnet with reliable indexing, safe plugin lifecycle, resilient metadata, native-token voting support.

**Phase 1 (2026-01-21 → 2026-01-27) — Foundation & Observability:**

- [x] Event handler baseline (contracts, 40h) [labels:type:feature, area:backend] [status:DONE] [priority:CRITICAL] [estimate:40h]
- [x] Indexing catch-up strategy (backend, 35h, 40%) [labels:type:feature, area:backend] [status:IN_PROGRESS] [priority:CRITICAL] [estimate:35h]
- [ ] Monitoring setup — Prometheus + Grafana (observability, 30h) [labels:type:task, area:infra] [status:TODO] [priority:HIGH] [estimate:30h]
- [x] Setup form + validator address (app, 20h) [labels:type:feature, area:frontend] [status:DONE] [priority:HIGH] [estimate:20h]

**Phase 2 (2026-01-28 → 2026-02-11) — Resilience & Safety:**

- [x] Reorg-safe indexing (backend, 35h, 40%) [labels:type:feature, area:backend] [status:IN_PROGRESS] [priority:CRITICAL] [estimate:35h]
- [x] Plugin uninstall lifecycle (contracts, 38h, 67%) [labels:type:feature, area:contracts] [status:IN_PROGRESS] [priority:HIGH] [estimate:38h]
- [ ] Metadata redundancy + fallback (backend/app, 24h) [labels:type:feature, area:backend, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:24h]
- [ ] UI resilience (app, 24h, 33%) [labels:type:feature, area:frontend] [status:IN_PROGRESS] [priority:HIGH] [estimate:24h]

**Phase 3 (2026-02-12 → 2026-02-21) — Feature Completion:**

- [ ] Native-token voting support (contracts/backend/app, 38h, 83%) [labels:type:feature, area:contracts, area:backend] [status:IN_PROGRESS] [priority:HIGH] [estimate:38h]
- [ ] Uninstall UX refinement (app, 20h) [labels:type:feature, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:20h]
- [ ] Native-token UX (app, 18h, 25%) [labels:type:feature, area:frontend] [status:IN_PROGRESS] [priority:MEDIUM] [estimate:18h]
- [ ] Metadata caching strategy (backend, 25h, 30%) [labels:type:feature, area:backend] [status:TODO] [priority:MEDIUM] [estimate:25h]

**Phase 4 (2026-02-22 → 2026-02-28) — Testing & Release:**

- [ ] E2E testing (all repos, 26h) [labels:type:test, area:qa] [status:TODO] [priority:CRITICAL] [estimate:26h]
- [ ] Production smoke tests (backend/ops, 15h) [labels:type:test, area:ops] [status:TODO] [priority:CRITICAL] [estimate:15h]
- [ ] Release documentation (all, 8h) [labels:type:docs] [status:TODO] [priority:MEDIUM] [estimate:8h]
- [ ] Production deployment (ops, 4h) [labels:type:ops] [status:TODO] [priority:CRITICAL] [estimate:4h]

---

## Acceptance Criteria

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
- [ ] IPFS gateway downtime doesn't break UI

**Native-Token:**

- [x] Execution supports native token value transfers
- [ ] UI clearly shows fee/value semantics

**E2E & Release:**

- [ ] Full install → propose → vote → execute → uninstall flow
- [ ] 99.9% uptime SLA validated (7-day burn-in)
- [ ] Zero duplicate events in production

---

## Milestones

- **Phase 1 Complete:** 2026-01-27 (Foundation & observability ready)
- **Phase 2 Complete:** 2026-02-11 (Resilience + safety validated)
- **Phase 3 Complete:** 2026-02-21 (All features implemented)
- **Phase 4 Complete:** 2026-02-28 (Production go-live)
- **Production Burn-in:** 2026-02-28 → 2026-03-07 (7-day SLA validation)

---

## Risks & Mitigations

| Risk                                  | Severity | Mitigation                              | Contingency                                  |
| ------------------------------------- | -------- | --------------------------------------- | -------------------------------------------- |
| RPC instability delays indexing       | HIGH     | Fallback endpoints + circuit breaker    | Use fallback RPC for 24h, notify users       |
| Reorg handling edge cases             | HIGH     | Exhaustive reorg simulation tests       | Rollback to safe state, hotfix in 4h         |
| IPFS gateway downtime blocks metadata | HIGH     | Multi-gateway fallback + caching        | Serve placeholder metadata, update UI        |
| Uninstall breaks active DAOs          | HIGH     | Permission cleanup verification + tests | Manual permission revoke + emergency pause   |
| Native-token UX confusion             | MEDIUM   | Clear fee breakdown in UI               | Add in-app tutorial, defer to v1.1 if needed |
| Production deployment issues          | MEDIUM   | Smoke tests + runbook + on-call team    | Rollback in 30min + hotfix in 2h             |

---

**Version:** 2.0  
**Last Updated:** 2026-01-22  
**Template:** [EPIC.md](https://gist.github.com/mzfshark/2ab8856d6c0efc0dfa9d1f98d2a23fdf)

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
