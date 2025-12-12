type NetworkExtension = {
  deploy: string[];
};

export const networkExtensions: {[index: string]: NetworkExtension} = {
  mainnet: {
    deploy: ['./deploy'],
  },
  sepolia: {
    deploy: ['./deploy'],
  },
  goerli: {
    deploy: ['./deploy'],
  },
  devSepolia: {
    deploy: ['./deploy'],
  },
  holesky: {
    deploy: ['./deploy'],
  },
  polygon: {
    deploy: ['./deploy'],
  },
  mumbai: {
    deploy: ['./deploy'],
  },
  baseMainnet: {
    deploy: ['./deploy'],
  },
  baseGoerli: {
    deploy: ['./deploy'],
  },
  baseSepolia: {
    deploy: ['./deploy'],
  },
  arbitrum: {
    deploy: ['./deploy'],
  },
  arbitrumSepolia: {
    deploy: ['./deploy'],
  },
  linea: {
    deploy: ['./deploy'],
  },
  lineaSepolia: {
    deploy: ['./deploy'],
  },
  zksyncMainnet: {
    deploy: ['./deploy'],
  },
  zksyncSepolia: {
    deploy: ['./deploy'],
  },
  harmony: {
    deploy: ['./deploy/env', './deploy/new', './deploy/verification'],
  },
  harmonyTestnet: {
    deploy: ['./deploy/env', './deploy/new', './deploy/verification'],
  },
};
