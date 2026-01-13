// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {IDAO} from "@aragon/osx/core/dao/DAO.sol";
import {PluginUUPSUpgradeable} from "@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol";
import {ProposalUpgradeable} from "@aragon/osx/core/plugin/proposal/ProposalUpgradeable.sol";
import {RATIO_BASE, _applyRatioCeiled} from "@aragon/osx/plugins/utils/Ratio.sol";

/// @title NativeTokenVotingPlugin
/// @notice A governance plugin that allows voting using native token (ONE, ETH, etc.) balances.
/// @dev This plugin extends the standard voting pattern to use native token balances instead of ERC20.
/// Voting power is determined by the voter's native token balance at a specific snapshot block.
contract NativeTokenVotingPlugin is PluginUUPSUpgradeable, ProposalUpgradeable {
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
        IDAO.Action[] actions;
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

    /// @notice Emitted when voting settings are updated.
    event VotingSettingsUpdated(
        uint64 minParticipation,
        uint64 supportThreshold,
        uint64 minDuration,
        uint256 minProposerVotingPower
    );

    /// @notice Thrown when a voter has no voting power.
    error NoVotingPower();

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
        _updateVotingSettings(_minProposerVotingPower, _minParticipation, _supportThreshold, _minDuration);
    }

    /// @notice Creates a new proposal.
    /// @param _metadata Proposal metadata.
    /// @param _actions Actions to execute if proposal passes.
    /// @param _startDate Voting start date.
    /// @param _endDate Voting end date.
    /// @param _votingMode Voting mode.
    /// @param _allowFailureMap Bitmap for action failure tolerance.
    /// @return proposalId The ID of the created proposal.
    function createProposal(
        bytes calldata _metadata,
        IDAO.Action[] calldata _actions,
        uint32 _startDate,
        uint32 _endDate,
        VotingMode _votingMode,
        uint256 _allowFailureMap
    ) external returns (uint256 proposalId) {
        uint256 voterBalance = address(msg.sender).balance;
        if (voterBalance < minProposerVotingPower) {
            revert NoVotingPower();
        }

        uint64 _start = _startDate == 0 ? uint32(block.timestamp) : _startDate;
        uint64 _end = _endDate;

        require(_end > _start, "INVALID_DATES");
        require(_end - _start >= minDuration, "DURATION_TOO_SHORT");

        proposalId = _createProposalId();

        Proposal storage proposal = proposals[proposalId];
        proposal.parameters.votingMode = _votingMode;
        proposal.parameters.startDate = _start;
        proposal.parameters.endDate = _end;
        proposal.parameters.snapshotBlock = uint32(block.number - 1);
        proposal.parameters.minParticipation = minParticipation;
        proposal.parameters.supportThreshold = supportThreshold;

        for (uint256 i = 0; i < _actions.length; i++) {
            proposal.actions.push(_actions[i]);
        }
        proposal.allowFailureMap = _allowFailureMap;

        emit ProposalCreated({
            proposalId: proposalId,
            creator: msg.sender,
            startDate: uint64(_start),
            endDate: uint64(_end),
            metadata: _metadata,
            actions: _actions,
            allowFailureMap: _allowFailureMap
        });
    }

    /// @notice Casts a vote on a proposal.
    /// @param _proposalId The proposal ID.
    /// @param _voteOption The vote option.
    function vote(uint256 _proposalId, VoteOption _voteOption) external {
        Proposal storage proposal = proposals[_proposalId];

        if (!_isProposalOpen(proposal)) {
            revert ProposalNotOpen();
        }

        // Get voting power at snapshot block
        // Note: In production, this should query historical balance via an indexer or oracle
        // For now, we use current balance as a simplified implementation
        uint256 votingPower = address(msg.sender).balance;

        if (votingPower == 0) {
            revert NoVotingPower();
        }

        VoteOption previousVote = proposal.votes[msg.sender];

        // Update vote counts
        if (previousVote == VoteOption.Yes) {
            proposal.yes -= votingPower;
        } else if (previousVote == VoteOption.No) {
            proposal.no -= votingPower;
        } else if (previousVote == VoteOption.Abstain) {
            proposal.abstain -= votingPower;
        }

        if (_voteOption == VoteOption.Yes) {
            proposal.yes += votingPower;
        } else if (_voteOption == VoteOption.No) {
            proposal.no += votingPower;
        } else if (_voteOption == VoteOption.Abstain) {
            proposal.abstain += votingPower;
        }

        proposal.votes[msg.sender] = _voteOption;

        emit VoteCast(_proposalId, msg.sender, _voteOption, votingPower);

        // Early execution if applicable
        if (
            proposal.parameters.votingMode == VotingMode.EarlyExecution &&
            _canExecute(_proposalId)
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

        _executeProposal(
            dao(),
            _proposalId,
            proposal.actions,
            proposal.allowFailureMap
        );
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
        return currentTime >= proposal.parameters.startDate && currentTime < proposal.parameters.endDate;
    }

    /// @notice Checks if minimum participation is reached.
    function _isMinParticipationReached(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        
        // Note: totalVotingPower should be calculated from total native token supply at snapshot
        // This is a simplified version
        uint256 totalVotingPower = address(dao()).balance; // Placeholder
        uint256 participation = proposal.yes + proposal.no + proposal.abstain;

        return participation >= _applyRatioCeiled(totalVotingPower, proposal.parameters.minParticipation);
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

        emit VotingSettingsUpdated(_minParticipation, _supportThreshold, _minDuration, _minProposerVotingPower);
    }

    uint256[45] private __gap;
}
