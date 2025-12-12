import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Verifica contratos já implantados usando hardhat-verify.
 * Tenta verificar todos os contratos presentes em deployments para a rede atual.
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
      // Alguns explorers exigem verificação apenas se não estiver verificado.
      // O run('verify:verify') irá falhar caso já esteja verificado; tratamos com try/catch.
      await run('verify:verify', {
        address,
        constructorArguments: args,
      });
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

// Usa a tag de 'verification' para alinhar com hardhat.config.ts
func.tags = ['verification'];
func.runAtTheEnd = true;

export default func;
