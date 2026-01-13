import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
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
  const pluginRepoSubdomain = `native-token-voting-${Date.now()}`;
  console.log(
    `\nRegistering NativeTokenVoting plugin repo with subdomain: ${pluginRepoSubdomain}`
  );

  const registerTx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
    pluginRepoSubdomain,
    nativeTokenVotingSetup.address,
    deployer,
    '0x00', // release metadata
    '0x00' // build metadata
  );

  const receipt = await registerTx.wait();
  const event = receipt.events?.find(
    (e: any) => e.event === 'PluginRepoRegistered'
  );
  const pluginRepoAddress = event?.args?.pluginRepo;

  console.log(`NativeTokenVoting PluginRepo registered at: ${pluginRepoAddress}`);
};

export default func;
func.tags = ['New', 'NativeTokenVoting'];
func.dependencies = ['Framework'];
