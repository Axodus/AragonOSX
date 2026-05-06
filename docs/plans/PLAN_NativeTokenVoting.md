# PLAN: NativeTokenVoting — Native (wallet + staked) voting power

## Context

`NativeTokenVotingPlugin` currently uses `address(voter).balance` at vote time and does not account for staked native tokens.
For native tokens (e.g., ONE) there is no ERC20Votes interface and (in general) there is no on-chain historical `balanceAt(snapshotBlock)`; therefore, a reliable snapshot for **wallet + staked** requires an oracle/indexer approach.

## Goals

- [x] Voting power equals **native wallet balance + native staked balance** at a **snapshot block**.
- [x] Voting power is **fixed** for a proposal (no balance-moving exploits during the vote).
- [x] Participation / quorum checks use a snapshot-based **total voting power**.
- [x] Vote replacement (if enabled) remains correct and cannot corrupt tallies.

## Non-goals

- [ ] Implementing the off-chain indexer/oracle service in this change.
- [ ] Changing unrelated plugins or OSx core contracts.

## Proposed design

- Introduce a Merkle-root based snapshot system:
  - The proposal stores a `snapshotBlock` at creation time (currently `block.number - 1`).
  - An authorized **oracle** sets for each proposal: `(merkleRoot, totalVotingPower)`.
  - A voter provides `(votingPower, merkleProof)` to vote.
  - The leaf is `keccak256(abi.encodePacked(voter, votingPower))` where `votingPower = walletNative + stakedNative` at `snapshotBlock` (computed off-chain).
- Add a dedicated permission `SET_PROPOSAL_SNAPSHOT_PERMISSION_ID` for setting the snapshot.

## Implementation steps

- [x] Add proposal fields: `snapshotBlock`, `merkleRoot`, `totalVotingPower`.
- [x] Add `setProposalSnapshot(proposalId, merkleRoot, totalVotingPower)` guarded by `SET_PROPOSAL_SNAPSHOT_PERMISSION_ID`.
- [x] Update `vote()` to require `votingPower + merkleProof`, verify against `merkleRoot`, and store per-voter power to support vote replacement safely.
- [x] Document proposer eligibility behavior: `minProposerVotingPower` check remains based on the proposer’s **current wallet native balance** at proposal creation.
- [x] Fix `minParticipation` calculation to use `totalVotingPower` from oracle snapshot.
- [x] Add tests:
  - [x] Valid vote with correct proof counts.
  - [x] Invalid proof reverts.
  - [x] Vote replacement preserves tallies.
  - [x] Participation/support threshold use snapshot totals.

## Dependencies / integration points

- Off-chain indexer/oracle must compute:
  - wallet native balance at snapshot
  - staked native balance at snapshot
  - total voting power
  - merkle root

## Acceptance criteria

- [x] On-chain contract verifies proofs and always uses snapshot-derived power.
- [x] A voter’s power is wallet+staked (as encoded by the oracle) and cannot be altered mid-vote.
- [x] Tests cover core flows.
