const axios = require('axios');

interface AxiosError {
  response?: {
    data?: any;
  };
  message?: string;
}

// Contract address
const STAKING_CONTRACT_ADDRESS = '0xF670A2D32a2b25e181B26Abb02614a20eA1eA2D9';

async function testGraphQL() {
  try {
    // 1. Test getting all staking pools
    const allPoolsResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
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
      `
    });

    console.log('All Staking Pools:', JSON.stringify(allPoolsResponse.data, null, 2));

    // 2. Test getting a specific staking pool
    const singlePoolResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingPool(id: "${STAKING_CONTRACT_ADDRESS.toLowerCase()}") {
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
      `
    });

    console.log('Single Staking Pool:', JSON.stringify(singlePoolResponse.data, null, 2));

    // 3. Test getting staking pool users
    const poolUsersResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingPoolUsers(poolId: "${STAKING_CONTRACT_ADDRESS.toLowerCase()}", first: 10, skip: 0) {
            id
            address
            stakedAmount
            rewards
            lastAction
            lastActionTimestamp
          }
        }
      `
    });

    console.log('Staking Pool Users:', JSON.stringify(poolUsersResponse.data, null, 2));

    // 4. Test getting staking events
    const stakingEventsResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingEvents(poolId: "${STAKING_CONTRACT_ADDRESS.toLowerCase()}", eventType: "stake", first: 5, skip: 0) {
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
        }
      `
    });

    console.log('Staking Events:', JSON.stringify(stakingEventsResponse.data, null, 2));

    // 5. Test getting contract data directly
    const contractDataResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingContractData {
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
      `
    });

    console.log('Contract Data:', JSON.stringify(contractDataResponse.data, null, 2));

  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error('Error testing GraphQL:',
      axiosError.response ? axiosError.response.data : axiosError.message);
  }
}

testGraphQL();
