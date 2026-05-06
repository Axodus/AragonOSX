import {DAO__factory, PluginRepo__factory} from '../../../typechain';
import {managementDaoSubdomainEnv} from '../../../utils/environment';
import {getContractAddress, managePermissions, Permission} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

// Revokes necessary permissions from deployer, but leaves EXECUTE
// permission currently on the deployer. This is useful for a deployer
// to install the plugin on managing dao at later time.
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();
  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;

  // Get info from .env
  const daoSubdomain = managementDaoSubdomainEnv(hre.network);

  if (!daoSubdomain)
    throw new Error('ManagementDAO subdomain has not been set in .env');

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `ManagementDAOProxy` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // Se Multisig está configurado e estamos removendo privilégios do deployer,
  // podemos manter apenas a verificação/registro das revogações que não exigem
  // executar via deployer (DAO.execute); caso contrário, pule para evitar revert.
  const execPermissionId = ethers.keccak256(ethers.toUtf8Bytes('EXECUTE_PERMISSION'));
  const hasExecute = await (DAO__factory.connect(managementDAOAddress, deployer) as any).hasPermission(
    managementDAOAddress,
    deployer.address,
    execPermissionId,
    '0x'
  );
  if (multisigEnv && !hasExecute) {
    console.log('[Finalize/Revoke] Multisig configurado e deployer sem EXECUTE; pulando revogações via deployer.');
    return;
  }

  // Revoke `REGISTER_DAO_PERMISSION` from `Deployer`.
  // Revoke `ROOT_PERMISSION` from `Deployer`.
  // Revoke `SET_METADATA_PERMISSION` from `Deployer`.
  const revokePermissions = [
    {
      operation: Operation.Revoke,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'SET_METADATA_PERMISSION',
    },
  ];
  await managePermissions(managementDaoContract, revokePermissions);
};
export default func;
func.tags = ['new', 'RevokeManagementPermissionsDAO'];
