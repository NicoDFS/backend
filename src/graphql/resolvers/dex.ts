import { Context } from '../context';
import { volumeService } from '../../services/dex/volumeService';

export const dexResolvers = {
  Query: {
    dexOverview: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getDexOverview();
    },

    kalyswapFactory: async (_: any, __: any, { dexService }: Context) => {
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

    tokensVestedEvents: async (
      _: any,
      { first, skip }: { first?: number; skip?: number },
      { dexService }: Context
    ) => {
      return dexService.getTokensVestedEvents(first, skip);
    },

    dexStakingPool: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getStakingRewards();
    },

    kalyswapDayDatas: async (
      _: any,
      { first, skip }: { first?: number; skip?: number },
      { dexService }: Context
    ) => {
      return dexService.getDexDayData(first, skip);
    },

    pairDayDatas: async (
      _: any,
      { pairAddress, first, skip }: { pairAddress: string; first?: number; skip?: number },
      { dexService }: Context
    ) => {
      // Validate pairAddress is provided
      if (!pairAddress) {
        throw new Error('pairAddress is required');
      }

      // Validate pairAddress format (should be a valid Ethereum address)
      if (!/^0x[a-fA-F0-9]{40}$/.test(pairAddress)) {
        throw new Error('Invalid pairAddress format');
      }

      return dexService.getPairDayData(pairAddress, first, skip);
    },

    router: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getRouter();
    },

    routerSwaps: async (
      _: any,
      { first, skip }: { first?: number; skip?: number },
      { dexService }: Context
    ) => {
      return dexService.getRouterSwaps(first, skip);
    },

    lpStakingData: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getLPStakingData();
    },

    swaps: async (
      _: any,
      { first, skip, userAddress }: { first?: number; skip?: number; userAddress?: string },
      { dexService }: Context
    ) => {
      return dexService.getSwaps(first, skip, userAddress);
    },

    // 24hr Volume Queries
    pair24hrVolume: async (_: any, {
      pairAddress,
      klcPriceUSD,
      token0Symbol,
      token1Symbol
    }: {
      pairAddress: string;
      klcPriceUSD: number;
      token0Symbol?: string;
      token1Symbol?: string;
    }) => {
      return volumeService.getPair24hrVolume(pairAddress, klcPriceUSD, token0Symbol, token1Symbol);
    },

    multiplePairs24hrVolume: async (_: any, {
      pairs,
      klcPriceUSD
    }: {
      pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>;
      klcPriceUSD: number;
    }) => {
      return volumeService.getMultiplePairs24hrVolume(pairs, klcPriceUSD);
    },

    total24hrVolume: async (_: any, {
      pairs,
      klcPriceUSD
    }: {
      pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>;
      klcPriceUSD: number;
    }) => {
      return volumeService.getTotal24hrVolume(pairs, klcPriceUSD);
    }
  }
};
