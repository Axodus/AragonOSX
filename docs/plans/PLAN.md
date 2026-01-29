# [Plan] HarmonyVoting Subgraph: processKey + Delegation metadata

## Goal
Make Harmony Delegation Voting installations and proposals discoverable by the subgraph with a stable `processKey`, preventing UI/indexer fallback to `UNKNOWN`.

## Scope
- Subgraph schema changes (add `processKey` field to the appropriate entity)
- Subgraph mappings (populate `processKey`/`validatorAddress` at install time)
- ABI/bindings updates for Harmony Delegation Voting contract
- Minimal validation (codegen/build + targeted mapping tests if present)

## Non-goals
- Full rewrite of HarmonyVoting indexing
- Any on-chain deployments

## Tasks
- [ ] Identify which subgraph entity should carry `processKey` (installation vs plugin vs process)
- [ ] Add `processKey` (and optionally `validatorAddress`) to the schema
- [ ] Update mapping to populate these fields using `try_` calls against the plugin contract
- [ ] Add/update ABI for Harmony Delegation Voting to include `processKey()` and `validatorAddress()`
- [ ] Run codegen/build to ensure mappings compile
- [ ] Verify query results include `processKey` for Delegation installations

## Acceptance Criteria
- Subgraph stores a non-empty `processKey` for DelegationVoting installations.
- UI/backend can resolve DelegationVoting processes without `UNKNOWN` fallback.
- Subgraph builds successfully after changes.
