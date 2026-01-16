/*
 Verifica se o PluginRepoFactory tem permissão para registrar repos no PluginRepoRegistry
 e (opcionalmente) concede a permissão via DAO se a conta tiver ROOT.

 Uso:
  npx hardhat run scripts/check-repo-permission.ts --network harmony

 Env vars:
  - GRANT=1 (opcional) -> tenta conceder permissão se ausente
*/

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { keccak256, toUtf8Bytes } from 'ethers';

type Deployed = {
  deployedContractAddresses?: Record<string, string>;
};

const DAO_ABI = [
  'function hasPermission(address where, address who, bytes32 permissionId, bytes data) view returns (bool)',
  'function grant(address where, address who, bytes32 permissionId)'
];

async function main() {
  const [signer] = await ethers.getSigners();

  const deployedPath = path.join(__dirname, '..', 'deployed_contracts.json');
  if (!fs.existsSync(deployedPath)) {
    throw new Error('deployed_contracts.json não encontrado');
  }
  const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8')) as Deployed;
  const reg = deployed.deployedContractAddresses?.PluginRepoRegistryProxy;
  const daoAddr = deployed.deployedContractAddresses?.ManagementDAOProxy;
  const factory = deployed.deployedContractAddresses?.PluginRepoFactory;

  if (!reg || !daoAddr || !factory) {
    throw new Error('Endereços necessários não encontrados (Registry/DAO/Factory)');
  }

  const dao = new ethers.Contract(daoAddr, DAO_ABI, signer);
  const PERM = keccak256(toUtf8Bytes('REGISTER_PLUGIN_REPO_PERMISSION'));

  const has = await dao.hasPermission(reg, factory, PERM, '0x');
  console.log('Factory tem REGISTER_PLUGIN_REPO_PERMISSION no Registry?', has);

  const doGrant = process.env.GRANT === '1';
  if (!has && doGrant) {
    console.log('Tentando conceder permissão...');
    const overrides = await getLegacyGasOverrides();
    const tx = await dao.grant(reg, factory, PERM, overrides);
    console.log('Tx enviada:', tx.hash);
    const receipt = await tx.wait();
    console.log('Confirmada no bloco', receipt.blockNumber);
  } else if (!has) {
    console.log('Permissão ausente. Rode novamente com GRANT=1 se esta conta tiver ROOT no DAO.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Força transação legacy na Harmony com gas mínimo
async function getLegacyGasOverrides() {
  try {
    const networkMin = BigInt(200_000_000_000); // 200 gwei
    let gasPrice = await (ethers as any).provider.getGasPrice();
    if (gasPrice < networkMin) gasPrice = networkMin;
    const gasLimit = BigInt(500_000);
    return { type: 0, gasPrice, gasLimit } as const;
  } catch {
    const gasPrice = BigInt(200_000_000_000); // 200 gwei
    const gasLimit = BigInt(500_000);
    return { type: 0, gasPrice, gasLimit } as const;
  }
}
