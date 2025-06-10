import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FairlaunchDeploymentData {
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

  // Fairlaunch Configuration (from form)
  saleToken: string;
  baseToken: string;
  buybackRate: string;
  sellingAmount: string;
  softCap: string;
  liquidityPercent: string;
  fairlaunchStart: string; // ISO string, will be converted to DateTime
  fairlaunchEnd: string;   // ISO string, will be converted to DateTime
  isWhitelist: boolean;
  referrer?: string;

  // Required Blockchain Data
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;

  // User ID (added by resolver)
  userId: string;
}

// Type for database operations
type FairlaunchProject = {
  id: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  whitepaperUrl: string | null;
  githubUrl: string | null;
  discordUrl: string | null;
  telegramUrl: string | null;
  twitterUrl: string | null;
  additionalSocialUrl: string | null;
  saleToken: string;
  baseToken: string;
  buybackRate: string;
  sellingAmount: string;
  softCap: string;
  liquidityPercent: string;
  fairlaunchStart: Date;
  fairlaunchEnd: Date;
  isWhitelist: boolean;
  referrer: string | null;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  deployedAt: Date;
  createdAt: Date;
  userId: string;
};

export const FairlaunchService = {
  /**
   * Save a fairlaunch project to database after successful blockchain deployment
   * This is the ONLY way fairlaunch projects get saved - blockchain-first approach
   */
  async saveConfirmedFairlaunch(data: FairlaunchDeploymentData): Promise<FairlaunchProject> {
    try {
      // Validate required blockchain data
      if (!data.contractAddress || !data.transactionHash || !data.blockNumber) {
        throw new Error('Blockchain data is required: contractAddress, transactionHash, and blockNumber');
      }

      // Validate required project data
      if (!data.name || !data.description || !data.saleToken || !data.baseToken) {
        throw new Error('Required fairlaunch project fields are missing');
      }

      // Validate required fairlaunch configuration
      if (!data.buybackRate || !data.sellingAmount || !data.softCap) {
        throw new Error('Required fairlaunch configuration fields are missing');
      }

      // Check if fairlaunch project already exists (prevent duplicates)
      const existingByContract = await prisma.fairlaunchProject.findUnique({
        where: { contractAddress: data.contractAddress }
      });

      if (existingByContract) {
        throw new Error(`Fairlaunch project with contract address ${data.contractAddress} already exists`);
      }

      const existingByTx = await prisma.fairlaunchProject.findUnique({
        where: { transactionHash: data.transactionHash }
      });

      if (existingByTx) {
        throw new Error(`Fairlaunch project with transaction hash ${data.transactionHash} already exists`);
      }

      // Parse dates
      const fairlaunchStart = new Date(data.fairlaunchStart);
      const fairlaunchEnd = new Date(data.fairlaunchEnd);
      const deployedAt = new Date(); // Current timestamp when saving to DB

      // Validate dates
      if (isNaN(fairlaunchStart.getTime()) || isNaN(fairlaunchEnd.getTime())) {
        throw new Error('Invalid fairlaunch start or end date format');
      }

      // Create fairlaunch project in database
      const fairlaunchProject = await prisma.fairlaunchProject.create({
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

          // Fairlaunch Configuration
          saleToken: data.saleToken,
          baseToken: data.baseToken,
          buybackRate: data.buybackRate,
          sellingAmount: data.sellingAmount,
          softCap: data.softCap,
          liquidityPercent: data.liquidityPercent,
          fairlaunchStart,
          fairlaunchEnd,
          isWhitelist: data.isWhitelist,
          referrer: data.referrer || null,

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

      console.log(`✅ Fairlaunch project saved to database: ${fairlaunchProject.name} (${fairlaunchProject.contractAddress})`);
      return fairlaunchProject;
    } catch (error) {
      console.error('❌ Error saving fairlaunch project to database:', error);
      throw error;
    }
  },

  /**
   * Get all confirmed fairlaunch projects with pagination
   */
  async getConfirmedFairlaunches(limit: number = 10, offset: number = 0): Promise<FairlaunchProject[]> {
    try {
      const fairlaunches = await prisma.fairlaunchProject.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: true
        }
      });

      return fairlaunches.map(fairlaunch => ({
        id: fairlaunch.id,
        name: fairlaunch.name,
        description: fairlaunch.description,
        websiteUrl: fairlaunch.websiteUrl,
        whitepaperUrl: fairlaunch.whitepaperUrl,
        githubUrl: fairlaunch.githubUrl,
        discordUrl: fairlaunch.discordUrl,
        telegramUrl: fairlaunch.telegramUrl,
        twitterUrl: fairlaunch.twitterUrl,
        additionalSocialUrl: fairlaunch.additionalSocialUrl,
        saleToken: fairlaunch.saleToken,
        baseToken: fairlaunch.baseToken,
        buybackRate: fairlaunch.buybackRate,
        sellingAmount: fairlaunch.sellingAmount,
        softCap: fairlaunch.softCap,
        liquidityPercent: fairlaunch.liquidityPercent,
        fairlaunchStart: fairlaunch.fairlaunchStart,
        fairlaunchEnd: fairlaunch.fairlaunchEnd,
        isWhitelist: fairlaunch.isWhitelist,
        referrer: fairlaunch.referrer,
        contractAddress: fairlaunch.contractAddress,
        transactionHash: fairlaunch.transactionHash,
        blockNumber: fairlaunch.blockNumber,
        deployedAt: fairlaunch.deployedAt,
        createdAt: fairlaunch.createdAt,
        userId: fairlaunch.userId
      }));
    } catch (error) {
      console.error('❌ Error fetching confirmed fairlaunch projects:', error);
      throw error;
    }
  },

  /**
   * Get a specific confirmed fairlaunch project by ID
   */
  async getConfirmedFairlaunch(id: string): Promise<FairlaunchProject | null> {
    try {
      const fairlaunch = await prisma.fairlaunchProject.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!fairlaunch) {
        return null;
      }

      return {
        id: fairlaunch.id,
        name: fairlaunch.name,
        description: fairlaunch.description,
        websiteUrl: fairlaunch.websiteUrl,
        whitepaperUrl: fairlaunch.whitepaperUrl,
        githubUrl: fairlaunch.githubUrl,
        discordUrl: fairlaunch.discordUrl,
        telegramUrl: fairlaunch.telegramUrl,
        twitterUrl: fairlaunch.twitterUrl,
        additionalSocialUrl: fairlaunch.additionalSocialUrl,
        saleToken: fairlaunch.saleToken,
        baseToken: fairlaunch.baseToken,
        buybackRate: fairlaunch.buybackRate,
        sellingAmount: fairlaunch.sellingAmount,
        softCap: fairlaunch.softCap,
        liquidityPercent: fairlaunch.liquidityPercent,
        fairlaunchStart: fairlaunch.fairlaunchStart,
        fairlaunchEnd: fairlaunch.fairlaunchEnd,
        isWhitelist: fairlaunch.isWhitelist,
        referrer: fairlaunch.referrer,
        contractAddress: fairlaunch.contractAddress,
        transactionHash: fairlaunch.transactionHash,
        blockNumber: fairlaunch.blockNumber,
        deployedAt: fairlaunch.deployedAt,
        createdAt: fairlaunch.createdAt,
        userId: fairlaunch.userId
      };
    } catch (error) {
      console.error('❌ Error fetching fairlaunch project:', error);
      throw error;
    }
  },

  /**
   * Get confirmed fairlaunch projects for a specific user
   */
  async getUserConfirmedFairlaunches(userId: string, limit: number = 10, offset: number = 0): Promise<FairlaunchProject[]> {
    try {
      const fairlaunches = await prisma.fairlaunchProject.findMany({
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

      return fairlaunches.map(fairlaunch => ({
        id: fairlaunch.id,
        name: fairlaunch.name,
        description: fairlaunch.description,
        websiteUrl: fairlaunch.websiteUrl,
        whitepaperUrl: fairlaunch.whitepaperUrl,
        githubUrl: fairlaunch.githubUrl,
        discordUrl: fairlaunch.discordUrl,
        telegramUrl: fairlaunch.telegramUrl,
        twitterUrl: fairlaunch.twitterUrl,
        additionalSocialUrl: fairlaunch.additionalSocialUrl,
        saleToken: fairlaunch.saleToken,
        baseToken: fairlaunch.baseToken,
        buybackRate: fairlaunch.buybackRate,
        sellingAmount: fairlaunch.sellingAmount,
        softCap: fairlaunch.softCap,
        liquidityPercent: fairlaunch.liquidityPercent,
        fairlaunchStart: fairlaunch.fairlaunchStart,
        fairlaunchEnd: fairlaunch.fairlaunchEnd,
        isWhitelist: fairlaunch.isWhitelist,
        referrer: fairlaunch.referrer,
        contractAddress: fairlaunch.contractAddress,
        transactionHash: fairlaunch.transactionHash,
        blockNumber: fairlaunch.blockNumber,
        deployedAt: fairlaunch.deployedAt,
        createdAt: fairlaunch.createdAt,
        userId: fairlaunch.userId
      }));
    } catch (error) {
      console.error('❌ Error fetching user fairlaunch projects:', error);
      throw error;
    }
  }
};
