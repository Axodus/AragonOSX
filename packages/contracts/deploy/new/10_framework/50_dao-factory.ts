import daoFactoryArtifact from '../../../artifacts/src/framework/dao/DAOFactory.sol/DAOFactory.json';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginSetupProcessor` address.
  const pluginSetupProcessorAddress = await getContractAddress(
    'PluginSetupProcessor',
    hre
  );

  // Optional rescue address to prevent irrecoverable permission deadlocks.
  // If not set (zero address), no extra EXECUTE permission is granted.
  const network = hre.network.name;
  let rescueMultisig = ethers.ZeroAddress;

  if (network === 'harmony') {
    rescueMultisig = (process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || '').trim() || ethers.ZeroAddress;
  } else if (network === 'harmonyTestnet') {
    rescueMultisig =
      (process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG || '').trim() || ethers.ZeroAddress;
  } else if (network === 'hardhat' || network === 'localhost') {
    rescueMultisig = (process.env.HARDHAT_MANAGEMENT_DAO_MULTISIG || '').trim() || ethers.ZeroAddress;
  }

  await deploy('DAOFactory', {
    contract: daoFactoryArtifact,
    from: deployer.address,
    args: [daoRegistryAddress, pluginSetupProcessorAddress, rescueMultisig],
    log: true,
  });
};
export default func;
func.tags = ['new', 'DAOFactory'];
