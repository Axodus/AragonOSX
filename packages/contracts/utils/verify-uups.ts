import HRE, {ethers} from 'hardhat';
import {verifyContract, runTaskWithRetry} from './etherscan';

/**
 * Verifica par UUPS (implementação + proxy ERC1967) com encode de initialize.
 * - Implementação: sem argumentos de construtor
 * - Proxy: [implementation, data] onde data = initialize(...)
 */
export async function verifyUUPS(
  implAddress: string,
  proxyAddress: string,
  implementationContractPath: string,
  implementationContractName: string,
  initializeArgs: any[]
) {
  // 1) Verify implementation (no constructor args)
  await verifyContract(implAddress, [], `${implementationContractPath}:${implementationContractName}`);

  // 2) Encode initialize data
  const factory = await ethers.getContractFactory(implementationContractName);
  const data = factory.interface.encodeFunctionData('initialize', initializeArgs);

  // 3) Verify proxy with [impl, data]
  const params = {
    contract: '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy',
    address: proxyAddress,
    constructorArgs: [implAddress, data],
  };

  // Use runTaskWithRetry para lidar com delays e já-verified
  const msDelay = 500;
  const times = 2;
  await runTaskWithRetry('verify', params, times, msDelay, () => {});
}

/**
 * CLI entry: npx hardhat run scripts que chamem verifyUUPS.
 * Exemplo de uso programático:
 * await verifyUUPS(
 *   '0xImpl',
 *   '0xProxy',
 *   'src/framework/nameservice/NameServiceSubdomainRegistrar.sol',
 *   'NameServiceSubdomainRegistrar',
 *   [daoAddress, nameServiceAddress, node]
 * );
 */
