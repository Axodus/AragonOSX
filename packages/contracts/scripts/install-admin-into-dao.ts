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

const DAO_ABI = [
  'function execute(bytes32 _callId, tuple(address to, uint256 value, bytes data)[] _actions, uint256 _allowFailureMap) returns (bytes[] execResults, uint256 failureMap)',
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}`);
  return value;
}

function asChecksumAddress(value: string, name: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
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

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const daoAddr = asChecksumAddress(requireEnv('DAO'), 'DAO');
  const pspAddr = asChecksumAddress(requireEnv('PLUGIN_SETUP_PROCESSOR'), 'PLUGIN_SETUP_PROCESSOR');
  const adminRepoAddr = asChecksumAddress(requireEnv('ADMIN_REPO_PROXY'), 'ADMIN_REPO_PROXY');
  const adminAddr = asChecksumAddress(process.env.ADMIN ?? signer.address, 'ADMIN');

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Signer : ${signer.address}`);
  console.log(`DAO    : ${daoAddr}`);
  console.log(`PSP    : ${pspAddr}`);
  console.log(`Repo   : ${adminRepoAddr}`);
  console.log(`Admin  : ${adminAddr}`);

  const psp = await ethers.getContractAt(
    'src/framework/plugin/setup/PluginSetupProcessor.sol:PluginSetupProcessor',
    pspAddr,
    signer
  );
  const repo = await ethers.getContractAt(
    'src/framework/plugin/repo/PluginRepo.sol:PluginRepo',
    adminRepoAddr,
    signer
  );
  const dao = new ethers.Contract(daoAddr, DAO_ABI, signer);

  const latestRelease: number = await repo.latestRelease();
  const latestVersion = await repo.getLatestVersion(latestRelease);

  const release = Number(latestVersion.tag.release);
  const build = Number(latestVersion.tag.build);

  console.log(`Repo latest -> release=${release} build=${build} setup=${latestVersion.pluginSetup}`);

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const data = coder.encode(
    ['address', 'tuple(address target, uint8 operation)'],
    [adminAddr, { target: daoAddr, operation: 0 }]
  );

  const pluginSetupRef = {
    pluginSetupRepo: adminRepoAddr,
    versionTag: { release, build },
  };

  console.log('1/2 prepareInstallation...');
  const prepareTx = await psp.prepareInstallation(
    daoAddr,
    { pluginSetupRef, data },
    await getLegacyGasOverrides(BigInt(2_500_000))
  );
  console.log('prepare tx:', prepareTx.hash);
  const prepareReceipt = await prepareTx.wait();
  console.log('prepare block:', prepareReceipt?.blockNumber);

  const installationPreparedTopic = psp.interface.getEvent('InstallationPrepared').topicHash;
  const preparedLog = prepareReceipt?.logs?.find(
    (l: any) =>
      l?.address?.toLowerCase() === pspAddr.toLowerCase() &&
      Array.isArray(l?.topics) &&
      l.topics[0] === installationPreparedTopic
  );
  if (!preparedLog) {
    throw new Error('Não encontrei o evento InstallationPrepared no receipt');
  }

  const parsed = psp.interface.parseLog({ topics: preparedLog.topics, data: preparedLog.data });
  const pluginAddr = asChecksumAddress(parsed.args.plugin as string, 'plugin');
  console.log('plugin preparado:', pluginAddr);

  const helpersHash = ethers.keccak256(coder.encode(['address[]'], [[]]));
  const applyCalldata = psp.interface.encodeFunctionData('applyInstallation', [
    daoAddr,
    {
      pluginSetupRef,
      plugin: pluginAddr,
      permissions: [],
      helpersHash,
    },
  ]);

  console.log('2/2 DAO.execute(applyInstallation)...');
  const callId = ethers.keccak256(
    ethers.toUtf8Bytes(`install-admin:${daoAddr}:${adminRepoAddr}:${release}.${build}:${pluginAddr}`)
  );

  const execTx = await dao.execute(
    callId,
    [{ to: pspAddr, value: 0, data: applyCalldata }],
    0,
    await getLegacyGasOverrides(BigInt(3_500_000))
  );
  console.log('execute tx:', execTx.hash);
  const execReceipt = await execTx.wait();
  console.log('execute block:', execReceipt?.blockNumber);

  console.log('OK: Admin Plugin instalado (prepare+apply).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
