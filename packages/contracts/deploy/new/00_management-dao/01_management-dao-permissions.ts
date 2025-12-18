import {DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  // NOTE: Mesmo quando um Multisig está configurado, o deploy automatizado precisa
  // do deployer com EXECUTE para chamar DAO.execute (managePermissions) enquanto ele
  // ainda é o owner temporário do ManagementDAO.

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
  // Se já está concedido, não faça tx.
  try {
    const already = await (managementDaoContract as any).hasPermission(
      managementDAOAddress,
      deployer.address,
      permissionId,
      '0x'
    );
    if (already) {
      console.log('EXECUTE_PERMISSION já concedida ao deployer. Pulando.');
      return;
    }
  } catch (_) {
    // ignore
  }
  try {
    const tx = await managementDaoContract.grant(
      managementDAOAddress,
      deployer.address,
      permissionId,
      '0x',
      (() => {
        const envGas = process.env.HARMONY_GAS_PRICE;
        const gasPrice = envGas ? BigInt(envGas) : 300_000_000_000n;
        const gasLimit = BigInt(process.env.HARMONY_LEGACY_GAS_LIMIT || '1500000');
        return {type: 0, gasPrice, gasLimit};
      })()
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
    const tx2 = await managementDaoContract.applyMultiTargetPermissions(
      items,
      (() => {
        const envGas = process.env.HARMONY_GAS_PRICE;
        const gasPrice = envGas ? BigInt(envGas) : 300_000_000_000n;
        const gasLimit = BigInt(process.env.HARMONY_LEGACY_GAS_LIMIT || '1500000');
        return {type: 0, gasPrice, gasLimit};
      })()
    );
    console.log(`Set permissions with ${tx2.hash}. Waiting for confirmation...`);
    await tx2.wait();
  }
};
export default func;
func.tags = ['new', 'ManagementDaoPermissions'];
