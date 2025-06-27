import { FairlaunchService, FairlaunchDeploymentData } from '../../services/fairlaunch';
import { Context } from '../context';

export const fairlaunchResolvers = {
  Query: {
    /**
     * Get all confirmed fairlaunch projects with pagination
     */
    confirmedFairlaunches: async (
      _: any, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }, 
      context: Context
    ) => {
      try {
        const fairlaunches = await FairlaunchService.getConfirmedFairlaunches(limit, offset);
        
        return fairlaunches.map(fairlaunch => ({
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
          user: { id: fairlaunch.userId } // Will be resolved by User resolver
        }));
      } catch (error) {
        console.error('Error fetching confirmed fairlaunch projects:', error);
        throw new Error('Failed to fetch confirmed fairlaunch projects');
      }
    },

    /**
     * Get a specific confirmed fairlaunch project by ID
     */
    confirmedFairlaunch: async (
      _: any, 
      { id }: { id: string }, 
      context: Context
    ) => {
      try {
        const fairlaunch = await FairlaunchService.getConfirmedFairlaunch(id);
        
        if (!fairlaunch) {
          return null;
        }

        return {
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
          user: { id: fairlaunch.userId } // Will be resolved by User resolver
        };
      } catch (error) {
        console.error('Error fetching fairlaunch project:', error);
        throw new Error('Failed to fetch fairlaunch project');
      }
    },

    /**
     * Get a specific confirmed fairlaunch project by contract address
     */
    confirmedFairlaunchByAddress: async (
      _: any,
      { contractAddress }: { contractAddress: string },
      context: Context
    ) => {
      try {
        const fairlaunch = await FairlaunchService.getConfirmedFairlaunchByAddress(contractAddress);

        if (!fairlaunch) {
          return null;
        }

        return {
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
          user: { id: fairlaunch.userId } // Will be resolved by User resolver
        };
      } catch (error) {
        console.error('Error fetching fairlaunch project by address:', error);
        throw new Error('Failed to fetch fairlaunch project by address');
      }
    },

    /**
     * Get confirmed fairlaunch projects for the authenticated user
     */
    myConfirmedFairlaunches: async (
      _: any, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }, 
      context: Context
    ) => {
      try {
        // Check if user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const fairlaunches = await FairlaunchService.getUserConfirmedFairlaunches(context.user.id, limit, offset);
        
        return fairlaunches.map(fairlaunch => ({
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
          user: { id: fairlaunch.userId } // Will be resolved by User resolver
        }));
      } catch (error) {
        console.error('Error fetching user fairlaunch projects:', error);
        throw new Error('Failed to fetch user fairlaunch projects');
      }
    }
  },

  Mutation: {
    /**
     * Save fairlaunch project data after successful blockchain deployment
     * This is the ONLY way fairlaunch projects get saved to the database
     */
    saveFairlaunchAfterDeployment: async (
      _: any, 
      { input }: { input: FairlaunchDeploymentData }, 
      context: Context
    ) => {
      try {
        // Check if user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Add user ID to the input data
        const fairlaunchData: FairlaunchDeploymentData = {
          ...input,
          userId: context.user.id
        };

        // Validate required blockchain data
        if (!fairlaunchData.contractAddress || !fairlaunchData.transactionHash || !fairlaunchData.blockNumber) {
          throw new Error('Blockchain confirmation required: contractAddress, transactionHash, and blockNumber must be provided');
        }

        // Validate required project data
        if (!fairlaunchData.name || !fairlaunchData.description || !fairlaunchData.saleToken || !fairlaunchData.baseToken) {
          throw new Error('Required fairlaunch project fields are missing');
        }

        // Validate required fairlaunch configuration
        if (!fairlaunchData.buybackRate || !fairlaunchData.sellingAmount || !fairlaunchData.softCap) {
          throw new Error('Required fairlaunch configuration fields are missing');
        }

        // Save the confirmed fairlaunch project
        const fairlaunch = await FairlaunchService.saveConfirmedFairlaunch(fairlaunchData);

        console.log(`✅ Fairlaunch project saved for user ${context.user.username}: ${fairlaunch.name} (${fairlaunch.contractAddress})`);

        return {
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
          user: { id: fairlaunch.userId } // Will be resolved by User resolver
        };
      } catch (error) {
        console.error('Error saving fairlaunch project after deployment:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          throw new Error(`Failed to save fairlaunch project: ${error.message}`);
        }
        
        throw new Error('Failed to save fairlaunch project');
      }
    }
  },

  // Field resolvers
  FairlaunchProject: {
    /**
     * Resolve the user field for FairlaunchProject type
     */
    user: async (parent: any, _: any, context: Context) => {
      try {
        // Use the existing user service to get user data
        if (context.userService) {
          return await context.userService.getUserById(parent.userId);
        }
        
        // Fallback: return minimal user data
        return { id: parent.userId };
      } catch (error) {
        console.error('Error resolving fairlaunch project user:', error);
        // Return minimal user data on error
        return { id: parent.userId };
      }
    }
  }
};
