import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';
import { KALYCHAIN_CONTRACTS } from '../../config/chain';

const launchpadClient = getGraphQLClient('launchpad');

// A presale/fairlaunch row from the launchpad subgraph. Only the fields the service
// reads are named; the rest are passed through to the GraphQL layer untouched.
interface SubgraphLaunch {
  id: string;
  address?: string;
  saleToken?: { id: string; name: string; symbol: string; address: string } | null;
  presaleStart?: string;
  presaleEnd?: string;
  [field: string]: unknown;
}
const prisma = new PrismaClient();

const FLAT_FEE_ABI = ['function flatFee() view returns (uint256)'];

/** Flat creation fee of each sale factory in whole KMT, read on-chain (boss adjusts via setFlatFee). 0 if the read fails. */
async function readFactoryFlatFees(): Promise<[number, number]> {
  const provider = getProvider();
  const read = async (address: string): Promise<number> => {
    try {
      const fee = await new ethers.Contract(address, FLAT_FEE_ABI, provider).flatFee();
      return Number(ethers.utils.formatEther(fee));
    } catch (error) {
      console.error(`Failed to read flatFee from ${address}:`, error);
      return 0;
    }
  };
  return Promise.all([read(KALYCHAIN_CONTRACTS.PRESALE_V3_FACTORY), read(KALYCHAIN_CONTRACTS.FAIRLAUNCH_V3_FACTORY)]);
}

