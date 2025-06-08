import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const launchpadClient = getGraphQLClient('launchpad');

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
      const query = gql`
        query {
          launchpadStats(id: "1") {
            id
            totalTokensCreated
            totalPresalesCreated
            totalFairlaunchesCreated
            totalVolumeRaised
            totalParticipants
            activePresales
            activeFairlaunches
            lastUpdated
          }
          tokenFactories(first: 10) {
            id
            address
            factoryType
            feeTo
            flatFee
            totalTokensCreated
            createdAt
            updatedAt
          }
          presaleFactories(first: 10) {
            id
            address
            feeTo
            flatFee
            totalPresalesCreated
            createdAt
            updatedAt
          }
          fairlaunchFactories(first: 10) {
            id
            address
            feeTo
            flatFee
            totalFairlaunchesCreated
            createdAt
            updatedAt
          }
          tokens(first: 10, orderBy: createdAt, orderDirection: desc) {
            id
            address
            name
            symbol
            decimals
            totalSupply
            tokenType
            creator
            createdAt
          }
          presales(first: 5, orderBy: createdAt, orderDirection: desc) {
            id
            address
            creator
            saleToken {
              id
              name
              symbol
              address
            }
            softCap
            hardCap
            status
            totalRaised
            totalParticipants
            createdAt
          }
          fairlaunches(first: 5, orderBy: createdAt, orderDirection: desc) {
            id
            address
            creator
            saleToken {
              id
              name
              symbol
              address
            }
            softCap
            status
            totalRaised
            totalParticipants
            createdAt
          }
        }
      `;

      const data = await launchpadClient.request(query);

      // Process the data to create the overview
      const stats = data.launchpadStats || {
        totalTokensCreated: '0',
        totalPresalesCreated: '0',
        totalFairlaunchesCreated: '0',
        totalVolumeRaised: '0',
        totalParticipants: '0',
        activePresales: '0',
        activeFairlaunches: '0'
      };

      const totalProjects = parseInt(stats.totalPresalesCreated || '0') + parseInt(stats.totalFairlaunchesCreated || '0');
      const activeProjects = parseInt(stats.activePresales || '0') + parseInt(stats.activeFairlaunches || '0');

      // Calculate total fees from factories (placeholder calculation)
      const tokenFactoryFees = (data.tokenFactories || []).reduce((sum: number, factory: any) =>
        sum + parseFloat(factory.flatFee || '0'), 0);
      const presaleFactoryFees = (data.presaleFactories || []).reduce((sum: number, factory: any) =>
        sum + parseFloat(factory.flatFee || '0'), 0);
      const fairlaunchFactoryFees = (data.fairlaunchFactories || []).reduce((sum: number, factory: any) =>
        sum + parseFloat(factory.flatFee || '0'), 0);

      // Combine recent projects from presales and fairlaunches
      const recentProjects = [
        ...(data.presales || []).map((presale: any) => ({
          id: presale.id,
          name: presale.saleToken?.name || 'Unknown Token',
          tokenAddress: presale.saleToken?.address || presale.address,
          hardCap: presale.hardCap || '0',
          softCap: presale.softCap || '0',
          status: presale.status?.toLowerCase() || 'unknown',
          type: 'presale'
        })),
        ...(data.fairlaunches || []).map((fairlaunch: any) => ({
          id: fairlaunch.id,
          name: fairlaunch.saleToken?.name || 'Unknown Token',
          tokenAddress: fairlaunch.saleToken?.address || fairlaunch.address,
          hardCap: '0', // Fairlaunches don't have hardCap
          softCap: fairlaunch.softCap || '0',
          status: fairlaunch.status?.toLowerCase() || 'unknown',
          type: 'fairlaunch'
        }))
      ].slice(0, 5);

      const overview = {
        totalProjects,
        activeProjects,
        totalTokensCreated: parseInt(stats.totalTokensCreated || '0'),
        totalFundsRaised: stats.totalVolumeRaised || '0',
        totalParticipants: parseInt(stats.totalParticipants || '0'),
        totalFeesCollected: (tokenFactoryFees + presaleFactoryFees + fairlaunchFactoryFees).toString(),
        factoryFees: {
          tokenFactory: tokenFactoryFees.toString(),
          presaleFactory: presaleFactoryFees.toString(),
          fairlaunchFactory: fairlaunchFactoryFees.toString()
        },
        recentProjects,
        lastUpdated: stats.lastUpdated || Date.now().toString()
      };

      return overview;
    } catch (error) {
      console.error('Error fetching launchpad overview:', error);

      // Return empty data structure with proper error handling
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalTokensCreated: 0,
        totalFundsRaised: '0',
        totalParticipants: 0,
        totalFeesCollected: '0',
        factoryFees: {
          tokenFactory: '0',
          presaleFactory: '0',
          fairlaunchFactory: '0'
        },
        recentProjects: [],
        lastUpdated: Date.now().toString(),
        error: 'Failed to fetch data from subgraph'
      };
    }
  }
};
