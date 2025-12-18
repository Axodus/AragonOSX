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

  const registryAddr = registryDep.address as string;
  const daoFactoryAddr = daoFactoryDep.address as string;

  console.log('Registry:', registryAddr);
  console.log('DAOFactory:', daoFactoryAddr);

  const registry = await ethers.getContractAt(registryDep.abi!, registryAddr);
  const managingDao: string = await registry.dao();
  console.log('Managing DAO (from registry.dao()):', managingDao);

  const dao = await ethers.getContractAt('src/core/dao/DAO.sol:DAO', managingDao);

  // Current signer diagnostics
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();
  console.log('Current signer:', sender);

  // Permission IDs
  const ROOT: string = await dao.ROOT_PERMISSION_ID();
  const REGISTER_ID: string = await registry.REGISTER_DAO_PERMISSION_ID();
  console.log('ROOT_PERMISSION_ID:', ROOT);
  console.log('REGISTER_DAO_PERMISSION_ID:', REGISTER_ID);

  // Check if signer has ROOT
  try {
    const hasRoot = await dao.isGranted(managingDao, sender, ROOT, '0x');
    console.log('Signer has ROOT:', hasRoot);
  } catch (_) {
    const hasRootAlt = await dao.hasPermission(managingDao, sender, ROOT, '0x');
    console.log('Signer has ROOT (hasPermission):', hasRootAlt);
  }

  // Check if DAOFactory already has REGISTER_DAO_PERMISSION on Registry
  try {
    const granted = await dao.isGranted(registryAddr, daoFactoryAddr, REGISTER_ID, '0x');
    console.log('DAOFactory REGISTER on Registry (isGranted):', granted);
  } catch (_) {
    const grantedAlt = await dao.hasPermission(registryAddr, daoFactoryAddr, REGISTER_ID, '0x');
    console.log('DAOFactory REGISTER on Registry (hasPermission):', grantedAlt);
  }

  // Scan Granted events on the managing DAO for ROOT holders
  const topicGranted = ethers.id('Granted(bytes32,address,address,address,address)');
  const filter = {
    address: managingDao,
    topics: [topicGranted, ROOT],
    fromBlock: 0,
    toBlock: 'latest' as any,
  };

  const logs = await ethers.provider.getLogs(filter as any);
  const iface = new ethers.Interface([
    'event Granted(bytes32 permissionId,address here,address where,address who,address condition)',
  ]);

  const rootHolders = new Set<string>();
  for (const log of logs) {
    try {
      const decoded = iface.decodeEventLog('Granted', log.data, log.topics);
      const who = (decoded as any).who as string;
      rootHolders.add(who);
    } catch {}
  }

  console.log('ROOT holders found:', Array.from(rootHolders));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
