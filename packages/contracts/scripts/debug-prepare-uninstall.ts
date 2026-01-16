import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente específicas para esta execução.
// - Por padrão, tenta `.env.install` no CWD.
// - Permite override via `DOTENV_CONFIG_PATH`.
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.env.DOTENV_CONFIG_PATH)
    : path.resolve(process.cwd(), '.env.install'),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}`);
  return value;
}

function truthyEnv(name: string): boolean {
  const value = (process.env[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'y';
}

function asChecksumAddress(value: string, name: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
}

function asUint(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} inválido: ${value}`);
  return n;
}

function asHexBytes(value: string, name: string): string {
  const v = value.trim();
  if (v === '') return '0x';
  if (!ethers.isHexString(v)) throw new Error(`${name} inválido (hex)`);
  return v;
}

// Harmony/legado: usa gasPrice e type 0
async function getLegacyGasOverrides(gasLimit: bigint) {
  const networkMin = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = networkMin;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < networkMin ? networkMin : gp;
    }
  } catch {
    // fallback permanece networkMin
  }
  return { type: 0, gasPrice, gasLimit } as const;
}

type VersionTag = { release: number; build: number };

type PreparedContext = {
  kind: 'install' | 'update';
  preparedSetupId: string;
  pluginSetupRepo: string;
  versionTag: VersionTag;
  helpers: string[];
  applyBlockNumber: number;
  appliedSetupIdFromApplyEvent: string;
};

function compareLogOrder(a: { blockNumber: number; logIndex: number }, b: { blockNumber: number; logIndex: number }) {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
  return a.logIndex - b.logIndex;
}

