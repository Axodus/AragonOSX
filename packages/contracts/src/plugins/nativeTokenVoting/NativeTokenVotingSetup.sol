// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IPluginSetup, PluginSetup, PermissionLib} from "../../framework/plugin/setup/PluginSetupProcessor.sol";
import {ProxyLib} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyLib.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";

import {NativeTokenVotingPlugin} from "./NativeTokenVotingPlugin.sol";

/// @title NativeTokenVotingSetup
/// @notice Setup contract for deploying and installing the NativeTokenVoting plugin.
contract NativeTokenVotingSetup is PluginSetup {
    /// @notice Installation parameters structure.
    struct InstallationParams {
        uint256 minProposerVotingPower;
        uint64 minParticipation;
        uint64 supportThreshold;
        uint64 minDuration;
    }

    constructor() PluginSetup(address(new NativeTokenVotingPlugin())) {}

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _installationParams
    ) external returns (address plugin, PreparedSetupData memory preparedSetupData) {
        InstallationParams memory params = abi.decode(_installationParams, (InstallationParams));

        // Deploy plugin proxy
        plugin = ProxyLib.deployUUPSProxy(
            implementation(),
            abi.encodeCall(
                NativeTokenVotingPlugin.initialize,
                (
                    IDAO(_dao),
                    params.minProposerVotingPower,
                    params.minParticipation,
                    params.supportThreshold,
                    params.minDuration
                )
            )
        );

        // Setup permissions
        PermissionLib.MultiTargetPermission[]
            memory permissions = new PermissionLib.MultiTargetPermission[](2);

        // Grant EXECUTE_PERMISSION on DAO to plugin
        permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: _dao,
            who: plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("EXECUTE_PERMISSION")
        });

        // Grant UPGRADE_PLUGIN_PERMISSION on plugin to DAO
        permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Grant,
            where: plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_PLUGIN_PERMISSION")
        });

        preparedSetupData.permissions = permissions;
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    ) external view returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        permissions = new PermissionLib.MultiTargetPermission[](2);

        // Revoke EXECUTE_PERMISSION on DAO from plugin
        permissions[0] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _dao,
            who: _payload.plugin,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("EXECUTE_PERMISSION")
        });

        // Revoke UPGRADE_PLUGIN_PERMISSION on plugin from DAO
        permissions[1] = PermissionLib.MultiTargetPermission({
            operation: PermissionLib.Operation.Revoke,
            where: _payload.plugin,
            who: _dao,
            condition: PermissionLib.NO_CONDITION,
            permissionId: keccak256("UPGRADE_PLUGIN_PERMISSION")
        });
    }

    /// @inheritdoc IPluginSetup
    function implementation() public view override returns (address) {
        return IMPLEMENTATION;
    }
}
