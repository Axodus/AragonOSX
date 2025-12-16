import { Contract } from "ethers";

/**
 * Tries to call `protocolVersion()` if the function exists on the contract.
 * Returns the version as `bigint` or `undefined` if the function is not present.
 */
export async function getProtocolVersionOrUndefined(contract: Contract): Promise<[number, number, number] | undefined> {
  try {
    // ethers v6: interface has getFunction; returns Fragment if exists, throws otherwise
    const hasFn = !!contract.interface.getFunction("protocolVersion");
    if (!hasFn) return undefined;
  } catch {
    return undefined;
  }

  try {
    const v = await (contract as any).protocolVersion();
    // Expected tuple [major, minor, patch]; normalize to numbers
    const arr = Array.isArray(v) ? v : [v?.major, v?.minor, v?.patch];
    if (!Array.isArray(arr) || arr.length < 3) return undefined;
    return [Number(arr[0]), Number(arr[1]), Number(arr[2])];
  } catch {
    // If calling fails (older implementations), treat as undefined
    return undefined;
  }
}

/**
 * Returns the protocol version as [number, number, number].
 * Falls back to the provided `fallback` if the function is absent.
 */
export async function getProtocolVersionCompat(
  contract: Contract,
  fallback: [number, number, number]
): Promise<[number, number, number]> {
  const v = await getProtocolVersionOrUndefined(contract);
  return v ?? fallback;
}
