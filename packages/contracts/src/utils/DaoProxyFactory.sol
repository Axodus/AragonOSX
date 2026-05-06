// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DaoProxyFactory
/// @notice Minimal factory to deploy a UUPS proxy for the Aragon DAO implementation.
/// @dev Uses OZ ERC1967Proxy; pass the DAO implementation address and the ABI-encoded initialize calldata.
contract DaoProxyFactory {
    event DaoProxyDeployed(address proxy, address implementation);

    function deployDaoProxy(
        address implementation,
        bytes calldata initData
    ) external returns (address) {
        ERC1967Proxy proxy = new ERC1967Proxy(implementation, initData);
        emit DaoProxyDeployed(address(proxy), implementation);
        return address(proxy);
    }
}
