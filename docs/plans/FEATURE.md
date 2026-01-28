# FEATURE: New Functionality & Enhancements — AragonOSX

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Active Features in Sprint 1:** 4 (Indexing, Uninstall, Metadata, Native-Token)  
**Last Updated:** 2026-01-21

---

## Overview

This document tracks new features and enhancements for AragonOSX contracts. For active sprint items, see [SPRINT.md](SPRINT.md).

---

## Active Features (Sprint 1)

See [SPRINT.md](SPRINT.md) for detailed tracking of:

1. **FEATURE-001:** Indexing Resilience & Catch-Up (75% complete)
2. **FEATURE-002:** Plugin Uninstall Safety & Cleanup (83% complete)
3. **FEATURE-003:** Metadata Resilience & Fallback (50% complete)
4. **FEATURE-004:** Native-Token Voting & Execution (83% complete)

### Implemented Items (latest)

- **FEATURE-001:** Event handler framework + proposal/vote indexing — **DONE** (week 1)
- **FEATURE-001:** Event deduplication & block tracking — **DONE** (week 1)
- **FEATURE-001:** Reorg-safe handling (confirmations, idempotency, retries) — **DONE**
- **FEATURE-001:** Catch-up strategy (deployment block + checkpointing) — **DONE**
- **FEATURE-001:** Fresh sync validation from deployment block — **DONE**

- **FEATURE-002:** Uninstall revokes permissions and clears references — **DONE**
- **FEATURE-002:** Uninstall emits events for indexers/UI reconciliation — **DONE**
- **FEATURE-002:** Uninstall UX with warnings + post-uninstall state — **DONE**
- **FEATURE-002:** Backend/subgraph handles "plugin removed" state — **DONE**

- **FEATURE-003:** Metadata sources identified (on-chain hash + placeholder) — **DONE**
- **FEATURE-003:** Backend validation + TTL strategy — **DONE**

- **FEATURE-004:** Requirements defined (RPC endpoint, contract path, permission validation) — **DONE**
- **FEATURE-004:** RPC provider setup verified for power reading — **DONE**
- **FEATURE-004:** Contract path resolution validated — **DONE**
- **FEATURE-004:** Permission validation in indexing — **DONE**
- **FEATURE-004:** Native-token execution marking in indexer — **DONE**
- **FEATURE-004:** Execution path validated (native-token value transfer) — **DONE**
- **FEATURE-004:** Permission model for execution validated — **DONE**
- **FEATURE-004:** Indexer distinguishes native-token execution events — **DONE**

---

## Backlog: Future Features (Q2 & Beyond)

### Plugin Marketplace

- [ ] FEATURE-101: Plugin marketplace discovery [labels:type:feature, area:frontend] [status:BACKLOG] [priority:MEDIUM] [estimate:40h] [start:2026-03-01] [end:TBD]
      **Description:** Enable DAO admins to discover and install approved third-party plugins.

  - [ ] Design plugin registry schema [labels:type:design] [status:TODO] [priority:MEDIUM] [estimate:4h]
  - [ ] Implement registry contract [labels:type:feature, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:12h]
  - [ ] Add frontend UI for discovery [labels:type:feature, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:16h]
  - [ ] Set up curation process [labels:type:task, area:ops] [status:TODO] [priority:LOW] [estimate:8h]

### Multi-Sig Governance

- [ ] FEATURE-102: Multi-sig voting (M-of-N) [labels:type:feature, area:contracts] [status:BACKLOG] [priority:MEDIUM] [estimate:32h] [start:TBD] [end:TBD]
      **Description:** Support voting by M-of-N signers instead of token-weighted voting.

  - [ ] Design multi-sig schema [labels:type:design] [status:TODO] [priority:MEDIUM] [estimate:4h]
  - [ ] Implement voting logic [labels:type:feature, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:16h]
  - [ ] Add signature verification [labels:type:feature, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:8h]
  - [ ] Create frontend UX [labels:type:feature, area:frontend] [status:TODO] [priority:MEDIUM] [estimate:4h]

### Gas Optimization

- [ ] FEATURE-103: Optimize plugin setup gas costs [labels:type:feature, area:contracts] [status:BACKLOG] [priority:LOW] [estimate:16h] [start:2026-04-01] [end:TBD]
      **Description:** Reduce gas usage for plugin installation by 20-30%.

  - [ ] Profile current gas usage [labels:type:investigation] [status:TODO] [priority:LOW] [estimate:3h]
  - [ ] Identify optimization opportunities [labels:type:investigation] [status:TODO] [priority:LOW] [estimate:3h]
  - [ ] Implement optimizations [labels:type:feature, area:contracts] [status:TODO] [priority:LOW] [estimate:8h]
  - [ ] Benchmark improvements [labels:type:test] [status:TODO] [priority:LOW] [estimate:2h]

