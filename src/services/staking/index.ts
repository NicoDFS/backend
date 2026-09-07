import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';
import { KALYCHAIN_CONTRACTS } from '../../config/chain';
import stakingAbi from '../../blockchain/abis/staking/stakeABI.json';

// Shapes returned by the staking subgraph (see subgraphs/staking/schema.graphql)
interface SubgraphStakingPool {
  id: string;
  address: string;
  totalStaked: string;
  rewardRate: string;
  rewardsDuration: string;
  periodFinish: string;
  lastUpdateTime: string;
  rewardPerTokenStored: string;
  paused: boolean;
}

interface SubgraphStakingUser {
  id: string;
  address: string;
  stakedAmount: string;
  rewards: string;
  lastAction: string;
  lastActionTimestamp: string;
}

interface SubgraphStakingEvent {
  id: string;
  user: { id: string; address: string };
  amount: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
}

const STAKING_CONTRACT_ADDRESS = KALYCHAIN_CONTRACTS.STAKING;

const stakingClient = getGraphQLClient('staking');

export const StakingService = {
  async getStakingPools() {
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
      const { stakingPools } = await stakingClient.request<{ stakingPools: SubgraphStakingPool[] }>(query);
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
      const { stakingPool } = await stakingClient.request<{ stakingPool: SubgraphStakingPool | null }>(query, { id });
      return stakingPool;
    } catch (error) {
      console.error(`Error fetching staking pool ${id}:`, error);
      return null;
    }
  },

  async getStakingPoolUsers(poolId: string, first: number = 100, skip: number = 0) {
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
      const { users } = await stakingClient.request<{ users: SubgraphStakingUser[] }>(query, { poolId, first, skip });
      return users;
    } catch (error) {
      console.error(`Error fetching users for staking pool ${poolId}:`, error);
      return [];
    }
  },

  async getUserStakingInfo(userAddress: string, poolId: string) {
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
      const { user } = await stakingClient.request<{ user: SubgraphStakingUser | null }>(query, { userId });
      return user;
    } catch (error) {
      console.error(`Error fetching staking info for user ${userAddress} in pool ${poolId}:`, error);
      return null;
    }
  },

  async getStakingEvents(poolId: string = STAKING_CONTRACT_ADDRESS, eventType: string, first: number = 100, skip: number = 0) {
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
      const result = await stakingClient.request<{
        stakeEvents?: SubgraphStakingEvent[];
        withdrawEvents?: SubgraphStakingEvent[];
        rewardEvents?: SubgraphStakingEvent[];
      }>(query, { poolId, first, skip });
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
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, stakingAbi, provider);

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
      const contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, stakingAbi, provider);

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
