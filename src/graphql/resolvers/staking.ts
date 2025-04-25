import { Context } from '../context';

export const stakingResolvers = {
  Query: {
    stakingPools: async (_: any, __: any, { stakingService }: Context) => {
      return stakingService.getStakingPools();
    },
    stakingPool: async (_: any, { id }: { id: string }, { stakingService }: Context) => {
      return stakingService.getStakingPool(id);
    }
  }
};
