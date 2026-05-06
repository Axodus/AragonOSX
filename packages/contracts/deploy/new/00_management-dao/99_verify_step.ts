import {DAO__factory} from '../../../typechain';
import {
  checkPermission,
  DAO_PERMISSIONS,
  getContractAddress,
} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying management DAO deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();
  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  // If a Multisig is configured, we skip verifying EXECUTE for the deployer,
  // since we no longer grant temporary EXECUTE to the EOA on Harmony.
  if (!multisigEnv || multisigEnv.length === 0) {
    await checkPermission(managementDaoContract, {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    });
  } else {
    console.log('Multisig detected; skipping deployer EXECUTE permission verification.');
  }

  // check that the DAO have all permissions set correctly
  for (let index = 0; index < DAO_PERMISSIONS.length; index++) {
    const permission = DAO_PERMISSIONS[index];

    await checkPermission(managementDaoContract, {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      permission: permission,
    });
  }

  console.log('Management DAO deployment verified');
};
export default func;
  func.tags = ['new', 'ManagementDao', 'SetDAOPermissions'];
