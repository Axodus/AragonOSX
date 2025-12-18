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
