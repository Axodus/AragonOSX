import {Interface} from 'ethers';

// Compute ERC-165 interfaceId (XOR of function selectors) for ethers v6 Interface
export function getInterfaceId(iface: Interface): string {
  const fns = iface.fragments.filter((f) => f.type === 'function');
  const onlyIERC165 = fns.length === 1 && fns[0].name === 'supportsInterface' && (fns[0].inputs?.length ?? 0) === 1;
  let acc = 0n;
  for (const frag of fns) {
    if (!onlyIERC165 && frag.name === 'supportsInterface' && (frag.inputs?.length ?? 0) === 1) {
      // For any interface that inherits IERC165, exclude supportsInterface from the XOR
      continue;
    }
    if (typeof (frag as any).selector === 'string') {
      acc ^= BigInt((frag as any).selector);
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
  // Narrow by topic first for performance and correctness
  let topic: string | undefined;
  try {
    topic = iface.getEventTopic(eventName as any);
  } catch {}

  for (const log of logs) {
    if (topic && Array.isArray(log.topics) && log.topics[0] !== topic) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed as unknown as T;
      }
    } catch {}
  }
  // Fallback: try parsing all logs without topic pre-filter (handles ABI/topic mismatches)
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed as unknown as T;
      }
    } catch {}
  }
  // Special-case fallback for DAO Executed event across ABI variants
  if (eventName === 'Executed') {
    try {
      // v1.4.0+: includes failureMap (6-arg variant)
      const minimalWithFailureMap = new Interface([
        'event Executed(address actor, bytes32 callId, (address to, uint256 value, bytes data)[] actions, uint256 allowFailureMap, uint256 failureMap, bytes[] execResults)'
      ]);
      const sigTopicWithFailureMap = minimalWithFailureMap.getEventTopic('Executed');
      for (const log of logs) {
        if (Array.isArray(log.topics) && log.topics[0] !== sigTopicWithFailureMap) continue;
        try {
          const parsed = minimalWithFailureMap.parseLog(log);
          if (parsed) {
            return parsed as unknown as T;
          }
        } catch {}
      }
      // v1.3.x and earlier: without failureMap (5-arg variant)
      const minimalNoFailureMap = new Interface([
        'event Executed(address actor, bytes32 callId, (address to, uint256 value, bytes data)[] actions, uint256 allowFailureMap, bytes[] execResults)'
      ]);
      const sigTopicNoFailureMap = minimalNoFailureMap.getEventTopic('Executed');
      for (const log of logs) {
        if (Array.isArray(log.topics) && log.topics[0] !== sigTopicNoFailureMap) continue;
        try {
          const parsed = minimalNoFailureMap.parseLog(log);
          if (parsed) {
            return parsed as unknown as T;
          }
        } catch {}
      }
    } catch {}
  }
  throw new Error(`Event ${eventName} not found in receipt`);
}
