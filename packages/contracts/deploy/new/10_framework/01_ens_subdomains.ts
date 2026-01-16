import {ENSRegistry__factory} from '../../../typechain';
import {ENSRegistry} from '../../../typechain/ENSRegistry';
import {
  countryRegistryEnv,
  daoDomainEnv,
  pluginDomainEnv,
} from '../../../utils/environment';
import {
  getContractAddress,
  getENSAddress,
  getPublicResolverAddress,
  registerSubnodeRecord,
  transferSubnodeChain,
} from '../../helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

async function registerAndTransferDomain(
  ensRegistryContract: ENSRegistry,
  managementDAOAddress: string,
  domain: string,
  node: string,
  deployer: SignerWithAddress,
  hre: HardhatRuntimeEnvironment,
  ethers: any
) {
  let owner = await ensRegistryContract.owner(node);

  // node hasn't been registered yet
  if (owner === ((ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000')) {
    owner = await registerSubnodeRecord(
      domain,
      deployer,
      await getENSAddress(hre),
      await getPublicResolverAddress(hre)
    );
  }

  if (owner !== managementDAOAddress && owner !== deployer.address) {
    throw new Error(
      `${domain} is not owned either by deployer: ${deployer.address} or management dao: ${managementDAOAddress}. 
      Check if the domain is owned by ENS wrapper and if so, unwrap it from the ENS app.`
    );
  }

  // It could be the case that domain is already owned by the management DAO which could happen
  // if the script succeeded and is re-run again. So avoid transfer which would fail otherwise.
  if (owner === deployer.address) {
    await transferSubnodeChain(
      domain,
      managementDAOAddress,
      deployer.address,
      await getENSAddress(hre)
    );
  }
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  // Harmony não tem ENS oficial (usa 1.country). Não tente resolver ENSRegistry via deployments.
  if ((network.name || '').toLowerCase().includes('harmony')) {
    console.log(`[ENS] Rede '${network.name}' sem suporte ENS oficial. Pulando subdomains.`);
    return;
  }

  // Se um Country Registry estiver configurado, o fluxo de ENS não deve rodar.
  const countryRegistry = countryRegistryEnv(network);
  if (countryRegistry && countryRegistry.trim().length > 0) {
    console.log(
      `[ENS] Country Registry configurado (${countryRegistry}). Pulando subdomains.`
    );
    return;
  }

  // Get ENS subdomains
  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  let ensRegistryAddress: string | null = null;
  try {
    ensRegistryAddress = await getENSAddress(hre);
  } catch (e) {
    console.log(`[ENS] No deployment/address for ENSRegistry. Pulando subdomains.`);
    return;
  }

  if (!ensRegistryAddress) {
    console.log(`[ENS] ENSRegistry address vazio. Pulando subdomains.`);
    return;
  }
  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Check if domains are owned by the managementDAO
  const daoNode = (ethers as any).namehash
    ? (ethers as any).namehash(daoDomain)
    : require('eth-ens-namehash').hash(daoDomain);
  const pluginNode = (ethers as any).namehash
    ? (ethers as any).namehash(pluginDomain)
    : require('eth-ens-namehash').hash(pluginDomain);

  await registerAndTransferDomain(
    ensRegistryContract,
    managementDAOAddress,
    daoDomain,
    daoNode,
    deployer,
    hre,
    ethers
  );

  await registerAndTransferDomain(
    ensRegistryContract,
    managementDAOAddress,
    pluginDomain,
    pluginNode,
    deployer,
    hre,
    ethers
  );
};
export default func;
func.tags = ['new', 'ENSSubdomains'];
