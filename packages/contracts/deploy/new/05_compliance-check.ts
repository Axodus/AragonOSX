import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

/**
 * Reuso seletivo: apenas mantém contratos se estiverem 100% conformes.
 * Caso contrário, apaga o deployment para forçar redeploy nos passos seguintes.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, network} = hre;

  const has = async (name: string) => {
    try { await deployments.get(name); return true; } catch { return false; }
  };
  const addr = async (name: string) => (await deployments.get(name)).address;
  const del = async (name: string) => { try { await deployments.delete(name); } catch {} };

  const nonCompliant: string[] = [];

  // Checagem DAORegistry/DAOFactory
  if (await has('DAORegistryProxy')) {
    const regAddr = await addr('DAORegistryProxy');
    const regDep = await deployments.get('DAORegistryProxy');
    const registry = await ethers.getContractAt(regDep.abi!, regAddr);
    let shouldDeleteRegistry = false;

    const mgmtDaoPresent = await has('ManagementDAOProxy');
    const mgmtDaoAddr = mgmtDaoPresent ? await addr('ManagementDAOProxy') : '0x0000000000000000000000000000000000000000';
    try {
      const currentDao: string = await registry.dao();
      if (!currentDao || currentDao.toLowerCase() !== mgmtDaoAddr.toLowerCase()) {
        console.warn(`[compliance] DAORegistry.dao != ManagementDAOProxy (${currentDao} != ${mgmtDaoAddr})`);
        shouldDeleteRegistry = true;
      }
    } catch (e) {
      console.warn('[compliance] Falha ao ler registry.dao(), marcando para redeploy.');
      shouldDeleteRegistry = true;
    }

    // Verificar permissão REGISTER_DAO_PERMISSION -> DAOFactory
    const hasFactory = await has('DAOFactory');
    if (hasFactory && mgmtDaoPresent && !shouldDeleteRegistry) {
      const dao = await ethers.getContractAt('src/core/dao/DAO.sol:DAO', mgmtDaoAddr);
      const factoryAddr = await addr('DAOFactory');
      try {
        const REGISTER: string = await registry.REGISTER_DAO_PERMISSION_ID();
        const granted = await dao.isGranted(regAddr, factoryAddr, REGISTER, '0x');
        if (!granted) {
          console.warn('[compliance] DAOFactory não possui REGISTER_DAO_PERMISSION no DAORegistry.');
          // Forçar redeploy para não reutilizar artefatos fora de conformidade
          await del('DAOFactory');
          nonCompliant.push('DAOFactory');
        }
      } catch (e) {
        console.warn('[compliance] Falha ao checar REGISTER_DAO_PERMISSION, marcando DAOFactory p/ redeploy.');
        await del('DAOFactory');
        nonCompliant.push('DAOFactory');
      }
    }

    if (shouldDeleteRegistry) {
      await del('DAORegistryProxy');
      await del('DAORegistryProxy_Implementation');
      nonCompliant.push('DAORegistryProxy');
    }
  }

  // Checagem PluginRepoRegistry/PluginRepoFactory
  if (await has('PluginRepoRegistryProxy')) {
    const prAddr = await addr('PluginRepoRegistryProxy');
    const prDep = await deployments.get('PluginRepoRegistryProxy');
    const mgmtDaoPresent = await has('ManagementDAOProxy');
    const factoryPresent = await has('PluginRepoFactory');
    if (mgmtDaoPresent && factoryPresent) {
      try {
        const daoAddr = await addr('ManagementDAOProxy');
        const dao = await ethers.getContractAt('src/core/dao/DAO.sol:DAO', daoAddr);
        const factoryAddr = await addr('PluginRepoFactory');
        const REGISTER_PLUGIN_REPO = ethers.keccak256(ethers.toUtf8Bytes('REGISTER_PLUGIN_REPO_PERMISSION'));
        const granted = await dao.isGranted(prAddr, factoryAddr, REGISTER_PLUGIN_REPO, '0x');
        if (!granted) {
          console.warn('[compliance] PluginRepoFactory não possui REGISTER_PLUGIN_REPO_PERMISSION no PluginRepoRegistry.');
          await del('PluginRepoFactory');
          nonCompliant.push('PluginRepoFactory');
        }
      } catch (e) {
        console.warn('[compliance] Falha ao checar permissões de PluginRepoRegistry, marcando PluginRepoFactory p/ redeploy.');
        await del('PluginRepoFactory');
        nonCompliant.push('PluginRepoFactory');
      }
    }
  }

  if (nonCompliant.length === 0) {
    console.log(`[compliance] Nenhuma inconsistência detectada em '${network.name}'. Reutilizando deployments.`);
  } else {
    console.log(`[compliance] Contratos marcados p/ redeploy: ${nonCompliant.join(', ')}`);
  }
};

func.tags = ['new', 'Compliance'];
func.runAtTheStart = true;

export default func;
