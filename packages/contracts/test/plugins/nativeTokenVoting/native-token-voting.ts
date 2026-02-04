import {expect} from '../../chai-setup';
import hre, {ethers} from 'hardhat';
import {deployNewDAO} from '../../test-utils/dao';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const EMPTY_ACTIONS: any[] = [];

async function deployPluginFixture() {
  const signers = (await ethers.getSigners()) as unknown as SignerWithAddress[];
  const [proposer, oracle, voter] = signers;
  const dao = await deployNewDAO(proposer);

  const minDuration = 60;

  const plugin: any = await hre.wrapper.deploy(
    'src/plugins/nativeTokenVoting/NativeTokenVotingPlugin.sol:NativeTokenVotingPlugin',
    {
      withProxy: true,
      proxySettings: {initializer: 'initialize'},
      initArgs: [dao.target, 0, 0, 500000, minDuration],
    }
  );

  const setSnapshotPermission =
    await plugin.SET_PROPOSAL_SNAPSHOT_PERMISSION_ID();
  await dao.grant(plugin.target, oracle.address, setSnapshotPermission);

  const now = Number((await ethers.provider.getBlock('latest'))!.timestamp);
  const endDate = now + minDuration + 5;

  return {proposer, oracle, voter, dao, plugin, minDuration, endDate};
}

async function createProposalAndGetId(
  plugin: any,
  proposer: any,
  metadata: string,
  endDate: number,
  votingMode: number
): Promise<any> {
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint8', 'uint256'],
    [votingMode, 0]
  );

  const tx = await plugin
    .connect(proposer)
    .createProposal(metadata, EMPTY_ACTIONS, 0, endDate, data);

  const receipt = await tx.wait();
  const created = receipt!.logs
    .map((log: any) => {
      try {
        return plugin.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === 'ProposalCreated');

  return created!.args.proposalId;
}

describe('NativeTokenVotingPlugin (Merkle snapshot)', function () {
  it('allows voting with a valid snapshot proof and blocks invalid proof', async () => {
    const {proposer, oracle, voter, plugin, endDate} =
      await deployPluginFixture();

    const proposalId = await createProposalAndGetId(
      plugin,
      proposer,
      '0x01',
      endDate,
      2
    );

    const votingPower = 123;
    const leaf = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter.address, votingPower]
    );

    // Single-leaf tree: root == leaf (valid for OZ MerkleProof)
    const merkleRoot = leaf;
    const totalVotingPower = votingPower;

    await plugin
      .connect(oracle)
      .setProposalSnapshot(proposalId, merkleRoot, totalVotingPower);

    await expect(
      plugin
        .connect(voter)
        .vote(proposalId, 2, votingPower, []) // Yes
    )
      .to.emit(plugin, 'VoteCast')
      .withArgs(proposalId, voter.address, 2, votingPower);

    await expect(
      plugin
        .connect(voter)
        .vote(proposalId, 3, votingPower + 1, []) // No with wrong power
    ).to.be.revertedWithCustomError(plugin, 'InvalidMerkleProof');
  });

  it('stores per-voter voting power and enforces VoteReplacement mode', async () => {
    const {proposer, oracle, voter, plugin, endDate} =
      await deployPluginFixture();

    // Proposal A: VoteReplacement
    const proposalA = await createProposalAndGetId(
      plugin,
      proposer,
      '0x02',
      endDate,
      2
    );

    const power = 10;
    const leaf = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter.address, power]
    );

    await plugin.connect(oracle).setProposalSnapshot(proposalA, leaf, power);

    await plugin.connect(voter).vote(proposalA, 2, power, []); // Yes
    let tally = await plugin.getProposalTally(proposalA);
    expect(Number(tally.yes)).to.equal(power);
    expect(Number(tally.no)).to.equal(0);

    await plugin.connect(voter).vote(proposalA, 3, power, []); // No (replace)
    tally = await plugin.getProposalTally(proposalA);
    expect(Number(tally.yes)).to.equal(0);
    expect(Number(tally.no)).to.equal(power);

    // Proposal B: Standard (no replacement)
    const proposalB = await createProposalAndGetId(
      plugin,
      proposer,
      '0x03',
      endDate,
      0
    );

    await plugin.connect(oracle).setProposalSnapshot(proposalB, leaf, power);

    await plugin.connect(voter).vote(proposalB, 2, power, []); // Yes
    await expect(
      plugin.connect(voter).vote(proposalB, 3, power, [])
    ).to.be.revertedWithCustomError(plugin, 'VoteReplacementForbidden');
  });
});
