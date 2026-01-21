# HOTFIX: Urgent Production Fixes — AragonOSX

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Last Updated:** 2026-01-21  
**Status:** No active hotfixes

---

## Overview

This document tracks critical production fixes that bypass normal sprint planning and require immediate deployment. Hotfixes are for:

- **System down** (contract cannot deploy, execute, etc.)
- **Data loss** (corruption, duplicates, missing records)
- **Security breach** (vulnerability exploited in production)
- **Critical governance failure** (voting broken, execution prevented)

---

## Emergency Response Process

### 1. Alert (t=0)

- [ ] Page on-call engineer immediately
- [ ] Post to #incidents Slack channel
- [ ] Create GitHub issue: `[URGENT] Hotfix: [Title]`
- [ ] Set priority label: `type:hotfix` + `priority:critical`

### 2. Investigation (t=0-30min)

- [ ] Verify issue reproducibility
- [ ] Assess impact (how many DAOs affected?)
- [ ] Identify root cause
- [ ] Determine if rollback is needed

### 3. Fix (t=30min-3h)

- [ ] Develop minimal fix (not full refactor)
- [ ] Test thoroughly on local + testnet
- [ ] Create PR with hotfix
- [ ] Get expedited code review (15min SLA)

### 4. Deploy & Monitor (t=3h-4h)

- [ ] Deploy to testnet first (if possible)
- [ ] Deploy to mainnet
- [ ] Monitor metrics (errors, gas, execution)
- [ ] Verify fix resolves issue

### 5. Communicate (t=4h+)

- [ ] Notify affected DAO admins (email)
- [ ] Post resolution in #incidents
- [ ] Schedule post-mortem (48h)
- [ ] Document in HOTFIX.md

---

## Active Hotfixes

_None currently active._

---

## Historical Hotfixes (Reference)

### HOTFIX-2026-001: Reorg Duplicate Vote Events (RESOLVED)

**Status:** ✅ FIXED (2026-01-22)  
**Severity:** Critical  
**Impact:** 2 DAOs affected  
**SLA:** Deployed in 4 hours ✅

**Timeline:**

- 2026-01-20 14:00 — Issue discovered in testnet logs
- 2026-01-20 14:30 — Root cause identified (missing idempotency)
- 2026-01-20 16:00 — Fix implemented + tested
- 2026-01-20 18:00 — Deployed to testnet
- 2026-01-21 08:00 — Deployed to mainnet (after burn-in)
- 2026-01-21 16:00 — Post-mortem completed

**Lessons Learned:**

1. Need idempotency tests before merging event handlers
2. Add reorg simulation to critical path testing
3. Create pre-deploy checklist: "Test reorg scenarios"

---

## Hotfix SLA Levels

| Severity     | SLA   | Definition                       | Example                             |
| ------------ | ----- | -------------------------------- | ----------------------------------- |
| **Critical** | 2-4h  | System down, data loss, security | Vote duplication, contract stuck    |
| **High**     | 4-8h  | Major functionality broken       | Uninstall fails, execution reverted |
| **Medium**   | 8-24h | Workaround exists, poor UX       | Edge case bug, slow query           |

---

## Hotfix Rollback Plan Template

Always prepare a rollback before deploying:

```markdown
**Rollback Plan:**

1. **Detection (< 5 min):**

   - Alert on error rate > 10%
   - Verify with manual test

2. **Preparation (< 10 min):**

   - Access deployment system
   - Verify previous version is stable
   - Prepare rollback command

3. **Execution (< 5 min):**

   - Deploy previous version
   - Verify error rate drops

4. **Verification (< 5 min):**
   - Test critical flows
   - Monitor metrics for 10 min
   - Confirm stable

**Total rollback time:** 25 minutes max
```

---

## Hotfix Communication Template

When hotfix is active:

```
🚨 INCIDENT: [Title]

**Status:** INVESTIGATING → IN_PROGRESS → MONITORING → RESOLVED

**ETA:** [time]

**Impact:** [number] affected DAOs

**Workaround:** [if available]

**Updates:**
- 14:00 — Issue reported
- 14:30 — Root cause identified
- 16:00 — Fix deployed to testnet
- 18:00 — Fix deployed to mainnet
- RESOLVED — Issue verified fixed
```

