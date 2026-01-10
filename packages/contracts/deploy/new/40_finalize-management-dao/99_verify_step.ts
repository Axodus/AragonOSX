import {DAO__factory} from '../../../typechain';
import {checkPermission, delay, getContractAddress} from '../../helpers';
import {Operation} from '@aragon/osx-commons-sdk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nVerifying management DAO deployment.');

  const {ethers} = hre;
  const [deployer] = await ethers.getSigners();
  const multisigEnv = process.env.HARMONY_MANAGEMENT_DAO_MULTISIG || process.env.HARMONYTESTNET_MANAGEMENT_DAO_MULTISIG;

  // Get `ManagementDAOProxy` address.
  const managementDAOAddress = await getContractAddress(
    'ManagementDAOProxy',
    hre
  );

  // Get `DAO` contract.
  const managementDaoContract = DAO__factory.connect(
    managementDAOAddress,
    (await ethers.getSigners())[0]
  );

  // Get `DAORegistryProxy` address.
  const daoRegistryAddress = await getContractAddress('DAORegistryProxy', hre);
  // Get `PluginSetupProcessor` address.
  const pspAddress = await getContractAddress('PluginSetupProcessor', hre);

  // On some chains - such as holesky - wait so
  // previous permission txs are fully applied and verified.
  await delay(5000);

  // Check revoked permission.
  if (!multisigEnv) {
    await checkPermission(managementDaoContract, {
      operation: Operation.Revoke,
      where: {name: 'DAORegistryProxy', address: daoRegistryAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'REGISTER_DAO_PERMISSION',
    });
  } else {
    console.log('[Finalize/Verify] Multisig configurado; pulando verificação de revogação REGISTER_DAO_PERMISSION do deployer.');
  }

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'PluginSetupProcessor', address: pspAddress},
    who: {name: 'Deployer', address: deployer.address},
    permission: 'APPLY_INSTALLATION_PERMISSION',
  });

  await checkPermission(managementDaoContract, {
    operation: Operation.Revoke,
    where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
    who: {name: 'PluginSetupProcessor', address: pspAddress},
    permission: 'ROOT_PERMISSION',
  });

  if (!multisigEnv) {
    await checkPermission(managementDaoContract, {
      operation: Operation.Revoke,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'ROOT_PERMISSION',
    });
  } else {
    console.log('[Finalize/Verify] Multisig configurado; pulando verificação de revogação ROOT do deployer.');
  }

  if (!multisigEnv) {
    await checkPermission(managementDaoContract, {
      operation: Operation.Grant,
      where: {name: 'ManagementDAOProxy', address: managementDAOAddress},
      who: {name: 'Deployer', address: deployer.address},
      permission: 'EXECUTE_PERMISSION',
    });
  } else {
    console.log('[Finalize/Verify] Multisig configurado; pulando verificação de EXECUTE do deployer (fluxo Multisig-first).');
  }

  console.log('Finalizing Management DAO verified');
};
export default func;
func.tags = ['new', 'RegisterManagementDAO', 'FinalizeVerified'];
