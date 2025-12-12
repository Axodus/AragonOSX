import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {managementDaoMultisigAddressEnv} from '../../../utils/environment';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * Concede permissões de EXECUTE ao Multisig configurado via .env
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  const managementDAOAddress = await getContractAddress('ManagementDAOProxy', hre);
  const managementDaoContract = DAO__factory.connect(managementDAOAddress, deployer);

  const multisigAddress = managementDaoMultisigAddressEnv(network);
  console.log(`[multisig] Concedendo EXECUTE_PERMISSION para Multisig ${multisigAddress}`);

  await managePermissions(managementDaoContract, [
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'ManagementMultisig', address: multisigAddress},
      permission: 'EXECUTE_PERMISSION',
    },
  ]);
};

func.tags = ['new', 'ManagementDaoMultisig'];
func.dependencies = ['ManagementDaoPermissions'];

export default func;
