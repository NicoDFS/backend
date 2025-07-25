import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';

const farmClient = getGraphQLClient('farm');

export const FarmService = {
  /**
   * Get all farming pools from the farm subgraph
   */
  async getFarmingPools() {
    const query = gql`
      query GetFarmingPools {
        farmingPools {
          id
          address
          stakingToken
          rewardsToken
          totalStaked
          rewardRate
          rewardsDuration
          periodFinish
          lastUpdateTime
          rewardPerTokenStored
          createdAt
          updatedAt
        }
      }
    `;

    try {
      console.log('🚜 Fetching farming pools from farm subgraph...');
      const { farmingPools } = await farmClient.request(query);
      console.log(`✅ Fetched ${farmingPools?.length || 0} farming pools from subgraph`);
      return farmingPools || [];
    } catch (error) {
      console.error('❌ Error fetching farming pools:', error);
      return [];
    }
  },

  /**
   * Get all whitelisted pools from the farm subgraph
   */
  async getWhitelistedPools() {
    const query = gql`
      query GetWhitelistedPools {
        whitelistedPools {
          id
          pairAddress
          weight
          manager {
            id
            address
          }
          createdAt
          updatedAt
        }
      }
    `;

    try {
      console.log('🔍 Fetching whitelisted pools from farm subgraph...');
      const { whitelistedPools } = await farmClient.request(query);

      // Map pairAddress to pair to match backend schema
      const mappedPools = whitelistedPools?.map((pool: any) => ({
        ...pool,
        pair: pool.pairAddress // Map pairAddress to pair
      })) || [];

      console.log(`✅ Fetched ${mappedPools.length} whitelisted pools from subgraph`);
      return mappedPools;
    } catch (error) {
      console.error('❌ Error fetching whitelisted pools:', error);
      return [];
    }
  },

  /**
   * Get farming data for a specific user
   */
  async getUserFarmingData(userAddress: string) {
    const query = gql`
      query GetUserFarmingData($userAddress: Bytes!) {
        farmers(where: { address: $userAddress }) {
          id
          address
          pool {
            id
            address
            stakingToken
            rewardsToken
            totalStaked
            rewardRate
            periodFinish
          }
          stakedAmount
          rewards
          rewardPerTokenPaid
          lastAction
          lastActionTimestamp
        }
      }
    `;

    try {
      console.log(`👤 Fetching farming data for user ${userAddress}...`);
      const { farmers } = await farmClient.request(query, { 
        userAddress: userAddress.toLowerCase() 
      });
      console.log(`✅ Fetched ${farmers?.length || 0} farming positions for user`);
      return farmers || [];
    } catch (error) {
      console.error(`❌ Error fetching user farming data for ${userAddress}:`, error);
      return [];
    }
  },

  /**
   * Get all farming data (pools + whitelisted + user data if provided)
   */
  async getAllFarmingData(userAddress?: string) {
    try {
      console.log('📊 Fetching complete farming data from subgraph...');
      
      const [farmingPools, whitelistedPools, userFarms] = await Promise.all([
        this.getFarmingPools(),
        this.getWhitelistedPools(),
        userAddress ? this.getUserFarmingData(userAddress) : Promise.resolve([])
      ]);

      return {
        farmingPools,
        whitelistedPools,
        userFarms
      };
    } catch (error) {
      console.error('❌ Error fetching complete farming data:', error);
      return {
        farmingPools: [],
        whitelistedPools: [],
        userFarms: []
      };
    }
  }
};
