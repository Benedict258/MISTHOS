import { getNetworkConfig } from './network';
import { PublicKey } from '@solana/web3.js';

const DEVNET_CONFIG_ADDRESS = 'DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht';

export function getConfigAddress(): PublicKey {
  const config = getNetworkConfig();
  if (config.network === 'devnet') {
    return new PublicKey(DEVNET_CONFIG_ADDRESS);
  }
  // For other networks, derive or fetch the config PDA
  // The config PDA is derived from seeds ["config", authority]
  return new PublicKey(DEVNET_CONFIG_ADDRESS);
}
