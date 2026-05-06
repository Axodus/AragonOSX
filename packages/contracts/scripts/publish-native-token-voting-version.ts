import {ethers} from 'hardhat';
import {Interface, id, isAddress, toUtf8Bytes} from 'ethers';
import fs from 'fs';
import path from 'path';

const REPO_MIN_ABI = [
  'function MAINTAINER_PERMISSION_ID() view returns (bytes32)',
  'function grant(address where, address who, bytes32 permissionId)',
  'function isGranted(address where, address who, bytes32 permissionId, bytes data) view returns (bool)',
  'function latestRelease() view returns (uint8)',
  'function createVersion(uint8 _release, address _pluginSetup, bytes _buildMetadata, bytes _releaseMetadata)',
];

const VERSION_CREATED_IFACE = new Interface([
  'event VersionCreated(uint8 release, uint16 build, address indexed pluginSetup, bytes buildMetadata)',
]);

const REPO_ERRORS_IFACE = new Interface([
  'error Unauthorized(address where, address who, bytes32 permissionId)',
  'error InvalidPluginSetupInterface()',
  'error ReleaseZeroNotAllowed()',
  'error InvalidReleaseIncrement(uint8 latestRelease, uint8 newRelease)',
  'error PluginSetupAlreadyInPreviousRelease(uint8 release, uint16 build, address pluginSetup)',
  'error EmptyReleaseMetadata()',
  'error ReleaseDoesNotExist()',
]);

async function main() {
  const cfg = await getConfig();
  const repo = new ethers.Contract(cfg.repoAddr, REPO_MIN_ABI, cfg.signer);

  logInfo(
    cfg.network.name,
    cfg.network.chainId,
    cfg.signer.address,
    cfg.repoAddr,
    cfg.setupAddr
  );

  await ensureMaintainer(repo, cfg.repoAddr, cfg.maintainer);

  await preflight(repo, cfg.release, cfg.setupAddr, cfg.buildMetaStr, cfg.releaseMetaStr);

  const gasOverrides = await getLegacyGasOverrides();
  const receipt = await publishVersion(
    repo,
    cfg.release,
    cfg.setupAddr,
    cfg.buildMetaStr,
    cfg.releaseMetaStr,
    gasOverrides
  );

  decodeVersionCreated(cfg.repoAddr, receipt?.logs);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

// Harmony/legacy txs: use gasPrice and type 0 (no EIP-1559)
async function getLegacyGasOverrides() {
  const networkMin = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = networkMin;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < networkMin ? networkMin : gp;
    }
  } catch {
    // keep fallback
  }

  const gasLimit = BigInt(1_500_000);
  return {type: 0, gasPrice, gasLimit} as const;
}

async function ensureMaintainer(repo: any, repoAddr: string, maintainer: string) {
  const maintainerPermission: string = await repo.MAINTAINER_PERMISSION_ID();
  const hasMaintainer: boolean = await repo.isGranted(
    repoAddr,
    maintainer,
    maintainerPermission,
    '0x'
  );

  if (hasMaintainer) {
    console.log(`Maintainer already granted for ${maintainer}.`);
    return;
  }

  console.log(`Granting MAINTAINER to ${maintainer} on the repo...`);
  const grantTx = await repo.grant(
    repoAddr,
    maintainer,
    maintainerPermission,
    await getLegacyGasOverrides()
  );
  console.log('grant() tx:', grantTx.hash);
  await grantTx.wait();
}

function parseRelease(releaseStr: string): number {
  const release = Number(releaseStr);
  if (!Number.isInteger(release) || release <= 0 || release > 255) {
    throw new Error('Invalid RELEASE. Use an integer between 1 and 255.');
  }
  return release;
}

async function publishVersion(
  repo: any,
  release: number,
  setupAddr: string,
  buildMetaStr: string,
  releaseMetaStr: string,
  gasOverrides: any
) {
  console.log(`Publishing version: release=${release}, setup=${setupAddr}`);

  const populated = await repo.createVersion.populateTransaction(
    release,
    setupAddr,
    toUtf8Bytes(buildMetaStr),
    toUtf8Bytes(releaseMetaStr)
  );

  const dataPreview = typeof populated?.data === 'string' ? populated.data : '';
  console.log(
    `Calldata: ${dataPreview ? dataPreview.slice(0, 10) : '(missing)'} (len=${
      dataPreview ? (dataPreview.length - 2) / 2 : 0
    } bytes)`
  );

  const tx = await repo.createVersion(
    release,
    setupAddr,
    toUtf8Bytes(buildMetaStr),
    toUtf8Bytes(releaseMetaStr),
    gasOverrides
  );
  console.log('Tx sent:', tx.hash);
  if (typeof tx?.data === 'string') {
    console.log(
      `Tx data: ${tx.data ? tx.data.slice(0, 10) : '(empty)'} (len=${
        tx.data ? (tx.data.length - 2) / 2 : 0
      } bytes)`
    );
  }
  const receipt = await tx.wait();
  console.log('Tx confirmed in block', receipt?.blockNumber);
  return receipt;
}

