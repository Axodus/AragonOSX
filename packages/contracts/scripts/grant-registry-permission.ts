import {ethers} from 'hardhat';
import {Wallet} from 'ethers';
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

  // Use proxy address by default; only override via env if explicitly forced
  const registryAddr =
    process.env.FORCE_ENV_REGISTRY === '1' && process.env.DAO_REGISTRY
      ? (process.env.DAO_REGISTRY as string)
      : (registryDep.address as string);
  const daoFactoryAddr = process.env.DAO_FACTORY ?? daoFactoryDep.address;

  let managingDao = process.env.MANAGING_DAO ?? '0x6767c7842629A608a0A5b7f4dF5A326d39d836e1';
  const ensRegistrar = process.env.DAO_ENS_REGISTRAR ?? (() => {
    try {
      return readDeployment('DAOENSSubdomainRegistrarProxy.json').address;
    } catch {
      return '0x0000000000000000000000000000000000000000';
    }
  })();

  // Harmony legacy overrides
  const provider = ethers.provider;
  // Gas price: prefer env override, fallback to RPC, enforce minimum
  let gasPrice = BigInt(0);
  const envGasRaw = process.env.HARMONY_GAS_PRICE;
  const envGas = envGasRaw ? BigInt(envGasRaw) : undefined;
  try {
    const gasPriceHex = await provider.send('eth_gasPrice', []);
    gasPrice = BigInt(gasPriceHex);
  } catch (e) {
    gasPrice = BigInt('200000000000');
  }
  if (envGas && envGas > gasPrice) {
    gasPrice = envGas;
  }
  const MIN_GWEI = BigInt('200000000000');
  const legacyOverrides: any = {
    type: 0,
    gasLimit: BigInt(process.env.HARMONY_LEGACY_GAS_LIMIT || '2000000'),
    gasPrice: gasPrice < MIN_GWEI ? MIN_GWEI : gasPrice,
  };

  if (process.env.FORCE_ENV_REGISTRY === '1') {
    console.warn('[WARN] Using DAO_REGISTRY from env due to FORCE_ENV_REGISTRY=1');
  }
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
      if (managingDao.toLowerCase() !== currentDao.toLowerCase()) {
        console.warn(
          `[WARN] Env MANAGING_DAO (${managingDao}) difere do DAO do Registry (${currentDao}). Usarei o do Registry.`
        );
      }
      managingDao = currentDao;
    }
  } catch (e: any) {
    console.log('Skipping initialize (maybe already initialized):', e?.message ?? e);
  }

  // 2) Compute permission id and grant via managing DAO
  const REGISTER_ID: string = await registry.REGISTER_DAO_PERMISSION_ID();
  console.log('REGISTER_DAO_PERMISSION_ID:', REGISTER_ID);
  // Use DAO ABI to call grant with ABI safety (use FQN to avoid HH701)
  const dao = await ethers.getContractAt('src/core/dao/DAO.sol:DAO', managingDao);
  // Select signer: prefer GRANT_SIGNER_PRIVATE_KEY if provided
  const [defaultSigner] = await ethers.getSigners();
  let signer: any = defaultSigner;
  if (process.env.GRANT_SIGNER_PRIVATE_KEY) {
    try {
      let pk = (process.env.GRANT_SIGNER_PRIVATE_KEY || '').trim();
      if (!pk.startsWith('0x')) pk = '0x' + pk;
      signer = new Wallet(pk, provider);
      console.log('[INFO] Using signer from GRANT_SIGNER_PRIVATE_KEY');
    } catch (e) {
      console.warn('[WARN] Failed to use GRANT_SIGNER_PRIVATE_KEY, falling back to default signer.');
      signer = defaultSigner;
    }
  }
  const daoWithSigner = dao.connect(signer);
  const sender = await signer.getAddress();
  console.log('Signer address:', sender);
  const ROOT = await dao.ROOT_PERMISSION_ID();
  try {
    const hasRoot: boolean = await dao.isGranted(managingDao, sender, ROOT, '0x');
    if (!hasRoot) {
      console.error(
        `Sender ${sender} does not have ROOT on managing DAO ${managingDao}. Use the DAO owner/deployer.`
      );
      process.exit(1);
    }
  } catch (_) {
    // Fallback to hasPermission if needed
    const hasRootAlt: boolean = await dao.hasPermission(managingDao, sender, ROOT, '0x');
    if (!hasRootAlt) {
      console.error(
        `Sender ${sender} does not have ROOT on managing DAO ${managingDao}. Use the DAO owner/deployer.`
      );
      process.exit(1);
    }
  }

  const grantTx = await daoWithSigner.grant(registryAddr, daoFactoryAddr, REGISTER_ID, legacyOverrides);
  console.log('grant tx:', grantTx.hash);
  await grantTx.wait();
  console.log('Granted REGISTER_DAO_PERMISSION to DAOFactory on DAORegistry (proxy).');

  // Verify permission granted
  try {
    const granted = await dao.isGranted(registryAddr, daoFactoryAddr, REGISTER_ID, '0x');
    console.log('isGranted after grant:', granted);
  } catch (_) {
    const grantedAlt = await dao.hasPermission(registryAddr, daoFactoryAddr, REGISTER_ID, '0x');
    console.log('hasPermission after grant:', grantedAlt);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
