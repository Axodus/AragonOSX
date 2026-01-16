/**
 * Flips the bit at `index` for a bigint bitmap `num`.
 * Index 0 targets the least significant bit.
 */
export function flipBitBigInt(num: bigint, index: number): bigint {
  const mask = 1n << BigInt(index);
  return num ^ mask;
}

/**
 * Sets the bit at `index` to 1 for a bigint bitmap `num`.
 */
export function setBitBigInt(num: bigint, index: number): bigint {
  const mask = 1n << BigInt(index);
  return num | mask;
}
