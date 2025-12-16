import {hashHelpers} from '../../../utils/psp';
import {PermissionOperation, PluginRepoPointer, VersionTag} from './types';
import {BytesLike} from 'ethers';

function cloneHelpers(helpers: string[]): string[] {
  return Array.isArray(helpers) ? helpers.map((h) => String(h)) : (helpers as any);
}

function clonePermissions(permissions: PermissionOperation[]): PermissionOperation[] {
  return Array.isArray(permissions)
    ? permissions.map((p: any) => ({
        operation: typeof p.operation === 'bigint' ? Number(p.operation) : p.operation,
        where: String(p.where),
        who: String(p.who),
        permissionId: p.permissionId,
        condition: String(p.condition),
      }))
    : (permissions as any);
}

export function createPrepareInstallationParams(
  pluginRepoPointer: PluginRepoPointer,
  data: BytesLike
) {
  return {
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    data: data,
  };
}

export function createApplyInstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[],
  helpers: string[]
) {
  const helpersPlain = cloneHelpers(helpers);
  const permissionsPlain = clonePermissions(permissions);
  return {
    plugin: plugin,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    permissions: permissionsPlain,
    helpersHash: hashHelpers(helpersPlain),
  };
}

export function createPrepareUpdateParams(
  plugin: string,
  currentVersionTag: VersionTag,
  newVersionTag: VersionTag,
  pluginSetupRepo: string,
  helpers: string[],
  data: BytesLike
) {
  const helpersPlain = cloneHelpers(helpers);
  return {
    currentVersionTag: {
      release: currentVersionTag[0],
      build: currentVersionTag[1],
    },
    newVersionTag: {
      release: newVersionTag[0],
      build: newVersionTag[1],
    },
    pluginSetupRepo: pluginSetupRepo,
    setupPayload: {
      plugin: plugin,
      currentHelpers: helpersPlain,
      data: data,
    },
  };
}

export function createApplyUpdateParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  initData: BytesLike,
  permissions: PermissionOperation[],
  helpers: string[]
) {
  const helpersPlain = cloneHelpers(helpers);
  const permissionsPlain = clonePermissions(permissions);
  return {
    plugin: plugin,
    permissions: permissionsPlain,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    helpersHash: hashHelpers(helpersPlain),
    initData: initData,
  };
}

export function createPrepareUninstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  helpers: string[],
  data: BytesLike
) {
  const helpersPlain = cloneHelpers(helpers);
  return {
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    setupPayload: {
      plugin: plugin,
      currentHelpers: helpersPlain,
      data: data,
    },
  };
}

export function createApplyUninstallationParams(
  plugin: string,
  pluginRepoPointer: PluginRepoPointer,
  permissions: PermissionOperation[]
) {
  const permissionsPlain = clonePermissions(permissions);
  return {
    plugin: plugin,
    pluginSetupRef: {
      pluginSetupRepo: pluginRepoPointer[0],
      versionTag: {
        release: pluginRepoPointer[1],
        build: pluginRepoPointer[2],
      },
    },
    permissions: permissionsPlain,
  };
}
