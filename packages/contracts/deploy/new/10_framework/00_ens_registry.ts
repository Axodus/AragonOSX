import {setupENS} from '../../../utils/ens';
import {daoDomainEnv, pluginDomainEnv, countryRegistryEnv} from '../../../utils/environment';
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

  // Harmony redes usam 1.country; se houver registry configurado, apenas valida domínios via leitura posteriormente.
  if ((network.name || '').toLowerCase().includes('harmony')) {
    const countryRegistry = countryRegistryEnv(network);
    if (countryRegistry && countryRegistry.trim().length > 0) {
      console.log(`[Country] Registry configurado (${countryRegistry}). Pulando deploy ENS padrão.`);
      return;
    }
    console.log(`[ENS] Rede '${network.name}' sem suporte ENS oficial e sem 1.country registry configurado. Pulando setup.`);
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
