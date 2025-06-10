import { ethers } from 'ethers';

// Default to KalyChain mainnet RPC
const KALYCHAIN_RPC_URL = process.env.KALYCHAIN_RPC_URL || 'https://rpc.kalychain.io/rpc';

// Create a provider instance
export const provider = new ethers.providers.JsonRpcProvider(KALYCHAIN_RPC_URL);

// Export a function to get the provider
export function getProvider(): ethers.providers.Provider {
  return provider;
}
