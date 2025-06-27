import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { PrismaClient } from '@prisma/client';

const launchpadClient = getGraphQLClient('launchpad');
const prisma = new PrismaClient();

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
      const data = await launchpadClient.request(query);

      // Combine presales and fairlaunches into a unified projects list
      const projects = [
        ...(data.presales || []).map((presale: any) => ({
          ...presale,
          type: 'presale',
          name: presale.saleToken?.name || 'Unknown Token',
          tokenAddress: presale.saleToken?.address || presale.address,
          startTime: presale.presaleStart,
          endTime: presale.presaleEnd
        })),
        ...(data.fairlaunches || []).map((fairlaunch: any) => ({
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
      const data = await launchpadClient.request(query, { id });

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
        },
        include: {
          user: true
        }
      });

      const recentFairlaunches = await prisma.fairlaunchProject.findMany({
        take: 3,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: true
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
        hardCap: project.type === 'presale' ? (project as any).hardCap : null,
        softCap: project.softCap,
        status: project.endTime > now ? 'Active' : 'Ended',
        type: project.type,
        creator: project.userId,
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

      // Calculate factory fees (simplified - using fixed values since we don't have real fee data)
      const tokenFactoryFees = 0; // Would need to be calculated from actual fee collection
      const presaleFactoryFees = totalPresales * 200000; // 200k KLC per presale
      const fairlaunchFactoryFees = totalFairlaunches * 200000; // 200k KLC per fairlaunch

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
