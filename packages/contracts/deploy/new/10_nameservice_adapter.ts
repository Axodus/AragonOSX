import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';
import fs from 'fs';
import path from 'path';

const DEPLOYED_JSON = path.resolve(__dirname, '../../deployed_contracts.json');
const NETWORK_DEPLOYED_JSON = (network: string) =>
  path.resolve(__dirname, `../deployments/${network}/deployed_contracts.json`);

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = hre.network.name;
  // Only relevant for Harmony networks; skip elsewhere entirely.
  if (network !== 'harmony' && network !== 'harmonyTestnet') {
    console.log(`[nameservice] Skipping adapter on network '${network}'.`);
    return;
  }

  const isHexAddress = (value: unknown): value is string =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

  // Backfill mode (no redeploy): allow providing already deployed addresses.
  const existingAdapterAddress = process.env.NAMESERVICE_ADAPTER_ADDRESS;
  const existingRegistrarAddress = process.env.NAMESERVICE_REGISTRAR_ADDRESS;
  const shouldUseExistingAddresses =
    isHexAddress(existingAdapterAddress) && isHexAddress(existingRegistrarAddress);

  // Harmony RPCs often do not implement eth_estimateGas for contract deployments.
  // Default behavior: skip deployment on Harmony unless explicitly enabled via env.
  const enableNameservice = process.env.ENABLE_NAMESERVICE_ADAPTER === 'true';
  if (!enableNameservice && !shouldUseExistingAddresses) {
    console.log(
      `[nameservice] Skipping nameservice on '${network}' (provider lacks estimateGas). Set ENABLE_NAMESERVICE_ADAPTER=true to force.`
    );
    return;
  }

  // Optional explicit gas limit to avoid estimateGas call paths. Defaults to 6,000,000.
  const provider = hre.ethers.provider;
  const requestedGasLimit = BigInt(
    process.env.NAMESERVICE_DEPLOY_GAS_LIMIT || '6000000'
  );

  const txOverrides = await (async () => {
    const envGas = process.env.HARMONY_GAS_PRICE;
    const requestedGasPrice = envGas ? BigInt(envGas) : 0n;

    let rpcGasPrice = 0n;
    try {
      const gasPriceHex = (await provider.send('eth_gasPrice', [])) as string;
      rpcGasPrice = gasPriceHex ? BigInt(gasPriceHex) : 0n;
    } catch (_) {
      rpcGasPrice = 0n;
    }

    const bumpedRpcGasPrice = rpcGasPrice ? (rpcGasPrice * 12n) / 10n : 0n;
    const gasPrice =
      requestedGasPrice > bumpedRpcGasPrice
        ? requestedGasPrice
        : bumpedRpcGasPrice;

    let blockGasLimit = 0n;
    try {
      const latestBlock: any = await provider.getBlock('latest');
      const bg = latestBlock?.gasLimit;
      blockGasLimit =
        typeof bg === 'bigint'
          ? bg
          : bg
            ? BigInt(bg.toString())
            : 0n;
    } catch (_) {
      blockGasLimit = 0n;
    }

    const safetyMargin = 100_000n;
    const maxAllowed =
      blockGasLimit && blockGasLimit > safetyMargin
        ? blockGasLimit - safetyMargin
        : blockGasLimit;
    const gasLimit =
      maxAllowed && requestedGasLimit > maxAllowed
        ? maxAllowed
        : requestedGasLimit;

    if (blockGasLimit) {
      console.log(
        `[nameservice] latest block gasLimit=${blockGasLimit.toString()} => usando gasLimit=${gasLimit.toString()}`
      );
    } else {
      console.log(
        `[nameservice] não foi possível ler block gasLimit; usando gasLimit=${gasLimit.toString()}`
      );
    }

    // Harmony: use tx legacy (type 0) e defina gasLimit para evitar estimateGas.
    if (!gasPrice) return {gasLimit};
    return {type: 0, gasPrice, gasLimit};
  })();

  let adapterAddress = '';
  let adapterTxHash = '';
  let registrarAddress = '';
  let registrarTxHash = '';

  if (shouldUseExistingAddresses) {
    adapterAddress = existingAdapterAddress;
    registrarAddress = existingRegistrarAddress;
    console.log(
      `[nameservice] Using existing deployments on '${network}': adapter=${adapterAddress}, registrar=${registrarAddress}`
    );
  } else {
    console.log(`[nameservice] Deploying CountryNameServiceAdapter on '${network}'...`);
    const Adapter = await ethers.getContractFactory('CountryNameServiceAdapter');
    try {
      const adapterDeployTx = await Adapter.getDeployTransaction(txOverrides as any);
      const signer = (await ethers.getSigners())[0];
      const sent = await signer.sendTransaction(adapterDeployTx);
      const receipt = await sent.wait();
      adapterTxHash = sent.hash;
      adapterAddress = receipt?.contractAddress ?? '';
    } catch (e) {
      console.warn(`[nameservice] Adapter deployment failed, skipping nameservice:`, e);
      return;
    }
    console.log(`[nameservice] Adapter deployed at: ${adapterAddress}`);

    console.log(`[nameservice] Deploying NameServiceSubdomainRegistrar on '${network}'...`);
    const Registrar = await ethers.getContractFactory('NameServiceSubdomainRegistrar');
    try {
      const registrarDeployTx = await Registrar.getDeployTransaction(txOverrides as any);
      const signer = (await ethers.getSigners())[0];
      const sent = await signer.sendTransaction(registrarDeployTx);
      const receipt = await sent.wait();
      registrarTxHash = sent.hash;
      registrarAddress = receipt?.contractAddress ?? '';
    } catch (e) {
      console.warn(`[nameservice] Registrar deployment failed, skipping nameservice:`, e);
      return;
    }
    console.log(`[nameservice] Registrar deployed at: ${registrarAddress}`);
  }

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
          const tx = await registrar.initialize(
            daoProxy,
            adapterAddress,
            envNode,
            txOverrides as any
          );
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

  // Persist também no registry por rede usado pelo fluxo de deploy (deploy/deployments/<network>/deployed_contracts.json)
  try {
    const networkFile = NETWORK_DEPLOYED_JSON(network);
    const raw = fs.readFileSync(networkFile, 'utf8');
    const json = JSON.parse(raw);
    json.contracts = json.contracts || {};

    // Mantenha o mesmo formato dos demais contratos: { address, txHash }
    json.contracts.CountryNameServiceAdapter = {
      address: adapterAddress,
      txHash: adapterTxHash,
    };
    json.contracts.NameServiceSubdomainRegistrar = {
      address: registrarAddress,
      txHash: registrarTxHash,
    };
    json.generatedAt = new Date().toISOString();

    fs.writeFileSync(networkFile, JSON.stringify(json, null, 2));
    console.log(
      `[nameservice] Updated deploy/deployments/${network}/deployed_contracts.json.`
    );
  } catch (e) {
    console.warn(
      `[nameservice] Failed to update deploy/deployments/${network}/deployed_contracts.json:`,
      e
    );
  }

  console.log('[nameservice] Reminder: grant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID to registrar via DAO if needed.');
};

func.tags = ['nameservice-adapter'];

export default func;
