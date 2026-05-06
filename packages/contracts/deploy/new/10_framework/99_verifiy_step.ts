import {
  DAOFactory__factory,
  DAORegistry__factory,
  ENSRegistry__factory,
  ENSSubdomainRegistrar__factory,
  PluginRepoFactory__factory,
  PluginRepoRegistry__factory,
  PluginSetupProcessor__factory,
} from '../../../typechain';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {checkSetManagementDao, getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying framework deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();

  const isAddress = (value: string): boolean => {
    const fn = (ethers as any).isAddress ?? (ethers as any).utils?.isAddress;
    if (typeof fn === 'function') return !!fn(value);
    return /^0x[0-9a-fA-F]{40}$/.test(value);
  };

  const requireDeployedAddress = async (deploymentName: string): Promise<string> => {
    const addr = await getContractAddress(deploymentName, hre);
    if (!addr || !isAddress(addr)) {
      throw new Error(
        `[verify] Deployment ausente/inválido para '${deploymentName}' na rede '${hre.network.name}'. ` +
          `Valor retornado: '${addr}'.`
      );
    }
    return addr;
  };

  // Get `managementDAO` address.
  const managementDAOAddress = await requireDeployedAddress('ManagementDAOProxy');

  // If network has no ENS (e.g., Harmony), skip ENS-related verifications
  const ensDisabled = (hre.network.name || '').toLowerCase().includes('harmony');
  if (ensDisabled) {
    console.log("[ENS] Rede sem suporte ENS oficial. Pulando verificações de ENS.");
  } else {
  // VERIFYING DAO ENS SUBDOMAIN REGISTRAR
  const DAOENSSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );
  const DAOENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    DAOENSSubdomainRegistrarAddress,
    deployer
  );
  await checkSetManagementDao(DAOENSSubdomainRegistrar, managementDAOAddress);
  // scope to reuse same const again
  {
    const ensAddr = await DAOENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managementDAOAddress,
      DAOENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `DAOENSSubdomainRegistrar isn't approved for all. Expected ${managementDAOAddress} to have ${DAOENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await DAOENSSubdomainRegistrar.node();
    const domain = daoDomainEnv(hre.network);
    const expectedNode = (ethers as any).namehash ? (ethers as any).namehash(domain) : require('eth-ens-namehash').hash(domain);
    if (node !== expectedNode) {
      throw new Error(
        `DAOENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }

  // VERIFYING PLUGIN ENS SUBDOMAIN REGISTRAR
  const PluginENSSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );
  const PluginENSSubdomainRegistrar = ENSSubdomainRegistrar__factory.connect(
    PluginENSSubdomainRegistrarAddress,
    deployer
  );
  await checkSetManagementDao(
    PluginENSSubdomainRegistrar,
    managementDAOAddress
  );
  // scope to reuse same const again
  {
    const ensAddr = await PluginENSSubdomainRegistrar.ens();
    const ensRegistryContract = ENSRegistry__factory.connect(ensAddr, deployer);
    const isApprovedForAll = await ensRegistryContract.isApprovedForAll(
      managementDAOAddress,
      PluginENSSubdomainRegistrarAddress
    );
    if (!isApprovedForAll) {
      throw new Error(
        `PluginENSSubdomainRegistrar isn't approved for all. Expected ${managementDAOAddress} to have ${PluginENSSubdomainRegistrarAddress} approved for all`
      );
    }

    const node = await PluginENSSubdomainRegistrar.node();
    const domain = pluginDomainEnv(hre.network);
    const expectedNode = (ethers as any).namehash ? (ethers as any).namehash(domain) : require('eth-ens-namehash').hash(domain);
    if (node !== expectedNode) {
      throw new Error(
        `PluginENSSubdomainRegistrar node (${node}) doesn't match expected node (${expectedNode})`
      );
    }
  }
  }

  // VERIFYING DAO REGISTRY
  const DAORegistryAddress = await requireDeployedAddress('DAORegistryProxy');
  const DAORegistry = DAORegistry__factory.connect(
    DAORegistryAddress,
    deployer
  );
  await checkSetManagementDao(DAORegistry, managementDAOAddress);
  // scope to reuse same const again
  {
    if (!ensDisabled) {
      const SubdomainRegistrarAddress = await DAORegistry.subdomainRegistrar();
      const expected = await getContractAddress('DAOENSSubdomainRegistrarProxy', hre);
      if (SubdomainRegistrarAddress !== expected) {
        throw new Error(
          `${DAORegistryAddress} has wrong SubdomainRegistrarAddress set. Expected ${expected} to be ${SubdomainRegistrarAddress}`
        );
      }
    }
  }

  // VERIFYING PLUGIN REPO REGISTRY
  const PluginRepoRegistryAddress = await requireDeployedAddress(
    'PluginRepoRegistryProxy'
  );
  const PluginRepoRegistry = PluginRepoRegistry__factory.connect(
    PluginRepoRegistryAddress,
    deployer
  );
  await checkSetManagementDao(PluginRepoRegistry, managementDAOAddress);
  // scope to reuse same const again
  {
    if (!ensDisabled) {
      const SubdomainRegistrarAddress = await PluginRepoRegistry.subdomainRegistrar();
      const expected = await getContractAddress('PluginENSSubdomainRegistrarProxy', hre);
      if (SubdomainRegistrarAddress !== expected) {
        throw new Error(
          `${PluginRepoRegistryAddress} has wrong SubdomainRegistrarAddress set. Expected ${expected} to be ${SubdomainRegistrarAddress}`
        );
      }
    }
  }

  // VERIFYING PLUGIN REPO FACTORY
  const PluginRepoFactoryAddress = await requireDeployedAddress('PluginRepoFactory');
  const PluginRepoFactory = PluginRepoFactory__factory.connect(
    PluginRepoFactoryAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginRepoFactory.pluginRepoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING PSP
  const PluginSetupProcessorAddress = await requireDeployedAddress(
    'PluginSetupProcessor'
  );
  const PluginSetupProcessor = PluginSetupProcessor__factory.connect(
    PluginSetupProcessorAddress,
    deployer
  );
  // scope to reuse same const again
  {
    const SetPluginRepoRegistryAddress =
      await PluginSetupProcessor.repoRegistry();
    if (SetPluginRepoRegistryAddress !== PluginRepoRegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginRepoRegistry set. Expected ${SetPluginRepoRegistryAddress} to be ${PluginRepoRegistryAddress}`
      );
    }
  }

  // VERIFYING DAO FACTORY
  const DAOFactoryAddress = await requireDeployedAddress('DAOFactory');
  const DAOFactory = DAOFactory__factory.connect(DAOFactoryAddress, deployer);
  // scope to reuse same const again
  {
    const SetDAORegistryAddress = await DAOFactory.daoRegistry();
    if (SetDAORegistryAddress !== DAORegistryAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong DAORegistry set. Expected ${SetDAORegistryAddress} to be ${DAORegistryAddress}`
      );
    }
  }
  // scope to reuse same const again
  {
    const SetPSP = await DAOFactory.pluginSetupProcessor();
    if (SetPSP !== PluginSetupProcessorAddress) {
      throw new Error(
        `${PluginRepoFactoryAddress} has wrong PluginSetupProcessor set. Expected ${SetPSP} to be ${PluginSetupProcessorAddress}`
      );
    }
  }

  console.log('Framework deployment verified');
};
export default func;
func.runAtTheEnd = true;
func.tags = ['new', 'Verify'];
