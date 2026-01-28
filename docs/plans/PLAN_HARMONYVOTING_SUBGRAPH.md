# [PLAN] HarmonyVoting Subgraph Mappings

**Repository:** AragonOSX (Axodus/AragonOSX)  
**Slug:** `PLAN-HarmonyVotingSG`  
**Related:** [PLAN-HarmonyVoting (Contracts)](../../../osx-plugin-foundry/docs/plans/PLAN_HARMONYVOTING_FIXES.md)  
**End Date Goal:** 2026-02-15  
**Priority:** HIGH  
**Estimative Hours:** 20h  
**Status:** TODO

---

## Executive Summary

This plan addresses subgraph indexing for HarmonyVoting plugins. The subgraph needs to map events from NativeTokenVoting, DelegationVoting, and HIPVoting contracts to enable frontend queries.

### Problem Summary (Subgraph Scope)

| Issue                    | Symptom                        | Root Cause Hypothesis                        |
| ------------------------ | ------------------------------ | -------------------------------------------- |
| Proposals not indexed    | Frontend can't query proposals | No mapping for HarmonyVoting ProposalCreated |
| Votes not tracked        | Vote counts missing            | No VoteCast event handler                    |
| Validator not exposed    | Can't query validator by DAO   | No ValidatorConfigured mapping               |
| Allowlist status unknown | HIPVoting install blocked      | No AllowlistRequested/Granted mapping        |

---

## Hierarchy Overview

```
[PLAN] HarmonyVoting Subgraph Mappings (this document)
├── [PLAN-HarmonyVotingSG | SPRINT-001] Schema & ABI Setup
│   ├── TASK-001: Add HarmonyVoting ABIs
│   ├── TASK-002: Define schema entities
│   └── TASK-003: Configure data sources in subgraph.yaml
└── [PLAN-HarmonyVotingSG | SPRINT-002] Mappings & Deployment
    ├── TASK-001: Implement NativeTokenVoting mappings
    ├── TASK-002: Implement DelegationVoting mappings
    ├── TASK-003: Implement HIPVoting mappings
    ├── TASK-004: Local graph-node testing
    └── TASK-005: Deploy to hosted service
```

---

## Sprints (Linked)

### [PLAN-HarmonyVotingSG | SPRINT-001] Schema & ABI Setup

- [ ] [PLAN-HarmonyVotingSG | SPRINT-001 | TASK-001] Add HarmonyVoting ABIs [key:01JK8SG00001] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-001 | TASK-002] Define schema entities [key:01JK8SG00002] [status:TODO] [priority:HIGH] [estimate:3h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-001 | TASK-003] Configure data sources in subgraph.yaml [key:01JK8SG00003] [status:TODO] [priority:HIGH] [estimate:2h]

### [PLAN-HarmonyVotingSG | SPRINT-002] Mappings & Deployment

- [ ] [PLAN-HarmonyVotingSG | SPRINT-002 | TASK-001] Implement NativeTokenVoting mappings [key:01JK8SG00004] [status:TODO] [priority:HIGH] [estimate:4h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-002 | TASK-002] Implement DelegationVoting mappings [key:01JK8SG00005] [status:TODO] [priority:HIGH] [estimate:4h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-002 | TASK-003] Implement HIPVoting mappings [key:01JK8SG00006] [status:TODO] [priority:MEDIUM] [estimate:3h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-002 | TASK-004] Local graph-node testing [key:01JK8SG00007] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] [PLAN-HarmonyVotingSG | SPRINT-002 | TASK-005] Deploy to hosted service [key:01JK8SG00008] [status:TODO] [priority:HIGH] [estimate:2h]

---

## Events to Map

### NativeTokenVoting

| Event                                                                                | Entity   | Fields                                    |
| ------------------------------------------------------------------------------------ | -------- | ----------------------------------------- |
| `ProposalCreated(uint256 proposalId, address creator, ...)`                          | Proposal | id, creator, startDate, endDate, metadata |
| `VoteCast(uint256 proposalId, address voter, uint8 voteOption, uint256 votingPower)` | Vote     | proposal, voter, option, power            |
| `ProposalExecuted(uint256 proposalId)`                                               | Proposal | executed, executionDate                   |

