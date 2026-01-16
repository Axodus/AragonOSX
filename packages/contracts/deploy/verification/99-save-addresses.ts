import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Salva um JSON com todos os endereços dos contratos implantados.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network} = hre;
  const all = await deployments.all();
  const result: Record<string, {address: string; txHash?: string}> = {};

  const isHexAddress = (value: unknown): value is string =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

  for (const [name, d] of Object.entries(all)) {
    if (!isHexAddress(d.address)) {
      continue;
    }
    result[name] = {address: d.address, txHash: d.receipt?.transactionHash};
  }

  const rootOut = path.resolve(__dirname, '..', 'deployed_contracts.json');
  const perNetworkDir = path.resolve(__dirname, '..', 'deployments', network.name);
  const perNetworkOut = path.join(perNetworkDir, 'deployed_contracts.json');

  fs.mkdirSync(perNetworkDir, {recursive: true});

  const payload = {
    network: network.name,
    chainId: hre.network.config.chainId,
    contracts: result,
    generatedAt: new Date().toISOString(),
  };

  const readExistingContracts = (filePath: string): Record<string, any> => {
    try {
      if (!fs.existsSync(filePath)) {
        return {};
      }
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      const contracts = (parsed as any).contracts;
      if (!contracts || typeof contracts !== 'object') {
        return {};
      }
      return contracts as Record<string, any>;
    } catch {
      return {};
    }
  };

  const mergeMissingContracts = (existing: Record<string, any>) => {
    for (const [name, entry] of Object.entries(existing)) {
      if (result[name]) {
        continue;
      }
      const address = (entry as any)?.address;
      if (!isHexAddress(address)) {
        continue;
      }
      const txHash = (entry as any)?.txHash;
      result[name] = {
        address,
        ...(typeof txHash === 'string' ? {txHash} : {}),
      };
    }
  };

  const mergeFromGlobalDeployedContracts = () => {
    try {
      // packages/contracts/deployed_contracts.json (não confundir com deploy/deployed_contracts.json)
      const globalPath = path.resolve(__dirname, '..', '..', 'deployed_contracts.json');
      if (!fs.existsSync(globalPath)) {
        return;
      }
      const parsed = JSON.parse(fs.readFileSync(globalPath, 'utf8'));
      const net = parsed?.deployedContractAddresses?.[network.name];
      if (!net || typeof net !== 'object') {
        return;
      }

      const maybeMerge = (name: string, address: unknown) => {
        if (result[name]) return;
        if (!isHexAddress(address)) return;
        result[name] = {address};
      };

      maybeMerge('CountryNameServiceAdapter', net.CountryNameServiceAdapter);
      maybeMerge('NameServiceSubdomainRegistrar', net.NameServiceSubdomainRegistrar);
    } catch {
      // best effort
    }
  };

  // Preserve any contracts written by other steps (e.g., nameservice), but never keep entries without address.
  mergeMissingContracts(readExistingContracts(rootOut));
  mergeMissingContracts(readExistingContracts(perNetworkOut));
  mergeFromGlobalDeployedContracts();

  fs.writeFileSync(rootOut, JSON.stringify(payload, null, 2));
  fs.writeFileSync(perNetworkOut, JSON.stringify(payload, null, 2));

  console.log(`[addresses] Arquivos gerados:\n- ${rootOut}\n- ${perNetworkOut}`);
};

func.tags = ['verification'];
func.runAtTheEnd = true;

export default func;
