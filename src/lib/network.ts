import { PublicKey } from '@solana/web3.js';

export type SolanaNetwork = 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkConfig {
  network: SolanaNetwork;
  programId: PublicKey;
  rpcUrl: string;
  explorerUrl: string;
  cluster: string;
}

const NETWORK_CONFIGS: Record<SolanaNetwork, Omit<NetworkConfig, 'programId'>> = {
  devnet: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    cluster: 'devnet',
  },
  testnet: {
    network: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    cluster: 'testnet',
  },
  'mainnet-beta': {
    network: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    cluster: 'mainnet-beta',
  },
};

function getNetwork(): SolanaNetwork {
  const envNetwork = import.meta.env.VITE_SOLANA_NETWORK as SolanaNetwork;
  if (envNetwork && envNetwork in NETWORK_CONFIGS) return envNetwork;
  return 'devnet';
}

function getProgramId(): PublicKey {
  const envProgramId = import.meta.env.VITE_PROGRAM_ID;
  if (envProgramId) {
    try {
      return new PublicKey(envProgramId);
    } catch {
      console.warn('Invalid VITE_PROGRAM_ID, using default');
    }
  }
  return new PublicKey('7WDrepbu71dCMPpDeHrafhV3gVGrSPaMgFXp4cUHWyiR');
}

function getRpcUrl(): string {
  return import.meta.env.VITE_RPC_URL || NETWORK_CONFIGS[getNetwork()].rpcUrl;
}

export function getNetworkConfig(): NetworkConfig {
  const network = getNetwork();
  return {
    ...NETWORK_CONFIGS[network],
    programId: getProgramId(),
    rpcUrl: getRpcUrl(),
  };
}

export function buildExplorerUrl(type: 'tx' | 'address' | 'account', value: string): string {
  const config = getNetworkConfig();
  const clusterParam = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
  return `${config.explorerUrl}/${type}/${value}${clusterParam}`;
}
