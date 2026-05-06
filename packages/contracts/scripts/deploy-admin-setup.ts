import { ethers } from 'hardhat';
import fs from 'fs';

type DeployOverrides = { type: 0; gasPrice: bigint; gasLimit: bigint };

async function legacyOverrides() {
  const min = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = min;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < min ? min : gp;
    }
  } catch {
    // fallback ao mínimo
  }
  return { type: 0, gasPrice, gasLimit: BigInt(1_000_000) } as const;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Is deploy test is enabled: ', process.env.DEPLOY_TEST === 'true');
  console.log('Deployer:', deployer.address);

  const overrides = await legacyOverrides();

  // Tenta usar artefato local do Hardhat; se não existir, tenta via caminho externo (ADMIN_SETUP_ARTIFACT_PATH)
  const artifactPath = process.env.ADMIN_SETUP_ARTIFACT_PATH; // ex.: d:/path/to/artifacts/contracts/AdminPluginSetup.sol/AdminPluginSetup.json

  let setup: any;
  try {
    const Factory = await ethers.getContractFactory('AdminPluginSetup');
    const ctorArgs = parseCtorArgs(process.env.ADMIN_SETUP_CTOR_ARGS_JSON);
    setup = await (Factory as any).deploy(...ctorArgs, overrides as DeployOverrides);
  } catch (err: any) {
    const msg = String(err?.message || err);
    const isHH700 = msg.includes('HH700') || msg.includes('not found');
    if (!isHH700) throw err;

    if (!artifactPath) {
      throw new Error('Artifacto do AdminPluginSetup não encontrado (HH700) e ADMIN_SETUP_ARTIFACT_PATH não definido. Forneça o caminho do JSON do artefato ou adicione o contrato ao projeto.');
    }

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`ADMIN_SETUP_ARTIFACT_PATH não encontrado: ${artifactPath}`);
    }

    const { abi, bytecode } = readAbiBytecode(artifactPath);
    const Factory = new (ethers as any).ContractFactory(abi, bytecode, deployer);
    const ctorArgs = parseCtorArgs(process.env.ADMIN_SETUP_CTOR_ARGS_JSON);
    setup = await Factory.deploy(...ctorArgs, overrides as DeployOverrides);
  }

  console.log('Tx:', setup.deploymentTransaction()?.hash);
  await setup.waitForDeployment();
  console.log('AdminPluginSetup:', await setup.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });

function parseCtorArgs(json?: string) {
  if (!json) return [] as any[];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    throw new Error('ADMIN_SETUP_CTOR_ARGS_JSON deve ser um array JSON, ex.: ["0xabc...", 123]');
  } catch (e) {
    throw new Error(`Falha ao parsear ADMIN_SETUP_CTOR_ARGS_JSON: ${(e as Error).message}`);
  }
}

function readAbiBytecode(p: string) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const abi = pickAbi(j);
  const bytecode = pickBytecode(j);
  if (!abi || !bytecode) throw new Error('Artefato inválido: campos abi/bytecode ausentes.');
  return { abi, bytecode } as const;
}

function pickAbi(j: any) {
  if (j?.abi) return j.abi;
  if (j?.interface) return j.interface;
  return undefined;
}

function pickBytecode(j: any) {
  if (j?.bytecode) return j.bytecode;
  if (j?.data?.bytecode) return j.data.bytecode;
  if (j?.evm?.bytecode?.object) return j.evm.bytecode.object;
  return undefined;
}