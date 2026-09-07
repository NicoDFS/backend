import { ethers } from 'ethers';
import { KALYCHAIN_RPC_URL } from '../../config/chain';

// The one KalyChain provider (chain id 3890). RPC comes from KALYCHAIN_RPC_URL.
export const provider = new ethers.providers.JsonRpcProvider(KALYCHAIN_RPC_URL);

export function getProvider(): ethers.providers.Provider {
  return provider;
}
