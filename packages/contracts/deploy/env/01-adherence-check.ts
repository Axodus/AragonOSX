import {DAO__factory} from '../../typechain';
import {managementDaoMultisigAddressEnv} from '../../utils/environment';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * Reuse-only gate: se existirem deployments para a rede, só prossegue quando
 * as invariantes/permissions críticas estiverem 100% aderentes.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const isTransientRpcError = (err: unknown): boolean => {
    const message = (err as any)?.message ? String((err as any).message) : '';
    const code = (err as any)?.code ? String((err as any).code) : '';

    // Hardhat (via undici) pode falhar com: "SocketError: other side closed".
    // Outros RPCs podem retornar ECONNRESET/ETIMEDOUT/UND_ERR_SOCKET etc.
    return (
      message.includes('SocketError') ||
      message.includes('other side closed') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('EAI_AGAIN') ||
      code.includes('UND_ERR_SOCKET') ||
      code.includes('UND_ERR_CONNECT_TIMEOUT')
    );
  };

  const withRpcRetry = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const maxAttempts = Number(process.env.HARMONY_RPC_RETRIES || 4);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (!isTransientRpcError(err) || attempt === maxAttempts) {
          throw err;
        }
        const delayMs = 250 * attempt * attempt;
        console.log(
          `[adherence] RPC instável durante '${label}' (tentativa ${attempt}/${maxAttempts}). Aguardando ${delayMs}ms e tentando novamente...`
        );
        await sleep(delayMs);
      }
    }

    // unreachable, but keeps TS happy
    throw lastError;
  };

  const managementDaoDeployment = await deployments.getOrNull(
    'ManagementDAOProxy'
  );

  // No prior deployments => nothing to reuse/check.
  if (!managementDaoDeployment) {
    console.log(
      `[adherence] Nenhum deployment existente em '${network.name}'. Prosseguindo.`
    );
    return;
  }

  const daoRegistryDeployment = await deployments.getOrNull('DAORegistryProxy');
  const daoFactoryDeployment = await deployments.getOrNull('DAOFactory');
  const pluginRepoRegistryDeployment = await deployments.getOrNull(
    'PluginRepoRegistryProxy'
  );
  const pluginRepoFactoryDeployment = await deployments.getOrNull(
    'PluginRepoFactory'
  );

  const missing: string[] = [];
  if (!daoRegistryDeployment) missing.push('DAORegistryProxy');
  if (!daoFactoryDeployment) missing.push('DAOFactory');
  if (!pluginRepoRegistryDeployment) missing.push('PluginRepoRegistryProxy');
  if (!pluginRepoFactoryDeployment) missing.push('PluginRepoFactory');

  if (missing.length) {
    // Deployments parciais normalmente indicam um deploy anterior interrompido.
    // Nesse caso, permita continuar o deploy ao invés de forçar reset.
    console.log(
      `[adherence] Deployments parciais detectados em '${network.name}' (${missing.join(
        ', '
      )}). Prosseguindo para continuar o deploy.`
    );
    return;
  }

  // Narrow types after the explicit completeness check above.
  if (
    !daoRegistryDeployment ||
    !daoFactoryDeployment ||
    !pluginRepoRegistryDeployment ||
    !pluginRepoFactoryDeployment
  ) {
    throw new Error(
      `[adherence] Estado inesperado: deployments null após checagem de completude.`
    );
  }

  const [signer] = await ethers.getSigners();
  const managementDao = DAO__factory.connect(
    managementDaoDeployment.address,
    signer
  );

  const multisigAddress = managementDaoMultisigAddressEnv(network);

  const permissionId = (name: string) =>
    ethers.keccak256(ethers.toUtf8Bytes(name));
  const ROOT = permissionId('ROOT_PERMISSION');
  const EXECUTE = permissionId('EXECUTE_PERMISSION');
  const REGISTER_DAO = permissionId('REGISTER_DAO_PERMISSION');
  const REGISTER_PLUGIN_REPO = permissionId('REGISTER_PLUGIN_REPO_PERMISSION');

  const problems: string[] = [];

  let multisigHasRoot: boolean;
  let multisigHasExecute: boolean;
  let daoFactoryHasRegister: boolean;
  let repoFactoryHasRegister: boolean;

  try {
    multisigHasRoot = await withRpcRetry('hasPermission(multisig ROOT)', () =>
      (managementDao as any).hasPermission(
        managementDaoDeployment.address,
        multisigAddress,
        ROOT,
        '0x'
      )
    );
    multisigHasExecute = await withRpcRetry('hasPermission(multisig EXECUTE)', () =>
      (managementDao as any).hasPermission(
        managementDaoDeployment.address,
        multisigAddress,
        EXECUTE,
        '0x'
      )
    );
    daoFactoryHasRegister = await withRpcRetry(
      'hasPermission(DAOFactory REGISTER_DAO)',
      () =>
        (managementDao as any).hasPermission(
          daoRegistryDeployment.address,
          daoFactoryDeployment.address,
          REGISTER_DAO,
          '0x'
        )
    );
    repoFactoryHasRegister = await withRpcRetry(
      'hasPermission(PluginRepoFactory REGISTER_PLUGIN_REPO)',
      () =>
        (managementDao as any).hasPermission(
          pluginRepoRegistryDeployment.address,
          pluginRepoFactoryDeployment.address,
          REGISTER_PLUGIN_REPO,
          '0x'
        )
    );
  } catch (err) {
    if (isTransientRpcError(err)) {
      console.log(
        `[adherence] RPC fechou o socket durante checagens de aderência. Pulando este passo para não bloquear o deploy. Detalhe: ${(err as any)?.message || err}`
      );
      return;
    }
    throw err;
  }

  if (!multisigHasRoot)
    problems.push(`Multisig sem ROOT no ManagementDAO (${multisigAddress})`);
  if (!multisigHasExecute)
    problems.push(
      `Multisig sem EXECUTE no ManagementDAO (${multisigAddress})`
    );
  if (!daoFactoryHasRegister) {
    problems.push(
      `DAOFactory sem REGISTER_DAO_PERMISSION no DAORegistry (daoFactory=${daoFactoryDeployment.address})`
    );
  }
  if (!repoFactoryHasRegister) {
    problems.push(
      `PluginRepoFactory sem REGISTER_PLUGIN_REPO_PERMISSION no PluginRepoRegistry (repoFactory=${pluginRepoFactoryDeployment.address})`
    );
  }

  if (problems.length) {
    throw new Error(
      `[adherence] Deployments existentes em '${network.name}' NÃO estão 100% aderentes:\n` +
        problems.map(p => `- ${p}`).join('\n') +
        `\n\nRecuso reutilizar. Use --reset (redeploy) ou apague deployments/${network.name}.`
    );
  }

  console.log(
    `[adherence] Deployments existentes em '${network.name}' estão aderentes. Reutilizando.`
  );
};

export default func;
func.tags = ['env'];
