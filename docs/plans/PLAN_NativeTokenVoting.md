# PLAN: NativeTokenVoting — Native (wallet + staked) voting power

## Context

`NativeTokenVotingPlugin` currently uses `address(voter).balance` at vote time and does not account for staked native tokens.
For native tokens (e.g., ONE) there is no ERC20Votes interface and (in general) there is no on-chain historical `balanceAt(snapshotBlock)`; therefore, a reliable snapshot for **wallet + staked** requires an oracle/indexer approach.

## Goals

- [ ] Voting power equals **native wallet balance + native staked balance** at a **snapshot block**.
- [ ] Voting power is **fixed** for a proposal (no balance-moving exploits during the vote).
- [ ] Participation / quorum checks use a snapshot-based **total voting power**.
- [ ] Vote replacement (if enabled) remains correct and cannot corrupt tallies.

## Non-goals

- [ ] Implementing the off-chain indexer/oracle service in this change.
- [ ] Changing unrelated plugins or OSx core contracts.

## Proposed design

- Introduce a Merkle-root based snapshot system:
  - An authorized **oracle** sets for each proposal: `(snapshotBlock, merkleRoot, totalVotingPower)`.
  - A voter provides `(votingPower, merkleProof)` to vote.
  - The leaf is `keccak256(abi.encodePacked(voter, votingPower))` where `votingPower = walletNative + stakedNative` at `snapshotBlock` (computed off-chain).
- Add a dedicated permission `ORACLE_PERMISSION_ID` for setting the root.

## Implementation steps

- [ ] Add proposal fields: `snapshotBlock`, `merkleRoot`, `totalVotingPower`.
- [ ] Add `setMerkleRoot(proposalId, merkleRoot, totalVotingPower)` guarded by `ORACLE_PERMISSION_ID`.
- [ ] Update `vote()` to require `votingPower + merkleProof`, verify against `merkleRoot`, and store per-voter power to support vote replacement safely.
- [ ] Update `minProposerVotingPower` check to use snapshot voting power (if root is available) or document expected behavior.
- [ ] Fix `minParticipation` calculation to use `totalVotingPower` from oracle snapshot.
- [ ] Add tests:
  - [ ] Valid vote with correct proof counts.
  - [ ] Invalid proof reverts.
  - [ ] Vote replacement preserves tallies.
  - [ ] Participation/support threshold use snapshot totals.

## Dependencies / integration points

- Off-chain indexer/oracle must compute:
  - wallet native balance at snapshot
  - staked native balance at snapshot
  - total voting power
  - merkle root

## Acceptance criteria

- [ ] On-chain contract verifies proofs and always uses snapshot-derived power.
- [ ] A voter’s power is wallet+staked (as encoded by the oracle) and cannot be altered mid-vote.
- [ ] Tests cover core flows.
