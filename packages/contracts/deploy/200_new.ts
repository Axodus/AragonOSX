import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Placeholder de deploy. Caso seus contratos já estejam em `deployments/`,
 * este passo não faz nada. Caso contrário, implemente aqui a orquestração
 * de criação/upgrade dos contratos do OSx.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`[new] Nenhum passo de deploy específico implementado para '${hre.network.name}'.`);
  console.log('[new] Ajuste este script para realizar implantações conforme necessário.');
};

func.tags = ['new'];

export default func;
