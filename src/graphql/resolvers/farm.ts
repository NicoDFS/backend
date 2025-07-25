import { Context } from '../context';
import { FarmService } from '../../services/farm';

export const farmResolvers = {
  Query: {
    // Get all farming pools
    farmingPools: async () => {
      return FarmService.getFarmingPools();
    },

    // Get all whitelisted pools
    whitelistedPools: async () => {
      return FarmService.getWhitelistedPools();
    },

    // Get user farming data
    userFarmingData: async (_: any, { userAddress }: { userAddress: string }) => {
      return FarmService.getUserFarmingData(userAddress);
    },

    // Get complete farming data (what the frontend currently expects)
    farmingData: async (_: any, { userAddress }: { userAddress?: string }) => {
      return FarmService.getAllFarmingData(userAddress);
    }
  }
};
