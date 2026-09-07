import { FairlaunchService, FairlaunchDeploymentData } from '../../services/fairlaunch';
import { verifyDeployment } from '../../services/launchpad/deploymentVerifier';

export const fairlaunchResolvers = {
  Query: {
    /**
     * Get all confirmed fairlaunch projects with pagination
     */
    confirmedFairlaunches: async (
      _: unknown, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }
    ) => {
      try {
        const fairlaunches = await FairlaunchService.getConfirmedFairlaunches(limit, offset);
        
        return fairlaunches.map(fairlaunch => ({
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
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
      _: unknown, 
      { id }: { id: string }
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
      _: unknown,
      { contractAddress }: { contractAddress: string }
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
        };
      } catch (error) {
        console.error('Error fetching fairlaunch project by address:', error);
        throw new Error('Failed to fetch fairlaunch project by address');
      }
    },

    /**
     * Get confirmed fairlaunch projects deployed by a given address
     */
    fairlaunchesByOwner: async (
      _: unknown,
      { ownerAddress, limit = 10, offset = 0 }: { ownerAddress: string; limit?: number; offset?: number }
    ) => {
      try {
        const fairlaunches = await FairlaunchService.getFairlaunchesByOwner(ownerAddress, limit, offset);
        
        return fairlaunches.map(fairlaunch => ({
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching fairlaunches by owner:', error);
        throw new Error('Failed to fetch fairlaunches by owner');
      }
    }
  },

  Mutation: {
    /**
     * Save fairlaunch project data after successful blockchain deployment
     * This is the ONLY way fairlaunch projects get saved to the database
     */
    saveFairlaunchAfterDeployment: async (
      _: unknown, 
      { input }: { input: Omit<FairlaunchDeploymentData, 'ownerAddress'> }
    ) => {
      try {
        // Validate required blockchain data
        if (!input.contractAddress || !input.transactionHash || !input.blockNumber) {
          throw new Error('Blockchain confirmation required: contractAddress, transactionHash, and blockNumber must be provided');
        }

        // Ownership is the deployer of the on-chain tx — nothing else vouches for it
        const { ownerAddress } = await verifyDeployment(input);
        const fairlaunchData: FairlaunchDeploymentData = { ...input, ownerAddress };

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

        console.log(`✅ Fairlaunch project saved for ${ownerAddress}: ${fairlaunch.name} (${fairlaunch.contractAddress})`);

        return {
          ...fairlaunch,
          fairlaunchStart: fairlaunch.fairlaunchStart.toISOString(),
          fairlaunchEnd: fairlaunch.fairlaunchEnd.toISOString(),
          deployedAt: fairlaunch.deployedAt.toISOString(),
          createdAt: fairlaunch.createdAt.toISOString(),
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
};
