import {Interface} from 'ethers';

// Compute ERC-165 interfaceId (XOR of function selectors) for ethers v6 Interface
export function getInterfaceId(iface: Interface): string {
  let acc = 0n;
  for (const frag of iface.fragments) {
    if (frag.type === 'function' && typeof frag.selector === 'string') {
      acc ^= BigInt(frag.selector);
    }
  }
  const hex = acc.toString(16).padStart(8, '0');
  return '0x' + hex;
}

// Find and parse an event log from a transaction receipt using ethers v6
export function findEventLog<T = any>(
  receipt: Awaited<ReturnType<any['wait']>> | {logs: any[]},
  iface: Interface,
  eventName: string
): T {
  const logs = (receipt as any).logs ?? [];
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed as unknown as T;
      }
    } catch {}
  }
  throw new Error(`Event ${eventName} not found in receipt`);
}
