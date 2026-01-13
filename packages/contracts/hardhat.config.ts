import {networkExtensions} from './networks';
import {TestingFork} from './types/hardhat';
import {
  networks as commonNetworkConfigs,
  SupportedNetworks,
  addRpcUrlToNetwork,
} from '@aragon/osx-commons-configs';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import {extendEnvironment, HardhatUserConfig, task} from 'hardhat/config';
import type {NetworkUserConfig} from 'hardhat/types';
import 'solidity-coverage';
import 'solidity-docgen';

dotenv.config();

function parseGasPriceWei(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Harmony costuma rejeitar txs com gasPrice muito baixo ("transaction underpriced").
// Mantemos um mínimo razoável e ainda permitimos override via env (em wei).
const MIN_HARMONY_GAS_PRICE_WEI = 700_000_000_000; // 700 gwei

const ETH_KEY = process.env.ETH_KEY;
const accounts = ETH_KEY ? ETH_KEY.split(',') : [];

// Alchemy API key is only required when deploying to networks whose RPC URLs are
// derived from Alchemy. Keep it optional so custom networks (e.g. Harmony) can
// deploy without needing unrelated credentials.
if (process.env.ALCHEMY_API_KEY) {
  addRpcUrlToNetwork(process.env.ALCHEMY_API_KEY);
} else {
  console.log(
    'WARNING: ALCHEMY_API_KEY in .env not set. Alchemy-based networks may be unavailable.'
  );
}

// add accounts to network configs
const hardhatNetworks: {[index: string]: NetworkUserConfig} =
  commonNetworkConfigs;
for (const network of Object.keys(hardhatNetworks) as SupportedNetworks[]) {
  if (network === SupportedNetworks.LOCAL) {
    continue;
  }

  if (networkExtensions[network] == undefined) {
    console.log(`WARNING: newtork ${network} is not found in networks.ts file`);
    continue;
  }

  hardhatNetworks[network].accounts = accounts;
  hardhatNetworks[network].deploy = networkExtensions[network].deploy;
}

// Extend HardhatRuntimeEnvironment
extendEnvironment(hre => {
  const testingFork: TestingFork = {
    network: '',
    osxVersion: '',
    activeContracts: {},
  };
  hre.aragonToVerifyContracts = [];
  hre.managementDAOMultisigPluginAddress = ''; // TODO This must be removed after the deploy script got refactored (see https://github.com/aragon/osx/pull/582)
  hre.managementDAOActions = [];
  hre.testingFork = testingFork;
});

const ENABLE_DEPLOY_TEST = process.env.TEST_UPDATE_DEPLOY_SCRIPT !== undefined;

console.log('Is deploy test is enabled: ', ENABLE_DEPLOY_TEST);

// Override the test task so it injects wrapper.
// Note that this also gets injected when running it through coverage.
task('test').setAction(async (args, hre, runSuper) => {
  await hre.run('compile');
  // Back-compat shim for ethers v6: expose .address like v5
  try {
    const {Contract} = await import('ethers');
    if (
      Contract &&
      (Contract as any).prototype &&
      !Object.getOwnPropertyDescriptor((Contract as any).prototype, 'address')
    ) {
      Object.defineProperty((Contract as any).prototype, 'address', {
        get: function () {
          // ethers v6 uses .target for contract address
          return (this as any).target;
        },
      });
    }
    // Also patch Hardhat's re-exported ethers just in case
    if (
      (hre as any).ethers &&
      (hre as any).ethers.Contract &&
      !Object.getOwnPropertyDescriptor(
        (hre as any).ethers.Contract.prototype,
        'address'
      )
    ) {
      Object.defineProperty((hre as any).ethers.Contract.prototype, 'address', {
        get: function () {
          return (this as any).target;
        },
      });
    }
  } catch (e) {
    // no-op if import fails; tests may still work without the shim
  }
  const imp = await import('./test/test-utils/wrapper');

  const wrapper = await imp.Wrapper.create(
    hre.network.name,
    hre.ethers.provider as any
  );
  hre.wrapper = wrapper;

  await runSuper(args);
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
    overrides: {
      // NativeTokenVotingPlugin hits "stack too deep" on the ProposalCreated emission.
      // Enabling viaIR+optimizer for this file fixes it while keeping the rest of the
      // repository on the standard compilation pipeline.
      'src/plugins/nativeTokenVoting/NativeTokenVotingPlugin.sol': {
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 2000,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      blockGasLimit: 3000000000, // really high to test some things that are only possible with a higher block gas limit
      gasPrice: 80000000000,
      deploy: ['env', 'new', 'verification'],
    },
    localhost: {
      deploy: ['env', 'new', 'verification'],
    },
    harmony: {
      url: process.env.HARMONY_MAINNET_RPC || '',
      chainId: 1666600000,
      gasPrice: Math.max(
        parseGasPriceWei(
          process.env.HARMONY_GAS_PRICE,
          MIN_HARMONY_GAS_PRICE_WEI
        ),
        MIN_HARMONY_GAS_PRICE_WEI
      ),
      accounts,
      deploy: ['./deploy/env', './deploy/new', './deploy/verification'],
    },
    harmonyTestnet: {
      url: process.env.HARMONY_TESTNET_RPC || '',
      chainId: 1666700000,
      gasPrice: Math.max(
        parseGasPriceWei(
          process.env.HARMONY_TESTNET_GAS_PRICE,
          MIN_HARMONY_GAS_PRICE_WEI
        ),
        MIN_HARMONY_GAS_PRICE_WEI
      ),
      accounts,
      deploy: ['./deploy/env', './deploy/new', './deploy/verification'],
    },
    ...hardhatNetworks,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      modeTestnet: 'modeTestnet',
      modeMainnet: 'modeMainnet',
      harmony: process.env.HARMONY_EXPLORER_KEY || '',
      harmonyTestnet: process.env.HARMONY_TESTNET_EXPLORER_KEY || '',
    },
    customChains: [
      {
        network: 'baseMainnet',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseGoerli',
        chainId: 84531,
        urls: {
          apiURL: 'https://api-goerli.basescan.org/api',
          browserURL: 'https://goerli.basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
      {
        network: 'holesky',
        chainId: 17000,
        urls: {
          apiURL: 'https://api-holesky.etherscan.io/api',
          browserURL: 'https://holesky.etherscan.io',
        },
      },
      {
        network: 'modeTestnet',
        chainId: 919,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/testnet/evm/919/etherscan',
          browserURL: 'https://testnet.modescan.io',
        },
      },
      {
        network: 'modeMainnet',
        chainId: 34443,
        urls: {
          apiURL:
            'https://api.routescan.io/v2/network/mainnet/evm/34443/etherscan',
          browserURL: 'https://modescan.io',
        },
      },
      {
        network: 'harmony',
        chainId: 1666600000,
        urls: {
          apiURL: process.env.HARMONY_EXPLORER_API_URL || '',
          browserURL: process.env.HARMONY_EXPLORER_BROWSER_URL || '',
        },
      },
      {
        network: 'harmonyTestnet',
        chainId: 1666700000,
        urls: {
          apiURL: process.env.HARMONY_TESTNET_EXPLORER_API_URL || '',
          browserURL: process.env.HARMONY_TESTNET_EXPLORER_BROWSER_URL || '',
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    deploy: './deploy',
  },
  docgen: process.env.DOCS ? require('./docs/config.js') : undefined,
  mocha: {
    timeout: 90_000, // 90 seconds // increase the timeout for subdomain validation tests
  },
};

export default config;
