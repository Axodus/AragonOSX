import { Contract, Interface, ZeroAddress } from "ethers";

/**
 * Tries to call `protocolVersion()` if the function exists on the contract.
 * Returns the version as `bigint` or `undefined` if the function is not present.
 */
export async function getProtocolVersionOrUndefined(contract: Contract): Promise<[number, number, number] | undefined> {
  // Try a direct, low-level call so it works even if the ABI doesn't expose the function
  const iface = new Interface(["function protocolVersion() view returns (uint8 major, uint8 minor, uint8 patch)"]);
  try {
    const data = iface.encodeFunctionData("protocolVersion", []);
    const raw = await contract.runner!.call({ to: contract.target as string, data });
    const [major, minor, patch] = iface.decodeFunctionResult("protocolVersion", raw) as unknown as [bigint, bigint, bigint];
    return [Number(major), Number(minor), Number(patch)];
  } catch {
    // Fall back to attempting a normal call if ABI happens to include it
    try {
      const v = await (contract as any).protocolVersion();
      const arr = Array.isArray(v) ? v : [v?.major, v?.minor, v?.patch];
      if (!Array.isArray(arr) || arr.length < 3) return undefined;
      return [Number(arr[0]), Number(arr[1]), Number(arr[2])];
    } catch {
      return undefined;
    }
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
