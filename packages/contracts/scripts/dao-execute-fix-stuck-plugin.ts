import { ethers } from "hardhat";

type DaoAction = {
  to: string;
  value: bigint;
  data: string;
};

type TxOverrides = {
  gasLimit?: bigint;
  gasPrice?: bigint;
  type?: number; // 0 = legacy
};

function envBigInt(name: string, fallback: bigint) {
  const v = process.env[name];
  if (!v) return fallback;
  // suporta valores tipo "300000000000" (wei)
  return BigInt(v.trim());
}

function getExecFn(dao: any) {
  const sigWithCallId = "execute(bytes32,(address,uint256,bytes)[],uint256)";
  const sigNoCallId = "execute((address,uint256,bytes)[],uint256)";

  if (dao.interface.fragments.some((f: any) => f.type === "function" && f.format() === sigWithCallId)) {
    return async (actions: DaoAction[], allowFailureMap = 0n, overrides: TxOverrides = {}) =>
      dao[sigWithCallId](ethers.ZeroHash, actions, allowFailureMap, overrides);
  }

  if (dao.interface.fragments.some((f: any) => f.type === "function" && f.format() === sigNoCallId)) {
    return async (actions: DaoAction[], allowFailureMap = 0n, overrides: TxOverrides = {}) =>
      dao[sigNoCallId](actions, allowFailureMap, overrides);
  }

  return async (actions: DaoAction[], allowFailureMap = 0n, overrides: TxOverrides = {}) =>
    dao.execute(actions, allowFailureMap, overrides);
}

async function main() {
  const daoAddress = "0x76B83B6148ccA891D768cE3129585F25d0104783";
  const pluginAddress = "0x48D6E7Dc4A289417D6878119092d2Bb040162995";
  const mgmtSafe = "0xC3caEc518EdACd3fdbBB0a67DC98612EDbbcE738";

  const [signer] = await ethers.getSigners();
  const signerAddr = await signer.getAddress();

  console.log("Signer:", signerAddr);
  console.log("DAO:", daoAddress);
  console.log("Plugin:", pluginAddress);
  console.log("Mgmt Safe:", mgmtSafe);

  const dao = await ethers.getContractAt("src/core/dao/DAO.sol:DAO", daoAddress, signer);

  const EXECUTE_PERMISSION_ID =
    "0xbf04b4486c9663d805744005c3da000eda93de6e3308a4a7a812eb565327b78d";

  const grantExecToMgmtSafe = dao.interface.encodeFunctionData("grant", [
    daoAddress,
    mgmtSafe,
    EXECUTE_PERMISSION_ID,
  ]);

  const revokeExecFromPlugin = dao.interface.encodeFunctionData("revoke", [
    daoAddress,
    pluginAddress,
    EXECUTE_PERMISSION_ID,
  ]);

  const actions: DaoAction[] = [
    { to: daoAddress, value: 0n, data: grantExecToMgmtSafe },
    { to: daoAddress, value: 0n, data: revokeExecFromPlugin },
  ];

  // Harmony: force legacy tx + fixed gas to avoid eth_estimateGas
  const gasPrice = envBigInt("HARMONY_GAS_PRICE", 300000000000n); // 300 gwei
  const gasLimit = envBigInt("HARMONY_LEGACY_GAS_LIMIT", 30000000n);

  const exec = getExecFn(dao);

  console.log("\nSubmitting DAO.execute with actions:", actions.length);
  const tx = await exec(actions, 0n, { type: 0, gasPrice, gasLimit });
  console.log("Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Mined in block:", receipt?.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});