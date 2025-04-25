import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const stakingClient = getGraphQLClient('staking');

export const StakingService = {
  async getStakingPools() {
    const query = gql`
      query {
        stakingPools(first: 100, orderBy: startTime, orderDirection: desc) {
          id
          tokenAddress
          rewardTokenAddress
          totalStaked
          rewardRate
          startTime
          endTime
        }
      }
    `;
    
    try {
      const { stakingPools } = await stakingClient.request(query);
      return stakingPools;
    } catch (error) {
      console.error('Error fetching staking pools:', error);
      return [];
    }
  },
  
  async getStakingPool(id: string) {
    const query = gql`
      query getStakingPool($id: ID!) {
        stakingPool(id: $id) {
          id
          tokenAddress
          rewardTokenAddress
          totalStaked
          rewardRate
          startTime
          endTime
        }
      }
    `;
    
    try {
      const { stakingPool } = await stakingClient.request(query, { id });
      return stakingPool;
    } catch (error) {
      console.error(`Error fetching staking pool ${id}:`, error);
      return null;
    }
  }
};
