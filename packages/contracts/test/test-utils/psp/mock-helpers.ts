import {Operation} from '@aragon/osx-commons-sdk';
import {getAddress, id, ZeroAddress, zeroPadValue, toBeHex} from 'ethers';

export function mockPermissionsOperations(
  start: number,
  end: number,
  op: Operation
) {
  let arr = [];

  for (let i = start; i < end; i++) {
    arr.push({
      operation: op,
      where: getAddress(zeroPadValue(toBeHex(i), 20)),
      who: getAddress(zeroPadValue(toBeHex(i), 20)),
      condition: ZeroAddress,
      permissionId: id('MOCK_PERMISSION'),
    });
  }

  return arr.map(item => Object.values(item));
}

export function mockHelpers(amount: number): string[] {
  let arr: string[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push(getAddress(zeroPadValue(toBeHex(i), 20)));
  }

  return arr;
}
