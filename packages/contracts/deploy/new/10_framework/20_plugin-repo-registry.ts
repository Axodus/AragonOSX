import pluginRepoRegistryArtifact from '../../../artifacts/src/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';
import {countryRegistryEnv} from '../../../utils/environment';
import {getContractAddress} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Get `managementDAO` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Harmony (Country Registry) não usa ENSSubdomainRegistrar.
  const isHarmony = (network.name || '').toLowerCase().includes('harmony');
  const countryRegistry = countryRegistryEnv(network);
  let ensSubdomainRegistrarAddress: string;
  if (isHarmony || (countryRegistry && countryRegistry.trim().length > 0)) {
    ensSubdomainRegistrarAddress =
      (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000';
    console.log(
      `[PluginRepoRegistry] ENSSubdomainRegistrar não disponível nesta rede. Usando address(0).`
    );
  } else {
    // Get DAO's `ENSSubdomainRegistrar` address.
    ensSubdomainRegistrarAddress = await getContractAddress(
      'PluginENSSubdomainRegistrarProxy',
      hre
    );
  }

  await deploy('PluginRepoRegistryProxy', {
    contract: pluginRepoRegistryArtifact,
    from: deployer.address,
    args: [],
    log: true,
    proxy: {
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
// func.runAtTheEnd = true;
func.tags = ['new', 'PluginRepoRegistry'];
