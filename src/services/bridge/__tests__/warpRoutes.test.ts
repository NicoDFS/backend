import { describe, it, expect } from 'vitest';
import { BridgeService } from '..';
import { KALYCHAIN_TOKENS } from '../../../config/chain';

describe('BridgeService.getWarpRoutes (3890)', () => {
  it('exposes exactly the live KalyChain-side routes with 3890 token addresses', async () => {
    const routes = await BridgeService.getWarpRoutes();
    expect(routes.map(r => r.id).sort()).toEqual(
      ['dai-arbitrum', 'eth-arbitrum', 'usdc-arbitrum', 'usdt-arbitrum', 'usdt-polygon', 'wbtc-arbitrum'],
    );
    for (const r of routes) {
      expect(r.sourceChain).toBe('kalychain');
      expect(r.status).toBe('active');
      expect(r.tokenAddress).toBe(KALYCHAIN_TOKENS[r.tokenSymbol as keyof typeof KALYCHAIN_TOKENS].address);
    }
    expect(routes.map(r => r.tokenSymbol)).not.toContain('KLC');
    expect(routes.map(r => r.destinationChain)).not.toContain('bsc');
  });
});
