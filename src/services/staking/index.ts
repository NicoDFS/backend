import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';

// Contract address
const STAKING_CONTRACT_ADDRESS = '0xF670A2D32a2b25e181B26Abb02614a20eA1eA2D9';

// Mock data for testing
const MOCK_STAKING_POOLS = [
  {
    id: STAKING_CONTRACT_ADDRESS.toLowerCase(),
    address: STAKING_CONTRACT_ADDRESS,
    totalStaked: '1000000000000000000000', // 1000 tokens with 18 decimals
    rewardRate: '100000000000000000', // 0.1 tokens per block
    rewardsDuration: '30758400', // 356 days in seconds
    periodFinish: '1672531200', // Unix timestamp
    lastUpdateTime: '1625097600', // Unix timestamp
    rewardPerTokenStored: '1000000000000000000',
    paused: false
  }
];

// Use real data from the subgraph
const USE_MOCK_DATA = false;

const stakingClient = getGraphQLClient('staking');

export const StakingService = {
  async getStakingPools() {
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log('Using mock staking pool data');
      return [MOCK_STAKING_POOLS[0]];
    }

    const query = gql`
      query {
        stakingPools {
          id
          address
          totalStaked
          rewardRate
          rewardsDuration
          periodFinish
          lastUpdateTime
          rewardPerTokenStored
          paused
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
      if (id.toLowerCase() === STAKING_CONTRACT_ADDRESS.toLowerCase()) {
        return MOCK_STAKING_POOLS[0];
      }
      return null;
    }

    const query = gql`
      query getStakingPool($id: ID!) {
        stakingPool(id: $id) {
          id
          address
          totalStaked
          rewardRate
          rewardsDuration
          periodFinish
          lastUpdateTime
          rewardPerTokenStored
          paused
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
  },

  async getStakingPoolUsers(poolId: string, first: number = 100, skip: number = 0) {
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for staking pool users ${poolId}`);
      return [
        {
          id: '0x1234567890abcdef1234567890abcdef12345678-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
          address: '0x1234567890abcdef1234567890abcdef12345678',
          stakedAmount: '500000000000000000000', // 500 tokens
          rewards: '10000000000000000000', // 10 tokens
          lastAction: 'staked',
          lastActionTimestamp: '1625097600' // Unix timestamp
        },
        {
          id: '0x2345678901abcdef2345678901abcdef23456789-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
          address: '0x2345678901abcdef2345678901abcdef23456789',
          stakedAmount: '300000000000000000000', // 300 tokens
          rewards: '6000000000000000000', // 6 tokens
          lastAction: 'claimed',
          lastActionTimestamp: '1625184000' // Unix timestamp
        }
      ];
    }

    const query = gql`
      query getStakingPoolUsers($poolId: ID!, $first: Int!, $skip: Int!) {
        users(
          where: { pool: $poolId }
          first: $first
          skip: $skip
          orderBy: stakedAmount
          orderDirection: desc
        ) {
          id
          address
          stakedAmount
          rewards
          lastAction
          lastActionTimestamp
        }
      }
    `;

    try {
      const { users } = await stakingClient.request(query, { poolId, first, skip });
      return users;
    } catch (error) {
      console.error(`Error fetching users for staking pool ${poolId}:`, error);
      return [];
    }
  },

  async getUserStakingInfo(userAddress: string, poolId: string) {
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for user ${userAddress} in pool ${poolId}`);
      if (userAddress.toLowerCase() === '0x1234567890abcdef1234567890abcdef12345678') {
        return {
          id: '0x1234567890abcdef1234567890abcdef12345678-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
          address: '0x1234567890abcdef1234567890abcdef12345678',
          stakedAmount: '500000000000000000000', // 500 tokens
          rewards: '10000000000000000000', // 10 tokens
          lastAction: 'staked',
          lastActionTimestamp: '1625097600' // Unix timestamp
        };
      }
      return null;
    }

    const userId = userAddress.toLowerCase() + '-' + poolId.toLowerCase();

    const query = gql`
      query getUserStakingInfo($userId: ID!) {
        user(id: $userId) {
          id
          address
          stakedAmount
          rewards
          lastAction
          lastActionTimestamp
        }
      }
    `;

    try {
      const { user } = await stakingClient.request(query, { userId });
      return user;
    } catch (error) {
      console.error(`Error fetching staking info for user ${userAddress} in pool ${poolId}:`, error);
      return null;
    }
  },

  async getStakingEvents(poolId: string, eventType: string, first: number = 100, skip: number = 0) {
    // Use mock data for testing
    if (USE_MOCK_DATA) {
      console.log(`Using mock data for ${eventType} events in pool ${poolId}`);
      if (eventType === 'stake') {
        return [
          {
            id: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890-0',
            user: {
              id: '0x1234567890abcdef1234567890abcdef12345678-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
              address: '0x1234567890abcdef1234567890abcdef12345678'
            },
            amount: '500000000000000000000', // 500 tokens
            timestamp: '1625097600', // Unix timestamp
            blockNumber: '20992300',
            transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
          }
        ];
      } else if (eventType === 'withdraw') {
        return [
          {
            id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0',
            user: {
              id: '0x2345678901abcdef2345678901abcdef23456789-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
              address: '0x2345678901abcdef2345678901abcdef23456789'
            },
            amount: '100000000000000000000', // 100 tokens
            timestamp: '1625184000', // Unix timestamp
            blockNumber: '20993000',
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          }
        ];
      } else if (eventType === 'reward') {
        return [
          {
            id: '0x2345678901abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0',
            user: {
              id: '0x2345678901abcdef2345678901abcdef23456789-' + STAKING_CONTRACT_ADDRESS.toLowerCase(),
              address: '0x2345678901abcdef2345678901abcdef23456789'
            },
            amount: '6000000000000000000', // 6 tokens
            timestamp: '1625184000', // Unix timestamp
            blockNumber: '20993000',
            transactionHash: '0x2345678901abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          }
        ];
      }
      return [];
    }

    let eventQuery = '';
    if (eventType === 'stake') {
      eventQuery = `
        stakeEvents(
          where: { pool: $poolId }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          user {
            id
            address
          }
          amount
          timestamp
          blockNumber
          transactionHash
        }
      `;
    } else if (eventType === 'withdraw') {
      eventQuery = `
        withdrawEvents(
          where: { pool: $poolId }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          user {
            id
            address
          }
          amount
          timestamp
          blockNumber
          transactionHash
        }
      `;
    } else if (eventType === 'reward') {
      eventQuery = `
        rewardEvents(
          where: { pool: $poolId }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          user {
            id
            address
          }
          amount
          timestamp
          blockNumber
          transactionHash
        }
      `;
    } else {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    const query = gql`
      query getStakingEvents($poolId: ID!, $first: Int!, $skip: Int!) {
        ${eventQuery}
      }
    `;

    try {
      const result = await stakingClient.request(query, { poolId, first, skip });
      if (eventType === 'stake') {
        return result.stakeEvents;
      } else if (eventType === 'withdraw') {
        return result.withdrawEvents;
      } else if (eventType === 'reward') {
        return result.rewardEvents;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching ${eventType} events for pool ${poolId}:`, error);
      return [];
    }
  },

  // Direct contract interaction methods (for real-time data)
  async getContractData() {
    try {
      const provider = getProvider();
      const abi = require('../../blockchain/abis/staking/stakeABI.json');
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, abi, provider);

      const [
        totalSupply,
        rewardRate,
        rewardsDuration,
        periodFinish,
        lastUpdateTime,
        rewardPerTokenStored,
        paused
      ] = await Promise.all([
        contract.totalSupply(),
        contract.rewardRate(),
        contract.rewardsDuration(),
        contract.periodFinish(),
        contract.lastUpdateTime(),
        contract.rewardPerTokenStored(),
        contract.paused()
      ]);

      return {
        id: STAKING_CONTRACT_ADDRESS.toLowerCase(),
        address: STAKING_CONTRACT_ADDRESS,
        totalStaked: totalSupply.toString(),
        rewardRate: rewardRate.toString(),
        rewardsDuration: rewardsDuration.toString(),
        periodFinish: periodFinish.toString(),
        lastUpdateTime: lastUpdateTime.toString(),
        rewardPerTokenStored: rewardPerTokenStored.toString(),
        paused: paused
      };
    } catch (error) {
      console.error('Error fetching contract data:', error);
      return null;
    }
  },

  async getUserContractData(userAddress: string) {
    try {
      const provider = getProvider();
      const abi = require('../../blockchain/abis/staking/stakeABI.json');
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, abi, provider);

      const [
        stakedAmount,
        rewards,
        rewardPerTokenPaid
      ] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.rewards(userAddress),
        contract.userRewardPerTokenPaid(userAddress)
      ]);

      return {
        address: userAddress,
        stakedAmount: stakedAmount.toString(),
        rewards: rewards.toString(),
        rewardPerTokenPaid: rewardPerTokenPaid.toString()
      };
    } catch (error) {
      console.error(`Error fetching contract data for user ${userAddress}:`, error);
      return null;
    }
  }
};