async function preflight(
  repo: any,
  release: number,
  setupAddr: string,
  buildMetaStr: string,
  releaseMetaStr: string
) {
  const repoAddr = (await repo.getAddress()) as string;
  const [signer] = await ethers.getSigners();

  const repoCode = await ethers.provider.getCode(repoAddr);
  const setupCode = await ethers.provider.getCode(setupAddr);
  console.log(`Repo code size : ${(repoCode.length - 2) / 2} bytes`);
  console.log(`Setup code size: ${(setupCode.length - 2) / 2} bytes`);

  if (setupCode === '0x') {
    const hint = findSetupDeploymentHint(setupAddr);
    throw new Error(
      `Setup address has no code on this network: ${setupAddr}. Check the network and the deployed address.` +
        (hint ? `\n${hint}` : '')
    );
  }

  try {
    const populated = await repo.createVersion.populateTransaction(
      release,
      setupAddr,
      toUtf8Bytes(buildMetaStr),
      toUtf8Bytes(releaseMetaStr)
    );
    const callReq = {
      to: repoAddr,
      from: signer.address,
      data: populated.data,
    };
    await ethers.provider.call(callReq);
    console.log('Preflight eth_call: OK');
  } catch (err: any) {
    console.error('Preflight eth_call: REVERTED');
    printDecodedRevert(err);
    throw err;
  }
}

function findSetupDeploymentHint(setupAddr: string): string | undefined {
  try {
    const deploymentsRoot = path.join(__dirname, '..', 'deployments');
    const candidates = ['harmony', 'harmonyTestnet'];

    for (const name of candidates) {
      const deployPath = path.join(deploymentsRoot, name, 'NativeTokenVotingSetup.json');
      const chainPath = path.join(deploymentsRoot, name, '.chainId');
      if (!fs.existsSync(deployPath)) continue;

      const parsed = JSON.parse(fs.readFileSync(deployPath, 'utf8')) as any;
      const addr = parsed?.address;
      if (typeof addr !== 'string') continue;

      if (addr.toLowerCase() !== setupAddr.toLowerCase()) continue;

      const chainId = fs.existsSync(chainPath)
        ? String(fs.readFileSync(chainPath, 'utf8')).trim()
        : 'unknown';
      return `Hint: this setup address matches hardhat-deploy network '${name}' (chainId=${chainId}). You may be using the wrong --network.`;
    }
  } catch {
    // ignore
  }

  return undefined;
}

function printDecodedRevert(err: any) {
  const data: string | undefined =
    err?.data ?? err?.error?.data ?? err?.info?.error?.data;
  if (!data || typeof data !== 'string') {
    console.error('No revert data returned by the RPC/provider.');
    return;
  }

  try {
    const parsed = REPO_ERRORS_IFACE.parseError(data);
    console.error(`Revert error: ${parsed?.name}`);
    if (parsed?.args?.length) {
      console.error('Revert args:', parsed.args);
    }
  } catch {
    console.error(`Raw revert data: ${data}`);
  }
}

function decodeVersionCreated(repoAddr: string, logs?: any[]) {
  const topic = id('VersionCreated(uint8,uint16,address,bytes)');
  const log = logs?.find(
    (l: any) =>
      l.topics?.[0] === topic &&
      l.address?.toLowerCase() === repoAddr.toLowerCase()
  );

  if (!log) {
    console.warn(
      'Warning: could not decode VersionCreated event. Verify manually in the explorer.'
    );
    return;
  }

  const parsed = VERSION_CREATED_IFACE.parseLog({
    topics: log.topics,
    data: log.data,
  });

  const releaseLogged = parsed?.args?.release as number;
  const buildLogged = parsed?.args?.build as number;
  const setupLogged = parsed?.args?.pluginSetup as string;
  console.log(
    `VersionCreated -> release=${releaseLogged}, build=${buildLogged}, setup=${setupLogged}`
  );
}

async function getConfig() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const repoAddr =
    process.env.PLUGIN_REPO ?? (await readRepoFromDeployedContracts());
  const setupAddr =
    process.env.NATIVE_TOKEN_VOTING_SETUP ??
    process.env.PLUGIN_SETUP ??
    process.env.NATIVE_TOKEN_VOTING_PLUGIN_SETUP;

  const releaseStr = process.env.RELEASE ?? '1';
  const releaseMetaStr = process.env.RELEASE_METADATA_URI ?? '';
  const buildMetaStr = process.env.BUILD_METADATA_URI ?? '';
  const maintainerOverride = process.env.MAINTAINER;

  if (!repoAddr) {
    throw new Error(
      'Missing PLUGIN_REPO and could not find NativeTokenVotingPluginRepo in deploy/deployed_contracts.json.'
    );
  }
  if (!setupAddr) {
    throw new Error(
      'Missing NATIVE_TOKEN_VOTING_SETUP (or PLUGIN_SETUP) with the new PluginSetup address.'
    );
  }
  if (!isAddress(repoAddr)) {
    throw new Error(`PLUGIN_REPO is not a valid address: ${repoAddr}`);
  }
  if (!isAddress(setupAddr)) {
    throw new Error(`PluginSetup address is not a valid address: ${setupAddr}`);
  }
  if (!releaseMetaStr) {
    throw new Error(
      'RELEASE_METADATA_URI must be non-empty (e.g. ipfs://... or a https:// link to release notes).' 
    );
  }

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

async function readRepoFromDeployedContracts(): Promise<string | undefined> {
  try {
    const deployedPath = path.join(__dirname, '..', 'deploy', 'deployed_contracts.json');
    if (!fs.existsSync(deployedPath)) {
      return undefined;
    }

    const parsed = JSON.parse(fs.readFileSync(deployedPath, 'utf8')) as any;
    const addr = parsed?.contracts?.NativeTokenVotingPluginRepo?.address;
    return typeof addr === 'string' ? addr : undefined;
  } catch {
    return undefined;
  }
}

function logInfo(
  name: string,
  chainId: bigint,
  signer: string,
  repo: string,
  setup: string
) {
  console.log(`Network: ${name} (${chainId})`);
  console.log(`Signer : ${signer}`);
  console.log(`Repo   : ${repo}`);
  console.log(`Setup  : ${setup}`);
}
