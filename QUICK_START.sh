# Quick Start: Create GitHub Issues

## 1. Authenticate (Required First)
```bash
gh auth login -h github.com
```

## 2. Create All Issues in One Go

Copy and paste this entire block:

```bash
# Epic Issue
cd "d:\Rede\Github\mzfshark\AragonOSX" && \
gh issue create --title "[EPIC] HarmonyVoting E2E Reliability" --body-file PLAN.md --label "epic,harmony,enhancement" --project "https://github.com/users/mzfshark/projects/5" --repo Axodus/AragonOSX && \
\
# Backend Issue
cd "d:\Rede\Github\mzfshark\Aragon-app-backend" && \
gh issue create --title "[Backend] Indexing & Backfill for HarmonyVoting" --body-file plans/indexing-backfill.md --label "backend,indexing,harmony" --project "https://github.com/users/mzfshark/projects/5" --repo Axodus/Aragon-app-backend && \
\
# Frontend Issue
cd "d:\Rede\Github\mzfshark\aragon-app" && \
gh issue create --title "[Frontend] UI Resilience & Fallbacks" --body-file plans/ui-resilience.md --label "frontend,ui,harmony" --project "https://github.com/users/mzfshark/projects/5" --repo Axodus/aragon-app && \
\
# Contracts Issue
cd "d:\Rede\Github\mzfshark\osx-plugin-foundry" && \
gh issue create --title "[Contracts] Uninstall Safety & Native Executor" --body-file plans/uninstall-native-executor.md --label "contracts,harmony,enhancement" --project "https://github.com/users/mzfshark/projects/5" --repo mzfshark/osx-plugin-foundry && \
\
echo "✅ All issues created!"
```

## 3. View Created Issues

```bash
# List all Harmony-related issues
gh issue list --label harmony --repo Axodus/AragonOSX
gh issue list --label harmony --repo Axodus/Aragon-app-backend
gh issue list --label harmony --repo Axodus/aragon-app
gh issue list --label harmony --repo mzfshark/osx-plugin-foundry
```
