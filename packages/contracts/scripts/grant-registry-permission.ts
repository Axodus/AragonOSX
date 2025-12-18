import {ethers} from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const network = (await ethers.provider.getNetwork()).name || 'harmony';

  const deploymentsDir = path.resolve(__dirname, `../deployments/${network}`);
  const readDeployment = (file: string): {address: string; abi?: any[]} => {
    const p = path.join(deploymentsDir, file);
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  };

  const registryDep = readDeployment('DAORegistryProxy.json');
  const daoFactoryDep = readDeployment('DAOFactory.json');

  const registryAddr = process.env.DAO_REGISTRY ?? registryDep.address;
  const daoFactoryAddr = process.env.DAO_FACTORY ?? daoFactoryDep.address;

  const managingDao = process.env.MANAGING_DAO ?? '0x6767c7842629A608a0A5b7f4dF5A326d39d836e1';
  const ensRegistrar = process.env.DAO_ENS_REGISTRAR ?? (() => {
    try {
      return readDeployment('DAOENSSubdomainRegistrarProxy.json').address;
    } catch {
      return '0x0000000000000000000000000000000000000000';
    }
  })();

  // Harmony legacy overrides
  const provider = ethers.provider;
  let gasPrice = BigInt(0);
  try {
    const gasPriceHex = await provider.send('eth_gasPrice', []);
    gasPrice = BigInt(gasPriceHex);
  } catch (e) {
    gasPrice = BigInt('200000000000');
  }
  const MIN_GWEI = BigInt('200000000000');
  const legacyOverrides: any = {
    type: 0,
    gasLimit: BigInt(1000000),
    gasPrice: gasPrice < MIN_GWEI ? MIN_GWEI : gasPrice,
  };

  console.log('Registry:', registryAddr);
  console.log('DAOFactory:', daoFactoryAddr);
  console.log('Managing DAO:', managingDao);
  console.log('ENS Registrar:', ensRegistrar);

  // Attach contracts using ABIs from deployments where possible
  const registry = await ethers.getContractAt(registryDep.abi!, registryAddr);

  // 1) Initialize DAORegistry if not initialized
  try {
    const currentDao: string = await registry.dao();
    if (!currentDao || currentDao === '0x0000000000000000000000000000000000000000') {
      console.log('DAORegistry not initialized. Initializing...');
      const tx = await registry.initialize(managingDao, ensRegistrar, legacyOverrides);
      console.log('initialize tx:', tx.hash);
      await tx.wait();
      console.log('DAORegistry initialized with managing DAO.');
    } else {
      console.log('DAORegistry already initialized. managing DAO:', currentDao);
    }
  } catch (e: any) {
    console.log('Skipping initialize (maybe already initialized):', e?.message ?? e);
  }

  // 2) Compute permission id and grant via managing DAO
  const REGISTER_ID: string = await registry.REGISTER_DAO_PERMISSION_ID();
  console.log('REGISTER_DAO_PERMISSION_ID:', REGISTER_ID);

  // Encode grant() manually to avoid ABI mismatches in certain environments
  const pmIface = new ethers.Interface([
    'function grant(address _where, address _who, bytes32 _permissionId)',
  ]);
  const grantCalldata = pmIface.encodeFunctionData('grant', [registryAddr, daoFactoryAddr, REGISTER_ID]);
  const txResp = await (await ethers.getSigner()).sendTransaction({
    to: managingDao,
    data: grantCalldata,
    ...legacyOverrides,
  });
  console.log('grant tx:', txResp.hash);
  await txResp.wait();
  console.log('Granted REGISTER_DAO_PERMISSION to DAOFactory on DAORegistry.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
import { ethers } from 'hardhat';

/**
 * Grants REGISTER_DAO_PERMISSION on DAORegistry to the DAOFactory.
 * This fixes createDao reverts that happen before any plugin installation,
 * typically on chains where the factory wasn't granted registry permission.
 *
 * Env vars required:
 * - REGISTRY: address of DAORegistry
 * - MANAGING_DAO: address of the managing DAO that controls the registry
 * - FACTORY: address of DAOFactory to grant permission to
 *
 * Harmony notes:
 * - Use legacy tx type 0 and set a manual gasPrice if needed (RPC-specific).
 */
async function main() {
  const registry = process.env.REGISTRY?.trim();
  const managingDao = process.env.MANAGING_DAO?.trim();
  const factory = process.env.FACTORY?.trim();

  if (!registry || !managingDao || !factory) {
    throw new Error('Defina REGISTRY, MANAGING_DAO e FACTORY no env');
  }

  // 
  // IDAO minimal ABI: grant(address where, address who, bytes32 permissionId)
  //
  const idaoAbi = [
    'function grant(address where, address who, bytes32 permissionId) external',
  ];

  // REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION")
  const REGISTER_DAO_PERMISSION_ID = ethers.keccak256(ethers.toUtf8Bytes('REGISTER_DAO_PERMISSION'));

  const signer = (await ethers.getSigners())[0];
  const dao = new ethers.Contract(managingDao, idaoAbi, signer);

  // Harmony legacy overrides (optional)
  const provider = ethers.provider;
  const gasPriceHex = await provider.send('eth_gasPrice', []);
  const gasPrice = BigInt(gasPriceHex);
  const MIN_GWEI = 200n * 10n ** 9n;
  const legacyOverrides: any = { type: 0, gasLimit: 500_000n, gasPrice: gasPrice < MIN_GWEI ? MIN_GWEI : gasPrice };

  console.log('Granting REGISTER_DAO_PERMISSION on registry to factory...');
  console.log('Managing DAO:', managingDao);
  console.log('Registry    :', registry);
  console.log('Factory     :', factory);

  const tx = await dao.grant(registry, factory, REGISTER_DAO_PERMISSION_ID, legacyOverrides);
  console.log('Tx sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('Confirmed in block', receipt?.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
