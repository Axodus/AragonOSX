/*
 Gera a calldata para: DAO.grant(PluginRepoRegistry, PluginRepoFactory, REGISTER_PLUGIN_REPO_PERMISSION)
 Útil para enviar via multisig, executor, ou conta com ROOT no ManagementDAO.

 Uso:
  npx hardhat run scripts/generate-grant-calldata.ts --network harmony
*/

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { keccak256, toUtf8Bytes, Interface } from 'ethers';

type Deployed = { deployedContractAddresses?: Record<string, string> };

async function main() {
  const deployedPath = path.join(__dirname, '..', 'deployed_contracts.json');
  if (!fs.existsSync(deployedPath)) throw new Error('deployed_contracts.json não encontrado');
  const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8')) as Deployed;

  const dao = deployed.deployedContractAddresses?.ManagementDAOProxy;
  const registry = deployed.deployedContractAddresses?.PluginRepoRegistryProxy;
  const factory = deployed.deployedContractAddresses?.PluginRepoFactory;
  if (!dao || !registry || !factory) throw new Error('Endereços necessários ausentes (DAO/Registry/Factory)');

  const DAO_ABI = [
    'function grant(address where, address who, bytes32 permissionId)'
  ];
  const iface = new Interface(DAO_ABI);
  const PERM = keccak256(toUtf8Bytes('REGISTER_PLUGIN_REPO_PERMISSION'));
  const data = iface.encodeFunctionData('grant', [registry, factory, PERM]);

  console.log('Resumo da ação de permissão');
  console.log('- DAO (to):', dao);
  console.log('- where (Registry):', registry);
  console.log('- who (Factory):', factory);
  console.log('- permissionId:', PERM);
  console.log('- calldata:', data);

  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log(`\nEnvio sugerido (forge cast):`);
  console.log(`cast send ${dao} "grant(address,address,bytes32)" ${registry} ${factory} ${PERM} --rpc-url <RPC_HARMONY> --private-key <CHAVE> --legacy --gas-price 200gwei`);
  console.log(`\nOu via Safe/Multisig, use to=${dao}, data=${data}, value=0`);
  console.log(`Rede: ${network.name} (${network.chainId})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
