import { Context } from '../context';

export const dexResolvers = {
  Query: {
    dexOverview: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getDexOverview();
    },

    factory: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getFactory();
    },

    pairs: async (
      _: any,
      { first, skip, orderBy, orderDirection }: { first?: number; skip?: number; orderBy?: string; orderDirection?: string },
      { dexService }: Context
    ) => {
      return dexService.getPairs(first, skip, orderBy, orderDirection);
    },

    pair: async (_: any, { id }: { id: string }, { dexService }: Context) => {
      return dexService.getPair(id);
    },

    tokens: async (
      _: any,
      { first, skip, orderBy, orderDirection }: { first?: number; skip?: number; orderBy?: string; orderDirection?: string },
      { dexService }: Context
    ) => {
      return dexService.getTokens(first, skip, orderBy, orderDirection);
    },

    token: async (_: any, { id }: { id: string }, { dexService }: Context) => {
      return dexService.getToken(id);
    },

    liquidityPoolManager: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getLiquidityPoolManager();
    },

    whitelistedPools: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getWhitelistedPools();
    },

    treasuryVester: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getTreasuryVester();
    },

    dexStakingPool: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getStakingRewards();
    },

    dexDayData: async (
      _: any,
      { first, skip }: { first?: number; skip?: number },
      { dexService }: Context
    ) => {
      return dexService.getDexDayData(first, skip);
    }
  }
};