async function main() {
  const adminKeyRaw = (process.env.ADMIN_KEY ?? '').trim();
  const adminKey = adminKeyRaw ? adminKeyRaw.split(',')[0].trim() : '';

  const signer = adminKey
    ? new ethers.Wallet(adminKey, ethers.provider)
    : (await ethers.getSigners())[0];

  const network = await ethers.provider.getNetwork();

  const daoAddr = asChecksumAddress(requireEnv('DAO'), 'DAO');
  const pluginAddr = asChecksumAddress(requireEnv('PLUGIN'), 'PLUGIN');
  const pspAddr = asChecksumAddress(requireEnv('PLUGIN_SETUP_PROCESSOR'), 'PLUGIN_SETUP_PROCESSOR');

  const uninstallData = asHexBytes(process.env.UNINSTALL_DATA ?? '0x', 'UNINSTALL_DATA');

  const scanBack = asUint(process.env.SCAN_BACK ?? '200000', 'SCAN_BACK');

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Signer : ${signer.address}`);
  console.log(`DAO    : ${daoAddr}`);
  console.log(`PSP    : ${pspAddr}`);
  console.log(`Plugin : ${pluginAddr}`);
  console.log(`Data   : ${uninstallData}`);

  const psp = await ethers.getContractAt(
    'src/framework/plugin/setup/PluginSetupProcessor.sol:PluginSetupProcessor',
    pspAddr,
    signer
  );

  const pluginInstallationId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [daoAddr, pluginAddr])
  );

  const state = await (psp as any).states(pluginInstallationId);
  const currentAppliedSetupId: string = state?.currentAppliedSetupId;
  const lastApplyBlock: bigint = state?.blockNumber;

  console.log(`pluginInstallationId: ${pluginInstallationId}`);
  console.log(`state.blockNumber:    ${lastApplyBlock}`);
  console.log(`state.currentAppliedSetupId: ${currentAppliedSetupId}`);

  // 1) Descobre o último apply (InstallationApplied/UpdateApplied) para (dao, plugin)
  const installAppliedLogs = await (psp as any).queryFilter(
    (psp as any).filters.InstallationApplied(daoAddr, pluginAddr)
  );
  const updateAppliedLogs = await (psp as any).queryFilter(
    (psp as any).filters.UpdateApplied(daoAddr, pluginAddr)
  );

  const allApply = [...installAppliedLogs.map((l: any) => ({ kind: 'install' as const, l })), ...updateAppliedLogs.map((l: any) => ({ kind: 'update' as const, l }))];

  if (allApply.length === 0) {
    throw new Error('Não encontrei InstallationApplied/UpdateApplied para esse (DAO, plugin).');
  }

  allApply.sort((a: any, b: any) => compareLogOrder(a.l, b.l));
  const lastApply = allApply[allApply.length - 1];

  const preparedSetupId: string = lastApply.l.args?.preparedSetupId;
  const appliedSetupIdFromApplyEvent: string | undefined = lastApply.l.args?.appliedSetupId;

  console.log(`Último apply: kind=${lastApply.kind} block=${lastApply.l.blockNumber} tx=${lastApply.l.transactionHash}`);
  console.log(`preparedSetupId: ${preparedSetupId}`);
  if (appliedSetupIdFromApplyEvent) console.log(`appliedSetupId (event): ${appliedSetupIdFromApplyEvent}`);

  // 2) Busca o evento Prepared correspondente (pelo preparedSetupId) para reconstruir repo/tag/helpers
  const startBlock = Math.max(0, lastApply.l.blockNumber - scanBack);
  const endBlock = lastApply.l.blockNumber;

  console.log(`Scan Prepared events: [${startBlock}..${endBlock}] (SCAN_BACK=${scanBack})`);

  const installationPreparedLogs = await (psp as any).queryFilter(
    (psp as any).filters.InstallationPrepared(null, daoAddr, null, null),
    startBlock,
    endBlock
  );

  const updatePreparedLogs = await (psp as any).queryFilter(
    (psp as any).filters.UpdatePrepared(null, daoAddr, null, null),
    startBlock,
    endBlock
  );

  let preparedContext: PreparedContext | null = null;

  if (lastApply.kind === 'install') {
    const match = installationPreparedLogs.find((l: any) => l.args?.preparedSetupId === preparedSetupId);
    if (!match) {
      throw new Error('Não encontrei InstallationPrepared correspondente ao preparedSetupId (aumente SCAN_BACK).');
    }

    preparedContext = {
      kind: 'install',
      preparedSetupId,
      pluginSetupRepo: match.args?.pluginSetupRepo,
      versionTag: {
        release: Number(match.args?.versionTag?.release ?? match.args?.versionTag?.[0]),
        build: Number(match.args?.versionTag?.build ?? match.args?.versionTag?.[1]),
      },
      helpers: (match.args?.preparedSetupData?.helpers ?? []) as string[],
      applyBlockNumber: lastApply.l.blockNumber,
      appliedSetupIdFromApplyEvent: appliedSetupIdFromApplyEvent ?? '0x',
    };
  } else {
    const match = updatePreparedLogs.find((l: any) => l.args?.preparedSetupId === preparedSetupId);
    if (!match) {
      throw new Error('Não encontrei UpdatePrepared correspondente ao preparedSetupId (aumente SCAN_BACK).');
    }

    preparedContext = {
      kind: 'update',
      preparedSetupId,
      pluginSetupRepo: match.args?.pluginSetupRepo,
      versionTag: {
        release: Number(match.args?.versionTag?.release ?? match.args?.versionTag?.[0]),
        build: Number(match.args?.versionTag?.build ?? match.args?.versionTag?.[1]),
      },
      helpers: (match.args?.preparedSetupData?.helpers ?? []) as string[],
      applyBlockNumber: lastApply.l.blockNumber,
      appliedSetupIdFromApplyEvent: appliedSetupIdFromApplyEvent ?? '0x',
    };
  }

  const repoAddr = asChecksumAddress(String(preparedContext.pluginSetupRepo), 'pluginSetupRepo');
  const tag = preparedContext.versionTag;
  const helpers = preparedContext.helpers.map((h) => ethers.getAddress(h));

  console.log(`PluginSetupRepo: ${repoAddr}`);
  console.log(`VersionTag: release=${tag.release} build=${tag.build}`);
  console.log(`Helpers (${helpers.length}): ${helpers.join(', ')}`);

  // 3) Recalcula helpersHash e appliedSetupId esperado, e compara
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const helpersHash = ethers.keccak256(coder.encode(['address[]'], [helpers]));
  const appliedSetupIdExpected = ethers.keccak256(
    coder.encode(
      ['tuple(uint8 release,uint16 build)', 'address', 'bytes32'],
      [{ release: tag.release, build: tag.build }, repoAddr, helpersHash]
    )
  );

  console.log(`helpersHash:            ${helpersHash}`);
  console.log(`appliedSetupIdExpected: ${appliedSetupIdExpected}`);

  if (currentAppliedSetupId?.toLowerCase() !== appliedSetupIdExpected.toLowerCase()) {
    console.warn('ATENÇÃO: state.currentAppliedSetupId != appliedSetupIdExpected');
  }

  if (preparedContext.appliedSetupIdFromApplyEvent !== '0x') {
    const ev = preparedContext.appliedSetupIdFromApplyEvent;
    if (ev.toLowerCase() !== appliedSetupIdExpected.toLowerCase()) {
      console.warn('ATENÇÃO: appliedSetupId do evento != appliedSetupIdExpected');
    }
  }

  // 4) Tenta simular prepareUninstallation com o payload correto
  const pluginSetupRef = {
    pluginSetupRepo: repoAddr,
    versionTag: { release: tag.release, build: tag.build },
  };

  const setupPayload = {
    plugin: pluginAddr,
    currentHelpers: helpers,
    data: uninstallData,
  };

  console.log('Simulando prepareUninstallation.staticCall...');

  try {
    const permissions = await (psp as any).prepareUninstallation.staticCall(daoAddr, {
      pluginSetupRef,
      setupPayload,
    });

    console.log(`OK: prepareUninstallation.staticCall retornou permissions.length=${permissions?.length ?? 0}`);

    // Opcional: envia tx real de prepareUninstallation
    if (truthyEnv('DO_TX')) {
      const tx = await (psp as any).prepareUninstallation(
        daoAddr,
        { pluginSetupRef, setupPayload },
        await getLegacyGasOverrides(BigInt(2_500_000))
      );
      console.log('prepareUninstallation tx:', tx.hash);
      await tx.wait();
    }
  } catch (e: any) {
    const name = e?.errorName ?? e?.shortMessage ?? e?.reason;
    console.error('prepareUninstallation.staticCall REVERTEU:', name ?? '(sem reason)');
    if (e?.errorArgs) console.error('errorArgs:', e.errorArgs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
