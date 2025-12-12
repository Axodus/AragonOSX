import {DAO__factory} from '../../../typechain';
import {getContractAddress, managePermissions} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`Granting ${deployer.address} temp EXECUTE permission`);

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

  // Grant the deployer EXECUTE permission for setup (ROOT not needed; DAO.execute is used for permission changes).
  await managePermissions(managementDaoContract, [
    {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    },
  ]);
};
export default func;
func.tags = ['new', 'ManagementDaoPermissions'];
