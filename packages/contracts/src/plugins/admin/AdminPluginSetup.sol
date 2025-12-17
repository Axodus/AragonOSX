// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {PluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/PluginSetup.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";

import {AdminPlugin} from "./AdminPlugin.sol";

/// @title AdminPluginSetup (minimal)
/// @notice Minimal setup for the AdminPlugin to enable publishing and installation.
/// @dev Prepares installation by deploying a new AdminPlugin and returns no permissions/helpers.
contract AdminPluginSetup is PluginSetup {
    /// @notice The config used during installation.
    /// @dev Matches the provided ABI snippet: `(address admin, (address target, uint8 operation) targetConfig)`.
    struct TargetConfig {
        address target;
        uint8 operation;
    }

    /// @notice Deploys the plugin and returns minimal prepared data.
    /// @param _dao The installing DAO address.
    /// @param _data ABI-encoded `(address admin, TargetConfig targetConfig)`.
    /// @return plugin The deployed `AdminPlugin` address.
    /// @return preparedSetupData Empty helpers and permissions for a no-op install.
    function prepareInstallation(
        address _dao,
        bytes memory _data
    ) external override returns (address plugin, IPluginSetup.PreparedSetupData memory preparedSetupData) {
        (address admin, TargetConfig memory /* targetConfig */) = abi.decode(
            _data,
            (address, TargetConfig)
        );

        // Deploy minimal plugin carrying the admin.
        AdminPlugin deployed = new AdminPlugin(admin);
        plugin = address(deployed);

        // No helpers and no permissions requested; installation will be a no-op.
        preparedSetupData.helpers = new address[](0);
        preparedSetupData.permissions = new PermissionLib.MultiTargetPermission[](0);
    }

    /// @notice Minimal update preparation: no init data and no changes.
    function prepareUpdate(
        address /* _dao */,
        uint16 /* _currentBuild */,
        IPluginSetup.SetupPayload calldata /* _payload */
    ) external pure override returns (bytes memory initData, IPluginSetup.PreparedSetupData memory preparedSetupData) {
        initData = bytes("");
        preparedSetupData.helpers = new address[](0);
        preparedSetupData.permissions = new PermissionLib.MultiTargetPermission[](0);
    }

    /// @notice Minimal uninstallation preparation: no permissions to revoke.
    function prepareUninstallation(
        address /* _dao */,
        IPluginSetup.SetupPayload calldata /* _payload */
    ) external pure override returns (PermissionLib.MultiTargetPermission[] memory permissions) {
        permissions = new PermissionLib.MultiTargetPermission[](0);
    }

    /// @notice Implementation address for upgrade comparisons.
    /// @dev Returns zero address as this minimal plugin is non-upgradeable.
    function implementation() external pure override returns (address) {
        return address(0);
    }
}
