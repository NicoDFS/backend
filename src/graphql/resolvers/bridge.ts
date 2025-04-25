import { Context } from '../context';

export const bridgeResolvers = {
  Query: {
    bridges: async (_: any, __: any, { bridgeService }: Context) => {
      return bridgeService.getBridges();
    },
    bridge: async (_: any, { id }: { id: string }, { bridgeService }: Context) => {
      return bridgeService.getBridge(id);
    }
  }
};
