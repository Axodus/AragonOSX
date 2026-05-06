import {AbiCoder, keccak256} from 'ethers';

export function hashHelpers(helpers: string[]) {
  return keccak256(new AbiCoder().encode(['address[]'], [helpers]));
}
