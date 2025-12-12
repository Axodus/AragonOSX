import {DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
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

  // Bootstrap: as initialOwner, the deployer holds ROOT and can grant EXECUTE directly
  const items = [
    [
      Operation.Grant,
      managementDAOAddress,
      deployer.address,
      (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000',
      ethers.keccak256(ethers.toUtf8Bytes('EXECUTE_PERMISSION')),
    ],
  ];
  const tx = await managementDaoContract.applyMultiTargetPermissions(items, {gasLimit: 1_200_000});
  console.log(`Set permissions with ${tx.hash}. Waiting for confirmation...`);
  await tx.wait();
};
export default func;
func.tags = ['new', 'ManagementDaoPermissions'];
