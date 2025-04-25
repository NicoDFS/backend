import { Context } from '../context';

export const dexResolvers = {
  Query: {
    pairs: async (_: any, __: any, { dexService }: Context) => {
      return dexService.getPairs();
    },
    pair: async (_: any, { id }: { id: string }, { dexService }: Context) => {
      return dexService.getPair(id);
    }
  }
};
