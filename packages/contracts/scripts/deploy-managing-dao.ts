import { ethers } from 'hardhat';

/**
 * Deploys a UUPS proxy of the DAO implementation using DaoProxyFactory
 * and initializes it with minimal settings to act as the managing DAO for DAORegistry.
 *
 * Env vars:
 * - DAO_IMPL: address of the DAO implementation (networkDefinitions.addresses.dao)
 */
async function main() {
  const daoImpl = process.env.DAO_IMPL?.trim();
  if (!daoImpl) throw new Error('Defina DAO_IMPL com o endereço da implementação do DAO');

  const [signer] = await ethers.getSigners();

  // Harmony legacy overrides
  const provider = ethers.provider;
  let gasPrice = BigInt(0);
  try {
    const gasPriceHex = await provider.send('eth_gasPrice', []);
    gasPrice = BigInt(gasPriceHex);
  } catch (e) {
    // fallback para 200 gwei se o RPC não suportar eth_gasPrice
    gasPrice = BigInt('200000000000');
  }
  const MIN_GWEI = BigInt('200000000000');
  const legacyOverrides: any = { type: 0, gasLimit: BigInt(1000000), gasPrice: gasPrice < MIN_GWEI ? MIN_GWEI : gasPrice };

  // Compose initialize calldata for DAO.initialize(bytes,address,address,string)
  const daoIface = new ethers.Interface([
    'function initialize(bytes _metadata, address _initialOwner, address _trustedForwarder, string daoURI_)',
  ]);
  const initCalldata = daoIface.encodeFunctionData('initialize', [
    '0x',
    await signer.getAddress(),
    ethers.ZeroAddress,
    '',
  ]);

  const Factory = await ethers.getContractFactory('DaoProxyFactory');
  const factory = await Factory.deploy(legacyOverrides);
  await factory.waitForDeployment();
  console.log('DaoProxyFactory:', await factory.getAddress());

  const tx = await factory.deployDaoProxy(daoImpl, initCalldata, legacyOverrides);
  console.log('Deploy tx:', tx.hash);
  const receipt = await tx.wait();

  const event = receipt?.logs?.[0];
  let managingDao: string | undefined;
  try {
    const parsed = new ethers.Interface(['event DaoProxyDeployed(address proxy, address implementation)']).parseLog(event!);
    managingDao = parsed?.args?.proxy as string;
  } catch (e) {
    console.warn('Falha ao decodificar evento, tente manualmente obter o proxy da tx');
  }

  console.log('Managing DAO (proxy):', managingDao ?? 'desconhecido');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