export const LaunchpadService = {
  async getLaunchpadProjects() {
    const query = gql`
      query {
        presales(first: 100, orderBy: createdAt, orderDirection: desc) {
          id
          address
          creator
          saleToken {
            id
            name
            symbol
            address
          }
          baseToken
          presaleRate
          listingRate
          softCap
          hardCap
          liquidityPercent
          presaleStart
          presaleEnd
          status
          totalRaised
          totalParticipants
          createdAt
          blockNumber
          transactionHash
        }
        fairlaunches(first: 100, orderBy: createdAt, orderDirection: desc) {
          id
          address
          creator
          saleToken {
            id
            name
            symbol
            address
          }
          baseToken
          softCap
          maxSpendPerBuyer
          liquidityPercent
          presaleStart
          presaleEnd
          status
          totalRaised
          totalParticipants
          createdAt
          blockNumber
          transactionHash
        }
      }
    `;

    try {
      const data = await launchpadClient.request<{ presales?: SubgraphLaunch[]; fairlaunches?: SubgraphLaunch[] }>(query);

      // Combine presales and fairlaunches into a unified projects list
      const projects = [
        ...(data.presales || []).map((presale) => ({
          ...presale,
          type: 'presale',
          name: presale.saleToken?.name || 'Unknown Token',
          tokenAddress: presale.saleToken?.address || presale.address,
          startTime: presale.presaleStart,
          endTime: presale.presaleEnd
        })),
        ...(data.fairlaunches || []).map((fairlaunch) => ({
          ...fairlaunch,
          type: 'fairlaunch',
          name: fairlaunch.saleToken?.name || 'Unknown Token',
          tokenAddress: fairlaunch.saleToken?.address || fairlaunch.address,
          startTime: fairlaunch.presaleStart,
          endTime: fairlaunch.presaleEnd
        }))
      ];

      return projects;
    } catch (error) {
      console.error('Error fetching launchpad projects:', error);
      return [];
    }
  },

  async getLaunchpadProject(id: string) {
    const query = gql`
      query getLaunchpadProject($id: ID!) {
        presale(id: $id) {
          id
          address
          creator
          saleToken {
            id
            name
            symbol
            address
          }
          baseToken
          presaleRate
          listingRate
          softCap
          hardCap
          liquidityPercent
          presaleStart
          presaleEnd
          status
          totalRaised
          totalParticipants
          createdAt
          blockNumber
          transactionHash
        }
        fairlaunch(id: $id) {
          id
          address
          creator
          saleToken {
            id
            name
            symbol
            address
          }
          baseToken
          softCap
          maxSpendPerBuyer
          liquidityPercent
          presaleStart
          presaleEnd
          status
          totalRaised
          totalParticipants
          createdAt
          blockNumber
          transactionHash
        }
      }
    `;

    try {
      const data = await launchpadClient.request<{ presale?: SubgraphLaunch | null; fairlaunch?: SubgraphLaunch | null }>(query, { id });

      // Return either presale or fairlaunch data
      const project = data.presale || data.fairlaunch;
      if (project) {
        return {
          ...project,
          type: data.presale ? 'presale' : 'fairlaunch',
          name: project.saleToken?.name || 'Unknown Token',
          tokenAddress: project.saleToken?.address || project.address,
          startTime: project.presaleStart,
          endTime: project.presaleEnd
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching launchpad project ${id}:`, error);
      return null;
    }
  },

  async getLaunchpadOverview() {
    try {
      // Get database counts instead of subgraph data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Count total projects
      const totalPresales = await prisma.project.count();
      const totalFairlaunches = await prisma.fairlaunchProject.count();
      const totalProjects = totalPresales + totalFairlaunches;

      // Count active projects (end date > now)
      const activePresales = await prisma.project.count({
        where: {
          presaleEnd: {
            gt: now
          }
        }
      });

      const activeFairlaunches = await prisma.fairlaunchProject.count({
        where: {
          fairlaunchEnd: {
            gt: now
          }
        }
      });

      const activeProjects = activePresales + activeFairlaunches;

      // Count completed projects (end date < now)
      const completedPresales = await prisma.project.count({
        where: {
          presaleEnd: {
            lt: now
          }
        }
      });

      const completedFairlaunches = await prisma.fairlaunchProject.count({
        where: {
          fairlaunchEnd: {
            lt: now
          }
        }
      });

      const completedProjects = completedPresales + completedFairlaunches;

      // Count this month's projects
      const thisMonthPresales = await prisma.project.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      });

      const thisMonthFairlaunches = await prisma.fairlaunchProject.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      });

      const thisMonthProjects = thisMonthPresales + thisMonthFairlaunches;

      // Get recent projects from both tables
      const recentPresales = await prisma.project.findMany({
        take: 3,
        orderBy: {
          createdAt: 'desc'
        }
      });

      const recentFairlaunches = await prisma.fairlaunchProject.findMany({
        take: 3,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Combine and sort recent projects
      const allRecentProjects = [
        ...recentPresales.map(p => ({
          ...p,
          type: 'presale',
          startTime: p.presaleStart,
          endTime: p.presaleEnd
        })),
        ...recentFairlaunches.map(f => ({
          ...f,
          type: 'fairlaunch',
          startTime: f.fairlaunchStart,
          endTime: f.fairlaunchEnd
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

      // Map recent projects to expected format
      const recentProjects = allRecentProjects.map(project => ({
        id: project.id,
        name: project.name,
        tokenAddress: project.saleToken,
        startTime: project.startTime.toISOString(),
        endTime: project.endTime.toISOString(),
        hardCap: 'hardCap' in project ? project.hardCap : null,
        softCap: project.softCap,
        status: project.endTime > now ? 'Active' : 'Ended',
        type: project.type,
        creator: project.ownerAddress,
        saleToken: {
          id: project.saleToken,
          name: project.name,
          symbol: 'TOKEN', // Would need to be fetched from contract
          address: project.saleToken
        },
        totalRaised: '0', // Would need to be fetched from contract
        totalParticipants: 0, // Would need to be fetched from contract
        createdAt: project.createdAt.toISOString()
      }));

      // Creation fees collected so far = sales created x the factory's current flat fee (KMT)
      const [presaleFlatFee, fairlaunchFlatFee] = await readFactoryFlatFees();
      const tokenFactoryFees = 0; // Would need to be calculated from actual fee collection
      const presaleFactoryFees = totalPresales * presaleFlatFee;
      const fairlaunchFactoryFees = totalFairlaunches * fairlaunchFlatFee;

      const overview = {
        totalProjects,
        activeProjects,
        totalTokensCreated: completedProjects, // Using completed projects instead
        totalFundsRaised: thisMonthProjects.toString(), // Using this month's projects instead
        totalParticipants: thisMonthProjects, // Using this month's projects instead
        totalFeesCollected: (tokenFactoryFees + presaleFactoryFees + fairlaunchFactoryFees).toString(),
        factoryFees: {
          tokenFactory: tokenFactoryFees.toString(),
          presaleFactory: presaleFactoryFees.toString(),
          fairlaunchFactory: fairlaunchFactoryFees.toString()
        },
        recentProjects,
        lastUpdated: Date.now().toString()
      };

      return overview;
    } catch (error) {
      console.error('Error fetching launchpad overview:', error);

      // Return empty data structure with proper error handling
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalTokensCreated: 0, // Completed projects
        totalFundsRaised: '0', // This month's projects
        totalParticipants: 0, // This month's projects
        totalFeesCollected: '0',
        factoryFees: {
          tokenFactory: '0',
          presaleFactory: '0',
          fairlaunchFactory: '0'
        },
        recentProjects: [],
        lastUpdated: Date.now().toString(),
        error: 'Failed to fetch data from database'
      };
    }
  }
};
