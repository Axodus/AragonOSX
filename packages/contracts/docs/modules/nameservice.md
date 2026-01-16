# Name Service Adapters (ENS-like)

Aragon OSx supports optional name service integrations for human-readable names (e.g., subdomains). On networks without ENS (such as Harmony), use an adapter contract implementing `INameService` to provide similar functionality.

- Interface: `src/framework/nameservice/INameService.sol`
- Harmony fallback: `src/framework/nameservice/CountryNameServiceAdapter.sol` (stub adapter)

Adapters expose:

- `register(parentNode, label, owner)` → returns `node`
- `setAddr(node, addr)` → sets resolution address
- `resolve(node)` / `owner(node)` → read functions

This keeps core contract communication on addresses/permissions while enabling optional naming. Existing ENS-based registrars can be extended to depend on `INameService` via injection for cross-network portability.
