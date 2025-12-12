import {setupENS} from '../../../utils/ens';
import {daoDomainEnv, pluginDomainEnv} from '../../../utils/environment';
import {ENS_ADDRESSES} from '../../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

// Make sure you own the ENS set in the {{NETWORK}}_ENS_DOMAIN variable in .env
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`\nDeploying framework.`);

  const {network} = hre;

  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);

  const officialEnsRegistryAddress = ENS_ADDRESSES[network.name];

  // Harmony redes não suportam ENS por padrão; pula setup para evitar erros
  if (network.name === 'harmony' || network.name === 'harmonyTestnet') {
    console.log(`[ENS] Rede '${network.name}' sem suporte ENS oficial. Pulando setup.`);
    return;
  }

  if (!officialEnsRegistryAddress) {
    // Filtra nomes inválidos
    const domains = [daoDomain, pluginDomain].filter(
      d => !!d && d.trim().length > 0 && d.includes('.')
    );
    if (domains.length === 0) {
      console.log('[ENS] Nenhum domínio válido para registrar. Pulando.');
      return;
    }
    await setupENS(domains, hre);
  }
};
export default func;
func.tags = ['new', 'ENSRegistry'];
