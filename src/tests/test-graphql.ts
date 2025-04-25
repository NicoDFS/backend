const axios = require('axios');

interface AxiosError {
  response?: {
    data?: any;
  };
  message?: string;
}

async function testGraphQL() {
  try {
    // First, test getting all staking pools
    const allPoolsResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingPools {
            id
            tokenAddress
            rewardTokenAddress
            totalStaked
            rewardRate
            startTime
            endTime
          }
        }
      `
    });

    console.log('All Staking Pools:', JSON.stringify(allPoolsResponse.data, null, 2));

    // Then, test getting a specific staking pool
    const singlePoolResponse = await axios.post('http://localhost:3000/api/graphql', {
      query: `
        query {
          stakingPool(id: "1") {
            id
            tokenAddress
            rewardTokenAddress
            totalStaked
            rewardRate
            startTime
            endTime
          }
        }
      `
    });

    console.log('Single Staking Pool:', JSON.stringify(singlePoolResponse.data, null, 2));
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error('Error testing GraphQL:',
      axiosError.response ? axiosError.response.data : axiosError.message);
  }
}

testGraphQL();
