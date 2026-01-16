import {
  IERC165__factory,
  IPluginSetup__factory,
  IProtocolVersion__factory,
  PluginCloneableV1Mock__factory,
  PluginCloneableSetupV1Mock,
  PluginCloneableSetupV1Mock__factory,
} from '../../../typechain';
import {osxContractsVersion} from '../../test-utils/protocol-version';
// v6-compatible interfaceId calculator (XOR of selectors)
const getInterfaceId = (iface: Interface): string => {
  const selectors = iface.fragments
    .filter((f: any) => f.type === 'function')
    .map((f: any) => f.selector as string);
  let id = 0n;
  for (const sel of selectors) {
    // bytes4 -> BigInt
    const n = BigInt(sel);
    id ^= n;
  }
  // Ensure 4-byte hex string
  const hex = '0x' + id.toString(16).padStart(8, '0');
  return hex;
};
import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {Interface} from 'ethers';

describe('PluginSetup', function () {
  let setupMock: PluginCloneableSetupV1Mock;

  before(async () => {
    const pluginImplementation = await hre.wrapper.deploy(
      'PluginCloneableV1Mock'
    );
    setupMock = await hre.wrapper.deploy('PluginCloneableSetupV1Mock', {
      args: [pluginImplementation.address],
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await setupMock.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165` interface', async () => {
      const iface = new Interface(IERC165__factory.abi);
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IPluginSetup` interface', async () => {
      const iface = new Interface(IPluginSetup__factory.abi);
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = new Interface(IProtocolVersion__factory.abi);
      expect(await setupMock.supportsInterface(getInterfaceId(iface))).to.be
        .true;
    });
  });

  describe('Protocol version', async () => {
    it('returns the current protocol version', async () => {
      expect(await setupMock.protocolVersion()).to.deep.equal(
        osxContractsVersion()
      );
    });
  });
});
