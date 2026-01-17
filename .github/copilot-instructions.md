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

## Planning & Issue Tracking Workflow

**CRITICAL: After completing planning and BEFORE starting implementation:**

1. **Generate Plan Document**: Create `PLAN.md` at repository root containing:

   - [ ] Clear task breakdown with checkboxes
   - [ ] Implementation steps and guidelines
   - [ ] Dependencies and integration points
   - [ ] Expected outcomes and acceptance criteria

2. **Sync with GitHub Project**: Using GitHub CLI (`gh` - already authenticated as mzfshark):

   ```bash
   # Create issue from PLAN.md
   gh issue create --title "[Plan] <descriptive-title>" --body-file PLAN.md --project "https://github.com/users/mzfshark/projects/5"
   ```

3. **Update Plan Progress**: As tasks complete, update checkboxes in `PLAN.md` and sync with issue:
   ```bash
   # Update the issue body with current PLAN.md
   gh issue edit <issue-number> --body-file PLAN.md
   ```

**IMPORTANT**: Never run `git commit` or `git push` automatically. Always ask the user before any git operations.

**Never start implementation without a documented plan in `PLAN.md` and corresponding GitHub issue.**

## Tool Restrictions

**FORBIDDEN: Do NOT use `codacy_get_pattern` tool** — This tool is incompatible with WSL environments and will fail. Use alternative Codacy tools for code quality analysis.

## Language Standards

**MANDATORY: All public-facing content MUST be in English:**

- **Code comments**: All comments in source code must be written in English
- **Logs and console output**: All log messages, debug output, and error messages must be in English
- **GitHub Issues**: All issue titles, descriptions, and comments must be in English
- **Commit messages**: All git commit messages must be in English following conventional commits format
- **Documentation**: All README files, inline docs, and API documentation must be in English
- **Variable/function names**: Use English for all identifiers in code

**Examples:**

```bash
# ✅ CORRECT
git commit -m "feat: add .country domain resolution to DAO creation flow"

# ❌ INCORRECT
git commit -m "adiciona resolução de domínio .country no fluxo de criação de DAO"
```

**Note**: This standard ensures international collaboration and maintainability. Internal planning documents (like `PLAN.md` for local work) may use Portuguese if needed, but all published content must be English.

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
