import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

// Mock data for testing
const MOCK_STAKING_POOLS = [
  {
    id: '1',
    tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
    rewardTokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalStaked: '1000000000000000000000', // 1000 tokens with 18 decimals
    rewardRate: '100000000000000000', // 0.1 tokens per block
    startTime: '1625097600', // Unix timestamp
    endTime: '1640995200' // Unix timestamp
  },
  {
    id: '2',
    tokenAddress: '0x2345678901abcdef2345678901abcdef23456789',
    rewardTokenAddress: '0xbcdef1234567890abcdef1234567890abcdef123',
    totalStaked: '500000000000000000000', // 500 tokens with 18 decimals
    rewardRate: '50000000000000000', // 0.05 tokens per block
    startTime: '1625097600', // Unix timestamp
    endTime: '1640995200' // Unix timestamp
  }
];

// Use mock data for testing, will be replaced with actual subgraph data later
const USE_MOCK_DATA = true;

const stakingClient = getGraphQLClient('staking');

export const StakingService = {
  async getStakingPools() {
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log('Using mock staking pool data');
      return MOCK_STAKING_POOLS;
    }

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
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for staking pool ${id}`);
      return MOCK_STAKING_POOLS.find(pool => pool.id === id) || null;
    }

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
