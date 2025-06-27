import { Context } from '../context';
import { ProjectService, ProjectDeploymentData } from '../../services/project';

export const projectResolvers = {
  Query: {
    /**
     * Get all confirmed projects with pagination
     */
    confirmedProjects: async (
      _: any, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }, 
      context: Context
    ) => {
      try {
        const projects = await ProjectService.getConfirmedProjects(limit, offset);
        
        return projects.map(project => ({
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
          user: { id: project.userId } // Will be resolved by User resolver
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
      _: any,
      { id }: { id: string },
      context: Context
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
          user: { id: project.userId } // Will be resolved by User resolver
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
      _: any,
      { contractAddress }: { contractAddress: string },
      context: Context
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
          user: { id: project.userId } // Will be resolved by User resolver
        };
      } catch (error) {
        console.error('Error fetching confirmed project by address:', error);
        throw new Error('Failed to fetch confirmed project by address');
      }
    },

    /**
     * Get confirmed projects for the authenticated user
     */
    myConfirmedProjects: async (
      _: any, 
      { limit = 10, offset = 0 }: { limit?: number; offset?: number }, 
      context: Context
    ) => {
      try {
        // Check if user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const projects = await ProjectService.getUserConfirmedProjects(context.user.id, limit, offset);
        
        return projects.map(project => ({
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
          user: { id: project.userId } // Will be resolved by User resolver
        }));
      } catch (error) {
        console.error('Error fetching user confirmed projects:', error);
        throw new Error('Failed to fetch user confirmed projects');
      }
    }
  },

  Mutation: {
    /**
     * Save project data after successful blockchain deployment
     * This is the ONLY way projects get saved to the database
     */
    saveProjectAfterDeployment: async (
      _: any,
      { input }: { input: ProjectDeploymentData },
      context: Context
    ) => {
      try {
        // Check if user is authenticated
        if (!context.user) {
          throw new Error('Authentication required to create presales. Please login to your account.');
        }

        // Add user ID to the input data
        const projectData: ProjectDeploymentData = {
          ...input,
          userId: context.user.id
        };

        // Validate required blockchain data
        if (!projectData.contractAddress || !projectData.transactionHash || !projectData.blockNumber) {
          throw new Error('Blockchain confirmation required: contractAddress, transactionHash, and blockNumber must be provided');
        }

        // Validate required project data
        if (!projectData.name || !projectData.description || !projectData.saleToken || !projectData.baseToken) {
          throw new Error('Required project fields are missing');
        }

        // Save the confirmed project
        const project = await ProjectService.saveConfirmedProject(projectData);

        console.log(`✅ Project saved for user ${context.user.username}: ${project.name} (${project.contractAddress})`);

        return {
          ...project,
          presaleStart: project.presaleStart.toISOString(),
          presaleEnd: project.presaleEnd.toISOString(),
          deployedAt: project.deployedAt.toISOString(),
          createdAt: project.createdAt.toISOString(),
          user: { id: project.userId } // Will be resolved by User resolver
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

  // Field resolvers
  Project: {
    /**
     * Resolve the user field for Project type
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
        console.error('Error resolving project user:', error);
        // Return minimal user data on error
        return { id: parent.userId };
      }
    }
  }
};
