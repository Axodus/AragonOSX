import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Placeholder de deploy: ajuste para implantar contratos necessários.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`[new] Nenhum passo de deploy específico implementado para '${hre.network.name}'.`);
};

func.tags = ['new'];

export default func;
