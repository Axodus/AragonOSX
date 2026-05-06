import ensSubdomainRegistrarArtifact from '../../../artifacts/src/framework/utils/ens/ENSSubdomainRegistrar.sol/ENSSubdomainRegistrar.json';
import {DAO__factory, ENSRegistry__factory} from '../../../typechain';
import {countryRegistryEnv, daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {getContractAddress, getENSAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  // Harmony não possui suporte ENS oficial; pulamos completamente este passo.
  if ((network.name || '').toLowerCase().includes('harmony')) {
    console.log("[ENS] Rede 'harmony' sem suporte ENS oficial. Pulando subdomain registrars.");
    return;
  }

  const countryRegistry = countryRegistryEnv(network);
  if (countryRegistry && countryRegistry.trim().length > 0) {
    console.log(
      `[ENS] Country Registry configurado (${countryRegistry}). Pulando subdomain registrars.`
    );
    return;
  }

  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );
  const managementDAO = DAO__factory.connect(managementDAOAddress, deployer);

  let ensRegistryAddress: string | null = null;
  try {
    ensRegistryAddress = await getENSAddress(hre);
  } catch (e) {
    console.log('[ENS] No deployment/address for ENSRegistry. Pulando subdomain registrars.');
    return;
  }
  // If ENS is not available on this network, skip.
  if (!ensRegistryAddress) {
    console.log("[ENS] Registro não disponível nesta rede. Pulando subdomain registrars.");
    return;
  }

  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  if (!daoDomain || !pluginDomain) {
    console.log("[ENS] Domínios não configurados. Pulando subdomain registrars.");
    return;
  }
  const daoNode = (ethers as any).namehash ? (ethers as any).namehash(daoDomain) : require('eth-ens-namehash').hash(daoDomain);
  const pluginNode = (ethers as any).namehash ? (ethers as any).namehash(pluginDomain) : require('eth-ens-namehash').hash(pluginDomain);

  await deploy('DAOENSSubdomainRegistrarProxy', {
    contract: ensSubdomainRegistrarArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [managementDAOAddress, ensRegistryAddress, daoNode],
        },
      },
    },
  });

  // Get DAO's `DAOENSSubdomainRegistrarProxy` contract.
  const daoSubdomainRegistrarAddress = await getContractAddress(
    'DAOENSSubdomainRegistrarProxy',
    hre
  );

  await deploy('PluginENSSubdomainRegistrarProxy', {
    contract: ensSubdomainRegistrarArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [managementDAOAddress, ensRegistryAddress, pluginNode],
        },
      },
    },
  });

  // Get the `ENSSubdomainRegistrar` proxy contract of the PluginRepoRegistry.
  const pluginSubdomainRegistrarAddress = await getContractAddress(
    'PluginENSSubdomainRegistrarProxy',
    hre
  );

  const ensRegistryContract = ENSRegistry__factory.connect(
    ensRegistryAddress,
    deployer
  );

  const daoRegistrarTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      daoSubdomainRegistrarAddress,
      true
    );
  const pluginRegistrarTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      pluginSubdomainRegistrarAddress,
      true
    );
  const deployerTX =
    await ensRegistryContract.populateTransaction.setApprovalForAll(
      deployer.address,
      true
    );

  const tx = await managementDAO.execute(
    ethers.hexlify(ethers.toUtf8Bytes('ENS_Permissions')),
    [
      {
        to: daoRegistrarTX.to || '',
        value: daoRegistrarTX.value || '0',
        data: daoRegistrarTX.data || '',
      },
      {
        to: pluginRegistrarTX.to || '',
        value: pluginRegistrarTX.value || '0',
        data: pluginRegistrarTX.data || '',
      },
      {
        to: deployerTX.to || '',
        value: deployerTX.value || '0',
        data: deployerTX.data || '',
      },
    ],
    0
  );
  console.log(`Updating controllers of ENS domains with tx ${tx.hash}`);
  await tx.wait();
};
export default func;
func.tags = ['new', 'ENSSubdomainRegistrars'];
