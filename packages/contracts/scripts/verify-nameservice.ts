import {ethers} from 'hardhat';
import path from 'path';
import fs from 'fs';
import {verifyUUPS} from '../utils/verify-uups';
import {verifyContract} from '../utils/etherscan';

type Addresses = {
  network: string;
  adapter: string;
  registrar?: string;
  registrarImpl?: string;
  registrarProxy?: string;
  dao?: string;
  node?: string;
};

function loadAddresses(): Addresses {
  const network = (ethers as any).network?.name || 'unknown';
  const root = path.resolve(__dirname, '..');
  const deployedPath = path.join(root, 'deployed_contracts.json');
  const json = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
  const net = json?.deployedContractAddresses?.[network] || {};

  return {
    network,
    adapter: process.env.NS_ADAPTER_ADDRESS || net.CountryNameServiceAdapter,
    registrar: process.env.NS_REGISTRAR_ADDRESS || net.NameServiceSubdomainRegistrar,
    registrarImpl: process.env.NS_REGISTRAR_IMPL,
    registrarProxy: process.env.NS_REGISTRAR_PROXY,
    dao: process.env.DAO_ADDRESS || net.ManagementDAOProxy,
    node: process.env.NAME_SERVICE_NODE,
  };
}

async function verifyAdapter(address: string) {
  await verifyContract(address, [], '');
}

async function verifyRegistrar(addr: Addresses) {
  if (addr.registrarImpl && addr.registrarProxy) {
    if (!addr.dao || !addr.node) {
      throw new Error('DAO_ADDRESS and NAME_SERVICE_NODE required for proxy verification');
    }
    await verifyUUPS(
      addr.registrarImpl,
      addr.registrarProxy,
      'src/framework/nameservice/NameServiceSubdomainRegistrar.sol',
      'NameServiceSubdomainRegistrar',
      [addr.dao, addr.adapter, addr.node]
    );
    return;
  }
  if (addr.registrar) {
    await verifyContract(
      addr.registrar,
      [],
      'src/framework/nameservice/NameServiceSubdomainRegistrar.sol:NameServiceSubdomainRegistrar'
    );
  }
}

async function main() {
  const addresses = loadAddresses();
  if (!addresses.adapter) {
    throw new Error('Adapter address not found. Set NS_ADAPTER_ADDRESS or update deployed_contracts.json');
  }
  await verifyAdapter(addresses.adapter);
  await verifyRegistrar(addresses);
  console.log('Verification flow finished.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
