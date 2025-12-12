import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import fs from 'fs';
import path from 'path';

const DEPLOYED_JSON = path.resolve(__dirname, '../../deployed_contracts.json');

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = hre.network.name;
  // Only relevant for Harmony networks; skip elsewhere entirely.
  if (network !== 'harmony' && network !== 'harmonyTestnet') {
    console.log(`[nameservice] Skipping adapter on network '${network}'.`);
    return;
  }

  // Harmony RPCs often do not implement eth_estimateGas for contract deployments.
  // Default behavior: skip deployment on Harmony unless explicitly enabled via env.
  const enableNameservice = process.env.ENABLE_NAMESERVICE_ADAPTER === 'true';
  if (!enableNameservice) {
    console.log(
      `[nameservice] Skipping nameservice on '${network}' (provider lacks estimateGas). Set ENABLE_NAMESERVICE_ADAPTER=true to force.`
    );
    return;
  }

  // Optional explicit gas limit to avoid estimateGas call paths. Defaults to 6,000,000.
  const gasLimit = BigInt(process.env.NAMESERVICE_DEPLOY_GAS_LIMIT || '6000000');

  console.log(`[nameservice] Deploying CountryNameServiceAdapter on '${network}'...`);
  const Adapter = await ethers.getContractFactory('CountryNameServiceAdapter');
  let adapterAddress = '';
  try {
    const adapterDeployTx = await Adapter.getDeployTransaction({gasLimit});
    const signer = (await ethers.getSigners())[0];
    const sent = await signer.sendTransaction(adapterDeployTx);
    const receipt = await sent.wait();
    adapterAddress = receipt?.contractAddress ?? '';
  } catch (e) {
    console.warn(`[nameservice] Adapter deployment failed, skipping nameservice:`, e);
    return;
  }
  console.log(`[nameservice] Adapter deployed at: ${adapterAddress}`);

  console.log(`[nameservice] Deploying NameServiceSubdomainRegistrar on '${network}'...`);
  const Registrar = await ethers.getContractFactory('NameServiceSubdomainRegistrar');
  let registrarAddress = '';
  try {
    const registrarDeployTx = await Registrar.getDeployTransaction({gasLimit});
    const signer = (await ethers.getSigners())[0];
    const sent = await signer.sendTransaction(registrarDeployTx);
    const receipt = await sent.wait();
    registrarAddress = receipt?.contractAddress ?? '';
  } catch (e) {
    console.warn(`[nameservice] Registrar deployment failed, skipping nameservice:`, e);
    return;
  }
  console.log(`[nameservice] Registrar deployed at: ${registrarAddress}`);

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
        try {
          const registrar = await ethers.getContractAt('NameServiceSubdomainRegistrar', registrarAddress);
          console.log(
            `[nameservice] Initializing registrar with DAO ${daoProxy}, adapter ${adapterAddress}, node ${envNode}...`
          );
          const tx = await registrar.initialize(daoProxy, adapterAddress, envNode, {gasLimit});
          await tx.wait();
          console.log('[nameservice] Registrar initialized.');
        } catch (initErr) {
          console.warn('[nameservice] Failed to initialize registrar:', initErr);
        }
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
    json.deployedContractAddresses[network].CountryNameServiceAdapter = adapterAddress;
    json.deployedContractAddresses[network].NameServiceSubdomainRegistrar = registrarAddress;
    fs.writeFileSync(DEPLOYED_JSON, JSON.stringify(json, null, 2));
    console.log(`[nameservice] Updated deployed_contracts.json for '${network}'.`);
  } catch (e) {
    console.warn(`[nameservice] Failed to update deployed_contracts.json:`, e);
  }

  console.log('[nameservice] Reminder: grant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID to registrar via DAO if needed.');
};

func.tags = ['nameservice-adapter'];

export default func;
