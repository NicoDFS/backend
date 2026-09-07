import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import {
  KALYCHAIN_CHAIN_ID, KALYCHAIN_DOMAIN, KALYCHAIN_NATIVE_SYMBOL, KALYCHAIN_NAME,
  KALYCHAIN_TOKENS, KALYCHAIN_WARP_ROUTES, KALYCHAIN_CONTRACTS,
} from '../chain';

describe('KalyChain config (one chain, id 3890)', () => {
  it('is KalyChain on 3890 with KMT as native', () => {
    expect(KALYCHAIN_CHAIN_ID).toBe(3890);
    expect(KALYCHAIN_DOMAIN).toBe(3890);
    expect(KALYCHAIN_NAME).toBe('KalyChain');
    expect(KALYCHAIN_NATIVE_SYMBOL).toBe('KMT');
  });

  it('bridged token decimals match the on-chain synthetics (USDT/USDC 6, WBTC 8, rest 18)', () => {
    expect(KALYCHAIN_TOKENS.USDT.decimals).toBe(6);
    expect(KALYCHAIN_TOKENS.USDC.decimals).toBe(6);
    expect(KALYCHAIN_TOKENS.WBTC.decimals).toBe(8);
    expect(KALYCHAIN_TOKENS.DAI.decimals).toBe(18);
    expect(KALYCHAIN_TOKENS.ETH.decimals).toBe(18);
    expect(KALYCHAIN_TOKENS.WKMT.decimals).toBe(18);
  });

  it('every address is a valid, unique EVM address', () => {
    const all = [
      ...Object.values(KALYCHAIN_TOKENS).map(t => t.address),
      ...Object.values(KALYCHAIN_CONTRACTS),
    ];
    for (const a of all) expect(ethers.utils.isAddress(a), a).toBe(true);
    expect(new Set(all.map(a => a.toLowerCase())).size).toBe(all.length);
  });

  it('warp routes only reference bridged tokens and the two live remote legs', () => {
    for (const r of KALYCHAIN_WARP_ROUTES) {
      expect(Object.keys(KALYCHAIN_TOKENS)).toContain(r.token);
      expect(r.token).not.toBe('WKMT');
      expect(['arbitrum', 'polygon']).toContain(r.destinationChain);
    }
    expect(new Set(KALYCHAIN_WARP_ROUTES.map(r => r.id)).size).toBe(KALYCHAIN_WARP_ROUTES.length);
    // USDT is the only token with a Polygon leg
    expect(KALYCHAIN_WARP_ROUTES.filter(r => r.destinationChain === 'polygon').map(r => r.token)).toEqual(['USDT']);
  });
});
