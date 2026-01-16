// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IPlugin} from "@aragon/osx-commons-contracts/src/plugin/IPlugin.sol";

/// @title AdminPlugin (minimal)
/// @notice Minimal plugin carrying an admin address and advertising IPlugin support.
/// @dev This implementation is intentionally simple and non-upgradeable to enable publishing and installing via OSx.
contract AdminPlugin is ERC165, IPlugin {
    /// @notice The admin address associated with this plugin.
    address public immutable admin;

    /// @param _admin The admin address.
    constructor(address _admin) {
        admin = _admin;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IPlugin).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IPlugin
    function pluginType() external view returns (PluginType) {
        // Non-upgradeable (constructed via `new`).
        return PluginType.Constructable;
    }
}
