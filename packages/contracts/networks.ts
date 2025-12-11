type NetworkExtension = {
  deploy: string[];
};

export const networkExtensions: {[index: string]: NetworkExtension} = {
  mainnet: {
    deploy: ['./deploy'],
  },
  harmony: {
    deploy: ['env', 'new', 'verification'],
  },
  harmonyTestnet: {
    deploy: ['env', 'new', 'verification'],
  },
};
