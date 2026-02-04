// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {Action} from "@aragon/osx-commons-contracts/src/executors/IExecutor.sol";
import {PluginUUPSUpgradeable} from "@aragon/osx-commons-contracts/src/plugin/PluginUUPSUpgradeable.sol";
import {IProposal} from "@aragon/osx-commons-contracts/src/plugin/extensions/proposal/IProposal.sol";
import {ProposalUpgradeable} from "@aragon/osx-commons-contracts/src/plugin/extensions/proposal/ProposalUpgradeable.sol";
import {RATIO_BASE, _applyRatioCeiled} from "@aragon/osx-commons-contracts/src/utils/math/Ratio.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title NativeTokenVotingPlugin
/// @notice A governance plugin that allows voting using native token (ONE, ETH, etc.) balances.
/// @dev This plugin extends the standard voting pattern to use native token balances instead of ERC20.
/// Voting power is determined by the voter's native token balance at a specific snapshot block.
contract NativeTokenVotingPlugin is PluginUUPSUpgradeable, ProposalUpgradeable {
    /// @notice Permission to set a proposal snapshot (Merkle root + total voting power).
    bytes32 public constant SET_PROPOSAL_SNAPSHOT_PERMISSION_ID =
        keccak256("SET_PROPOSAL_SNAPSHOT_PERMISSION");

    /// @notice The different voting options available.
    enum VoteOption {
        None,
        Abstain,
        Yes,
        No
    }

    /// @notice Proposal parameters
    struct ProposalParameters {
        VotingMode votingMode;
        uint32 startDate;
        uint32 endDate;
        uint32 snapshotBlock;
        uint64 supportThreshold;
        uint64 minParticipation;
        bytes32 merkleRoot;
        uint256 totalVotingPower;
    }

    /// @notice Voting modes
    enum VotingMode {
        Standard,
        EarlyExecution,
        VoteReplacement
    }

    /// @notice Proposal data structure
    struct Proposal {
        bool executed;
        ProposalParameters parameters;
        uint256 yes;
        uint256 no;
        uint256 abstain;
        mapping(address => VoteOption) votes;
        mapping(address => uint256) votingPowerUsed;
        Action[] actions;
        uint256 allowFailureMap;
    }

    /// @notice The minimum voting power required to create a proposal.
    uint256 public minProposerVotingPower;

    /// @notice The minimum participation (as a fraction of RATIO_BASE) required for a proposal to pass.
    uint64 public minParticipation;

    /// @notice The support threshold (as a fraction of RATIO_BASE) required for a proposal to pass.
    uint64 public supportThreshold;

    /// @notice The minimum duration of a proposal.
    uint64 public minDuration;

    /// @notice Mapping of proposal IDs to proposal data.
    mapping(uint256 => Proposal) internal proposals;

    /// @notice Emitted when a vote is cast.
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteOption voteOption,
        uint256 votingPower
    );

    /// @notice Emitted when a proposal snapshot is set.
    event ProposalSnapshotSet(
        uint256 indexed proposalId,
        bytes32 indexed merkleRoot,
        uint256 totalVotingPower
    );

    /// @notice Emitted when voting settings are updated.
    event VotingSettingsUpdated(
        uint64 minParticipation,
        uint64 supportThreshold,
        uint64 minDuration,
        uint256 minProposerVotingPower
    );

    /// @notice Thrown when a voter has no voting power.
    error NoVotingPower();

    /// @notice Thrown when the proposal does not exist.
    error ProposalNotFound();

    /// @notice Thrown when a proposal snapshot was not set.
    error ProposalSnapshotNotSet();

    /// @notice Thrown when a proposal snapshot was already set.
    error ProposalSnapshotAlreadySet();

    /// @notice Thrown when a Merkle proof is invalid.
    error InvalidMerkleProof();

    /// @notice Thrown when vote replacement is not allowed.
    error VoteReplacementForbidden();

    /// @notice Thrown when trying to vote with an invalid option.
    error InvalidVoteOption();

    /// @notice Thrown when the proposal is not open for voting.
    error ProposalNotOpen();

    /// @notice Thrown when the proposal has already been executed.
    error ProposalAlreadyExecuted();

    /// @notice Thrown when the proposal cannot be executed.
    error ProposalExecutionForbidden();

    /// @notice Initializes the plugin.
    /// @param _dao The DAO contract.
    /// @param _minProposerVotingPower Minimum voting power to create proposals.
    /// @param _minParticipation Minimum participation threshold.
    /// @param _supportThreshold Support threshold for approval.
    /// @param _minDuration Minimum proposal duration.
    function initialize(
        IDAO _dao,
        uint256 _minProposerVotingPower,
        uint64 _minParticipation,
        uint64 _supportThreshold,
        uint64 _minDuration
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);
        _updateVotingSettings(
            _minProposerVotingPower,
            _minParticipation,
            _supportThreshold,
            _minDuration
        );
    }

    /// @inheritdoc IProposal
    /// @dev Extra params are encoded in `_data` as: `uint8 votingMode, uint256 allowFailureMap`.
    function createProposal(
        bytes memory _metadata,
        Action[] memory _actions,
        uint64 _startDate,
        uint64 _endDate,
        bytes memory _data
    ) external returns (uint256 proposalId) {
        if (address(msg.sender).balance < minProposerVotingPower) {
            revert NoVotingPower();
        }

        (VotingMode votingMode, uint256 allowFailureMap) = abi.decode(_data, (VotingMode, uint256));

        uint64 startDate = _startDate == 0 ? uint64(block.timestamp) : _startDate;
        _validateProposalDates(startDate, _endDate);

        proposalId = _createProposalId(keccak256(_metadata));

        _storeProposal(proposalId, votingMode, startDate, _endDate, _actions, allowFailureMap);

        _emitProposalCreated(
            proposalId,
            msg.sender,
            startDate,
            _endDate,
            _metadata,
            _actions,
            allowFailureMap
        );
    }

    function _validateProposalDates(uint64 _startDate, uint64 _endDate) internal view {
        require(_endDate > _startDate, "INVALID_DATES");
        require(_endDate - _startDate >= minDuration, "DURATION_TOO_SHORT");
    }

    function _storeProposal(
        uint256 _proposalId,
        VotingMode _votingMode,
        uint64 _startDate,
        uint64 _endDate,
        Action[] memory _actions,
        uint256 _allowFailureMap
    ) internal {
        Proposal storage proposal = proposals[_proposalId];
        proposal.parameters.votingMode = _votingMode;

        // Store timestamps as uint32 for storage efficiency.
        // This is safe for unix timestamps until year ~2106.
        require(_startDate <= type(uint32).max, "START_DATE_TOO_LARGE");
        require(_endDate <= type(uint32).max, "END_DATE_TOO_LARGE");
        proposal.parameters.startDate = uint32(_startDate);
        proposal.parameters.endDate = uint32(_endDate);
        proposal.parameters.snapshotBlock = uint32(block.number - 1);
        proposal.parameters.minParticipation = minParticipation;
        proposal.parameters.supportThreshold = supportThreshold;

        for (uint256 i = 0; i < _actions.length; i++) {
            proposal.actions.push(_actions[i]);
        }
        proposal.allowFailureMap = _allowFailureMap;
    }

    /// @notice Sets the proposal snapshot Merkle root and total eligible voting power.
    /// @dev The Merkle tree must be built with leaves: `keccak256(abi.encodePacked(voter, votingPower))`.
    /// The votingPower should represent native token power (wallet + staked) at `snapshotBlock`.
    function setProposalSnapshot(
        uint256 _proposalId,
        bytes32 _merkleRoot,
        uint256 _totalVotingPower
    ) external auth(SET_PROPOSAL_SNAPSHOT_PERMISSION_ID) {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.parameters.endDate == 0) {
            revert ProposalNotFound();
        }

        if (proposal.parameters.merkleRoot != bytes32(0)) {
            revert ProposalSnapshotAlreadySet();
        }

        if (_merkleRoot == bytes32(0) || _totalVotingPower == 0) {
            revert ProposalSnapshotNotSet();
        }

        proposal.parameters.merkleRoot = _merkleRoot;
        proposal.parameters.totalVotingPower = _totalVotingPower;

        emit ProposalSnapshotSet(_proposalId, _merkleRoot, _totalVotingPower);
    }

    /// @notice Returns the proposal snapshot parameters.
    function getProposalSnapshot(
        uint256 _proposalId
    ) external view returns (uint32 snapshotBlock, bytes32 merkleRoot, uint256 totalVotingPower) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.parameters.endDate == 0) {
            revert ProposalNotFound();
        }
        return (
            proposal.parameters.snapshotBlock,
            proposal.parameters.merkleRoot,
            proposal.parameters.totalVotingPower
        );
    }

    /// @notice Returns the proposal vote tally.
    function getProposalTally(
        uint256 _proposalId
    ) external view returns (uint256 yes, uint256 no, uint256 abstain) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.parameters.endDate == 0) {
            revert ProposalNotFound();
        }
        return (proposal.yes, proposal.no, proposal.abstain);
    }

    /// @notice Returns the current vote option and voting power used for a voter.
    function getVote(
        uint256 _proposalId,
        address _voter
    ) external view returns (VoteOption voteOption, uint256 votingPower) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.parameters.endDate == 0) {
            revert ProposalNotFound();
        }
        return (proposal.votes[_voter], proposal.votingPowerUsed[_voter]);
    }

    function _emitProposalCreated(
        uint256 _proposalId,
        address _creator,
        uint64 _startDate,
        uint64 _endDate,
        bytes memory _metadata,
        Action[] memory _actions,
        uint256 _allowFailureMap
    ) internal {
        emit ProposalCreated(
            _proposalId,
            _creator,
            _startDate,
            _endDate,
            _metadata,
            _actions,
            _allowFailureMap
        );
    }

    /// @notice Backwards-compatible entrypoint kept for ABI stability.
    /// @dev The native-token voting power (wallet + staked) requires an oracle snapshot and proof.
    function vote(uint256 _proposalId, VoteOption _voteOption) external {
        (_proposalId, _voteOption);
        revert ProposalSnapshotNotSet();
    }

    /// @notice Casts a vote on a proposal using a snapshot proof.
    /// @param _proposalId The proposal ID.
    /// @param _voteOption The vote option.
    /// @param _votingPower The voter's snapshot voting power.
    /// @param _proof Merkle proof for leaf: `keccak256(abi.encodePacked(msg.sender, _votingPower))`.
    function vote(
        uint256 _proposalId,
        VoteOption _voteOption,
        uint256 _votingPower,
        bytes32[] calldata _proof
    ) external {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.parameters.endDate == 0) {
            revert ProposalNotFound();
        }

        if (!_isProposalOpen(proposal)) {
            revert ProposalNotOpen();
        }

        if (_voteOption == VoteOption.None) {
            revert InvalidVoteOption();
        }

        bytes32 merkleRoot = proposal.parameters.merkleRoot;
        if (merkleRoot == bytes32(0) || proposal.parameters.totalVotingPower == 0) {
            revert ProposalSnapshotNotSet();
        }

        if (_votingPower == 0) {
            revert NoVotingPower();
        }

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _votingPower));
        if (!MerkleProof.verify(_proof, merkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        VoteOption previousVote = proposal.votes[msg.sender];
        uint256 previousVotingPower = proposal.votingPowerUsed[msg.sender];

        if (previousVote != VoteOption.None) {
            if (proposal.parameters.votingMode != VotingMode.VoteReplacement) {
                revert VoteReplacementForbidden();
            }

            if (previousVote == VoteOption.Yes) {
                proposal.yes -= previousVotingPower;
            } else if (previousVote == VoteOption.No) {
                proposal.no -= previousVotingPower;
            } else if (previousVote == VoteOption.Abstain) {
                proposal.abstain -= previousVotingPower;
            }
        }

        if (_voteOption == VoteOption.Yes) {
            proposal.yes += _votingPower;
        } else if (_voteOption == VoteOption.No) {
            proposal.no += _votingPower;
        } else if (_voteOption == VoteOption.Abstain) {
            proposal.abstain += _votingPower;
        }

        proposal.votes[msg.sender] = _voteOption;
        proposal.votingPowerUsed[msg.sender] = _votingPower;

        emit VoteCast(_proposalId, msg.sender, _voteOption, _votingPower);

        // Early execution if applicable
        if (
            proposal.parameters.votingMode == VotingMode.EarlyExecution && _canExecute(_proposalId)
        ) {
            _execute(_proposalId);
        }
    }

    /// @notice Executes a proposal.
    /// @param _proposalId The proposal ID.
    function execute(uint256 _proposalId) external {
        if (!_canExecute(_proposalId)) {
            revert ProposalExecutionForbidden();
        }
        _execute(_proposalId);
    }

    /// @notice Internal function to execute a proposal.
    function _execute(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }

        proposal.executed = true;

        _execute(bytes32(_proposalId), proposal.actions, proposal.allowFailureMap);

        emit ProposalExecuted(_proposalId);
    }

    /// @inheritdoc IProposal
    function canExecute(uint256 _proposalId) external view returns (bool) {
        return _canExecute(_proposalId);
    }

    /// @inheritdoc IProposal
    function hasSucceeded(uint256 _proposalId) external view returns (bool) {
        return _isMinParticipationReached(_proposalId) && _isSupportThresholdReached(_proposalId);
    }

    /// @inheritdoc IProposal
    function customProposalParamsABI() external pure returns (string memory) {
        return "uint8 votingMode,uint256 allowFailureMap";
    }

    /// @notice Checks if a proposal can be executed.
    function _canExecute(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.executed) {
            return false;
        }

        if (_isProposalOpen(proposal)) {
            if (proposal.parameters.votingMode != VotingMode.EarlyExecution) {
                return false;
            }
        } else if (block.timestamp < proposal.parameters.endDate) {
            return false;
        }

        return _isMinParticipationReached(_proposalId) && _isSupportThresholdReached(_proposalId);
    }

    /// @notice Checks if a proposal is open for voting.
    function _isProposalOpen(Proposal storage proposal) internal view returns (bool) {
        uint64 currentTime = uint64(block.timestamp);
        return
            currentTime >= proposal.parameters.startDate &&
            currentTime < proposal.parameters.endDate;
    }

    /// @notice Checks if minimum participation is reached.
    function _isMinParticipationReached(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];

        uint256 totalVotingPower = proposal.parameters.totalVotingPower;
        if (totalVotingPower == 0) {
            return false;
        }
        uint256 participation = proposal.yes + proposal.no + proposal.abstain;

        return
            participation >=
            _applyRatioCeiled(totalVotingPower, proposal.parameters.minParticipation);
    }

    /// @notice Checks if support threshold is reached.
    function _isSupportThresholdReached(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];

        uint256 totalVotes = proposal.yes + proposal.no;
        if (totalVotes == 0) {
            return false;
        }

        return proposal.yes >= _applyRatioCeiled(totalVotes, proposal.parameters.supportThreshold);
    }

    /// @notice Updates voting settings.
    function _updateVotingSettings(
        uint256 _minProposerVotingPower,
        uint64 _minParticipation,
        uint64 _supportThreshold,
        uint64 _minDuration
    ) internal {
        minProposerVotingPower = _minProposerVotingPower;
        minParticipation = _minParticipation;
        supportThreshold = _supportThreshold;
        minDuration = _minDuration;

        emit VotingSettingsUpdated(
            _minParticipation,
            _supportThreshold,
            _minDuration,
            _minProposerVotingPower
        );
    }

    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(PluginUUPSUpgradeable, ProposalUpgradeable) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    uint256[45] private __gap;
}
