import {DAO__factory} from '../../../typechain';
import {getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const txOverrides = await (async () => {
    const zero = ethers.toBigInt(0);
    const ten = ethers.toBigInt(10);
    const twelve = ethers.toBigInt(12);
    const envGas = process.env.HARMONY_GAS_PRICE;
    const requestedGasPrice = envGas ? ethers.toBigInt(envGas) : zero;

    let rpcGasPrice = zero;
    try {
      const hex = (await hre.ethers.provider.send(
        'eth_gasPrice',
        []
      )) as string;
      rpcGasPrice = hex ? ethers.toBigInt(hex) : zero;
    } catch (e) {
      rpcGasPrice = zero;
    }

    const bumpedRpcGasPrice =
      rpcGasPrice > zero ? (rpcGasPrice * twelve) / ten : zero;
    const gasPrice =
      requestedGasPrice > bumpedRpcGasPrice
        ? requestedGasPrice
        : bumpedRpcGasPrice;

    if (gasPrice === zero) return {};

    const requestedGasLimit = ethers.toBigInt(
      process.env.HARMONY_LEGACY_GAS_LIMIT || '1500000'
    );

    try {
      const latestBlock = await hre.ethers.provider.getBlock('latest');
      const blockGasLimit = (latestBlock as any)?.gasLimit;
      if (blockGasLimit && blockGasLimit > zero) {
        const safetyMargin = ethers.toBigInt(100000);
        const maxAllowed =
          blockGasLimit > safetyMargin
            ? blockGasLimit - safetyMargin
            : blockGasLimit;
        const gasLimit =
          requestedGasLimit > maxAllowed ? maxAllowed : requestedGasLimit;
        return {type: 0, gasPrice, gasLimit};
      }
    } catch (e) {
      // ignore
    }

    return {type: 0, gasPrice, gasLimit: requestedGasLimit};
  })();

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

  // Em modo "reuse", o ManagementDAO pode já estar sob controle do multisig e o
  // deployer não terá ROOT para conceder permissões. Nesse caso, não tente
  // auto-conceder EXECUTE (vai reverter) e deixe o deploy continuar.
  const rootPermissionId = ethers.keccak256(
    ethers.toUtf8Bytes('ROOT_PERMISSION')
  );
  try {
    const hasRoot = await (managementDaoContract as any).hasPermission(
      managementDAOAddress,
      deployer.address,
      rootPermissionId,
      '0x'
    );
    if (!hasRoot) {
      console.log(
        '[ManagementDaoPermissions] Deployer sem ROOT_PERMISSION no ManagementDAO; não é possível conceder EXECUTE automaticamente. Pulando.'
      );
      return;
    }
  } catch (_) {
    // Se falhar a leitura, seguimos e deixamos a tx falhar com erro real.
  }

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
      txOverrides
    );
    console.log(`Granted EXECUTE_PERMISSION with ${tx.hash}. Waiting for confirmation...`);
    await tx.wait();
  } catch (e) {
    console.log(`Grant via direct 'grant' failed, falling back to applyMultiTargetPermissions. Reason: ${(e as any)?.message || e}`);
    const items = [
      {
        operation: Operation.Grant,
        where: managementDAOAddress,
        who: deployer.address,
        condition:
          (ethers as any).ZeroAddress ||
          '0x0000000000000000000000000000000000000000',
        permissionId,
      },
    ];
    const tx2 = await managementDaoContract.applyMultiTargetPermissions(
      items,
      txOverrides
    );
    console.log(`Set permissions with ${tx2.hash}. Waiting for confirmation...`);
    await tx2.wait();
  }
};
export default func;
func.tags = ['new', 'ManagementDaoPermissions'];
