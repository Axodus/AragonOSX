# Repository Guidelines

## Project Structure & Module Organization

This Yarn workspace contains two primary packages. `packages/contracts` holds the Solidity protocol, Hardhat configuration, deployment scripts, generated types, and TypeScript tests. Contract source is in `packages/contracts/src`; tests mirror the domain under `packages/contracts/test` (for example, `test/core/dao/dao.ts`). `packages/subgraph` indexes protocol events: mappings live in `src`, GraphQL schema changes in `schema.graphql`, manifests in `manifest`, and Matchstick tests in `tests`. Keep shared repository documentation in `docs/` and security-review material in `audits/`.

## Build, Test, and Development Commands

Use Yarn 4 from the repository root: `yarn install` installs all workspace dependencies.

- `yarn prettier:check` checks repository formatting; `yarn prettier:write` applies it.
- `cd packages/contracts && yarn build` compiles contracts and regenerates TypeChain types.
- `cd packages/contracts && yarn test` runs the Hardhat suite. Use `yarn test:parallel`, `yarn coverage`, or `yarn test:zksync` when relevant.
- `cd packages/subgraph && yarn lint` lints TypeScript. Run `yarn manifest` before `yarn build`; use `yarn test` for Matchstick tests.

Run the narrowest relevant package command before opening a pull request. Contract CI also builds the npm bundle and generates Solidity documentation.

## Coding Style & Naming Conventions

Prettier is authoritative. JavaScript and TypeScript use single quotes, no spaces inside object braces, and import sorting. Solidity uses four spaces, double quotes, and a 100-character print width. Follow existing names: Solidity contracts use `PascalCase`, interfaces begin with `I`, and permission constants end in `_PERMISSION_ID`. Use lowercase, descriptive directory names and colocate tests by feature.

## Testing Guidelines

Add or update Hardhat tests for changed contract behavior and Matchstick tests for altered subgraph mappings or schema behavior. TypeScript test files use `.ts` and generally match the unit under test, such as `plugin-repo.ts`; subgraph tests use `.test.ts`. Cover permissions, upgrade paths, emitted events, and failure cases where applicable.

## Commit & Pull Request Guidelines

Recent history favors Conventional Commit prefixes such as `feat:`, `fix:`, `chore:`, and `refactor:`; write an imperative, scoped subject when useful (for example, `feat(nativeTokenVoting): add snapshot handling`). PRs should summarize behavior, link the task or issue, select the lifecycle change type, document relevant deployment/subgraph impact, and include tests run. Update changelog, deployment, upgrade, or documentation artifacts when the change requires them. Report security vulnerabilities privately to `sirt@aragon.org`, not through public issues.

## AXODUS_WORKSPACE_COORDINATION

This workspace is part of the federated Axodus portfolio. Read the root
[`AGENTS.md`](../../AGENTS.md) and the
[Agent Coordination Protocol](../../.instructions/AGENT_COORDINATION_PROTOCOL.md) before starting work.

Keep this file's local rules authoritative for this repository. For every
completed or materially blocked task, provide the required **Global Coordination
Handoff**: workspace, scope, local status, validation, local records changed,
dependencies, blockers or risks, priority impact, requested portfolio action,
and preserved boundaries.

Update this repository's existing local status, roadmap, task, validation,
blocker, or report records when the authorized task requires it. Do not edit
root portfolio records directly; the root Axodus orchestrator consolidates
validated handoffs into global status, priorities, blockers, dependencies, and
reports.
