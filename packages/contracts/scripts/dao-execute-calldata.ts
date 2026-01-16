import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.install by default (override with DOTENV_CONFIG_PATH)
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.env.DOTENV_CONFIG_PATH)
    : path.resolve(__dirname, '..', '.env.install'),
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}`);
  return value;
}

function asChecksumAddress(value: string, name: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
}

// Harmony/legacy: use type 0 + gasPrice
async function getLegacyGasOverrides(gasLimit?: bigint) {
  const networkMin = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = networkMin;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < networkMin ? networkMin : gp;
    }
  } catch {
    // keep fallback
  }

  const limit = gasLimit ?? BigInt(2_000_000);
  return { type: 0, gasPrice, gasLimit: limit } as const;
}

async function main() {
  const adminKeyRaw = (process.env.ADMIN_KEY ?? '').trim();
  const adminKey = adminKeyRaw ? adminKeyRaw.split(',')[0].trim() : '';
  const signer = adminKey ? new ethers.Wallet(adminKey, ethers.provider) : (await ethers.getSigners())[0];

  const daoAddr = asChecksumAddress(requireEnv('DAO'), 'DAO');
  const calldata = requireEnv('DAO_EXECUTE_CALLDATA').trim();

  if (!ethers.isHexString(calldata)) {
    throw new Error('DAO_EXECUTE_CALLDATA inválido (hex)');
  }

  const gasLimitEnv = process.env.GAS_LIMIT ? BigInt(process.env.GAS_LIMIT) : undefined;
  const overrides = await getLegacyGasOverrides(gasLimitEnv);

  console.log(`Signer: ${signer.address}`);
  console.log(`DAO   : ${daoAddr}`);
  console.log('Sending DAO.execute calldata...');

  const tx = await signer.sendTransaction({
    to: daoAddr,
    data: calldata,
    ...overrides,
  });

  console.log('tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('confirmed in block:', receipt?.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
