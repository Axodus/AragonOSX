import {AbiCoder} from 'ethers';
import {ethers} from 'hardhat';

// See https://eips.ethereum.org/EIPS/eip-1967
export const ERC1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)

export const OZ_INITIALIZED_SLOT_POSITION = 0;

export async function readStorage(
  contractAddress: string,
  location: number | string,
  types: string[]
): Promise<string> {
  const abi = new AbiCoder();
  return ethers.provider
    // ethers v6: use `getStorage(address, position)` instead of `getStorageAt`
    .getStorage(contractAddress, location)
    .then(encoded => abi.decode(types, encoded)[0]);
}
