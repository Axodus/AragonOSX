pragma solidity ^0.8.19;

import {INameService} from "./INameService.sol";

contract CountryNameServiceAdapter is INameService {
    mapping(bytes32 => address) private _owners;
    mapping(bytes32 => address) private _addrs;

    function resolve(bytes32 node) external view override returns (address) {
        return _addrs[node];
    }

    function owner(bytes32 node) external view override returns (address) {
        return _owners[node];
    }

    function register(
        bytes32 parentNode,
        string memory label,
        address owner_
    ) external override returns (bytes32 node) {
        bytes32 labelHash = keccak256(bytes(label));
        node = keccak256(abi.encodePacked(parentNode, labelHash));
        require(_owners[node] == address(0), "NS:ALREADY_REGISTERED");
        _owners[node] = owner_;
        emit Registered(parentNode, node, label, owner_);
    }

    function setAddr(bytes32 node, address addr_) external override {
        require(msg.sender == _owners[node], "NS:NOT_OWNER");
        _addrs[node] = addr_;
        emit AddrSet(node, addr_);
    }
}
