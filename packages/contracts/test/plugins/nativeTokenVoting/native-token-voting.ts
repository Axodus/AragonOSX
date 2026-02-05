import {expect} from '../../chai-setup';
import hre, {ethers} from 'hardhat';
import {deployNewDAO} from '../../test-utils/dao';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const EMPTY_ACTIONS: any[] = [];

function hashPair(a: string, b: string): string {
  const [x, y] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [x, y]);
}

function buildTwoLeafMerkleTree(leafA: string, leafB: string): {
  root: string;
  proofForA: string[];
  proofForB: string[];
} {
  const root = hashPair(leafA, leafB);
  return {root, proofForA: [leafB], proofForB: [leafA]};
}

async function deployPluginFixture(opts?: {minParticipation?: number; supportThreshold?: number}) {
  const signers = (await ethers.getSigners()) as unknown as SignerWithAddress[];
  const [proposer, oracle, voter, voter2] = signers;
  const dao = await deployNewDAO(proposer);

  const minDuration = 60;
  const minParticipation = opts?.minParticipation ?? 0;
  const supportThreshold = opts?.supportThreshold ?? 500000;

  const plugin: any = await hre.wrapper.deploy(
    'src/plugins/nativeTokenVoting/NativeTokenVotingPlugin.sol:NativeTokenVotingPlugin',
    {
      withProxy: true,
      proxySettings: {initializer: 'initialize'},
      initArgs: [dao.target, 0, minParticipation, supportThreshold, minDuration],
    }
  );

  const setSnapshotPermission =
    await plugin.SET_PROPOSAL_SNAPSHOT_PERMISSION_ID();
  await dao.grant(plugin.target, oracle.address, setSnapshotPermission);

  const now = Number((await ethers.provider.getBlock('latest'))!.timestamp);
  const endDate = now + minDuration + 120;

  return {proposer, oracle, voter, voter2, dao, plugin, minDuration, endDate};
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

  it('evaluates participation and support thresholds using snapshot totalVotingPower', async () => {
    const minParticipation = 200000; // 20%
    const supportThreshold = 600000; // 60%

    const {proposer, oracle, voter, voter2, plugin, endDate} =
      await deployPluginFixture({minParticipation, supportThreshold});

    // Case 1: participation below threshold => hasSucceeded == false
    const lowParticipationProposal = await createProposalAndGetId(
      plugin,
      proposer,
      '0x04',
      endDate,
      0
    );

    const lowPower = 19; // ceil(100 * 20%) = 20
    const lowLeaf = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter.address, lowPower]
    );

    await plugin
      .connect(oracle)
      .setProposalSnapshot(lowParticipationProposal, lowLeaf, 100);

    await plugin.connect(voter).vote(lowParticipationProposal, 2, lowPower, []);
    expect(await plugin.hasSucceeded(lowParticipationProposal)).to.equal(false);

    // Case 2: participation ok but support below threshold => hasSucceeded == false
    const lowSupportProposal = await createProposalAndGetId(
      plugin,
      proposer,
      '0x05',
      endDate,
      0
    );

    const yesPower = 30;
    const noPower = 30;
    const leafA = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter.address, yesPower]
    );
    const leafB = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter2.address, noPower]
    );

    const {root, proofForA, proofForB} = buildTwoLeafMerkleTree(leafA, leafB);
    await plugin.connect(oracle).setProposalSnapshot(lowSupportProposal, root, 100);

    await plugin.connect(voter).vote(lowSupportProposal, 2, yesPower, proofForA); // Yes
    await plugin.connect(voter2).vote(lowSupportProposal, 3, noPower, proofForB); // No

    // participation=60 >= 20, but support yes=30 of totalVotes=60 => 50% < 60%
    expect(await plugin.hasSucceeded(lowSupportProposal)).to.equal(false);

    // Case 3: participation ok and support ok => hasSucceeded == true
    const successProposal = await createProposalAndGetId(
      plugin,
      proposer,
      '0x06',
      endDate,
      0
    );

    const passPower = 25;
    const passLeaf = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [voter.address, passPower]
    );
    await plugin.connect(oracle).setProposalSnapshot(successProposal, passLeaf, 100);
    await plugin.connect(voter).vote(successProposal, 2, passPower, []);
    expect(await plugin.hasSucceeded(successProposal)).to.equal(true);
  });
});
