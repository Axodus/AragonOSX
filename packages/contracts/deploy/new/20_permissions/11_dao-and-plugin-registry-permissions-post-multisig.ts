import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * Pós-multisig: aplica permissões em registries que exigem ROOT via DAO.execute,
 * agora que o Multisig possui EXECUTE no ManagementDAO.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const managementDAOAddress = await getContractAddress('ManagementDAOProxy', hre);
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);
  const pluginRepoRegistryAddress = await getContractAddress('PluginRepoRegistryProxy', hre);
  const daoFactoryAddress = await getContractAddress('DAOFactory', hre);
  const managementDaoContract = DAO__factory.connect(managementDAOAddress, deployer);
  const pluginRepoFactoryAddress = await getContractAddress('PluginRepoFactory', hre);

  // Se o deployer não possui EXECUTE no ManagementDAO, não conseguirá chamar DAO.execute.
  // Nessa situação, este passo deve ser executado pelo Multisig off-chain, então pulamos.
  const execPermissionId = ethers.keccak256(ethers.toUtf8Bytes('EXECUTE_PERMISSION'));
  const hasExecute = await (DAO__factory.connect(managementDAOAddress, deployer) as any).hasPermission(
    managementDAOAddress,
    deployer.address,
    execPermissionId,
    '0x'
  );
  if (!hasExecute) {
    console.log('[PostMultisig] Deployer não possui EXECUTE no DAO. Pulando grants pós-multisig (execute via Multisig).');
    return;
  }

  const grants = [
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'DAOFactory', address: daoFactoryAddress},
      permission: 'REGISTER_DAO_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: 'UPGRADE_REGISTRY_PERMISSION',
    },
    {
      operation: Operation.Grant,
      where: {name: 'PluginRepoRegistryProxy', address: pluginRepoRegistryAddress},
      who: {name: 'PluginRepoFactory', address: pluginRepoFactoryAddress},
      permission: 'REGISTER_PLUGIN_REPO_PERMISSION',
    },
  ];

  await managePermissions(managementDaoContract, grants);
};

func.tags = ['new', 'DAO_Registry_Permissions_PostMultisig'];
// Garantir que rode após o grant ao Multisig
func.dependencies = ['ManagementDaoMultisig'];

export default func;
