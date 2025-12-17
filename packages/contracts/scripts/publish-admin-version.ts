import { ethers } from 'hardhat';
import { Interface, id, toUtf8Bytes } from 'ethers';

const REPO_MIN_ABI = [
  'function MAINTAINER_PERMISSION_ID() view returns (bytes32)',
  'function grant(address where, address who, bytes32 permissionId)',
  'function isGranted(address where, address who, bytes32 permissionId, bytes data) view returns (bool)',
  'function latestRelease() view returns (uint8)',
  'function createVersion(uint8 _release, address _pluginSetup, bytes _buildMetadata, bytes _releaseMetadata)',
];

const VERSION_CREATED_IFACE = new Interface([
  'event VersionCreated(uint8 release, uint16 build, address indexed pluginSetup, bytes buildMetadata)'
]);

async function main() {
  const cfg = await getConfig();
  const repo = new ethers.Contract(cfg.repoAddr, REPO_MIN_ABI, cfg.signer);

  logInfo(cfg.network.name, cfg.network.chainId, cfg.signer.address, cfg.repoAddr, cfg.setupAddr);

  await ensureMaintainer(repo, cfg.repoAddr, cfg.maintainer);
  const gasOverrides = await getLegacyGasOverrides();
  const receipt = await publishVersion(
    repo,
    cfg.repoAddr,
    cfg.release,
    cfg.setupAddr,
    cfg.buildMetaStr,
    cfg.releaseMetaStr,
    gasOverrides
  );
  decodeVersionCreated(cfg.repoAddr, receipt?.logs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Harmony/legado: usa gasPrice e type 0
async function getLegacyGasOverrides() {
  try {
    const networkMin = BigInt(200_000_000_000); // 200 gwei
    let gasPrice = await ethers.provider.getGasPrice();
    if (gasPrice < networkMin) gasPrice = networkMin;
    const gasLimit = BigInt(1_000_000);
    return { type: 0, gasPrice, gasLimit } as const;
  } catch {
    const gasPrice = BigInt(200_000_000_000);
    const gasLimit = BigInt(1_000_000);
    return { type: 0, gasPrice, gasLimit } as const;
  }
}

async function ensureMaintainer(repo: any, repoAddr: string, maintainer: string) {
  const maintainerPermission: string = await repo.MAINTAINER_PERMISSION_ID();
  const hasMaintainer: boolean = await repo.isGranted(repoAddr, maintainer, maintainerPermission, '0x');
  if (hasMaintainer) {
    console.log(`MAINTAINER já concedido para ${maintainer}.`);
    return;
  }
  console.log(`Concedendo MAINTAINER para ${maintainer} no repo...`);
  const grantTx = await repo.grant(repoAddr, maintainer, maintainerPermission, await getLegacyGasOverrides());
  console.log('grant() tx:', grantTx.hash);
  await grantTx.wait();
}

function parseRelease(releaseStr: string): number {
  const release = Number(releaseStr);
  if (!Number.isInteger(release) || release <= 0 || release > 255) {
    throw new Error('RELEASE inválido. Use um inteiro entre 1 e 255.');
  }
  return release;
}

async function publishVersion(
  repo: any,
  repoAddr: string,
  release: number,
  setupAddr: string,
  buildMetaStr: string,
  releaseMetaStr: string,
  gasOverrides: any
) {
  console.log(`Publicando versão: release=${release}, setup=${setupAddr}`);
  const tx = await repo.createVersion(
    release,
    setupAddr,
    toUtf8Bytes(buildMetaStr),
    toUtf8Bytes(releaseMetaStr),
    gasOverrides
  );
  console.log('Tx sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('Tx confirmed in block', receipt?.blockNumber);
  return receipt;
}

function decodeVersionCreated(repoAddr: string, logs?: any[]) {
  const topic = id('VersionCreated(uint8,uint16,address,bytes)');
  const log = logs?.find((l: any) => l.topics?.[0] === topic && l.address?.toLowerCase() === repoAddr.toLowerCase());
  if (!log) {
    console.warn('Aviso: não foi possível decodificar VersionCreated. Verifique manualmente no explorer.');
    return;
  }
  const parsed = VERSION_CREATED_IFACE.parseLog({ topics: log.topics, data: log.data });
  const releaseLogged = parsed?.args?.release as number;
  const buildLogged = parsed?.args?.build as number;
  const setupLogged = parsed?.args?.pluginSetup as string;
  console.log(`VersionCreated -> release=${releaseLogged}, build=${buildLogged}, setup=${setupLogged}`);
}

async function getConfig() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const repoAddr = process.env.PLUGIN_REPO;
  const setupAddr = process.env.ADMIN_PLUGIN_SETUP;
  const releaseStr = process.env.RELEASE ?? '1';
  const releaseMetaStr = process.env.RELEASE_METADATA_URI ?? '';
  const buildMetaStr = process.env.BUILD_METADATA_URI ?? '';
  const maintainerOverride = process.env.MAINTAINER;

  if (!repoAddr) throw new Error('Defina PLUGIN_REPO com o endereço do PluginRepo');
  if (!setupAddr) throw new Error('Defina ADMIN_PLUGIN_SETUP com o endereço do PluginSetup');
  if (!releaseMetaStr) throw new Error('RELEASE_METADATA_URI não pode ser vazio (ex.: ipfs://...)');

  return {
    signer,
    network,
    repoAddr,
    setupAddr,
    release: parseRelease(releaseStr),
    releaseMetaStr,
    buildMetaStr,
    maintainer: maintainerOverride ?? signer.address,
  } as const;
}

function logInfo(name: string, chainId: bigint, signer: string, repo: string, setup: string) {
  console.log(`Network: ${name} (${chainId})`);
  console.log(`Signer : ${signer}`);
  console.log(`Repo   : ${repo}`);
  console.log(`Setup  : ${setup}`);
}
