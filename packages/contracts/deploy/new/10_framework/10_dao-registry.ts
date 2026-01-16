import daoRegistryArtifact from '../../../artifacts/src/framework/dao/DAORegistry.sol/DAORegistry.json';
import {countryRegistryEnv} from '../../../utils/environment';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  const isAddress = (value: string): boolean => {
    const fn = (ethers as any).isAddress ?? (ethers as any).utils?.isAddress;
    if (typeof fn === 'function') return !!fn(value);
    return /^0x[0-9a-fA-F]{40}$/.test(value);
  };

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  if (!managementDAOAddress || !isAddress(managementDAOAddress)) {
    throw new Error(
      `[DAORegistry] ManagementDAOProxy address inválido: '${managementDAOAddress}'`
    );
  }

  // Harmony (Country Registry) não usa ENSSubdomainRegistrar.
  const isHarmony = (network.name || '').toLowerCase().includes('harmony');
  const countryRegistry = countryRegistryEnv(network);
  let ensSubdomainRegistrarAddress: string;
  if (isHarmony || (countryRegistry && countryRegistry.trim().length > 0)) {
    ensSubdomainRegistrarAddress =
      (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000';
    console.log(
      `[DAORegistry] ENSSubdomainRegistrar não disponível nesta rede. Usando address(0).`
    );
  } else {
    // Get DAO's `ENSSubdomainRegistrar` contract.
    ensSubdomainRegistrarAddress = await getContractAddress(
      'DAOENSSubdomainRegistrarProxy',
      hre
    );
    if (!ensSubdomainRegistrarAddress || !isAddress(ensSubdomainRegistrarAddress)) {
      throw new Error(
        `[DAORegistry] DAOENSSubdomainRegistrarProxy address inválido: '${ensSubdomainRegistrarAddress}'`
      );
    }
  }

  await deploy('DAORegistryProxy', {
    contract: daoRegistryArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'ERC1967Proxy',
      proxyArgs: ['{implementation}', '{data}'],
      execute: {
        init: {
          methodName: 'initialize',
          args: [managementDAOAddress, ensSubdomainRegistrarAddress],
        },
      },
    },
  });
};
export default func;
func.tags = ['new', 'DAORegistry'];
