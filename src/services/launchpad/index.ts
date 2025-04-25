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
  }
};
