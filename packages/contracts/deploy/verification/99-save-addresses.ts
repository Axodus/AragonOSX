import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Salva um JSON com todos os endereços dos contratos implantados.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network} = hre;
  const all = await deployments.all();
  const result: Record<string, {address: string; txHash?: string}> = {};

  for (const [name, d] of Object.entries(all)) {
    result[name] = {address: d.address, txHash: d.receipt?.transactionHash};
  }

  const rootOut = path.resolve(__dirname, '..', 'deployed_contracts.json');
  const perNetworkDir = path.resolve(__dirname, '..', 'deployments', network.name);
  const perNetworkOut = path.join(perNetworkDir, 'deployed_contracts.json');

  fs.mkdirSync(perNetworkDir, {recursive: true});

  const payload = {
    network: network.name,
    chainId: hre.network.config.chainId,
    contracts: result,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(rootOut, JSON.stringify(payload, null, 2));
  fs.writeFileSync(perNetworkOut, JSON.stringify(payload, null, 2));

  console.log(`[addresses] Arquivos gerados:\n- ${rootOut}\n- ${perNetworkOut}`);
};

func.tags = ['verification'];
func.runAtTheEnd = true;

export default func;
