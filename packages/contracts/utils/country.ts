import {Contract, JsonRpcProvider} from 'ethers';
import namehash from 'eth-ens-namehash';

const registryAbi = [
  'function resolver(bytes32 node) view returns (address)'
];
const resolverAbi = [
  'function addr(bytes32 node) view returns (address)',
  'function text(bytes32 node, string key) view returns (string)',
  'function contenthash(bytes32 node) view returns (bytes)'
];

export type CountryResolution = {
  node: string;
  resolver: string;
  address?: string;
  text?: Record<string, string>;
  contenthash?: string;
};

export async function resolveCountryName(
  name: string,
  registryAddress: string,
  rpcUrl: string,
  textKeys: string[] = []
): Promise<CountryResolution> {
  const provider = new JsonRpcProvider(rpcUrl);
  const node = namehash.hash(name);
  const registry = new Contract(registryAddress, registryAbi, provider);
  const resolverAddress: string = await registry.resolver(node);
  if (!resolverAddress || /^0x0{40}$/i.test(resolverAddress)) {
    throw new Error('Resolver not set for name');
  }
  const resolver = new Contract(resolverAddress, resolverAbi, provider);
  let addr: string | undefined;
  try {
    addr = await resolver.addr(node);
  } catch {}
  const texts: Record<string, string> = {};
  for (const k of textKeys) {
    try {
      texts[k] = await resolver.text(node, k);
    } catch {}
  }
  let ch: string | undefined;
  try {
    ch = await resolver.contenthash(node);
  } catch {}
  return {node, resolver: resolverAddress, address: addr, text: texts, contenthash: ch};
}
