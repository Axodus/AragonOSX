import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Valida variáveis de ambiente necessárias e prepara estado mínimo no HRE.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const required = ['ALCHEMY_API_KEY'];
  const missing = required.filter(k => !process.env[k] || process.env[k] === '');

  if (missing.length) {
    console.warn(`[env] Variáveis ausentes: ${missing.join(', ')}`);
  }

  // Inicialização mínima para compatibilidade
  hre.aragonToVerifyContracts = hre.aragonToVerifyContracts || [];
  hre.managementDAOMultisigPluginAddress = hre.managementDAOMultisigPluginAddress || '';
  hre.managementDAOActions = hre.managementDAOActions || [];

  console.log(`[env] Ambiente verificado para rede '${hre.network.name}'.`);
};

func.tags = ['env'];

export default func;
