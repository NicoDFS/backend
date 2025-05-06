import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';

// Contract addresses
const FACTORY_ADDRESS = '0xD42Af909d323D88e0E933B6c50D3e91c279004ca';
const ROUTER_ADDRESS = '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3';
const LIQUIDITY_POOL_MANAGER_ADDRESS = '0xe83e7ede1358FA87e5039CF8B1cffF383Bc2896A';
const TREASURY_VESTER_ADDRESS = '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3';
const STAKING_REWARDS_ADDRESS = '0x2bD4B7f303C1f372689d52A55ec202E0cf831a26';
const KSWAP_ADDRESS = '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a';
const WKLC_ADDRESS = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3';

// Important pair addresses
const WKLC_USDT_PAIR_ADDRESS = '0x25FDDaF836d12dC5e285823a644bb86E0b79c8e2'; // Current/correct WKLC/USDT pair

// Use real data from the subgraph
const USE_MOCK_DATA = false;

const dexClient = getGraphQLClient('dex');

export const DexService = {
  // Factory related queries
  async getFactory() {
    if (USE_MOCK_DATA) {
      return {
        id: FACTORY_ADDRESS.toLowerCase(),
        address: FACTORY_ADDRESS,
        pairCount: 10,
        totalVolumeUSD: '1000000',
        totalVolumeKLC: '500000',
        totalLiquidityUSD: '2000000',
        totalLiquidityKLC: '1000000',
        txCount: '5000',
        feeTo: null,
        feeToSetter: '0x1234567890123456789012345678901234567890'
      };
    }

    const query = gql`
      query {
        factory(id: "${FACTORY_ADDRESS.toLowerCase()}") {
          id
          address
          pairCount
          totalVolumeUSD
          totalVolumeKLC
          totalLiquidityUSD
          totalLiquidityKLC
          txCount
          feeTo
          feeToSetter
        }
      }
    `;

    try {
      const { factory } = await dexClient.request(query);
      return factory;
    } catch (error) {
      console.error('Error fetching factory:', error);
      return null;
    }
  },

  // Pair related queries
  async getPairs(first = 100, skip = 0, orderBy = 'reserveUSD', orderDirection = 'desc') {
    if (USE_MOCK_DATA) {
      return [
        {
          id: '0x1234567890123456789012345678901234567890',
          token0: {
            id: WKLC_ADDRESS.toLowerCase(),
            symbol: 'WKLC',
            name: 'Wrapped KLC'
          },
          token1: {
            id: KSWAP_ADDRESS.toLowerCase(),
            symbol: 'KSWAP',
            name: 'KalySwap Token'
          },
          reserve0: '1000000000000000000000',
          reserve1: '5000000000000000000000',
          volumeUSD: '100000',
          reserveUSD: '200000'
        }
      ];
    }

    const query = gql`
      query getPairs($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        pairs(
          first: $first,
          skip: $skip,
          orderBy: $orderBy,
          orderDirection: $orderDirection
        ) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          reserve0
          reserve1
          reserveUSD
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAt
        }
      }
    `;

    try {
      const { pairs } = await dexClient.request(query, { first, skip, orderBy, orderDirection });

      // Process pairs to handle duplicates
      const processedPairs = this.handleDuplicatePairs(pairs);

      return processedPairs;
    } catch (error) {
      console.error('Error fetching pairs:', error);
      return [];
    }
  },

  async getPair(id: string) {
    if (USE_MOCK_DATA && id.toLowerCase() === '0x1234567890123456789012345678901234567890') {
      return {
        id: '0x1234567890123456789012345678901234567890',
        token0: {
          id: WKLC_ADDRESS.toLowerCase(),
          symbol: 'WKLC',
          name: 'Wrapped KLC'
        },
        token1: {
          id: KSWAP_ADDRESS.toLowerCase(),
          symbol: 'KSWAP',
          name: 'KalySwap Token'
        },
        reserve0: '1000000000000000000000',
        reserve1: '5000000000000000000000',
        volumeUSD: '100000',
        reserveUSD: '200000'
      };
    }

    const query = gql`
      query getPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          reserve0
          reserve1
          reserveUSD
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAt
          mints(first: 10, orderBy: timestamp, orderDirection: desc) {
            id
            sender
            amount0
            amount1
            amountUSD
            timestamp
            transactionHash
          }
          burns(first: 10, orderBy: timestamp, orderDirection: desc) {
            id
            sender
            amount0
            amount1
            amountUSD
            timestamp
            transactionHash
          }
          swaps(first: 10, orderBy: timestamp, orderDirection: desc) {
            id
            sender
            amount0In
            amount1In
            amount0Out
            amount1Out
            amountUSD
            timestamp
            transactionHash
          }
        }
      }
    `;

    try {
      const { pair } = await dexClient.request(query, { id });
      return pair;
    } catch (error) {
      console.error(`Error fetching pair ${id}:`, error);
      return null;
    }
  },

  // Token related queries
  async getTokens(first = 100, skip = 0, orderBy = 'tradeVolumeUSD', orderDirection = 'desc') {
    if (USE_MOCK_DATA) {
      return [
        {
          id: WKLC_ADDRESS.toLowerCase(),
          symbol: 'WKLC',
          name: 'Wrapped KLC',
          decimals: 18,
          tradeVolume: '1000000',
          tradeVolumeUSD: '1000000',
          totalLiquidity: '5000000'
        },
        {
          id: KSWAP_ADDRESS.toLowerCase(),
          symbol: 'KSWAP',
          name: 'KalySwap Token',
          decimals: 18,
          tradeVolume: '500000',
          tradeVolumeUSD: '500000',
          totalLiquidity: '2500000'
        }
      ];
    }

    const query = gql`
      query getTokens($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        tokens(
          first: $first,
          skip: $skip,
          orderBy: $orderBy,
          orderDirection: $orderDirection
        ) {
          id
          symbol
          name
          decimals
          tradeVolume
          tradeVolumeUSD
          totalLiquidity
          derivedKLC
        }
      }
    `;

    try {
      const { tokens } = await dexClient.request(query, { first, skip, orderBy, orderDirection });
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  },

  async getToken(id: string) {
    if (USE_MOCK_DATA && id.toLowerCase() === WKLC_ADDRESS.toLowerCase()) {
      return {
        id: WKLC_ADDRESS.toLowerCase(),
        symbol: 'WKLC',
        name: 'Wrapped KLC',
        decimals: 18,
        tradeVolume: '1000000',
        tradeVolumeUSD: '1000000',
        totalLiquidity: '5000000'
      };
    }

    const query = gql`
      query getToken($id: ID!) {
        token(id: $id) {
          id
          symbol
          name
          decimals
          tradeVolume
          tradeVolumeUSD
          totalLiquidity
          derivedKLC
          pairs {
            pair {
              id
              token0 {
                symbol
              }
              token1 {
                symbol
              }
              reserveUSD
            }
          }
        }
      }
    `;

    try {
      const { token } = await dexClient.request(query, { id });
      return token;
    } catch (error) {
      console.error(`Error fetching token ${id}:`, error);
      return null;
    }
  },

  // Liquidity Pool Manager related queries
  async getLiquidityPoolManager() {
    if (USE_MOCK_DATA) {
      return {
        id: LIQUIDITY_POOL_MANAGER_ADDRESS.toLowerCase(),
        address: LIQUIDITY_POOL_MANAGER_ADDRESS,
        wklc: WKLC_ADDRESS,
        kswap: KSWAP_ADDRESS,
        treasuryVester: TREASURY_VESTER_ADDRESS,
        klcKswapPair: '0x1234567890123456789012345678901234567890',
        klcSplit: '500000000000000000', // 50%
        kswapSplit: '500000000000000000', // 50%
        splitPools: true,
        unallocatedKswap: '1000000000000000000000' // 1000 KSWAP
      };
    }

    const query = gql`
      query {
        liquidityPoolManager(id: "${LIQUIDITY_POOL_MANAGER_ADDRESS.toLowerCase()}") {
          id
          address
          wklc
          kswap
          treasuryVester
          klcKswapPair
          klcSplit
          kswapSplit
          splitPools
          unallocatedKswap
          whitelistedPools {
            id
            pair
            weight
          }
        }
      }
    `;

    try {
      const { liquidityPoolManager } = await dexClient.request(query);
      return liquidityPoolManager;
    } catch (error) {
      console.error('Error fetching liquidity pool manager:', error);
      return null;
    }
  },

  async getWhitelistedPools() {
    if (USE_MOCK_DATA) {
      return [
        {
          id: '0x1234567890123456789012345678901234567890',
          pair: '0x1234567890123456789012345678901234567890',
          weight: '1000000000000000000' // 1.0
        }
      ];
    }

    const query = gql`
      query {
        whitelistedPools {
          id
          pair
          weight
          manager {
            id
          }
        }
      }
    `;

    try {
      const { whitelistedPools } = await dexClient.request(query);
      return whitelistedPools;
    } catch (error) {
      console.error('Error fetching whitelisted pools:', error);
      return [];
    }
  },

  // Treasury Vester related queries
  async getTreasuryVester() {
    if (USE_MOCK_DATA) {
      return {
        id: TREASURY_VESTER_ADDRESS.toLowerCase(),
        address: TREASURY_VESTER_ADDRESS,
        recipient: LIQUIDITY_POOL_MANAGER_ADDRESS,
        kswap: KSWAP_ADDRESS,
        vestingAmount: '100000000000000000000000', // 100,000 KSWAP
        vestingBegin: '1625097600', // Unix timestamp
        vestingCliff: '1625097600', // Unix timestamp
        vestingEnd: '1656633600', // Unix timestamp
        lastUpdate: '1625097600', // Unix timestamp
        enabled: true
      };
    }

    const query = gql`
      query {
        treasuryVester(id: "${TREASURY_VESTER_ADDRESS.toLowerCase()}") {
          id
          address
          recipient
          kswap
          vestingAmount
          vestingBegin
          vestingCliff
          vestingEnd
          lastUpdate
          enabled
        }
      }
    `;

    try {
      const { treasuryVester } = await dexClient.request(query);
      return treasuryVester;
    } catch (error) {
      console.error('Error fetching treasury vester:', error);
      return null;
    }
  },

  // Staking Rewards related queries
  async getStakingRewards() {
    if (USE_MOCK_DATA) {
      return {
        id: STAKING_REWARDS_ADDRESS.toLowerCase(),
        address: STAKING_REWARDS_ADDRESS,
        stakingToken: KSWAP_ADDRESS,
        rewardsToken: KSWAP_ADDRESS,
        totalStaked: '10000000000000000000000', // 10,000 KSWAP
        rewardRate: '100000000000000000', // 0.1 KSWAP per block
        rewardsDuration: '2592000', // 30 days in seconds
        periodFinish: '1627689600', // Unix timestamp
        lastUpdateTime: '1625097600', // Unix timestamp
        rewardPerTokenStored: '1000000000000000000'
      };
    }

    const query = gql`
      query {
        stakingPool(id: "${STAKING_REWARDS_ADDRESS.toLowerCase()}") {
          id
          address
          stakingToken {
            id
            symbol
            name
          }
          rewardsToken {
            id
            symbol
            name
          }
          totalStaked
          rewardRate
          rewardsDuration
          periodFinish
          lastUpdateTime
          rewardPerTokenStored
        }
      }
    `;

    try {
      const { stakingPool } = await dexClient.request(query);
      return stakingPool;
    } catch (error) {
      console.error('Error fetching staking rewards:', error);
      return null;
    }
  },

  // Historical data queries
  async getDexDayData(first = 30, skip = 0) {
    if (USE_MOCK_DATA) {
      const dayData = [];
      const now = Math.floor(Date.now() / 1000);
      const daySeconds = 86400;

      for (let i = 0; i < first; i++) {
        const date = now - (i * daySeconds);
        dayData.push({
          id: (Math.floor(date / daySeconds)).toString(),
          date: Math.floor(date / daySeconds),
          volumeUSD: (1000000 / (i + 1)).toFixed(2),
          volumeKLC: (500000 / (i + 1)).toFixed(2),
          liquidityUSD: (2000000 - (i * 10000)).toFixed(2),
          liquidityKLC: (1000000 - (i * 5000)).toFixed(2),
          txCount: (1000 - (i * 10)).toString()
        });
      }

      return dayData;
    }

    const query = gql`
      query getDayData($first: Int!, $skip: Int!) {
        dayDatas(
          first: $first,
          skip: $skip,
          orderBy: date,
          orderDirection: desc
        ) {
          id
          date
          volumeUSD
          volumeKLC
          liquidityUSD
          liquidityKLC
          txCount
        }
      }
    `;

    try {
      const { dayDatas } = await dexClient.request(query, { first, skip });
      return dayDatas;
    } catch (error) {
      console.error('Error fetching day data:', error);
      return [];
    }
  },

  // Direct contract interaction methods (for real-time data)
  async getFactoryContractData() {
    try {
      const provider = getProvider();
      const abi = require('../../blockchain/abis/dex/factoryABI.json');
      const contract = new ethers.Contract(FACTORY_ADDRESS, abi, provider);

      const [
        feeTo,
        feeToSetter,
        allPairsLength
      ] = await Promise.all([
        contract.feeTo(),
        contract.feeToSetter(),
        contract.allPairsLength()
      ]);

      return {
        address: FACTORY_ADDRESS,
        feeTo,
        feeToSetter,
        allPairsLength: allPairsLength.toString()
      };
    } catch (error) {
      console.error('Error fetching factory contract data:', error);
      return null;
    }
  },

  // Helper method to handle duplicate pairs (like WKLC/USDT)
  handleDuplicatePairs(pairs: any[]) {
    if (!pairs || pairs.length === 0) return [];

    // Create a map to track pairs by token symbols
    const pairsBySymbols: { [key: string]: any[] } = {};

    // Group pairs by their token symbols
    pairs.forEach(pair => {
      // Create a consistent key regardless of token order
      const token0Symbol = pair.token0.symbol;
      const token1Symbol = pair.token1.symbol;
      const symbolKey = [token0Symbol, token1Symbol].sort().join('/');

      if (!pairsBySymbols[symbolKey]) {
        pairsBySymbols[symbolKey] = [];
      }

      pairsBySymbols[symbolKey].push(pair);
    });

    // Process each group to handle duplicates
    const processedPairs: any[] = [];

    Object.keys(pairsBySymbols).forEach(symbolKey => {
      const symbolPairs = pairsBySymbols[symbolKey];

      // If there's only one pair with these symbols, add it directly
      if (symbolPairs.length === 1) {
        processedPairs.push(symbolPairs[0]);
        return;
      }

      // Handle WKLC/USDT specifically
      if (symbolKey === 'USDT/WKLC' || symbolKey === 'WKLC/USDT') {
        // Find the correct pair by address
        const correctPair = symbolPairs.find(p =>
          p.id.toLowerCase() === WKLC_USDT_PAIR_ADDRESS.toLowerCase()
        );

        // If found, use it; otherwise use the one with highest liquidity
        if (correctPair) {
          processedPairs.push(correctPair);
        } else {
          // Sort by reserveUSD (descending) and take the first one
          const sortedPairs = [...symbolPairs].sort((a, b) =>
            parseFloat(b.reserveUSD || '0') - parseFloat(a.reserveUSD || '0')
          );
          processedPairs.push(sortedPairs[0]);
        }
      } else {
        // For other duplicate pairs, use the one with highest liquidity
        const sortedPairs = [...symbolPairs].sort((a, b) =>
          parseFloat(b.reserveUSD || '0') - parseFloat(a.reserveUSD || '0')
        );
        processedPairs.push(sortedPairs[0]);
      }
    });

    // Sort the processed pairs by the original criteria (usually reserveUSD)
    return processedPairs.sort((a, b) =>
      parseFloat(b.reserveUSD || '0') - parseFloat(a.reserveUSD || '0')
    );
  },

  // Get DEX overview data for dashboard
  async getDexOverview() {
    try {
      const [factory, dayData, pairs] = await Promise.all([
        this.getFactory(),
        this.getDexDayData(1),
        this.getPairs(5)
      ]);

      return {
        factory,
        dayData: dayData[0],
        topPairs: pairs
      };
    } catch (error) {
      console.error('Error fetching DEX overview:', error);
      return null;
    }
  }
};
