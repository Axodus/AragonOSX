/*
 Script: Create Admin PluginRepo on a target network
 Usage:
   npx hardhat run scripts/create-admin-repo.ts --network harmony \
     --show-stack-traces

 Required env vars:
   - MAINTAINER: EOA que será o maintainer do repo

 Optional env vars:
   - SUBDOMAIN: subdomínio ENS do repo (padrão: "admin")
   - PLUGIN_REPO_FACTORY: endereço do PluginRepoFactory (fallback: lido de deployed_contracts.json)
   - ADMIN_PLUGIN_SETUP: endereço do AdminPluginSetup para publicar a primeira versão
   - RELEASE_METADATA_URI: string/URI de release metadata (opcional)
   - BUILD_METADATA_URI: string/URI de build metadata (opcional)

 Se ADMIN_PLUGIN_SETUP estiver definido, o script chamará createPluginRepoWithFirstVersion(1.1).
 Caso contrário, criará apenas o repo vazio via createPluginRepo.
*/

import { ethers } from 'hardhat';
import { Interface, id, toUtf8Bytes } from 'ethers';
import fs from 'fs';
import path from 'path';

type Deployed = {
  deployedContractAddresses?: Record<string, string>;
};

const MIN_ABI_FACTORY = [
  'function pluginRepoRegistry() view returns (address)',
  'function createPluginRepo(string subdomain, address initialOwner) returns (address)',
  'function createPluginRepoWithFirstVersion(string subdomain, address pluginSetup, address maintainer, bytes releaseMetadata, bytes buildMetadata) returns (address)'
];

const REGISTRY_EVENT_IFACE = new Interface([
  'event PluginRepoRegistered(string subdomain, address pluginRepo)'
]);

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const maintainer = process.env.MAINTAINER;
  if (!maintainer) {
    throw new Error('MAINTAINER não definido. Ex: export MAINTAINER=0x...');
  }

  const subdomain = process.env.SUBDOMAIN ?? 'admin';
  const adminSetup = process.env.ADMIN_PLUGIN_SETUP; // opcional
  const releaseMetaStr = process.env.RELEASE_METADATA_URI ?? '';
  const buildMetaStr = process.env.BUILD_METADATA_URI ?? '';

  let factoryAddr = process.env.PLUGIN_REPO_FACTORY;
  if (!factoryAddr) {
    // tenta ler do deployed_contracts.json
    const p = path.join(__dirname, '..', 'deployed_contracts.json');
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Deployed;
      factoryAddr = parsed.deployedContractAddresses?.PluginRepoFactory;
    }
  }

  if (!factoryAddr) {
    throw new Error('Endereço do PluginRepoFactory não encontrado. Defina PLUGIN_REPO_FACTORY ou verifique deployed_contracts.json');
  }

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Factory : ${factoryAddr}`);
  console.log(`Subdomain: ${subdomain}`);
  console.log(`Maintainer: ${maintainer}`);
  if (adminSetup) console.log(`AdminPluginSetup: ${adminSetup}`);

  const factory = new ethers.Contract(factoryAddr, MIN_ABI_FACTORY, deployer);

  // Descobre o endereço do registry para decodificar event logs (opcional)
  let registryAddr: string | undefined;
  try {
    registryAddr = await factory.pluginRepoRegistry();
    console.log(`Registry: ${registryAddr}`);
  } catch {}

  const tx = adminSetup
    ? await factory.createPluginRepoWithFirstVersion(
        subdomain,
        adminSetup,
        maintainer,
        toUtf8Bytes(releaseMetaStr),
        toUtf8Bytes(buildMetaStr)
      )
    : await factory.createPluginRepo(subdomain, maintainer);

  console.log('Tx sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('Tx confirmed in block', receipt?.blockNumber);

  // Tenta extrair endereço do PluginRepo via evento PluginRepoRegistered
  const topic = id('PluginRepoRegistered(string,address)');
  const log = receipt?.logs?.find((l: any) => l.topics?.[0] === topic && (!registryAddr || l.address?.toLowerCase() === registryAddr.toLowerCase()));
  if (log) {
    const parsed = REGISTRY_EVENT_IFACE.parseLog({ topics: log.topics, data: log.data });
    const pluginRepo = parsed?.args?.pluginRepo as string;
    console.log('PluginRepo address:', pluginRepo);
  } else {
    console.warn('Aviso: Não foi possível decodificar PluginRepoRegistered. Verifique manualmente no explorer pelos logs do tx.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
