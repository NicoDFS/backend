import { Context } from '../context';
import { ProjectService } from '../../services/project';
import { FairlaunchService } from '../../services/fairlaunch';

export const launchpadResolvers = {
  Query: {
    launchpadProjects: async (_: any, __: any, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadProjects();
    },
    launchpadProject: async (_: any, { id }: { id: string }, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadProject(id);
    },
    launchpadOverview: async (_: any, __: any, { launchpadService }: Context) => {
      return launchpadService.getLaunchpadOverview();
    },

    /**
     * Unified project lookup - searches both presales and fairlaunches by contract address
     */
    projectByAddress: async (
      _: any,
      { contractAddress }: { contractAddress: string },
      context: Context
    ) => {
      try {
        // First try to find in presales
        const presale = await ProjectService.getConfirmedProjectByAddress(contractAddress);
        if (presale) {
          return {
            ...presale,
            type: 'presale',
            name: presale.name,
            tokenAddress: presale.saleToken,
            startTime: presale.presaleStart,
            endTime: presale.presaleEnd,
            status: 'Active', // This would need to be calculated based on current time
            creator: presale.userId,
            saleToken: {
              id: presale.saleToken,
              name: presale.name,
              symbol: 'TOKEN', // Would need to be fetched from contract
              address: presale.saleToken
            },
            totalRaised: '0', // Would need to be fetched from contract
            totalParticipants: 0, // Would need to be fetched from contract
            createdAt: presale.createdAt.toISOString()
          };
        }

        // If not found in presales, try fairlaunches
        const fairlaunch = await FairlaunchService.getConfirmedFairlaunchByAddress(contractAddress);
        if (fairlaunch) {
          return {
            ...fairlaunch,
            type: 'fairlaunch',
            name: fairlaunch.name,
            tokenAddress: fairlaunch.saleToken,
            startTime: fairlaunch.fairlaunchStart,
            endTime: fairlaunch.fairlaunchEnd,
            status: 'Active', // This would need to be calculated based on current time
            creator: fairlaunch.userId,
            saleToken: {
              id: fairlaunch.saleToken,
              name: fairlaunch.name,
              symbol: 'TOKEN', // Would need to be fetched from contract
              address: fairlaunch.saleToken
            },
            totalRaised: '0', // Would need to be fetched from contract
            totalParticipants: 0, // Would need to be fetched from contract
            createdAt: fairlaunch.createdAt.toISOString()
          };
        }

        return null; // Project not found in either table
      } catch (error) {
        console.error('Error fetching project by address:', error);
        throw new Error('Failed to fetch project by address');
      }
    }
  }
};
