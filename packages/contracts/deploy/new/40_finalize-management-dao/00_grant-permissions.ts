import {DAO__factory, PluginRepo__factory} from '../../../typechain';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nFinalizing ManagementDao.`);

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();
  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Se Multisig está configurado ou deployer não tem EXECUTE, pule e deixe para o Multisig.
  const execPermissionId = ethers.keccak256(ethers.toUtf8Bytes('EXECUTE_PERMISSION'));
  const hasExecute = await (DAO__factory.connect(managementDAOAddress, deployer) as any).hasPermission(
    managementDAOAddress,
    deployer.address,
    execPermissionId,
    '0x'
  );
  if (multisigEnv || !hasExecute) {
    console.log('[Finalize] Multisig configurado ou deployer sem EXECUTE; pulando grants finais.');
    return;
  }

  const grantPermissions = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];

  await managePermissions(managementDaoContract, grantPermissions);
};
export default func;
func.tags = ['new', 'RegisterManagementDAO'];
