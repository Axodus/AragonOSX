import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {Interface} from 'ethers';
import fs from 'fs';
import path from 'path';
import {
  DAO_PERMISSIONS,
  getContractAddress,
  managePermissions,
  Operation,
} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  console.log(`\nDeploying NativeTokenVoting Plugin.`);

  // Deploy NativeTokenVotingPlugin implementation
  const nativeTokenVotingImplementation = await deploy(
    'NativeTokenVotingPlugin',
    {
      from: deployer,
      args: [],
      log: true,
    }
  );

  // Deploy NativeTokenVotingSetup
  const nativeTokenVotingSetup = await deploy('NativeTokenVotingSetup', {
    from: deployer,
    args: [],
    log: true,
  });

  console.log(
    `NativeTokenVotingPlugin implementation deployed at: ${nativeTokenVotingImplementation.address}`
  );
  console.log(
    `NativeTokenVotingSetup deployed at: ${nativeTokenVotingSetup.address}`
  );

  // Get PluginRepoFactory
  const pluginRepoFactoryAddress = await getContractAddress(
    'PluginRepoFactory',
    hre
  );
  const pluginRepoFactory = await hre.ethers.getContractAt(
    'PluginRepoFactory',
    pluginRepoFactoryAddress
  );

  // Register plugin repo
  // Harmony deployments typically don't have an ENSSubdomainRegistrar configured.
  // Passing an empty subdomain skips ENS registration in PluginRepoRegistry.
  const isHarmony = ['harmony', 'harmonyTestnet'].includes(hre.network.name);
  const pluginRepoSubdomain = isHarmony ? '' : `native-token-voting-${Date.now()}`;
  console.log(
    `\nRegistering NativeTokenVoting plugin repo with subdomain: ${pluginRepoSubdomain}`
  );

  // Prevent creating multiple repos by accident when re-running the script.
  // If an address is already recorded in deploy/deployed_contracts.json, reuse it.
  try {
    const deployedContractsPath = path.resolve(
      __dirname,
      '..',
      '..',
      'deployed_contracts.json'
    );
    const jsonRaw = fs.readFileSync(deployedContractsPath, 'utf8');
    const json = JSON.parse(jsonRaw);
    const existing = json?.contracts?.NativeTokenVotingPluginRepo?.address;
    if (typeof existing === 'string' && existing.length > 0) {
      console.log(
        `NativeTokenVoting PluginRepo already recorded at: ${existing}. Skipping registration.`
      );
      return;
    }
  } catch {
    // Ignore if file doesn't exist or is malformed.
  }

  const registerTx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
    pluginRepoSubdomain,
    nativeTokenVotingSetup.address,
    deployer,
    '0x00', // release metadata
    '0x00', // build metadata
    // Some Harmony RPCs don't implement eth_estimateGas properly for contract calls.
    // Providing a gasLimit avoids estimation.
    isHarmony ? {gasLimit: 12_000_000} : {}
  );

  const receipt = await registerTx.wait();

  const pluginRepoRegistryIface = new Interface([
    'event PluginRepoRegistered(string subdomain, address pluginRepo)',
  ]);

  const pluginRepoRegisteredTopic =
    pluginRepoRegistryIface.getEvent('PluginRepoRegistered').topicHash;

  let pluginRepoAddress: string | undefined;
  for (const log of receipt.logs ?? []) {
    if (log.topics?.[0] !== pluginRepoRegisteredTopic) continue;

    const parsed = pluginRepoRegistryIface.parseLog({
      topics: log.topics as string[],
      data: log.data as string,
    });

    pluginRepoAddress = parsed.args.pluginRepo as string;
    break;
  }

  console.log(`NativeTokenVoting PluginRepo registered at: ${pluginRepoAddress}`);
};

export default func;
func.tags = ['New', 'NativeTokenVoting'];
func.dependencies = ['Framework'];
