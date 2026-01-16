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

  // Check known env addresses
  const envMultisig = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG;
  const envApprovers = (process.env.MANAGEMENT_DAO_MULTISIG_APPROVERS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (envMultisig) {
    try {
      const hasRootMs = await dao.isGranted(managingDao, envMultisig, ROOT, '0x');
      console.log('Multisig has ROOT:', hasRootMs, envMultisig);
    } catch (_) {
      const hasRootMsAlt = await dao.hasPermission(managingDao, envMultisig, ROOT, '0x');
      console.log('Multisig has ROOT (hasPermission):', hasRootMsAlt, envMultisig);
    }
  }
  if (envApprovers.length) {
    for (const addr of envApprovers) {
      try {
        const hasRootAp = await dao.isGranted(managingDao, addr, ROOT, '0x');
        console.log('Approver has ROOT:', hasRootAp, addr);
      } catch (_) {
        const hasRootApAlt = await dao.hasPermission(managingDao, addr, ROOT, '0x');
        console.log('Approver has ROOT (hasPermission):', hasRootApAlt, addr);
      }
    }
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

  let logs: any[] = [];
  try {
    logs = await ethers.provider.getLogs(filter as any);
  } catch (e) {
    // Fallback: paginate logs to avoid RPC limits
    try {
      const latest = await ethers.provider.getBlockNumber();
      const step = 1000;
      const topicGranted = filter.topics![0];
      for (let from = 0; from <= latest; from += step) {
        const to = Math.min(from + step - 1, latest);
        const chunk = await ethers.provider.getLogs({
          address: managingDao,
          topics: [topicGranted, ROOT],
          fromBlock: from,
          toBlock: to,
        } as any);
        logs.push(...chunk);
      }
    } catch (e2) {
      console.warn('Log scan skipped due to RPC limits:', (e2 as any)?.message || e2);
    }
  }
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
