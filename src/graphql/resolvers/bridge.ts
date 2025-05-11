import { Context } from '../context';

export const bridgeResolvers = {
  Query: {
    bridges: async (_: any, { limit, skip }: { limit?: number; skip?: number }, { bridgeService }: Context) => {
      return bridgeService.getBridges(limit || 10, skip || 0);
    },
    bridge: async (_: any, { id }: { id: string }, { bridgeService }: Context) => {
      return bridgeService.getBridge(id);
    },
    bridgeStats: async (_: any, __: any, { bridgeService }: Context) => {
      return bridgeService.getBridgeStats();
    },
    warpRoutes: async (_: any, __: any, { bridgeService }: Context) => {
      return bridgeService.getWarpRoutes();
    },
    bridgeOverview: async (_: any, __: any, { bridgeService }: Context) => {
      return bridgeService.getBridgeOverview();
    }
  }
};
