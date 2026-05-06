import {DAO__factory, DAORegistry__factory} from '../../../typechain';
import {ENSRegistry__factory} from '../../../typechain/factories/ENSRegistry__factory';
import {
  daoDomainEnv,
  isLocal,
  managementDaoSubdomainEnv,
  countryRegistryEnv,
} from '../../../utils/environment';
import {getContractAddress, getENSAddress} from '../../helpers';
import MANAGEMENT_DAO_METADATA from '../../management-dao-metadata.json';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  const txOverrides = await (async () => {
    const zero = ethers.toBigInt(0);
    const ten = ethers.toBigInt(10);
    const twelve = ethers.toBigInt(12);
    const envGas = process.env.HARMONY_GAS_PRICE;
    const requestedGasPrice = envGas ? ethers.toBigInt(envGas) : zero;

    let rpcGasPrice = zero;
    try {
      const hex = (await hre.ethers.provider.send('eth_gasPrice', [])) as string;
      rpcGasPrice = hex ? ethers.toBigInt(hex) : zero;
    } catch (e) {
      rpcGasPrice = zero;
    }

    // Evita `transaction underpriced` (Harmony costuma exigir >= eth_gasPrice).
    // Bump de 20% para reduzir flakiness.
    const bumpedRpcGasPrice =
      rpcGasPrice > zero ? (rpcGasPrice * twelve) / ten : zero;
    const gasPrice =
      requestedGasPrice > bumpedRpcGasPrice
        ? requestedGasPrice
        : bumpedRpcGasPrice;

    // Sem gasPrice (env nem rpc): não forçar overrides.
    if (gasPrice === zero) return {};

    const requestedGasLimit = ethers.toBigInt(
      process.env.HARMONY_LEGACY_GAS_LIMIT || '1500000'
    );

    // Harmony RPC frequentemente não implementa `eth_estimateGas`, então sempre
    // passamos `gasLimit`. Porém, alguns RPCs rejeitam quando ele excede o limite
    // do bloco. Aqui fazemos clamp com base no `latest block gasLimit`.
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
      // Se o RPC falhar no getBlock, seguimos com o limite configurado.
    }

    return {type: 0, gasPrice, gasLimit: requestedGasLimit};
  })();

  const isHarmony = (network.name || '').toLowerCase().includes('harmony');
  const countryRegistry = countryRegistryEnv(network);
  const ensDisabled = isHarmony || (countryRegistry && countryRegistry.trim().length > 0);

  // Get info from .env (apenas quando ENS estiver habilitado)
  const daoSubdomain = managementDaoSubdomainEnv(network);
  const daoDomain = daoDomainEnv(network);

  if (!ensDisabled && !daoSubdomain)
    throw new Error('ManagementDAO subdomain has not been set in .env');

  const node = !ensDisabled
    ? ((ethers as any).namehash
        ? (ethers as any).namehash(`${daoSubdomain}.${daoDomain}`)
        : require('eth-ens-namehash').hash(`${daoSubdomain}.${daoDomain}`))
    : null;

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Valida endereços antes de conectar contratos (ethers v6 exige endereços válidos)
  if (!managementDAOAddress || managementDAOAddress === (ethers as any).ZeroAddress) {
    console.log('[Finalize/Register] Endereço de ManagementDAOProxy inválido; pulando.');
    return;
  }
  if (!daoRegistryAddress || daoRegistryAddress === (ethers as any).ZeroAddress) {
    console.log('[Finalize/Register] Endereço de DAORegistryProxy inválido; pulando.');
    return;
  }

  // Get `DAORegistryProxy` contract
  const daoRegistryContract = DAORegistry__factory.connect(
    daoRegistryAddress,
    deployer
  );

  // Em redes sem ENS (Harmony/Country Registry), registre com subdomain vazio.
  // Isso mantém o DAORegistry funcional sem depender de ENS.
  if (ensDisabled) {
    try {
      const registerTx = await daoRegistryContract.register(
        managementDAOAddress,
        deployer.address,
        '',
        txOverrides
      );
      await registerTx.wait();
      console.log(
        `Registered the (managingDAO: ${managementDAOAddress}) on (DAORegistry: ${daoRegistryAddress}) with empty subdomain, see (tx: ${registerTx.hash})`
      );
    } catch (e) {
      console.log('[Finalize/Register] Falha ao registrar (no-ENS); pulando.');
    }
  } else {
    // ENS habilitado: valida ownership do subdomain antes de registrar.
    let owner = (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000';
    try {
      const ensRegistryContract = ENSRegistry__factory.connect(
        await getENSAddress(hre),
        deployer
      );
      owner = await ensRegistryContract.owner(node as string);
    } catch (e) {
      owner = (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000';
    }

    const daoENSSubdomainRegistrar = await getContractAddress(
      'DAOENSSubdomainRegistrarProxy',
      hre
    );

    if (
      owner !== daoENSSubdomainRegistrar &&
      owner !==
        ((ethers as any).ZeroAddress ||
          '0x0000000000000000000000000000000000000000')
    ) {
      throw new Error(
        `A DAO with ${daoSubdomain}.${daoDomain} is registered and owned by someone other than ENSSubdomainRegistrar ${daoENSSubdomainRegistrar}.`
      );
    }

    if (owner === ((ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000')) {
      try {
        const registerTx = await daoRegistryContract.register(
          managementDAOAddress,
          deployer.address,
          daoSubdomain,
          txOverrides
        );
        await registerTx.wait();
        console.log(
          `Registered the (managingDAO: ${managementDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
        );
      } catch (e) {
        console.log('[Finalize/Register] Falha ao registrar via deployer; pulando.');
      }
    }
  }

  // Set Metadata for the Management DAO
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    deployer
  );

  let metadataCIDPath = '0x';

  if (!isLocal(hre.network)) {
    // Upload the metadata to IPFS (prefer Pinata). If it fails, skip upload to avoid
    // hitting endpoints with TLS issues and set empty metadata.
    try {
      metadataCIDPath = await uploadToPinata(
        JSON.stringify(MANAGEMENT_DAO_METADATA, null, 2),
        `management-dao-metadata`
      );
    } catch (e) {
      metadataCIDPath = '0x';
    }
  }

  const hasMetadataPermission = await managementDaoContract.hasPermission(
    managementDAOAddress,
    deployer.address,
    ethers.keccak256(ethers.toUtf8Bytes('SET_METADATA_PERMISSION')),
    '0x'
  );

  if (hasMetadataPermission) {
    const setMetadataTX = await managementDaoContract.setMetadata(
      ethers.hexlify(ethers.toUtf8Bytes(metadataCIDPath)),
      txOverrides
    );
    await setMetadataTX.wait();
  } else {
    console.log('[Finalize/Metadata] Deployer sem SET_METADATA_PERMISSION; pulando.');
  }
};
export default func;
func.tags = ['new', 'RegisterManagementDAO'];
