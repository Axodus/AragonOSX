import ensRegistryArtifact from '../artifacts/@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol/ENSRegistry.json';
import publicResolverArtifact from '../artifacts/@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol/PublicResolver.json';
import {ENSRegistry__factory} from '../typechain';
import {ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export function ensLabelHash(label: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

export function ensDomainHash(name: string): string {
  return (ethers as any).namehash ? (ethers as any).namehash(name) : require('eth-ens-namehash').hash(name);
}

export async function setupENS(
  domains: string[],
  hre: HardhatRuntimeEnvironment
): Promise<any> {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  // Deploy the ENSRegistry
  await deploy('ENSRegistry', {
    contract: ensRegistryArtifact,
    from: deployer.address,
    args: [],
    log: true,
  });

  const ensDeployment = await deployments.get('ENSRegistry');
  const ens = ENSRegistry__factory.connect(ensDeployment.address, deployer);

  // Deploy the Resolver
  await deploy('PublicResolver', {
    contract: publicResolverArtifact,
    from: deployer.address,
    args: [ensDeployment.address, (ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000'],
  });

  const resolver = await deployments.get('PublicResolver');

  for (let i = 0; i < domains.length; i++) {
    console.log(`Registering subdomain ${domains[i]}`);

    const resolvedResolver = await ens.resolver(ensDomainHash(domains[i]));
    if (resolvedResolver === resolver.address) {
      console.log(`${domains[i]} already registered. Skipping...`);
      continue;
    }

    // Register subdomains in the reverse order
    let domainNamesReversed = domains[i].split('.');
    domainNamesReversed.push(''); //add the root domain
    domainNamesReversed = domainNamesReversed.reverse();

    for (let i = 0; i < domainNamesReversed.length - 1; i++) {
      // to support subdomains
      const domain = domainNamesReversed
        .map((value, index) => (index <= i ? value : ''))
        .filter(value => value !== '')
        .reverse()
        .join('.');

      // skipping if it is already set
      const fullDomain = `${domainNamesReversed[i + 1]}${domain ? '.' + domain : ''}`;
      if (!fullDomain || fullDomain.trim().length === 0) {
        // Evita label vazia na raiz
        continue;
      }
      const resolvedResolver = await ens.resolver(ensDomainHash(fullDomain));
      if (resolvedResolver !== ((ethers as any).ZeroAddress || '0x0000000000000000000000000000000000000000')) {
        continue;
      }

      const tx = await ens.setSubnodeRecord(
        ensDomainHash(domain),
        ensLabelHash(domainNamesReversed[i + 1]),
        deployer.address,
        resolver.address,
        0
      );
      await tx.wait();
    }

    console.log(`Registered subdomain ${domains[i]}`);
  }

  console.log(`ENS Setup complete!`);

  return ens;
}
