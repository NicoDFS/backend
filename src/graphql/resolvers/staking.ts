import { Context } from '../context';

export const stakingResolvers = {
  Query: {
    stakingPools: async (_: any, __: any, { stakingService }: Context) => {
      return stakingService.getStakingPools();
    },

    stakingPool: async (_: any, { id }: { id: string }, { stakingService }: Context) => {
      return stakingService.getStakingPool(id);
    },

    stakingPoolUsers: async (
      _: any,
      { poolId, first, skip }: { poolId: string; first?: number; skip?: number },
      { stakingService }: Context
    ) => {
      return stakingService.getStakingPoolUsers(poolId, first, skip);
    },

    userStakingInfo: async (
      _: any,
      { userAddress, poolId }: { userAddress: string; poolId: string },
      { stakingService }: Context
    ) => {
      return stakingService.getUserStakingInfo(userAddress, poolId);
    },

    stakingEvents: async (
      _: any,
      { poolId, eventType, first, skip }: { poolId: string; eventType: string; first?: number; skip?: number },
      { stakingService }: Context
    ) => {
      return stakingService.getStakingEvents(poolId, eventType, first, skip);
    },

    stakingContractData: async (_: any, __: any, { stakingService }: Context) => {
      return stakingService.getContractData();
    },

    userStakingContractData: async (
      _: any,
      { userAddress }: { userAddress: string },
      { stakingService }: Context
    ) => {
      return stakingService.getUserContractData(userAddress);
    }
  }
};
