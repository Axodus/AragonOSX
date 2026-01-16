# Copilot Instructions — Aragon OSx (Contracts/Subgraph)

Monorepo for the Aragon OSx protocol: Solidity contracts, subgraph, and ethers wrappers.

## Big Picture

- Packages:
  - `packages/contracts`: OSx core + framework + plugins (Solidity + Hardhat + Typechain).
  - `packages/subgraph`: Graph subgraph for event indexing powering the SDK.
  - `packages/contracts-ethers`: Ethers.js TypeScript wrappers around OSx contracts.
- NPM dist:
  - `@aragon/osx`: sources/interfaces; `@aragon/osx-artifacts`: ABI/bytecode; `@aragon/osx-ethers`: TS wrappers.
- Event flow: contracts emit events → subgraph indexes → SDK/app consume; backend may also read events directly.

## Workspaces & Tooling

- Yarn workspaces (`package.json` root); run package-specific commands from each package directory.
- Contracts use: Hardhat, Typechain, Solidity docgen, gas reporter, solhint.
- Node v16 supported by Hardhat; Node ≥19 may work but is unofficial (see README).

## Common Commands (contracts)

- Build: `yarn build` (compile + typechain) | `yarn build:zksync`
- Test: `yarn test` | `yarn test:parallel` | `yarn test:report-gas` | `yarn coverage`
- Node: `yarn dev` (Hardhat node on 0.0.0.0)
- Deploy: `yarn deploy` | `yarn deploy:local` | `yarn deploy:zksync`
- Lint/format (repo root): `yarn prettier:check` | `yarn prettier:write`
- Docs: `yarn docs` (docgen)

## Release & PR Utilities

- PR commands (in root README): `/mythx partial|full (quick|standard|deep)`; `/release patch|minor|major`; `/subgraph patch|minor|major`.
- `build:npm` creates bundle artifacts for `@aragon/osx-artifacts` distribution.

## Structure & Conventions (contracts)

- Core contracts: `DAO`, permissions, plugin bases live under `packages/contracts/src/**`.
- Framework: factories/registries + `PluginSetupProcessor` handle DAO/plugin lifecycle.
- Plugins: `packages/contracts/src/plugins/**` with logic + setup contracts; versioned via repos.
- Keep permissions explicit and favor modular plugins; update `deployed_contracts*.json` after deployments.

## Cross-Repo Integration

- App requires correct deployed addresses; update the app’s `networkDefinitions.ts` after deployments.
- Backend indexers and the subgraph rely on emitted events; align event changes with consumers.

## Example Tasks (Do It This Way)

- Add a plugin: implement logic + setup under `src/plugins/<name>`, wire permissions, extend tests, and document install/uninstall paths.
- Add a network: configure Hardhat `networks.ts`, deploy with `yarn deploy`, persist addresses in `deployed_contracts*.json` and propagate to app/backend.
- Update ABI consumers: run `yarn build` to refresh Typechain; update `contracts-ethers` if wrappers change.
