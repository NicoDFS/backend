import { ProjectService, ProjectDeploymentData } from '../../services/project';
import { verifyDeployment } from '../../services/launchpad/deploymentVerifier';

export const projectResolvers = {
  Query: {
    /**
     * Get all confirmed projects with pagination
     */
    confirmedProjects: async (
      _: unknown, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }
    ) => {
      try {
        const projects = await ProjectService.getConfirmedProjects(limit, offset);
        
        return projects.map(project => ({
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching confirmed projects:', error);
        throw new Error('Failed to fetch confirmed projects');
      }
    },

    /**
     * Get a specific confirmed project by ID
     */
    confirmedProject: async (
      _: unknown,
      { id }: { id: string }
    ) => {
      try {
        const project = await ProjectService.getConfirmedProject(id);

        if (!project) {
          return null;
        }

        return {
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('Error fetching confirmed project:', error);
        throw new Error('Failed to fetch confirmed project');
      }
    },

    /**
     * Get a specific confirmed project by contract address
     */
    confirmedProjectByAddress: async (
      _: unknown,
      { contractAddress }: { contractAddress: string }
    ) => {
      try {
        const project = await ProjectService.getConfirmedProjectByAddress(contractAddress);

        if (!project) {
          return null;
        }

        return {
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('Error fetching confirmed project by address:', error);
        throw new Error('Failed to fetch confirmed project by address');
      }
    },

    /**
     * Get confirmed projects deployed by a given address
     */
    projectsByOwner: async (
      _: unknown,
      { ownerAddress, limit = 10, offset = 0 }: { ownerAddress: string; limit?: number; offset?: number }
    ) => {
      try {
        const projects = await ProjectService.getProjectsByOwner(ownerAddress, limit, offset);
        
        return projects.map(project => ({
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching projects by owner:', error);
        throw new Error('Failed to fetch projects by owner');
      }
    }
  },

  Mutation: {
    /**
     * Save project data after successful blockchain deployment
     * This is the ONLY way projects get saved to the database
     */
    saveProjectAfterDeployment: async (
      _: unknown,
      { input }: { input: Omit<ProjectDeploymentData, 'ownerAddress'> }
    ) => {
      try {
        // Validate required blockchain data
        if (!input.contractAddress || !input.transactionHash || !input.blockNumber) {
          throw new Error('Blockchain confirmation required: contractAddress, transactionHash, and blockNumber must be provided');
        }

        // Ownership is the deployer of the on-chain tx — nothing else vouches for it
        const { ownerAddress } = await verifyDeployment(input);
        const projectData: ProjectDeploymentData = { ...input, ownerAddress };

        // Validate required project data
        if (!projectData.name || !projectData.description || !projectData.saleToken || !projectData.baseToken) {
          throw new Error('Required project fields are missing');
        }

        // Save the confirmed project
        const project = await ProjectService.saveConfirmedProject(projectData);

        console.log(`✅ Project saved for ${ownerAddress}: ${project.name} (${project.contractAddress})`);

        return {
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
        };
      } catch (error) {
        console.error('Error saving project after deployment:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          throw new Error(`Failed to save project: ${error.message}`);
        }
        
        throw new Error('Failed to save project after deployment');
      }
    }
  },
};
