// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.19;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ProtocolVersion} from "@aragon/osx-commons-contracts/src/utils/versioning/ProtocolVersion.sol";
import {DaoAuthorizableUpgradeable} from "@aragon/osx-commons-contracts/src/permission/auth/DaoAuthorizableUpgradeable.sol";
import {IDAO} from "@aragon/osx-commons-contracts/src/dao/IDAO.sol";
import {INameService} from "./INameService.sol";

/// @title NameServiceSubdomainRegistrar
/// @notice Registrar ENS-like que usa um `INameService` para registrar subdomínios e resolver endereços.
contract NameServiceSubdomainRegistrar is
    UUPSUpgradeable,
    DaoAuthorizableUpgradeable,
    ProtocolVersion
{
    /// @notice Permissão para upgrade via UUPS.
    bytes32 public constant UPGRADE_REGISTRAR_PERMISSION_ID =
        keccak256("UPGRADE_REGISTRAR_PERMISSION");

    /// @notice Permissão para registrar subdomínios e ajustar resolver.
    bytes32 public constant REGISTER_ENS_SUBDOMAIN_PERMISSION_ID =
        keccak256("REGISTER_ENS_SUBDOMAIN_PERMISSION");

    /// @notice Serviço de nomes ENS-like.
    INameService public nameService;

    /// @notice Namehash do domínio pai.
    bytes32 public node;

    /// @notice Resolver padrão mantido por compatibilidade (não utilizado diretamente).
    address public resolver;

    /// @notice Erro quando subnode já está registrado.
    error AlreadyRegistered(bytes32 subnode, address nodeOwner);

    /// @notice Erro quando resolver é inválido.
    error InvalidResolver(bytes32 node, address resolver);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Inicializa o registrar com DAO, serviço de nomes e node pai.
    function initialize(
        IDAO _managingDao,
        INameService _nameService,
        bytes32 _node
    ) external initializer {
        __DaoAuthorizableUpgradeable_init(_managingDao);

        nameService = _nameService;
        node = _node;

        // Resolver opcional; manter zero até setado.
        address nodeResolver = resolver;
        if (nodeResolver == address(0)) {
            // Sem resolver padrão exigido; OK para adapters simples.
        }
    }

    /// @dev Autoriza upgrade via UUPS.
    function _authorizeUpgrade(
        address
    ) internal virtual override auth(UPGRADE_REGISTRAR_PERMISSION_ID) {}

    /// @notice Registra subdomínio e define endereço resolvido no serviço de nomes.
    /// @param _label Labelhash do subdomínio.
    /// @param _targetAddress Endereço de destino para resolução.
    function registerSubnode(
        bytes32 _label,
        address _targetAddress
    ) external auth(REGISTER_ENS_SUBDOMAIN_PERMISSION_ID) {
        bytes32 subnode = keccak256(abi.encodePacked(node, _label));
        address currentOwner = nameService.owner(subnode);
        if (currentOwner != address(0)) {
            revert AlreadyRegistered(subnode, currentOwner);
        }

        // Registrar com este contrato como owner para manter controle (compatível com ENS registrar).
        nameService.registerByHash(node, _label, address(this));
        nameService.setAddr(subnode, _targetAddress);
    }

    /// @notice Define resolver padrão (compatibilidade).
    function setDefaultResolver(
        address _resolver
    ) external auth(REGISTER_ENS_SUBDOMAIN_PERMISSION_ID) {
        if (_resolver == address(0)) {
            revert InvalidResolver({node: node, resolver: _resolver});
        }
        resolver = _resolver;
    }

    uint256[47] private __gap;
}
