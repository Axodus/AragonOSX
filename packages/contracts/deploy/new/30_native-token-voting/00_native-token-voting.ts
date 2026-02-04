import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {Interface, isAddress} from 'ethers';
import fs from 'fs';
import path from 'path';
import {
  DAO_PERMISSIONS,
  managePermissions,
  Operation,
} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // Harmony deployments typically don't have an ENSSubdomainRegistrar configured.
  // Passing an empty subdomain skips ENS registration in PluginRepoRegistry.
  const isHarmony = ['harmony', 'harmonyTestnet'].includes(hre.network.name);
  const pluginRepoSubdomain = isHarmony ? '' : `native-token-voting-${Date.now()}`;

  // Prevent creating multiple repos by accident when re-running the script.
  // If an address is already recorded in deploy/deployed_contracts.json, reuse it.
  // NOTE: This script can (a) deploy impl+setup and (b) optionally register a new PluginRepo.
  // For upgrades, you typically deploy a new setup and then publish a new version to the
  // existing repo using a dedicated "publish version" script.
  let deployedContractsJson: any = undefined;
  let existingRepoAddress: string | undefined;
  const deployedContractsPath = path.resolve(
    __dirname,
    '..',
    '..',
    'deployed_contracts.json'
  );
  try {
    const jsonRaw = fs.readFileSync(deployedContractsPath, 'utf8');
    deployedContractsJson = JSON.parse(jsonRaw);
    const existing = deployedContractsJson?.contracts?.NativeTokenVotingPluginRepo?.address;
    if (typeof existing === 'string' && isAddress(existing)) {
      existingRepoAddress = existing;
    }
  } catch {
    // Ignore if file doesn't exist or is malformed.
  }

  console.log(`\nDeploying NativeTokenVoting Plugin.`);

  const forceRedeploy = process?.env?.FORCE_REDEPLOY === '1';

  // Deploy NativeTokenVotingPlugin implementation
  const nativeTokenVotingImplementation = await deploy(
    'NativeTokenVotingPlugin',
    {
      from: deployer,
      args: [],
      log: true,
      ...(forceRedeploy ? {skipIfAlreadyDeployed: false} : {}),
    }
  );

  // Deploy NativeTokenVotingSetup
  const nativeTokenVotingSetup = await deploy('NativeTokenVotingSetup', {
    from: deployer,
    args: [],
    log: true,
    ...(forceRedeploy ? {skipIfAlreadyDeployed: false} : {}),
  });

  console.log(
    `NativeTokenVotingPlugin implementation deployed at: ${nativeTokenVotingImplementation.address}`
  );
  console.log(
    `NativeTokenVotingSetup deployed at: ${nativeTokenVotingSetup.address}`
  );

  // Get PluginRepoFactory (Harmony may not have a "latest deployment" fallback)
  let pluginRepoFactoryAddress = '';
  try {
    const deployment = await deployments.get('PluginRepoFactory');
    pluginRepoFactoryAddress = deployment.address;
  } catch {
    pluginRepoFactoryAddress =
      deployedContractsJson?.contracts?.PluginRepoFactory?.address ?? '';
  }

  if (!isAddress(pluginRepoFactoryAddress)) {
    throw new Error(
      `PluginRepoFactory address not found/invalid for network '${hre.network.name}'. ` +
        `Expected a checksummed 0x-address, got '${pluginRepoFactoryAddress}'. ` +
        `Make sure the Framework deploy ran, or that deploy/deployed_contracts.json contains contracts.PluginRepoFactory.address.`
    );
  }

  const deployerSigner = await hre.ethers.getSigner(deployer);
  const pluginRepoFactory = await hre.ethers.getContractAt(
    'PluginRepoFactory',
    pluginRepoFactoryAddress,
    deployerSigner
  );

  const forceRepoRegister = process?.env?.FORCE_REPO_REGISTER === '1';
  if (existingRepoAddress && !forceRepoRegister) {
    console.log(
      `NativeTokenVoting PluginRepo already recorded at: ${existingRepoAddress}. Skipping repo registration.`
    );
    return;
  }

  // Register plugin repo
  console.log(
    `\nRegistering NativeTokenVoting plugin repo with subdomain: ${pluginRepoSubdomain}`
  );

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
