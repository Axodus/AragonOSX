import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import path from 'path';
import {writeFile} from 'fs/promises';

/**
 * Verifica contratos implantados usando hardhat-verify para a rede atual.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network, run} = hre;
  const all = await deployments.all();
  let names = Object.keys(all);

  const report: {
    network: string;
    generatedAt: string;
    totals: {total: number; verified: number; alreadyVerified: number; failed: number; skipped: number};
    results: Array<
      | {name: string; address: string; status: 'verified' | 'already_verified' | 'failed'; message?: string}
      | {name: string; address: string; status: 'skipped'; reason: string}
    >;
  } = {
    network: network.name,
    generatedAt: new Date().toISOString(),
    totals: {total: 0, verified: 0, alreadyVerified: 0, failed: 0, skipped: 0},
    results: [],
  };

  // Em redes sem suporte a ENS (ex.: harmony), pule verificações de registrars ENS
  const noEnsNetworks = new Set(['harmony', 'harmonytestnet']);
  if (noEnsNetworks.has(network.name.toLowerCase())) {
    const skipPatterns = [
      'DAOENSSubdomainRegistrarProxy',
      'PluginENSSubdomainRegistrarProxy',
      'ENSSubdomainRegistrar',
    ];
    const toSkip = names.filter(n => skipPatterns.some(p => n.includes(p)));
    for (const name of toSkip) {
      report.results.push({
        name,
        address: all[name]?.address,
        status: 'skipped',
        reason: `Rede '${network.name}' sem ENS`,
      });
      report.totals.skipped++;
    }
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
      report.results.push({name, address, status: 'verified'});
      report.totals.verified++;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('Already Verified') || msg.includes('Contract source code already verified')) {
        console.log(`[verify] Contrato '${name}' já verificado: ${address}.`);
        report.results.push({name, address, status: 'already_verified', message: msg});
        report.totals.alreadyVerified++;
      } else {
        console.warn(`[verify] Falha ao verificar '${name}' (${address}): ${msg}`);
        report.results.push({name, address, status: 'failed', message: msg});
        report.totals.failed++;
      }
    }
  }

  report.totals.total = report.results.length;

  const deploymentsDir = (hre.config as any).paths?.deployments || 'deployments';
  const outPath = path.join(deploymentsDir, network.name, 'verification-report.json');
  try {
    await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[verify] Report salvo em ${outPath}`);
  } catch (e: any) {
    console.warn(`[verify] Falha ao salvar report JSON (${outPath}): ${String(e?.message || e)}`);
  }
};

func.tags = ['verification'];

export default func;
