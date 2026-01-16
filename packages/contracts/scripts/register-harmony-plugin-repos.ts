import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente específicas para esta execução.
// - Por padrão, tenta `.env.install` no CWD.
// - Permite override via `DOTENV_CONFIG_PATH`.
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.env.DOTENV_CONFIG_PATH)
    : path.resolve(process.cwd(), '.env.install'),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}`);
  return value;
}

function truthyEnv(name: string): boolean {
  const value = (process.env[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'y';
}

function asChecksumAddress(value: string, name: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
}

async function getLegacyGasOverrides(gasLimit: bigint) {
  const networkMin = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = networkMin;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < networkMin ? networkMin : gp;
    }
  } catch {
    // fallback permanece networkMin
  }
  return { type: 0, gasPrice, gasLimit } as const;
}

type RepoToRegister = {
  env: string;
  label: string;
  subdomain: string;
};

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const pspAddr = asChecksumAddress(
    requireEnv('PLUGIN_SETUP_PROCESSOR'),
    'PLUGIN_SETUP_PROCESSOR'
  );

  const repos: RepoToRegister[] = [
    { env: 'ADMIN_REPO_PROXY', label: 'AdminRepoProxy', subdomain: process.env.SUBDOMAIN ?? '' },
    { env: 'HARMONY_HIP_VOTING_REPO_PROXY', label: 'HarmonyHIPVotingRepoProxy', subdomain: 'harmonyHipVoting' },
    { env: 'HARMONY_DELEGATION_VOTING_REPO_PROXY', label: 'HarmonyDelegationVotingRepoProxy', subdomain: 'harmonyDelegationVoting' },
  ];

  if (truthyEnv('INCLUDE_CORE_REPOS')) {
    repos.unshift(
      { env: 'TOKEN_VOTING_REPO_PROXY', label: 'TokenVotingRepoProxy', subdomain: 'token-voting' },
      { env: 'MULTISIG_REPO_PROXY', label: 'MultisigRepoProxy', subdomain: 'multisig' }
    );
  }

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Signer : ${signer.address}`);
  console.log(`PSP    : ${pspAddr}`);

  const psp = await ethers.getContractAt(
    'src/framework/plugin/setup/PluginSetupProcessor.sol:PluginSetupProcessor',
    pspAddr,
    signer
  );

  const repoRegistryAddr: string = await psp.repoRegistry();
  const repoRegistry = await ethers.getContractAt(
    'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
    repoRegistryAddr,
    signer
  );

  const managingDaoAddr: string = await (repoRegistry as any).dao();
  const registerPermId: string = await (repoRegistry as any).REGISTER_PLUGIN_REPO_PERMISSION_ID();

  console.log(`RepoRegistry: ${repoRegistryAddr}`);
  console.log(`Registry managing DAO: ${managingDaoAddr}`);
  console.log(`REGISTER_PLUGIN_REPO_PERMISSION_ID: ${registerPermId}`);

  const managingDao = await ethers.getContractAt(
    'src/core/dao/DAO.sol:DAO',
    managingDaoAddr,
    signer
  );

  const gasOverrides = await getLegacyGasOverrides(BigInt(700_000));

  for (const r of repos) {
    const raw = (process.env[r.env] ?? '').trim();
    if (!raw) {
      console.log(`- ${r.label}: env ${r.env} ausente (skip)`);
      continue;
    }

    const repoAddr = asChecksumAddress(raw, r.env);

    const code = await ethers.provider.getCode(repoAddr);
    if (!code || code === '0x') {
      console.log(`- ${r.label}: ${repoAddr} sem código (skip)`);
      continue;
    }

    const before: boolean = await (repoRegistry as any).entries(repoAddr);
    if (before) {
      console.log(`- ${r.label}: ${repoAddr} já registrado`);
      continue;
    }

    if (truthyEnv('SKIP_REPO_REGISTRATION')) {
      throw new Error(
        `${r.label} não está registrado no PluginRepoRegistry e SKIP_REPO_REGISTRATION=1. Repo=${repoAddr}`
      );
    }

    const subdomain = (r.subdomain ?? '').trim();
    console.log(`- ${r.label}: registrando ${repoAddr} (subdomain="${subdomain}")...`);

    // 1) tenta registrar direto
    try {
      const tx = await (repoRegistry as any).registerPluginRepo(subdomain, repoAddr, gasOverrides);
      const receipt = await tx.wait();
      console.log(`  registerPluginRepo tx: ${receipt?.hash ?? tx.hash}`);
    } catch (e) {
      console.log(`  registerPluginRepo falhou; tentando grant + retry...`);

      // 2) concede permissão e tenta novamente
      const grantTx = await managingDao.grant(repoRegistryAddr, signer.address, registerPermId, gasOverrides);
      await grantTx.wait();

      const tx2 = await (repoRegistry as any).registerPluginRepo(subdomain, repoAddr, gasOverrides);
      const receipt2 = await tx2.wait();
      console.log(`  registerPluginRepo (retry) tx: ${receipt2?.hash ?? tx2.hash}`);
    }

    const after: boolean = await (repoRegistry as any).entries(repoAddr);
    console.log(`  entries(repo)=${after}`);
    if (!after) throw new Error(`${r.label}: registro não refletiu em entries(repo)=true`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
