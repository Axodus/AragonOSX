import {promises as fs} from 'fs';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nPrinting deployed contracts.');
  const {deployments, aragonPluginRepos} = hre;

  const deployedContracts = await deployments.all();
  const deployedContractAddresses: {[index: string]: string} = {};

  const isHexAddress = (value: unknown): value is string =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

  for (const deployment in deployedContracts) {
    const address = deployedContracts[deployment]?.address;

    // Ignore non-contract artifacts that do not have an address
    if (!isHexAddress(address)) {
      continue;
    }

    // skip proxies because they are included twice
    if (!deployment.endsWith('_Proxy')) {
      switch (deployment) {
        case 'ManagementDAOProxy':
          deployedContractAddresses['ManagementDAOProxy'] =
            address;
          console.log(
            `Management DAO: ${address}`
          );
          break;
        case 'ManagementDAOProxy_Implementation':
          deployedContractAddresses['ManagementDAOProxyImplementation'] =
            address;
          console.log(
            `Management DAO Implementation: ${address}`
          );
          break;
        default:
          deployedContractAddresses[deployment] =
            address;
          console.log(
            `${deployment}: ${address}`
          );
      }
    }
  }

  for (const pluginRepo in aragonPluginRepos) {
    deployedContractAddresses[pluginRepo] = aragonPluginRepos[pluginRepo];
    console.log(`${pluginRepo}: ${aragonPluginRepos[pluginRepo]}`);
  }

  const storeInfo = {
    deployedContractAddresses,
    managementDAOActions: hre.managementDAOActions,
  };

  await fs.writeFile('deployed_contracts.json', JSON.stringify(storeInfo));
};
export default func;
func.tags = ['verification', 'Conclude', 'ConcludeEnd'];
func.runAtTheEnd = true;
