import {Operation} from '@aragon/osx-commons-sdk';
import {hexlify, id, ZeroAddress, zeroPadValue} from 'ethers';

export function mockPermissionsOperations(
  start: number,
  end: number,
  op: Operation
) {
  let arr = [];

  for (let i = start; i < end; i++) {
    arr.push({
      operation: op,
      where: zeroPadValue(hexlify(i), 20),
      who: zeroPadValue(hexlify(i), 20),
      condition: ZeroAddress,
      permissionId: id('MOCK_PERMISSION'),
    });
  }

  return arr.map(item => Object.values(item));
}

export function mockHelpers(amount: number): string[] {
  let arr: string[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push(zeroPadValue(hexlify(i), 20));
  }

  return arr;
}
