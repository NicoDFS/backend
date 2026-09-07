import { Context } from '../context';

export const bridgeResolvers = {
  Query: {
    bridges: async (_: unknown, { limit, skip }: { limit?: number; skip?: number }, { bridgeService }: Context) => {
      return bridgeService.getBridges(limit || 10, skip || 0);
    },
    bridge: async (_: unknown, { id }: { id: string }, { bridgeService }: Context) => {
      return bridgeService.getBridge(id);
    },
    bridgeStats: async (_: unknown, __: unknown, { bridgeService }: Context) => {
      return bridgeService.getBridgeStats();
    },
    warpRoutes: async (_: unknown, __: unknown, { bridgeService }: Context) => {
      return bridgeService.getWarpRoutes();
    },
    bridgeOverview: async (_: unknown, __: unknown, { bridgeService }: Context) => {
      return bridgeService.getBridgeOverview();
    }
  }
};
