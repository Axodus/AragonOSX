import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import fs from 'fs';
import path from 'path';

const DEPLOYED_JSON = path.resolve(__dirname, '../../deployed_contracts.json');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = hre.network.name;
  if (network !== 'harmony' && network !== 'harmonyTestnet') {
    console.log(`[nameservice] Skipping adapter on network '${network}'.`);
    return;
  }

  console.log(`[nameservice] Deploying CountryNameServiceAdapter on '${network}'...`);
  const Adapter = await ethers.getContractFactory('CountryNameServiceAdapter');
  const adapter = await Adapter.deploy();
  await adapter.deployed();
  console.log(`[nameservice] Adapter deployed at: ${adapter.address}`);

  console.log(`[nameservice] Deploying NameServiceSubdomainRegistrar on '${network}'...`);
  const Registrar = await ethers.getContractFactory('NameServiceSubdomainRegistrar');
  const registrar = await Registrar.deploy();
  await registrar.deployed();
  console.log(`[nameservice] Registrar deployed at: ${registrar.address}`);

  // Initialize registrar
  const envNode = process.env.NAME_SERVICE_NODE;
  if (!envNode) {
    console.warn('[nameservice] NAME_SERVICE_NODE env var not set (expected bytes32 namehash). Skipping initialize.');
  } else {
    try {
      const raw = fs.readFileSync(DEPLOYED_JSON, 'utf8');
      const json = JSON.parse(raw);
      const daoProxy = json?.deployedContractAddresses?.[network]?.ManagementDAOProxy;
      if (!daoProxy) {
        console.warn('[nameservice] ManagementDAOProxy not found in deployed_contracts.json. Skipping initialize.');
      } else {
        console.log(`[nameservice] Initializing registrar with DAO ${daoProxy}, adapter ${adapter.address}, node ${envNode}...`);
        const tx = await registrar.initialize(daoProxy, adapter.address, envNode);
        await tx.wait();
        console.log('[nameservice] Registrar initialized.');
      }
    } catch (e) {
      console.warn('[nameservice] Failed to initialize registrar:', e);
    }
  }

  // Persist addresses to deployed_contracts.json
  try {
    const raw = fs.readFileSync(DEPLOYED_JSON, 'utf8');
    const json = JSON.parse(raw);
    json.deployedContractAddresses = json.deployedContractAddresses || {};
    json.deployedContractAddresses[network] = json.deployedContractAddresses[network] || {};
    json.deployedContractAddresses[network].CountryNameServiceAdapter = adapter.address;
    json.deployedContractAddresses[network].NameServiceSubdomainRegistrar = registrar.address;
    fs.writeFileSync(DEPLOYED_JSON, JSON.stringify(json, null, 2));
    console.log(`[nameservice] Updated deployed_contracts.json for '${network}'.`);
  } catch (e) {
    console.warn(`[nameservice] Failed to update deployed_contracts.json:`, e);
  }

  console.log('[nameservice] Reminder: grant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID to registrar via DAO if needed.');
};

func.tags = ['nameservice-adapter'];

export default func;
