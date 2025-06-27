import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProjectDeploymentData {
  // Project Information (from form)
  name: string;
  description: string;
  websiteUrl?: string;
  whitepaperUrl?: string;
  githubUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  additionalSocialUrl?: string;

  // Presale Configuration (from form)
  saleToken: string;
  baseToken: string;
  tokenRate: string;
  liquidityRate: string;
  minContribution?: string;
  maxContribution?: string;
  softCap: string;
  hardCap: string;
  liquidityPercent: string;
  presaleStart: string; // ISO string, will be converted to DateTime
  presaleEnd: string;   // ISO string, will be converted to DateTime
  lpLockDuration: string;
  lpRecipient?: string;

  // Required Blockchain Data
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  
  // User context
  userId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  whitepaperUrl?: string;
  githubUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  additionalSocialUrl?: string;
  saleToken: string;
  baseToken: string;
  tokenRate: string;
  liquidityRate: string;
  minContribution?: string;
  maxContribution?: string;
  softCap: string;
  hardCap: string;
  liquidityPercent: string;
  presaleStart: Date;
  presaleEnd: Date;
  lpLockDuration: string;
  lpRecipient?: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: Date;
  createdAt: Date;
  userId: string;
}

export const ProjectService = {
  /**
   * Save a project to database after successful blockchain deployment
   * This is the ONLY way projects get saved - blockchain-first approach
   */
  async saveConfirmedProject(data: ProjectDeploymentData): Promise<Project> {
    try {
      // Validate required blockchain data
      if (!data.contractAddress || !data.transactionHash || !data.blockNumber) {
        throw new Error('Blockchain data is required: contractAddress, transactionHash, and blockNumber');
      }

      // Validate required project data
      if (!data.name || !data.description || !data.saleToken || !data.baseToken) {
        throw new Error('Required project fields are missing');
      }



      // Check if project with this contract address or transaction hash already exists
      const existingProject = await prisma.project.findFirst({
        where: {
          OR: [
            { contractAddress: data.contractAddress },
            { transactionHash: data.transactionHash }
          ]
        }
      });

      if (existingProject) {
        throw new Error('Project with this contract address or transaction hash already exists');
      }

      // Convert date strings to Date objects
      const presaleStart = new Date(data.presaleStart);
      const presaleEnd = new Date(data.presaleEnd);
      const deployedAt = new Date(); // Current timestamp when saving

      // Validate dates
      if (isNaN(presaleStart.getTime()) || isNaN(presaleEnd.getTime())) {
        throw new Error('Invalid date format for presale start or end time');
      }

      // Create the project in database
      const project = await prisma.project.create({
        data: {
          // Project Information
          name: data.name,
          description: data.description,
          websiteUrl: data.websiteUrl || null,
          whitepaperUrl: data.whitepaperUrl || null,
          githubUrl: data.githubUrl || null,
          discordUrl: data.discordUrl || null,
          telegramUrl: data.telegramUrl || null,
          twitterUrl: data.twitterUrl || null,
          additionalSocialUrl: data.additionalSocialUrl || null,

          // Presale Configuration
          saleToken: data.saleToken,
          baseToken: data.baseToken,
          tokenRate: data.tokenRate,
          liquidityRate: data.liquidityRate,
          minContribution: data.minContribution || null,
          maxContribution: data.maxContribution || null,
          softCap: data.softCap,
          hardCap: data.hardCap,
          liquidityPercent: data.liquidityPercent,
          presaleStart,
          presaleEnd,
          lpLockDuration: data.lpLockDuration,
          lpRecipient: data.lpRecipient || null,

          // Blockchain Data
          contractAddress: data.contractAddress,
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          deployedAt,

          // User relation
          userId: data.userId
        },
        include: {
          user: true
        }
      });

      console.log(`✅ Project saved to database: ${project.name} (${project.contractAddress})`);
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        websiteUrl: project.websiteUrl || undefined,
        whitepaperUrl: project.whitepaperUrl || undefined,
        githubUrl: project.githubUrl || undefined,
        discordUrl: project.discordUrl || undefined,
        telegramUrl: project.telegramUrl || undefined,
        twitterUrl: project.twitterUrl || undefined,
        additionalSocialUrl: project.additionalSocialUrl || undefined,
        saleToken: project.saleToken,
        baseToken: project.baseToken,
        tokenRate: project.tokenRate,
        liquidityRate: project.liquidityRate,
        minContribution: project.minContribution || undefined,
        maxContribution: project.maxContribution || undefined,
        softCap: project.softCap,
        hardCap: project.hardCap,
        liquidityPercent: project.liquidityPercent,
        presaleStart: project.presaleStart,
        presaleEnd: project.presaleEnd,
        lpLockDuration: project.lpLockDuration,
        lpRecipient: project.lpRecipient || undefined,
        contractAddress: project.contractAddress,
        transactionHash: project.transactionHash,
        blockNumber: project.blockNumber,
        deployedAt: project.deployedAt,
        createdAt: project.createdAt,
        userId: project.userId
      };
    } catch (error) {
      console.error('❌ Error saving confirmed project:', error);
      throw error;
    }
  },

  /**
   * Get confirmed projects (read-only operations)
   */
  async getConfirmedProjects(limit: number = 10, offset: number = 0): Promise<Project[]> {
    try {
      const projects = await prisma.project.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: true
        }
      });

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        websiteUrl: project.websiteUrl || undefined,
        whitepaperUrl: project.whitepaperUrl || undefined,
        githubUrl: project.githubUrl || undefined,
        discordUrl: project.discordUrl || undefined,
        telegramUrl: project.telegramUrl || undefined,
        twitterUrl: project.twitterUrl || undefined,
        additionalSocialUrl: project.additionalSocialUrl || undefined,
        saleToken: project.saleToken,
        baseToken: project.baseToken,
        tokenRate: project.tokenRate,
        liquidityRate: project.liquidityRate,
        minContribution: project.minContribution || undefined,
        maxContribution: project.maxContribution || undefined,
        softCap: project.softCap,
        hardCap: project.hardCap,
        liquidityPercent: project.liquidityPercent,
        presaleStart: project.presaleStart,
        presaleEnd: project.presaleEnd,
        lpLockDuration: project.lpLockDuration,
        lpRecipient: project.lpRecipient || undefined,
        contractAddress: project.contractAddress,
        transactionHash: project.transactionHash,
        blockNumber: project.blockNumber,
        deployedAt: project.deployedAt,
        createdAt: project.createdAt,
        userId: project.userId
      }));
    } catch (error) {
      console.error('❌ Error fetching confirmed projects:', error);
      throw error;
    }
  },

  /**
   * Get a specific confirmed project by ID
   */
  async getConfirmedProject(id: string): Promise<Project | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!project) {
        return null;
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        websiteUrl: project.websiteUrl || undefined,
        whitepaperUrl: project.whitepaperUrl || undefined,
        githubUrl: project.githubUrl || undefined,
        discordUrl: project.discordUrl || undefined,
        telegramUrl: project.telegramUrl || undefined,
        twitterUrl: project.twitterUrl || undefined,
        additionalSocialUrl: project.additionalSocialUrl || undefined,
        saleToken: project.saleToken,
        baseToken: project.baseToken,
        tokenRate: project.tokenRate,
        liquidityRate: project.liquidityRate,
        minContribution: project.minContribution || undefined,
        maxContribution: project.maxContribution || undefined,
        softCap: project.softCap,
        hardCap: project.hardCap,
        liquidityPercent: project.liquidityPercent,
        presaleStart: project.presaleStart,
        presaleEnd: project.presaleEnd,
        lpLockDuration: project.lpLockDuration,
        lpRecipient: project.lpRecipient || undefined,
        contractAddress: project.contractAddress,
        transactionHash: project.transactionHash,
        blockNumber: project.blockNumber,
        deployedAt: project.deployedAt,
        createdAt: project.createdAt,
        userId: project.userId
      };
    } catch (error) {
      console.error('❌ Error fetching confirmed project:', error);
      throw error;
    }
  },

  /**
   * Get a specific confirmed project by contract address
   */
  async getConfirmedProjectByAddress(contractAddress: string): Promise<Project | null> {
    try {
      const project = await prisma.project.findFirst({
        where: { contractAddress },
        include: {
          user: true
        }
      });

      if (!project) {
        return null;
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        websiteUrl: project.websiteUrl || undefined,
        whitepaperUrl: project.whitepaperUrl || undefined,
        githubUrl: project.githubUrl || undefined,
        discordUrl: project.discordUrl || undefined,
        telegramUrl: project.telegramUrl || undefined,
        twitterUrl: project.twitterUrl || undefined,
        additionalSocialUrl: project.additionalSocialUrl || undefined,
        saleToken: project.saleToken,
        baseToken: project.baseToken,
        tokenRate: project.tokenRate,
        liquidityRate: project.liquidityRate,
        minContribution: project.minContribution || undefined,
        maxContribution: project.maxContribution || undefined,
        softCap: project.softCap,
        hardCap: project.hardCap,
        liquidityPercent: project.liquidityPercent,
        presaleStart: project.presaleStart,
        presaleEnd: project.presaleEnd,
        lpLockDuration: project.lpLockDuration,
        lpRecipient: project.lpRecipient || undefined,
        contractAddress: project.contractAddress,
        transactionHash: project.transactionHash,
        blockNumber: project.blockNumber,
        deployedAt: project.deployedAt,
        createdAt: project.createdAt,
        userId: project.userId
      };
    } catch (error) {
      console.error('❌ Error fetching confirmed project by address:', error);
      throw error;
    }
  },

  /**
   * Get confirmed projects for a specific user
   */
  async getUserConfirmedProjects(userId: string, limit: number = 10, offset: number = 0): Promise<Project[]> {
    try {
      const projects = await prisma.project.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: true
        }
      });

      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        websiteUrl: project.websiteUrl || undefined,
        whitepaperUrl: project.whitepaperUrl || undefined,
        githubUrl: project.githubUrl || undefined,
        discordUrl: project.discordUrl || undefined,
        telegramUrl: project.telegramUrl || undefined,
        twitterUrl: project.twitterUrl || undefined,
        additionalSocialUrl: project.additionalSocialUrl || undefined,
        saleToken: project.saleToken,
        baseToken: project.baseToken,
        tokenRate: project.tokenRate,
        liquidityRate: project.liquidityRate,
        minContribution: project.minContribution || undefined,
        maxContribution: project.maxContribution || undefined,
        softCap: project.softCap,
        hardCap: project.hardCap,
        liquidityPercent: project.liquidityPercent,
        presaleStart: project.presaleStart,
        presaleEnd: project.presaleEnd,
        lpLockDuration: project.lpLockDuration,
        lpRecipient: project.lpRecipient || undefined,
        contractAddress: project.contractAddress,
        transactionHash: project.transactionHash,
        blockNumber: project.blockNumber,
        deployedAt: project.deployedAt,
        createdAt: project.createdAt,
        userId: project.userId
      }));
    } catch (error) {
      console.error('❌ Error fetching user confirmed projects:', error);
      throw error;
    }
  }
};
