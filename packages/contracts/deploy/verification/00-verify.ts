import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Verifica contratos implantados usando hardhat-verify para a rede atual.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network, run} = hre;
  const all = await deployments.all();
  let names = Object.keys(all);

  // Em redes sem suporte a ENS (ex.: harmony), pule verificações de registrars ENS
  const noEnsNetworks = new Set(['harmony', 'harmonytestnet']);
  if (noEnsNetworks.has(network.name.toLowerCase())) {
    const skipPatterns = [
      'DAOENSSubdomainRegistrarProxy',
      'PluginENSSubdomainRegistrarProxy',
      'ENSSubdomainRegistrar',
    ];
    names = names.filter(n => !skipPatterns.some(p => n.includes(p)));
    console.log(`[verify] Rede '${network.name}' sem ENS; pulando contratos: ${skipPatterns.join(', ')}`);
  }

  if (names.length === 0) {
    console.log(`[verify] Nenhum contrato encontrado para verificação em '${network.name}'.`);
    return;
  }

  console.log(`[verify] Iniciando verificação de ${names.length} contratos em '${network.name}'.`);

  for (const name of names) {
    const d = all[name];
    const address = d.address;
    let args = d.args || [];

    // Implementations behind proxies usually have zero-arg constructors.
    // Force empty args for any deployment labeled as an implementation.
    const isImplementation = /Implementation$/i.test(name) || /Proxy_Implementation/i.test(name);
    if (isImplementation) {
      args = [];
    }

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