### DelegationVoting

| Event                                                 | Entity       | Fields              |
| ----------------------------------------------------- | ------------ | ------------------- |
| `ProposalCreated(...)`                                | Proposal     | (same as above)     |
| `VoteCast(...)`                                       | Vote         | (same as above)     |
| `ValidatorConfigured(address dao, address validator)` | PluginConfig | dao, validator      |
| `Delegated(address delegator, address delegatee)`     | Delegation   | from, to, timestamp |

### HIPVoting

| Event                                                | Entity           | Fields                 |
| ---------------------------------------------------- | ---------------- | ---------------------- |
| `ProposalCreated(...)`                               | Proposal         | (same as above)        |
| `VoteCast(...)`                                      | Vote             | (same as above)        |
| `AllowlistRequested(address dao, address requester)` | AllowlistRequest | dao, requester, status |
| `DAOAllowed(address dao)`                            | AllowlistRequest | dao, status=approved   |

---

## Key Files to Create/Modify

```yaml
# Subgraph configuration
packages/subgraph/subgraph.yaml

# Schema
packages/subgraph/schema.graphql

# ABIs (copy from osx-plugin-foundry/out/)
packages/subgraph/abis/HarmonyNativeTokenVoting.json
packages/subgraph/abis/HarmonyDelegationVoting.json
packages/subgraph/abis/HarmonyHIPVoting.json

# Mappings
packages/subgraph/src/mappings/harmonyNativeTokenVoting.ts
packages/subgraph/src/mappings/harmonyDelegationVoting.ts
packages/subgraph/src/mappings/harmonyHIPVoting.ts
```

---

## Schema Additions

```graphql
# Add to schema.graphql

type HarmonyProposal @entity {
  id: ID!
  dao: Dao!
  plugin: Plugin!
  pluginType: String! # "NativeTokenVoting" | "DelegationVoting" | "HIPVoting"
  proposalId: BigInt!
  creator: Bytes!
  metadata: String
  startDate: BigInt!
  endDate: BigInt!
  executed: Boolean!
  executionDate: BigInt
  votes: [HarmonyVote!]! @derivedFrom(field: "proposal")
}

type HarmonyVote @entity {
  id: ID!
  proposal: HarmonyProposal!
  voter: Bytes!
  voteOption: Int!
  votingPower: BigInt!
  timestamp: BigInt!
}

type ValidatorConfig @entity {
  id: ID!
  dao: Dao!
  plugin: Plugin!
  validator: Bytes!
  configuredAt: BigInt!
}

type AllowlistRequest @entity {
  id: ID!
  dao: Bytes!
  requester: Bytes!
  status: String! # "pending" | "approved" | "rejected"
  requestedAt: BigInt!
  approvedAt: BigInt
}
```

---

## Dependencies

| Dependency                             | Repo               | Status   |
| -------------------------------------- | ------------------ | -------- |
| Contracts deployed with correct events | osx-plugin-foundry | Required |
| ABIs exported from forge build         | osx-plugin-foundry | Required |

---

## Commands Reference

```bash
cd packages/subgraph

# Generate types from schema
yarn codegen

# Build subgraph
yarn build

# Deploy to hosted service (example)
yarn deploy --node https://api.thegraph.com/deploy/ --ipfs https://api.thegraph.com/ipfs/ <subgraph-name>

# Local testing with graph-node
docker-compose up -d  # Start local graph-node
yarn create-local
yarn deploy-local
```

---

## Definition of Done

- [ ] ABIs added for all 3 plugins
- [ ] Schema entities defined
- [ ] Data sources configured in subgraph.yaml
- [ ] Mappings implemented for all events
- [ ] Local graph-node test passes
- [ ] Deployed to hosted service
- [ ] Queries return indexed data
