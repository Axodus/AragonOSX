import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Verifica contratos implantados usando hardhat-verify para a rede atual.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network, run} = hre;
  const all = await deployments.all();
  const names = Object.keys(all);

  if (names.length === 0) {
    console.log(`[verify] Nenhum contrato encontrado para verificação em '${network.name}'.`);
    return;
  }

  console.log(`[verify] Iniciando verificação de ${names.length} contratos em '${network.name}'.`);

  for (const name of names) {
    const d = all[name];
    const address = d.address;
    const args = d.args || [];

    try {
      await run('verify:verify', {address, constructorArguments: args});
      console.log(`[verify] Contrato '${name}' verificado em ${address}.`);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('Already Verified') || msg.includes('Contract source code already verified')) {
        console.log(`[verify] Contrato '${name}' já verificado: ${address}.`);
      } else {
        console.warn(`[verify] Falha ao verificar '${name}' (${address}): ${msg}`);
      }
    }
  }
};

func.tags = ['verification'];

export default func;
