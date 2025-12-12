import {DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;
  if (multisigEnv && multisigEnv.length > 0) {
    console.log(
      `Multisig is configured (${multisigEnv}). Skipping temporary EXECUTE grant to deployer.`
    );
    return;
  }

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
  const permissionId = ethers.keccak256(ethers.toUtf8Bytes('EXECUTE_PERMISSION'));
  try {
    const tx = await managementDaoContract.grant(
      managementDAOAddress,
      deployer.address,
      permissionId,
      '0x',
      {gasLimit: 600000}
    );
    console.log(`Granted EXECUTE_PERMISSION with ${tx.hash}. Waiting for confirmation...`);
    await tx.wait();
  } catch (e) {
    console.log(`Grant via direct 'grant' failed, falling back to applyMultiTargetPermissions. Reason: ${(e as any)?.message || e}`);
    const items = [
      [
        Operation.Grant,
        managementDAOAddress,
        deployer.address,
        (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000',
        permissionId,
      ],
    ];
    const tx2 = await managementDaoContract.applyMultiTargetPermissions(items, {gasLimit: 1_500_000});
    console.log(`Set permissions with ${tx2.hash}. Waiting for confirmation...`);
    await tx2.wait();
  }
};
export default func;
func.tags = ['new', 'ManagementDaoPermissions'];
