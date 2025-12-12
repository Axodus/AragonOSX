import {DAO__factory, DAORegistry__factory} from '../../../typechain';
import {ENSRegistry__factory} from '../../../typechain/factories/ENSRegistry__factory';
import {
  daoDomainEnv,
  isLocal,
  managementDaoSubdomainEnv,
} from '../../../utils/environment';
import {getContractAddress, getENSAddress, uploadToIPFS} from '../../helpers';
import MANAGEMENT_DAO_METADATA from '../../management-dao-metadata.json';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();
  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;

  // Get info from .env
  const daoSubdomain = managementDaoSubdomainEnv(network);
  const daoDomain = daoDomainEnv(network);

  if (!daoSubdomain)
    throw new Error('ManagementDAO subdomain has not been set in .env');

  const node = (ethers as any).namehash
    ? (ethers as any).namehash(`${daoSubdomain}.${daoDomain}`)
    : require('eth-ens-namehash').hash(`${daoSubdomain}.${daoDomain}`);

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);

  // Get `DAORegistryProxy` contract.
  const daoRegistryContract = DAORegistry__factory.connect(
    daoRegistryAddress,
    deployer
  );

  // Harmony não tem ENS oficial; se falhar, trate como não registrado
  let owner = ethers.ZeroAddress;
  try {
    const ensRegistryContract = ENSRegistry__factory.connect(
      await getENSAddress(hre),
      deployer
    );
    owner = await ensRegistryContract.owner(node);
  } catch (e) {
    owner = ethers.ZeroAddress;
  }

  let daoENSSubdomainRegistrar = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  if (
    owner != daoENSSubdomainRegistrar &&
    owner != (ethers as any).ZeroAddress
  ) {
    throw new Error(
      `A DAO with ${daoSubdomain}.${daoDomain} is registered and owned by 
      someone other than ENSSubdomainRegistrar ${daoENSSubdomainRegistrar}.`
    );
  }

  if (owner === (ethers as any).ZeroAddress) {
    // Register `managingDAO` on `DAORegistry`.
    // Em ambientes com Multisig como owner inicial, o deployer pode não ter permissão.
    // Nesse caso, pulamos o registro on-chain aqui para ser feito via Multisig.
    const canRegister = await daoRegistryContract.permissionManager().catch(() => undefined);
    try {
      const registerTx = await daoRegistryContract.register(
        managementDAOAddress,
        deployer.address,
        daoSubdomain
      );
      await registerTx.wait();
      console.log(
        `Registered the (managingDAO: ${managementDAOAddress}) on (DAORegistry: ${daoRegistryAddress}), see (tx: ${registerTx.hash})`
      );
    } catch (e) {
      console.log('[Finalize/Register] Falha ao registrar via deployer; provavelmente requer execução via Multisig. Pulando.');
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
    managementDaoContract.address,
    deployer.address,
    ethers.keccak256(ethers.toUtf8Bytes('SET_METADATA_PERMISSION')),
    '0x'
  );

  if (hasMetadataPermission) {
    const setMetadataTX = await managementDaoContract.setMetadata(
      ethers.hexlify(ethers.toUtf8Bytes(metadataCIDPath))
    );
    await setMetadataTX.wait();
  } else if (multisigEnv) {
    console.log('[Finalize/Metadata] Deployer sem SET_METADATA_PERMISSION com Multisig configurado; aplicar metadata via Multisig.');
  }
};
export default func;
func.tags = ['new', 'RegisterManagementDAO'];
