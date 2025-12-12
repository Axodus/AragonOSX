pragma solidity ^0.8.19;

interface INameService {
    function resolve(bytes32 node) external view returns (address);

    function owner(bytes32 node) external view returns (address);

    function register(
        bytes32 parentNode,
        string memory label,
        address owner_
    ) external returns (bytes32 node);

    function registerByHash(
        bytes32 parentNode,
        bytes32 labelHash,
        address owner_
    ) external returns (bytes32 node);

    function setAddr(bytes32 node, address addr_) external;

    event Registered(bytes32 indexed parentNode, bytes32 indexed node, string label, address owner);

    event AddrSet(bytes32 indexed node, address addr);
}
