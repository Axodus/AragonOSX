import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * Revoga EXECUTE_PERMISSION do deployer após instalar o Multisig.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const managementDAOAddress = await getContractAddress('ManagementDAOProxy', hre);
  const managementDaoContract = DAO__factory.connect(managementDAOAddress, deployer);

  console.log(`[multisig] Revogando EXECUTE_PERMISSION do Deployer ${deployer.address}`);

  await managePermissions(managementDaoContract, [
    {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
      data: '0x',
    },
  ]);
};

func.tags = ['new', 'ManagementDaoMultisig'];
func.dependencies = ['ManagementDaoPermissions'];

export default func;
