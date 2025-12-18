import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * (MANUAL) Revoga permissões do deployer.
 *
 * Em Harmony, manter o deployer com EXECUTE durante o processo de deploy/finalize
 * evita dead-ends. Use este passo manualmente depois, se desejar.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const managementDAOAddress = await getContractAddress('ManagementDAOProxy', hre);
  const managementDaoContract = DAO__factory.connect(managementDAOAddress, deployer);

  console.log(`[multisig/manual] Revogando EXECUTE_PERMISSION e ROOT_PERMISSION do Deployer ${deployer.address}`);

  await managePermissions(managementDaoContract, [
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
      data: '0x',
    },
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
      data: '0x',
    },
  ]);
};

// NÃO roda automaticamente no deploy padrão.
func.tags = ['manual', 'ManagementDaoRevokeDeployer'];

export default func;
