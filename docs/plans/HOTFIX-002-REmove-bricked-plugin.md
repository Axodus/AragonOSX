# HOTFIX-002 - Remove bricked plugin from DAO [key:01MZB0Y8C5Q1R2S3T4U5V6W7X]

**Repository:** AragonOSX (Axodus/AragonOSX)  
**End Date Goal:** 2026-01-27 (URGENT)  
**Priority:** HIGH  
**Estimative Hours:** 4h  
**Status:** Done

---

## Executive Summary

The plugin installed on DAO `0x1b0f7e8fA531F56D5e8cAF76F1FCC2dB0FE6058a` is bricked (not accessible in the UI and cannot be uninstalled). The DAO admin must remove it to restore normal governance execution.

Outcome: Plugin was effectively removed for DAO operations by revoking the plugin permissions on the DAO (break-glass hotfix).

---

## Technical Context

| Item                     | Value                                        |
| ------------------------ | -------------------------------------------- |
| **Plugin Address**       | `0x42385C52e929d0229889cbC5A46647D87334C925` |
| **DAO Address**          | `0x1b0f7e8fA531F56D5e8cAF76F1FCC2dB0FE6058a` |
| **DAO Admin**            | `0x45B96eD5d5B18f4f865266D8371C662Cd241e6D5` |
| **Network**              | Harmony Mainnet (1666600000)                 |
| **PluginSetupProcessor** | `0x6300477942944d2501db08cD5b7e37DC6423E77C` |
| **RPC**                  | `https://api.harmony.one`                    |

---

## Root Cause Investigation

### Hypotheses

1. **Plugin setup repo missing** — The PluginRepo associated with this installation might be missing or version not available.
2. **Inconsistent PSP state** — `currentAppliedSetupId` does not match expected inputs.
3. **Missing helpers** — Helper contracts used at installation are unavailable.
4. **UI failure** — Frontend cannot resolve plugin metadata or render uninstall flow.

### Verification Steps (READ-ONLY)

```bash
# 1. Verify plugin is installed (PSP state)
cast call 0x6300477942944d2501db08cD5b7e37DC6423E77C \
  "states(bytes32)(uint256,bytes32)" \
  $(cast keccak "$(cast abi-encode "tuple(address,address)" 0x1b0f7e8fA531F56D5e8cAF76F1FCC2dB0FE6058a 0x42385C52e929d0229889cbC5A46647D87334C925)") \
  --rpc-url https://api.harmony.one

# 2. Check EXECUTE permission on DAO
cast call 0x1b0f7e8fA531F56D5e8cAF76F1FCC2dB0FE6058a \
  "hasPermission(address,address,bytes32,bytes)(bool)" \
  0x1b0f7e8fA531F56D5e8cAF76F1FCC2dB0FE6058a \
  0x42385C52e929d0229889cbC5A46647D87334C925 \
  $(cast keccak "EXECUTE_PERMISSION") \
  0x \
  --rpc-url https://api.harmony.one

# 3. Check code at plugin address (proxy or not)
cast code 0x42385C52e929d0229889cbC5A46647D87334C925 --rpc-url https://api.harmony.one | head -c 100
```

### Observed (2026-01-27)

- `pluginInstallationId`: `0x73dbcd5cf9e38cf5224f10165f4ef1308adfec982ddbca0e6e80f302c2467220`
- PSP `states(pluginInstallationId)` returned:
  - `blockNumber`: `84238558`
  - `currentAppliedSetupId`: `0xab27927a060ee294c77e38f9ab5c49ac5afeac82e8420bfa89977bc5e9c67704`
- DAO `hasPermission(dao, plugin, EXECUTE_PERMISSION, 0x)` returned: `true`

### Post-fix Verification (2026-01-27)

After revoking permissions, the following checks returned `false` for the plugin on the DAO:

- `ROOT_PERMISSION`
- `UPGRADE_DAO_PERMISSION`
- `SET_METADATA_PERMISSION`
- `REGISTER_STANDARD_CALLBACK_PERMISSION`

---

## Subtasks (Linked)

### HOTFIX-002 | TASK-001: Investigation baseline [key:01KJ0J6V4PXF7N3GJ3Q2E6Z9M0]

- [x] Confirm PSP state for plugin installation [labels:type:task, area:contracts] [status:DONE] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [x] Enumerate current permissions for plugin on DAO (minimum: EXECUTE) [labels:type:task, area:permissions] [status:DONE] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [ ] Verify plugin code and proxy status [labels:type:task, area:contracts] [status:TODO] [priority:MEDIUM] [estimate:15m] [start:2026-01-27] [end:2026-01-27]

### HOTFIX-002 | TASK-002: Prepare revoke transactions [key:01KJ0J6V4Q5C2X7B4YAG3E2Z7N]

- [x] Generate calldata to revoke EXECUTE permission [labels:type:task, area:permissions] [status:DONE] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [ ] Generate calldata to revoke upgrade/admin permissions (if applicable) [labels:type:task, area:permissions] [status:TODO] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [ ] Validate calldata on fork or simulation (optional) [labels:type:task, area:qa] [status:TODO] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]

### HOTFIX-002 | TASK-003: Execute removal [key:01KJ0J6V4QY1K2AXWAX0G2Z5R8]

- [x] Execute revoke actions via DAO admin [labels:type:task, area:ops] [status:DONE] [priority:HIGH] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [x] Verify plugin has no permissions post-revoke [labels:type:task, area:qa] [status:DONE] [priority:HIGH] [estimate:15m] [start:2026-01-27] [end:2026-01-27]

### HOTFIX-002 | TASK-004: Post-fix cleanup [key:01KJ0J6V4R8W5E6C1V9J6ZK7ND]

- [ ] Document root cause in incident notes [labels:type:task, area:docs] [status:TODO] [priority:MEDIUM] [estimate:30m] [start:2026-01-27] [end:2026-01-27]
- [ ] File follow-up issue for UI uninstall fallback [labels:type:task, area:frontend] [status:TODO] [priority:LOW] [estimate:1h] [start:2026-01-27] [end:2026-01-28]

---

## Milestones

- **Milestone 1: Investigation complete** — 2026-01-27 (TASK-001)
- **Milestone 2: Revoke actions prepared** — 2026-01-27 (TASK-002)
- **Milestone 3: Plugin removed** — 2026-01-27 (TASK-003)
- **Milestone 4: Post-fix documented** — 2026-01-27 (TASK-004)