### Cross-Chain Support

- [ ] FEATURE-104: Support additional chains (Polygon, Arbitrum) [labels:type:feature, area:infra] [status:BACKLOG] [priority:MEDIUM] [estimate:24h] [start:2026-05-01] [end:TBD]
      **Description:** Deploy HarmonyVoting plugin to additional EVM chains.

  - [ ] Verify contract compatibility [labels:type:qa, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:6h]
  - [ ] Set up deployment scripts [labels:type:task, area:infra] [status:TODO] [priority:MEDIUM] [estimate:8h]
  - [ ] Deploy and verify on Polygon [labels:type:task, area:infra] [status:TODO] [priority:MEDIUM] [estimate:5h]
  - [ ] Deploy and verify on Arbitrum [labels:type:task, area:infra] [status:TODO] [priority:MEDIUM] [estimate:5h]

### Advanced Governance Features

- [ ] FEATURE-105: Proposal simulation & preview [labels:type:feature, area:contracts] [status:BACKLOG] [priority:LOW] [estimate:20h] [start:2026-06-01] [end:TBD]
      **Description:** Allow users to simulate proposal execution before voting.

  - [ ] Design simulation API [labels:type:design] [status:TODO] [priority:LOW] [estimate:3h]
  - [ ] Implement contract simulator [labels:type:feature, area:contracts] [status:TODO] [priority:LOW] [estimate:12h]
  - [ ] Add frontend UI [labels:type:feature, area:frontend] [status:TODO] [priority:LOW] [estimate:5h]

---

## How to Add New Features

1. **Create feature item** in the appropriate section (Active, Backlog)
2. **Use FEATURE-NNN format** (unique within repo)
3. **Include all metadata tags:** [labels], [status], [priority], [estimate], [start], [end]
4. **Add description** (2-3 sentences)
5. **Define subtasks** (4-6 items)
6. **Link to related issues** if applicable

### Feature Template

```markdown
- [ ] FEATURE-XXX: Title [labels:type:feature, area:backend] [status:TODO] [priority:MEDIUM] [estimate:20h] [start:2026-01-21] [end:TBD]
      **Description:** What is this feature? What problem does it solve?

  **Acceptance Criteria:**

  - [ ] Works on mainnet and testnet
  - [ ] Zero performance regression
  - [ ] Full test coverage
  - [ ] Documentation updated

  - [ ] Design phase [labels:type:design] [status:TODO] [priority:MEDIUM] [estimate:4h]
  - [ ] Implementation [labels:type:feature, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:12h]
  - [ ] Testing [labels:type:test] [status:TODO] [priority:MEDIUM] [estimate:4h]
```

---

## Feature Priority Matrix

| Feature             | Effort | Impact | Priority | Status  |
| ------------------- | ------ | ------ | -------- | ------- |
| Indexing Resilience | 20h    | High   | CRITICAL | 75%     |
| Plugin Uninstall    | 26h    | High   | HIGH     | 83%     |
| Metadata Resilience | 19h    | Medium | HIGH     | 33%     |
| Native-Token Voting | 28h    | High   | HIGH     | 83%     |
| Plugin Marketplace  | 40h    | Medium | MEDIUM   | Backlog |
| Multi-Sig Voting    | 32h    | Medium | MEDIUM   | Backlog |
| Gas Optimization    | 16h    | Low    | LOW      | Backlog |
| Cross-Chain Support | 24h    | Medium | MEDIUM   | Backlog |

---

## Dependencies & Blockers

### External Dependencies

- **Aragon OSx Core:** Contract interfaces and base classes
- **Harmony Chain:** Archive node + RPC endpoints
- **IPFS Network:** Metadata gateway availability
- **Subgraph:** Event schema and queries

### Internal Dependencies

- `packages/contracts/src/plugins/` — HarmonyVoting plugin
- `packages/contracts/src/setup/` — Plugin setup contract
- `packages/contracts/src/executor/` — Execution logic

---

## Version History

| Version | Date       | Features                | Status  |
| ------- | ---------- | ----------------------- | ------- |
| **1.0** | 2026-02-28 | FEATURE-001 through 004 | Target  |
| **1.1** | 2026-04-15 | FEATURE-101, 102        | Planned |
| **2.0** | 2026-06-01 | FEATURE-103, 104, 105   | Future  |

---

## References

- [SPRINT.md](SPRINT.md) — Active sprint tracking
- [PLAN.md](PLAN.md) — Master planning document
- [BUG.md](BUG.md) — Issue tracking
- [packages/contracts/README.md](packages/contracts/README.md) — Contract docs
- [GitHub Issues](https://github.com/Axodus/AragonOSX/issues) — Issue tracker

---

**Last Updated:** 2026-01-21  
**Maintained By:** Development Team  
**Next Review:** 2026-02-28 (End of Sprint 1)