**Post-Mortem:** Scheduled for [date]

---

## Post-Mortem Template

After hotfix is stable, schedule post-mortem within 48 hours:

```markdown
**POST-MORTEM: [Title]**

Date: YYYY-MM-DD  
Attendees: [names]

**Timeline:**

- t=00:00 — Issue reported by [source]
- t=00:30 — Root cause identified
- t=03:00 — Fix deployed to testnet
- t=04:00 — Fix deployed to mainnet
- t=06:00 — System stable

**Root Cause:**
[Technical explanation]

**Why wasn't this caught earlier?**

1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

**Action Items:**

1. [ ] [Action] — Owner: [person]
2. [ ] [Action] — Owner: [person]
3. [ ] [Action] — Owner: [person]

**Preventive Measures:**

1. [Measure 1] — Prevents [root cause]
2. [Measure 2] — Prevents [root cause]
3. [Measure 3] — Prevents [root cause]

**Follow-up:**

- [ ] Deploy preventive measures to production
- [ ] Update pre-deploy checklist
- [ ] Schedule training for team
```

---

## How to Declare a Hotfix

1. **Verify urgency:** Does this need emergency fix SLA?

   - Yes: Follow hotfix process
   - No: File normal bug in BUG.md

2. **Alert team:** Post to #incidents with severity

3. **Document:** Create hotfix issue in GitHub with template

4. **Fix & deploy:** Follow 5-step emergency response process

5. **Post-mortem:** Schedule within 48h of resolution

---

## Hotfix Checklist

- [ ] Issue verified reproducible
- [ ] Root cause identified
- [ ] Minimal fix developed (< 50 lines)
- [ ] Local testing passed
- [ ] Testnet deployment successful
- [ ] Mainnet deployment prepared
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Affected DAOs notified
- [ ] Post-mortem scheduled
- [ ] Preventive measures documented

---

## Common Hotfix Scenarios

### Scenario: Contract Function Reverted

**Symptoms:**

- Proposal creation fails
- Execute transactions reverting
- Error: `revert: [reason]`

**Investigation:**

1. Check contract code for new assertions
2. Verify state changes (permissions, DAOs, etc.)
3. Test on local fork
4. Identify which action triggers revert

**Fix:**

1. Patch assertion condition
2. Deploy new contract version
3. Re-execute failed transactions

**Prevention:**

1. Add assertion tests
2. Test with real DAOs on testnet
3. Pre-deploy checklist: "Test with existing DAOs"

### Scenario: Indexing Lag or Data Loss

**Symptoms:**

- Proposals don't appear in UI
- Vote counts missing
- Lag > 5 blocks

**Investigation:**

1. Check indexer logs for errors
2. Query database for missing events
3. Verify RPC connectivity
4. Check for reorg or chain reorganization

**Fix:**

1. Fix root cause (RPC, handler, DB)
2. Reindex affected block range
3. Verify data integrity

**Prevention:**

1. Monitoring alerts for indexing lag
2. Automated reindex triggers
3. Data integrity tests

### Scenario: Permission or Access Control Bug

**Symptoms:**

- Users can't create proposals
- Execution fails on permission check
- DAOs locked out

**Investigation:**

1. Query permission state
2. Verify role assignments
3. Check permission grant/revoke events
4. Test permission checks locally

**Fix:**

1. Grant missing permission (temporary)
2. Patch permission logic
3. Revoke temporary grant after fix deploys

**Prevention:**

1. Permission audit before release
2. E2E permission tests
3. Pre-deploy: "Verify all roles assigned"

---

## References

- [SPRINT.md](SPRINT.md) — Active sprint tracking
- [PLAN.md](PLAN.md) — Master planning document
- [BUG.md](BUG.md) — Issue tracking (for non-urgent bugs)
- [GitHub Issues](https://github.com/Axodus/AragonOSX/issues?q=label%3Atype%3Ahotfix) — Hotfix issues
- [#incidents](https://slack.com) — Slack incident channel

---

**Version:** 1.0  
**Last Updated:** 2026-01-21  
**Status:** No active incidents  
**On-Call:** [rotation schedule]  
**Escalation:** [contact info]
