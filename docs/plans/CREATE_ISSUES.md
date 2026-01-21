# GitHub Issue Creation Commands

Due to GitHub CLI authentication issues, please run these commands manually after re-authenticating:

## 1. Re-authenticate GitHub CLI

```bash
gh auth login -h github.com
# Follow prompts to authenticate
```

## 2. Create Epic Issue (AragonOSX)

```bash
cd "d:\Rede\Github\mzfshark\AragonOSX"
gh issue create \
  --title "[EPIC] HarmonyVoting E2E Reliability" \
  --body-file PLAN.md \
  --label "epic,harmony,enhancement" \
  --project "https://github.com/users/mzfshark/projects/5" \
  --repo Axodus/AragonOSX
```

## 3. Create Backend Indexing Issue

```bash
cd "d:\Rede\Github\mzfshark\Aragon-app-backend"
gh issue create \
  --title "[Backend] Indexing & Backfill for HarmonyVoting" \
  --body-file plans/indexing-backfill.md \
  --label "backend,indexing,harmony" \
  --project "https://github.com/users/mzfshark/projects/5" \
  --repo Axodus/Aragon-app-backend
```

## 4. Create UI Resilience Issue

```bash
cd "d:\Rede\Github\mzfshark\aragon-app"
gh issue create \
  --title "[Frontend] UI Resilience & Fallbacks" \
  --body-file plans/ui-resilience.md \
  --label "frontend,ui,harmony" \
  --project "https://github.com/users/mzfshark/projects/5" \
  --repo Axodus/aragon-app
```

## 5. Create Contract Uninstall Issue

```bash
cd "d:\Rede\Github\mzfshark\osx-plugin-foundry"
gh issue create \
  --title "[Contracts] Uninstall Safety & Native Executor" \
  --body-file plans/uninstall-native-executor.md \
  --label "contracts,harmony,enhancement" \
  --project "https://github.com/users/mzfshark/projects/5" \
  --repo mzfshark/osx-plugin-foundry
```

## 6. Link Sub-tasks to Epic

After creating all issues, update the epic issue with the actual issue numbers:

```bash
# Get issue numbers
gh issue list --repo Axodus/AragonOSX --label "epic,harmony"
gh issue list --repo Axodus/Aragon-app-backend --label "harmony"
gh issue list --repo Axodus/aragon-app --label "harmony"
gh issue list --repo mzfshark/osx-plugin-foundry --label "harmony"

# Edit epic issue to add sub-task links
gh issue edit <epic-issue-number> --repo Axodus/AragonOSX --body "
[Updated content with actual issue numbers in Related Issues section]
"
```

## Alternative: Use GitHub Web UI

If CLI continues to have issues, create issues via web:

1. AragonOSX: https://github.com/Axodus/AragonOSX/issues/new
2. Aragon-app-backend: https://github.com/Axodus/Aragon-app-backend/issues/new
3. aragon-app: https://github.com/Axodus/aragon-app/issues/new
4. osx-plugin-foundry: https://github.com/mzfshark/osx-plugin-foundry/issues/new

Copy content from respective PLAN.md and plans/\*.md files.
