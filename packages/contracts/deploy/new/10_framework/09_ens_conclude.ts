import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {countryRegistryEnv} from '../../../utils/environment';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Concluding ENS deployment.\n`);

  const {deployments, network} = hre;

  // Harmony (e redes com Country Registry) não possuem deployments ENS no fluxo.
  if ((network.name || '').toLowerCase().includes('harmony')) {
    console.log(`[ENS] Rede '${network.name}' sem suporte ENS oficial. Pulando conclude.`);
    return;
  }
  const countryRegistry = countryRegistryEnv(network);
  if (countryRegistry && countryRegistry.trim().length > 0) {
    console.log(`[ENS] Country Registry configurado (${countryRegistry}). Pulando conclude.`);
    return;
  }

  try {
    const ensRegistry = await deployments.get('ENSRegistry');
    if (ensRegistry) {
      hre.aragonToVerifyContracts.push(ensRegistry);
    }
  } catch (e) {
    console.log(`No deployment for ENSRegistry found`);
  }

  try {
    const publicResolver = await deployments.get('PublicResolver');
    if (publicResolver) {
      hre.aragonToVerifyContracts.push(publicResolver);
    }
  } catch (e) {
    console.log(`No deployment for PublicResolver found`);
  }

  try {
    hre.aragonToVerifyContracts.push(
      await deployments.get('DAOENSSubdomainRegistrarProxy')
    );
    hre.aragonToVerifyContracts.push({
      contract:
        'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
      ...(await deployments.get('DAOENSSubdomainRegistrarProxy_Implementation')),
    });
    hre.aragonToVerifyContracts.push(
      await deployments.get('PluginENSSubdomainRegistrarProxy')
    );
    hre.aragonToVerifyContracts.push({
      contract:
        'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
      ...(await deployments.get(
        'PluginENSSubdomainRegistrarProxy_Implementation'
      )),
    });
  } catch (e) {
    console.log(`No deployments for ENSSubdomainRegistrars found`);
  }
};

export default func;
func.tags = [
  'new',
  'ENSRegistry',
  'ENSSubdomains',
  'ENSSubdomainRegistrars',
  'Verify',
];
