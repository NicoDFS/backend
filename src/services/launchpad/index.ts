import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const launchpadClient = getGraphQLClient('launchpad');

export const LaunchpadService = {
  async getLaunchpadProjects() {
    const query = gql`
      query {
        launchpadProjects(first: 100, orderBy: startTime, orderDirection: desc) {
          id
          name
          description
          tokenAddress
          startTime
          endTime
          hardCap
          softCap
          status
        }
      }
    `;

    try {
      const { launchpadProjects } = await launchpadClient.request(query);
      return launchpadProjects;
    } catch (error) {
      console.error('Error fetching launchpad projects:', error);
      return [];
    }
  },

  async getLaunchpadProject(id: string) {
    const query = gql`
      query getLaunchpadProject($id: ID!) {
        launchpadProject(id: $id) {
          id
          name
          description
          tokenAddress
          startTime
          endTime
          hardCap
          softCap
          status
        }
      }
    `;

    try {
      const { launchpadProject } = await launchpadClient.request(query, { id });
      return launchpadProject;
    } catch (error) {
      console.error(`Error fetching launchpad project ${id}:`, error);
      return null;
    }
  },

  async getLaunchpadOverview() {
    // This will be implemented when the subgraph is deployed
    // For now, return mock data
    try {
      // When subgraph is ready, uncomment this code
      /*
      const query = gql`
        query {
          launchpadFactories {
            id
            totalFees
            tokenFactoryFees
            presaleFactoryFees
            fairlaunchFactoryFees
          }
          launchpadProjects(first: 100) {
            id
            name
            tokenAddress
            hardCap
            softCap
            status
          }
          launchpadStats {
            totalProjects
            activeProjects
            totalFundsRaised
            totalParticipants
          }
        }
      `;

      const data = await launchpadClient.request(query);

      // Process the data to create the overview
      const overview = {
        totalProjects: data.launchpadStats.totalProjects,
        activeProjects: data.launchpadStats.activeProjects,
        totalFundsRaised: data.launchpadStats.totalFundsRaised,
        totalParticipants: data.launchpadStats.totalParticipants,
        totalFeesCollected: data.launchpadFactories.reduce((sum, factory) => sum + parseFloat(factory.totalFees), 0).toString(),
        factoryFees: {
          tokenFactory: data.launchpadFactories.reduce((sum, factory) => sum + parseFloat(factory.tokenFactoryFees), 0).toString(),
          presaleFactory: data.launchpadFactories.reduce((sum, factory) => sum + parseFloat(factory.presaleFactoryFees), 0).toString(),
          fairlaunchFactory: data.launchpadFactories.reduce((sum, factory) => sum + parseFloat(factory.fairlaunchFactoryFees), 0).toString()
        },
        recentProjects: data.launchpadProjects.slice(0, 5)
      };

      return overview;
      */

      // Mock data for now
      return {
        totalProjects: 12,
        activeProjects: 3,
        totalFundsRaised: '500000',
        totalParticipants: 850,
        totalFeesCollected: '25000',
        factoryFees: {
          tokenFactory: '15000',
          presaleFactory: '8000',
          fairlaunchFactory: '2000'
        },
        recentProjects: [
          {
            id: '0x1234567890123456789012345678901234567890',
            name: 'KalySwap Token',
            tokenAddress: '0x1234567890123456789012345678901234567890',
            hardCap: '100000',
            softCap: '50000',
            status: 'active'
          },
          {
            id: '0x2345678901234567890123456789012345678901',
            name: 'Kaly Governance Token',
            tokenAddress: '0x2345678901234567890123456789012345678901',
            hardCap: '200000',
            softCap: '100000',
            status: 'completed'
          },
          {
            id: '0x3456789012345678901234567890123456789012',
            name: 'KalyChain NFT Token',
            tokenAddress: '0x3456789012345678901234567890123456789012',
            hardCap: '50000',
            softCap: '25000',
            status: 'upcoming'
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching launchpad overview:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalFundsRaised: '0',
        totalParticipants: 0,
        totalFeesCollected: '0',
        factoryFees: {
          tokenFactory: '0',
          presaleFactory: '0',
          fairlaunchFactory: '0'
        },
        recentProjects: []
      };
    }
  }
};
