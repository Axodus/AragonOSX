import { Contract } from "ethers";

/**
 * Tries to call `protocolVersion()` if the function exists on the contract.
 * Returns the version as `bigint` or `undefined` if the function is not present.
 */
export async function getProtocolVersionOrUndefined(contract: Contract): Promise<bigint | undefined> {
  try {
    // ethers v6: interface has getFunction; returns Fragment if exists, throws otherwise
    const hasFn = !!contract.interface.getFunction("protocolVersion");
    if (!hasFn) return undefined;
  } catch {
    return undefined;
  }

  try {
    const v = await (contract as any).protocolVersion();
    // Normalize to bigint if returned as number/BigNumber
    return typeof v === "bigint" ? v : BigInt(v.toString());
  } catch {
    // If calling fails (older implementations), treat as undefined
    return undefined;
  }
}
