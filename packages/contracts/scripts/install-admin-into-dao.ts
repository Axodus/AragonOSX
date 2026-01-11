import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente específicas para esta execução.
// - Por padrão, tenta `.env.install` no CWD.
// - Permite override via `DOTENV_CONFIG_PATH`.
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.env.DOTENV_CONFIG_PATH)
    : path.resolve(process.cwd(), '.env.install'),
});

const DAO_ABI = [
  'function execute(bytes32 _callId, tuple(address to, uint256 value, bytes data)[] _actions, uint256 _allowFailureMap) returns (bytes[] execResults, uint256 failureMap)',
  'function hasPermission(address _where, address _who, bytes32 _permissionId, bytes _data) view returns (bool)',
  'function grant(address _where, address _who, bytes32 _permissionId)',
  'function EXECUTE_PERMISSION_ID() view returns (bytes32)',
  'function ROOT_PERMISSION_ID() view returns (bytes32)',
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name}`);
  return value;
}

function truthyEnv(name: string): boolean {
  const value = (process.env[name] ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'y';
}

function asChecksumAddress(value: string, name: string): string {
  try {
    return ethers.getAddress(value);
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
}

// Harmony/legado: usa gasPrice e type 0
async function getLegacyGasOverrides(gasLimit: bigint) {
  const networkMin = BigInt(200_000_000_000); // 200 gwei
  let gasPrice: bigint = networkMin;
  try {
    const hex = await (ethers.provider as any).send('eth_gasPrice', []);
    if (hex) {
      const gp = BigInt(hex);
      gasPrice = gp < networkMin ? networkMin : gp;
    }
  } catch {
    // fallback permanece networkMin
  }
  return { type: 0, gasPrice, gasLimit } as const;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const daoAddr = asChecksumAddress(requireEnv('DAO'), 'DAO');
  const pspAddr = asChecksumAddress(requireEnv('PLUGIN_SETUP_PROCESSOR'), 'PLUGIN_SETUP_PROCESSOR');
  const adminRepoAddr = asChecksumAddress(requireEnv('ADMIN_REPO_PROXY'), 'ADMIN_REPO_PROXY');
  const adminAddr = asChecksumAddress(process.env.ADMIN ?? signer.address, 'ADMIN');

  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Signer : ${signer.address}`);
  console.log(`DAO    : ${daoAddr}`);
  console.log(`PSP    : ${pspAddr}`);
  console.log(`Repo   : ${adminRepoAddr}`);
  console.log(`Admin  : ${adminAddr}`);

  const psp = await ethers.getContractAt(
    'src/framework/plugin/setup/PluginSetupProcessor.sol:PluginSetupProcessor',
    pspAddr,
    signer
  );
  const repo = await ethers.getContractAt(
    'src/framework/plugin/repo/PluginRepo.sol:PluginRepo',
    adminRepoAddr,
    signer
  );
  const dao = new ethers.Contract(daoAddr, DAO_ABI, signer);

  // Sanity check: o PSP só aceita repos que existam no PluginRepoRegistry dele.
  const repoRegistryAddr: string = await psp.repoRegistry();
  const repoRegistry = await ethers.getContractAt(
    'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
    repoRegistryAddr,
    signer
  );
  const isRepoRegistered: boolean = await (repoRegistry as any).entries(adminRepoAddr);
  console.log(`RepoRegistry: ${repoRegistryAddr} | entries(repo)=${isRepoRegistered}`);

  // Se não estiver registrado, tentamos registrar automaticamente.
  // Isso requer REGISTER_PLUGIN_REPO_PERMISSION no PluginRepoRegistry, concedida pelo managing DAO.
  if (!isRepoRegistered) {
    if (truthyEnv('SKIP_REPO_REGISTRATION')) {
      throw new Error(
        `Admin repo não está registrado no PluginRepoRegistry do PSP e SKIP_REPO_REGISTRATION=1. ` +
          `Repo=${adminRepoAddr} Registry=${repoRegistryAddr}`
      );
    }

    const subdomain = (process.env.SUBDOMAIN ?? '').trim();
    console.log(`Repo não registrado. Tentando registrar (subdomain="${subdomain}")...`);

    const managingDaoAddr: string = await (repoRegistry as any).dao();
    const registerPermId: string = await (repoRegistry as any).REGISTER_PLUGIN_REPO_PERMISSION_ID();
    console.log(`Registry managing DAO: ${managingDaoAddr}`);
    console.log(`REGISTER_PLUGIN_REPO_PERMISSION_ID: ${registerPermId}`);

    const daoManaging = await ethers.getContractAt(
      'src/core/dao/DAO.sol:DAO',
      managingDaoAddr,
      signer
    );

    // 1) Tenta registrar direto (se já tiver permissão).
    try {
      const tx = await (repoRegistry as any).registerPluginRepo(
        subdomain,
        adminRepoAddr,
        await getLegacyGasOverrides(BigInt(700_000))
      );
      console.log('registerPluginRepo tx:', tx.hash);
      await tx.wait();
    } catch (e: any) {
      const errName = e?.errorName ?? e?.shortMessage ?? e?.reason ?? '';
      console.warn('registerPluginRepo falhou, tentando grant+retry...', errName);

      // 2) Concede permissão ao signer no registry via managing DAO.
      const grantTx = await (daoManaging as any).grant(
        repoRegistryAddr,
        signer.address,
        registerPermId,
        await getLegacyGasOverrides(BigInt(900_000))
      );
      console.log('DAO.grant tx:', grantTx.hash);
      await grantTx.wait();

      // 3) Tenta registrar novamente.
      const tx2 = await (repoRegistry as any).registerPluginRepo(
        subdomain,
        adminRepoAddr,
        await getLegacyGasOverrides(BigInt(700_000))
      );
      console.log('registerPluginRepo tx (retry):', tx2.hash);
      await tx2.wait();
    }

    const isRepoRegisteredAfter: boolean = await (repoRegistry as any).entries(adminRepoAddr);
    console.log(`entries(repo) after register=${isRepoRegisteredAfter}`);
    if (!isRepoRegisteredAfter) {
      throw new Error(
        `Falha ao registrar o repo no PluginRepoRegistry. ` +
          `Verifique permissões no managing DAO ${managingDaoAddr}.`
      );
    }
  }

  const latestRelease: number = await repo.latestRelease();
  const latestVersion = await (repo as any)['getLatestVersion(uint8)'](latestRelease);

  const release = Number(latestVersion.tag.release);
  const build = Number(latestVersion.tag.build);

  console.log(`Repo latest -> release=${release} build=${build} setup=${latestVersion.pluginSetup}`);

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const data = coder.encode(
    ['address', 'tuple(address target, uint8 operation)'],
    [adminAddr, { target: daoAddr, operation: 0 }]
  );

  const pluginSetupRef = {
    pluginSetupRepo: adminRepoAddr,
    versionTag: { release, build },
  };

  console.log('1/2 prepareInstallation...');

  // Diagnóstico: tenta simular para capturar custom error antes de gastar gas.
  try {
    await (psp as any).prepareInstallation.staticCall(daoAddr, { pluginSetupRef, data });
  } catch (e: any) {
    const name = e?.errorName ?? e?.shortMessage ?? e?.reason;
    if (name) {
      console.warn('prepareInstallation staticCall revert:', name, e?.errorArgs ?? '');
    } else {
      console.warn('prepareInstallation staticCall revert (sem reason):', e);
    }
  }

  const prepareTx = await psp.prepareInstallation(
    daoAddr,
    { pluginSetupRef, data },
    await getLegacyGasOverrides(BigInt(2_500_000))
  );
  console.log('prepare tx:', prepareTx.hash);
  const prepareReceipt = await prepareTx.wait();
  console.log('prepare block:', prepareReceipt?.blockNumber);

  const installationPreparedTopic = psp.interface.getEvent('InstallationPrepared').topicHash;
  const preparedLog = prepareReceipt?.logs?.find(
    (l: any) =>
      l?.address?.toLowerCase() === pspAddr.toLowerCase() &&
      Array.isArray(l?.topics) &&
      l.topics[0] === installationPreparedTopic
  );
  if (!preparedLog) {
    throw new Error('Não encontrei o evento InstallationPrepared no receipt');
  }

  const parsed = psp.interface.parseLog({ topics: preparedLog.topics, data: preparedLog.data });
  const pluginAddr = asChecksumAddress(parsed.args.plugin as string, 'plugin');
  console.log('plugin preparado:', pluginAddr);

  const helpersHash = ethers.keccak256(coder.encode(['address[]'], [[]]));
  const applyCalldata = psp.interface.encodeFunctionData('applyInstallation', [
    daoAddr,
    {
      pluginSetupRef,
      plugin: pluginAddr,
      permissions: [],
      helpersHash,
    },
  ]);

  console.log('2/2 applyInstallation...');
  const execPermId: string = await (dao as any).EXECUTE_PERMISSION_ID();
  const rootPermId: string = await (dao as any).ROOT_PERMISSION_ID();
  const applyPermId: string = await (psp as any).APPLY_INSTALLATION_PERMISSION_ID();

  const canDirectApply: boolean = await (dao as any).hasPermission(
    pspAddr,
    signer.address,
    applyPermId,
    '0x'
  );

  // Observação importante: chamar `PSP.applyInstallation` via `DAO.execute` só funciona se o
  // PRÓPRIO DAO tiver a permissão APPLY_INSTALLATION no PSP (porque, no PSP, `msg.sender` será o DAO).
  const daoCanApplyOnPsp: boolean = await (dao as any).hasPermission(
    pspAddr,
    daoAddr,
    applyPermId,
    '0x'
  );
  const canExecute: boolean = await (dao as any).hasPermission(
    daoAddr,
    signer.address,
    execPermId,
    '0x'
  );
  const hasRoot: boolean = await (dao as any).hasPermission(
    daoAddr,
    signer.address,
    rootPermId,
    '0x'
  );

  console.log(
    `Permissions: hasRoot=${hasRoot} canExecute=${canExecute} canDirectApply=${canDirectApply} daoCanApplyOnPsp=${daoCanApplyOnPsp}`
  );

  // Caminhos possíveis:
  // - Se o signer tem APPLY_INSTALLATION no PSP, pode chamar PSP.applyInstallation direto.
  // - Caso contrário, se o signer tem EXECUTE no DAO E o DAO tem APPLY_INSTALLATION no PSP, usa DAO.execute.
  // - Se faltar permissão, mas o signer tem ROOT no DAO, tenta grant e faz retry.

  const callId = ethers.keccak256(
    ethers.toUtf8Bytes(`install-admin:${daoAddr}:${adminRepoAddr}:${release}.${build}:${pluginAddr}`)
  );

  const tryDirectApply = async () => {
    // Diagnóstico: simula primeiro pra capturar custom error quando possível.
    try {
      await (psp as any).applyInstallation.staticCall(daoAddr, {
        pluginSetupRef,
        plugin: pluginAddr,
        permissions: [],
        helpersHash,
      });
    } catch (e: any) {
      const name = e?.errorName ?? e?.shortMessage ?? e?.reason;
      if (name) {
        console.warn('applyInstallation staticCall revert:', name, e?.errorArgs ?? '');
      } else {
        console.warn('applyInstallation staticCall revert (sem reason):', e);
      }
    }

    const tx = await (psp as any).applyInstallation(
      daoAddr,
      {
        pluginSetupRef,
        plugin: pluginAddr,
        permissions: [],
        helpersHash,
      },
      await getLegacyGasOverrides(BigInt(3_500_000))
    );
    console.log('applyInstallation tx:', tx.hash);
    const receipt = await tx.wait();
    console.log('applyInstallation block:', receipt?.blockNumber);
  };

  const tryDaoExecute = async () => {
    const tx = await (dao as any).execute(
      callId,
      [{ to: pspAddr, value: 0, data: applyCalldata }],
      0,
      await getLegacyGasOverrides(BigInt(3_500_000))
    );
    console.log('DAO.execute tx:', tx.hash);
    const receipt = await tx.wait();
    console.log('DAO.execute block:', receipt?.blockNumber);
  };

  if (canDirectApply) {
    await tryDirectApply();
  } else if (canExecute && daoCanApplyOnPsp) {
    await tryDaoExecute();
  } else if (hasRoot) {
    console.log(
      'Signer não tem permissão para aplicar. Tentando grant(APPLY_INSTALLATION_PERMISSION_ID) e retry...'
    );

    // Concede permissão de aplicar instalação (para chamar PSP direto).
    const grantApplyTx = await (dao as any).grant(
      pspAddr,
      signer.address,
      applyPermId,
      await getLegacyGasOverrides(BigInt(900_000))
    );
    console.log('DAO.grant (apply) tx:', grantApplyTx.hash);
    await grantApplyTx.wait();

    const canDirectApplyAfter: boolean = await (dao as any).hasPermission(
      pspAddr,
      signer.address,
      applyPermId,
      '0x'
    );
    console.log(`canDirectApply after grant=${canDirectApplyAfter}`);

    if (canDirectApplyAfter) {
      await tryDirectApply();
    } else {
      console.log('Grant(APPLY_INSTALLATION) não surtiu efeito. Tentando grant(EXECUTE) e DAO.execute...');

      const grantExecTx = await (dao as any).grant(
        daoAddr,
        signer.address,
        execPermId,
        await getLegacyGasOverrides(BigInt(900_000))
      );
      console.log('DAO.grant (execute) tx:', grantExecTx.hash);
      await grantExecTx.wait();

      await tryDaoExecute();
    }
  } else {
    // Dica prática: mesmo sem EXECUTE/ROOT, normalmente você consegue concluir o apply via um
    // plugin de governança (TokenVoting/Multisig), propondo a execução da ação que chama o PSP.
    // Para facilitar, imprimimos os payloads necessários.
    const daoExecuteCalldata = dao.interface.encodeFunctionData('execute', [
      callId,
      [{ to: pspAddr, value: 0, data: applyCalldata }],
      0,
    ]);

    console.log('');
    console.log('--- Payloads para concluir a instalação ---');
    console.log('Admin (init):', adminAddr);
    console.log('Plugin (prepared):', pluginAddr);
    console.log('PluginSetupRef:', JSON.stringify({ pluginSetupRepo: adminRepoAddr, versionTag: { release, build } }));
    console.log('');
    console.log('Observação:');
    console.log('- Para chamar PSP.applyInstallation diretamente, o executor precisa de APPLY_INSTALLATION no PSP (via DAO.grant).');
    console.log('- Chamar via DAO.execute só funciona se o próprio DAO tiver APPLY_INSTALLATION no PSP.');
    console.log('');

    const multisigExecutor =
      process.env.MULTISIG_EXECUTOR ||
      process.env.SAFE_ADDRESS ||
      process.env.EXECUTOR_ADDRESS ||
      '';
    const suggestedExecutor = multisigExecutor || signer.address;

    const grantApplyCalldata = dao.interface.encodeFunctionData('grant', [
      pspAddr,
      suggestedExecutor,
      applyPermId,
    ]);

    console.log('A) Se você tiver EXECUTE no DAO, pode chamar DAO.execute diretamente:');
    console.log('DAO.execute calldata:', daoExecuteCalldata);
    console.log('');
    console.log('B) Se você for aplicar via governança (TokenVoting/Multisig), faça 2 ações em sequência:');
    console.log(`   1) DAO.grant(PSP, executor, APPLY_INSTALLATION) — executor sugerido: ${suggestedExecutor}`);
    if (!multisigExecutor) {
      console.log(
        '      (Dica: defina MULTISIG_EXECUTOR / SAFE_ADDRESS / EXECUTOR_ADDRESS no env para imprimir com o endereço certo.)'
      );
    }
    console.log('   2) PSP.applyInstallation(...)');
    console.log('');
    console.log('Ações (to/value/data):');
    console.log(
      JSON.stringify(
        [
          {
            to: daoAddr,
            value: '0',
            data: grantApplyCalldata,
          },
          {
            to: pspAddr,
            value: '0',
            data: applyCalldata,
          },
        ],
        null,
        2
      )
    );
    console.log('--- fim ---');
    console.log('');

    throw new Error(
      [
        'Falha ao aplicar a instalação: o signer não tem permissão suficiente.',
        `- Falta uma destas permissões no DAO ${daoAddr}:`,
        `  - EXECUTE_PERMISSION_ID (para usar DAO.execute): ${execPermId}`,
        `  - OU APPLY_INSTALLATION_PERMISSION_ID no PSP ${pspAddr} (para chamar PSP.applyInstallation): ${applyPermId}`,
        `- ROOT_PERMISSION_ID no DAO (para auto-grant) também está ausente: ${rootPermId}`,
        '',
        'Como resolver:',
        '- Execute o apply via o plugin de governança instalado (Multisig/TokenVoting) usando a ação impressa acima, ou',
        '- Rode o script com uma conta que tenha ROOT/EXECUTE no DAO, ou',
        '- Conceda manualmente EXECUTE_PERMISSION_ID ao seu signer e reexecute.',
      ].join('\n')
    );
  }

  console.log('OK: Admin Plugin instalado (prepare+apply).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
