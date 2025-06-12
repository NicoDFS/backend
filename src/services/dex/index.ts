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
const USDT_ADDRESS = '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A'; // Correct USDT address

// Use real data from the subgraph
const USE_MOCK_DATA = false;

const dexClient = getGraphQLClient('dex');

export const DexService = {
  // Factory related queries
  async getFactory() {
    if (USE_MOCK_DATA) {
      return {
        id: FACTORY_ADDRESS.toLowerCase(),
        pairCount: 10,
        totalVolumeUSD: '1000000',
        totalVolumeKLC: '500000',
        totalLiquidityUSD: '2000000',
        totalLiquidityKLC: '1000000',
        untrackedVolumeUSD: '50000',
        txCount: '5000'
      };
    }

    // Try new schema first, fallback to old schema
    const newSchemaQuery = gql`
      query {
        kalyswapFactory(id: "${FACTORY_ADDRESS.toLowerCase()}") {
          id
          pairCount
          totalVolumeKLC
          totalLiquidityKLC
          totalVolumeUSD
          untrackedVolumeUSD
          totalLiquidityUSD
          txCount
        }
      }
    `;

    const oldSchemaQuery = gql`
      query {
        factory(id: "${FACTORY_ADDRESS.toLowerCase()}") {
          id
          pairCount
          totalVolumeUSD
          totalVolumeKLC
          totalLiquidityUSD
          totalLiquidityKLC
          txCount
        }
      }
    `;

    try {
      // Try new schema first
      let factory = null;
      try {
        const result = await dexClient.request(newSchemaQuery);
        factory = result.kalyswapFactory;
        console.log('KalyswapFactory data from subgraph (new schema):', JSON.stringify(factory, null, 2));
      } catch (newSchemaError) {
        console.log('New schema failed, trying old schema...');

        // Fallback to old schema
        try {
          const result = await dexClient.request(oldSchemaQuery);
          factory = result.factory;
          console.log('Factory data from subgraph (old schema):', JSON.stringify(factory, null, 2));

          // Add missing fields for compatibility
          if (factory) {
            factory.untrackedVolumeUSD = factory.untrackedVolumeUSD || '0';
          }
        } catch (oldSchemaError) {
          console.error('Both schemas failed:', { newSchemaError, oldSchemaError });
          return null;
        }
      }

      if (!factory) {
        console.warn('Warning: factory not found in subgraph');
        return null;
      }

      // Check if totalLiquidityUSD and totalLiquidityKLC are valid
      if (!factory.totalLiquidityUSD || factory.totalLiquidityUSD === '0') {
        console.warn('Warning: totalLiquidityUSD is zero or missing in factory data');
      }

      if (!factory.totalLiquidityKLC || factory.totalLiquidityKLC === '0') {
        console.warn('Warning: totalLiquidityKLC is zero or missing in factory data');
      }

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

    const newSchemaQuery = gql`
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
            derivedKLC
          }
          token1 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          reserve0
          reserve1
          totalSupply
          reserveKLC
          reserveUSD
          trackedReserveKLC
          token0Price
          token1Price
          volumeToken0
          volumeToken1
          volumeUSD
          untrackedVolumeUSD
          txCount
          createdAtTimestamp
          createdAtBlockNumber
          liquidityProviderCount
        }
      }
    `;

    const oldSchemaQuery = gql`
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
            derivedKLC
          }
          token1 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          reserve0
          reserve1
          reserveUSD
          reserveKLC
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAt
        }
      }
    `;

    try {
      // Try new schema first
      let pairs = [];
      try {
        const result = await dexClient.request(newSchemaQuery, { first, skip, orderBy, orderDirection });
        pairs = result.pairs || [];
        console.log(`Pairs data from subgraph (new schema): ${pairs.length} pairs found`);
      } catch (newSchemaError) {
        console.log('New schema failed for pairs, trying old schema...');

        // Fallback to old schema
        try {
          const result = await dexClient.request(oldSchemaQuery, { first, skip, orderBy, orderDirection });
          pairs = result.pairs || [];
          console.log(`Pairs data from subgraph (old schema): ${pairs.length} pairs found`);

          // Add missing fields for compatibility
          pairs = pairs.map(pair => ({
            ...pair,
            totalSupply: pair.totalSupply || '0',
            trackedReserveKLC: pair.trackedReserveKLC || pair.reserveKLC || '0',
            volumeToken0: pair.volumeToken0 || '0',
            volumeToken1: pair.volumeToken1 || '0',
            untrackedVolumeUSD: pair.untrackedVolumeUSD || '0',
            createdAtTimestamp: pair.createdAt || '0',
            createdAtBlockNumber: pair.createdAtBlockNumber || '0',
            liquidityProviderCount: pair.liquidityProviderCount || '0'
          }));
        } catch (oldSchemaError) {
          console.error('Both schemas failed for pairs:', { newSchemaError, oldSchemaError });
          return [];
        }
      }

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

    // Try new schema first, fallback to basic pair data
    const newSchemaQuery = gql`
      query getPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          token1 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          reserve0
          reserve1
          totalSupply
          reserveKLC
          reserveUSD
          trackedReserveKLC
          token0Price
          token1Price
          volumeToken0
          volumeToken1
          volumeUSD
          untrackedVolumeUSD
          txCount
          createdAtTimestamp
          createdAtBlockNumber
          liquidityProviderCount
        }
      }
    `;

    const oldSchemaQuery = gql`
      query getPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          token1 {
            id
            symbol
            name
            decimals
            derivedKLC
          }
          reserve0
          reserve1
          reserveUSD
          reserveKLC
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAt
        }
      }
    `;

    try {
      // Try new schema first
      let pair = null;
      try {
        const result = await dexClient.request(newSchemaQuery, { id });
        pair = result.pair;
        console.log(`Pair data from subgraph (new schema) for ${id}:`, pair ? 'found' : 'not found');
      } catch (newSchemaError) {
        console.log(`New schema failed for pair ${id}, trying old schema...`);

        // Fallback to old schema
        try {
          const result = await dexClient.request(oldSchemaQuery, { id });
          pair = result.pair;
          console.log(`Pair data from subgraph (old schema) for ${id}:`, pair ? 'found' : 'not found');

          // Add missing fields for compatibility
          if (pair) {
            pair.totalSupply = pair.totalSupply || '0';
            pair.trackedReserveKLC = pair.trackedReserveKLC || pair.reserveKLC || '0';
            pair.volumeToken0 = pair.volumeToken0 || '0';
            pair.volumeToken1 = pair.volumeToken1 || '0';
            pair.untrackedVolumeUSD = pair.untrackedVolumeUSD || '0';
            pair.createdAtTimestamp = pair.createdAt || '0';
            pair.createdAtBlockNumber = pair.createdAtBlockNumber || '0';
            pair.liquidityProviderCount = pair.liquidityProviderCount || '0';
          }
        } catch (oldSchemaError) {
          console.error(`Both schemas failed for pair ${id}:`, { newSchemaError, oldSchemaError });
          return null;
        }
      }

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
          totalSupply
          tradeVolume
          tradeVolumeUSD
          untrackedVolumeUSD
          txCount
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
          totalSupply
          tradeVolume
          tradeVolumeUSD
          untrackedVolumeUSD
          txCount
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
        kswap: KSWAP_ADDRESS,
        recipient: LIQUIDITY_POOL_MANAGER_ADDRESS,
        vestingAmount: '100000000000000000000000', // 100,000 KSWAP
        vestingBegin: '1625097600', // Unix timestamp
        vestingCliff: '1625097600', // Unix timestamp
        vestingEnd: '1656633600', // Unix timestamp
        lastUpdate: '1625097600', // Unix timestamp
        vestingEnabled: true,
        createdAt: '1625097600',
        updatedAt: '1625097600'
      };
    }

    const query = gql`
      query {
        treasuryVester(id: "${TREASURY_VESTER_ADDRESS.toLowerCase()}") {
          id
          address
          kswap
          recipient
          vestingAmount
          vestingBegin
          vestingCliff
          vestingEnd
          lastUpdate
          vestingEnabled
          createdAt
          updatedAt
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

  // Get KLC price from the WKLC/USDT pair in the subgraph
  async getKLCPriceFromSubgraph() {
    try {
      console.log('Getting KLC price from WKLC/USDT pair in subgraph...');

      // Get the WKLC/USDT pair from the subgraph
      const pair = await this.getPair(WKLC_USDT_PAIR_ADDRESS.toLowerCase());

      if (!pair) {
        console.log('WKLC/USDT pair not found in subgraph, falling back to router method');
        return await this.getKLCPriceFromRouter();
      }

      console.log('WKLC/USDT pair data:', JSON.stringify(pair, null, 2));

      let klcPrice = 0;

      // Determine which token is WKLC and which is USDT
      if (pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'USDT') {
        // token1Price is the price of token0 in terms of token1
        // So this is WKLC price in USDT
        klcPrice = parseFloat(pair.token1Price);
        console.log(`WKLC is token0, price from subgraph: ${klcPrice}`);
      } else if (pair.token0.symbol === 'USDT' && pair.token1.symbol === 'WKLC') {
        // token0Price is the price of token1 in terms of token0
        // So this is WKLC price in USDT
        klcPrice = parseFloat(pair.token0Price);
        console.log(`WKLC is token1, price from subgraph: ${klcPrice}`);
      } else {
        console.log('Neither token in pair is WKLC or USDT, falling back to router method');
        return await this.getKLCPriceFromRouter();
      }

      // Sanity check - KLC price should be very small (around $0.001)
      const MIN_REASONABLE_PRICE = 0.0001;  // $0.0001
      const MAX_REASONABLE_PRICE = 0.01;    // $0.01

      if (klcPrice === 0 || isNaN(klcPrice) || klcPrice < MIN_REASONABLE_PRICE || klcPrice > MAX_REASONABLE_PRICE) {
        console.log(`KLC price ${klcPrice} from subgraph is outside reasonable range (${MIN_REASONABLE_PRICE} to ${MAX_REASONABLE_PRICE}), falling back to router method`);
        return await this.getKLCPriceFromRouter();
      }

      console.log(`Final KLC price from subgraph: $${klcPrice}`);
      return klcPrice;
    } catch (error) {
      console.error('Error getting KLC price from subgraph:', error);
      console.log('Falling back to router method');
      return await this.getKLCPriceFromRouter();
    }
  },

  // Get KLC price using Router contract's getAmountsOut method
  async getKLCPriceFromRouter() {
    try {
      console.log('Getting KLC price from Router contract...');
      const provider = getProvider();
      const routerAbi = require('../../blockchain/abis/dex/routerABI.json');
      const routerContract = new ethers.Contract(ROUTER_ADDRESS, routerAbi, provider);

      // USDT address on KalyChain - using the correct address
      const usdtAddress = USDT_ADDRESS;

      // Log the addresses we're using
      console.log(`Using addresses: WKLC=${WKLC_ADDRESS}, USDT=${usdtAddress}, Router=${ROUTER_ADDRESS}`);

      // Amount of KLC to convert (1 KLC = 10^18 wei)
      const amountIn = ethers.utils.parseEther('1');

      // Path for the swap: KLC -> USDT
      const path = [WKLC_ADDRESS, usdtAddress];

      console.log(`Getting price for 1 KLC (${amountIn.toString()} wei) to USDT using path:`, path);

      // Call getAmountsOut to get the expected output amount
      const amounts = await routerContract.getAmountsOut(amountIn, path);
      console.log(`Router returned amounts: ${amounts.map(a => a.toString()).join(', ')}`);

      // Get USDT decimals (typically 6)
      const erc20Abi = [
        {
          "constant": true,
          "inputs": [],
          "name": "decimals",
          "outputs": [{"name": "", "type": "uint8"}],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        }
      ];

      const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, provider);
      const usdtDecimals = await usdtContract.decimals();

      console.log(`USDT decimals: ${usdtDecimals}`);

      // Convert the output amount to a decimal value
      const usdtAmount = ethers.utils.formatUnits(amounts[1], usdtDecimals);

      console.log(`1 KLC = ${usdtAmount} USDT`);

      // Convert to a number for easier use
      const klcPrice = parseFloat(usdtAmount);

      // Sanity check - KLC price should be very small (around $0.001)
      const MIN_REASONABLE_PRICE = 0.0001;  // $0.0001
      const MAX_REASONABLE_PRICE = 0.01;    // $0.01

      if (klcPrice === 0 || isNaN(klcPrice) || klcPrice < MIN_REASONABLE_PRICE || klcPrice > MAX_REASONABLE_PRICE) {
        console.log(`KLC price ${klcPrice} is outside reasonable range (${MIN_REASONABLE_PRICE} to ${MAX_REASONABLE_PRICE}), using fallback price`);
        return 0.001221; // Default fallback price
      }

      return klcPrice;
    } catch (error: any) {
      console.error('Error getting KLC price from Router:', error);
      console.error('Error details:', error.message || error);
      if (error.code === 'CALL_EXCEPTION') {
        console.error('This might be due to incorrect contract addresses or the pair not existing');
      }
      return 0.001221; // Default fallback price
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

  // Calculate liquidity for a specific pair using the router contract
  async calculatePairLiquidity(pairAddress: string) {
    try {
      console.log(`Calculating liquidity for pair ${pairAddress} using router contract...`);

      // Get the pair data from the subgraph
      const pair = await this.getPair(pairAddress.toLowerCase());

      if (!pair) {
        console.log(`Pair ${pairAddress} not found in subgraph`);
        return { reserveUSD: '0', reserveKLC: '0' };
      }

      console.log(`Pair data:`, {
        token0: {
          symbol: pair.token0.symbol,
          address: pair.token0.id,
          decimals: pair.token0.decimals
        },
        token1: {
          symbol: pair.token1.symbol,
          address: pair.token1.id,
          decimals: pair.token1.decimals
        },
        reserve0: pair.reserve0,
        reserve1: pair.reserve1
      });

      // Special case for WKLC/USDT pair
      if ((pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'USDT') ||
          (pair.token1.symbol === 'WKLC' && pair.token0.symbol === 'USDT')) {
        console.log('Special handling for WKLC/USDT pair');

        // Get WKLC price
        const wklcPrice = await this.getKLCPriceFromRouter();
        console.log(`WKLC price: $${wklcPrice}`);

        // Determine which token is WKLC and which is USDT
        let wklcReserve, usdtReserve;
        if (pair.token0.symbol === 'WKLC') {
          wklcReserve = parseFloat(pair.reserve0);
          usdtReserve = parseFloat(pair.reserve1);
          console.log(`WKLC is token0, reserve: ${wklcReserve}`);
          console.log(`USDT is token1, reserve: ${usdtReserve}`);
        } else {
          wklcReserve = parseFloat(pair.reserve1);
          usdtReserve = parseFloat(pair.reserve0);
          console.log(`WKLC is token1, reserve: ${wklcReserve}`);
          console.log(`USDT is token0, reserve: ${usdtReserve}`);
        }

        // Calculate USD values
        const wklcValueUSD = wklcReserve * wklcPrice;
        const usdtValueUSD = usdtReserve; // USDT is 1:1 with USD

        console.log(`WKLC value in USD: $${wklcValueUSD.toFixed(2)}`);
        console.log(`USDT value in USD: $${usdtValueUSD.toFixed(2)}`);

        const totalReserveUSD = wklcValueUSD + usdtValueUSD;
        console.log(`Total reserve in USD: $${totalReserveUSD.toFixed(2)}`);

        return {
          reserveUSD: totalReserveUSD.toString(),
          reserveKLC: (totalReserveUSD / wklcPrice).toString()
        };
      }

      // Get the provider and router contract
      const provider = getProvider();
      const routerAbi = require('../../blockchain/abis/dex/routerABI.json');
      const routerContract = new ethers.Contract(ROUTER_ADDRESS, routerAbi, provider);

      // Get token prices in USD
      let token0PriceUSD = 0;
      let token1PriceUSD = 0;

      // Special case for stablecoins
      if (pair.token0.symbol === 'USDT' || pair.token0.symbol === 'USDC' || pair.token0.symbol === 'DAI') {
        token0PriceUSD = 1.0;
        console.log(`Token0 (${pair.token0.symbol}) is a stablecoin, setting price to $1.00`);
      }
      // If token is WKLC, get its price directly
      else if (pair.token0.id.toLowerCase() === WKLC_ADDRESS.toLowerCase()) {
        token0PriceUSD = await this.getKLCPriceFromRouter();
        console.log(`Token0 (${pair.token0.symbol}) is WKLC, price: $${token0PriceUSD}`);
      } else {
        // Try to get price via router (token -> WKLC -> USDT)
        try {
          // Amount of token0 to convert (1 token = 10^decimals)
          const amountIn = ethers.utils.parseUnits('1', pair.token0.decimals);

          // USDT address - using the correct address
          const usdtAddress = USDT_ADDRESS;

          // Path for the swap: token0 -> WKLC -> USDT
          const path = [pair.token0.id, WKLC_ADDRESS, usdtAddress];

          console.log(`Getting price for 1 ${pair.token0.symbol} using path:`, path);

          // Call getAmountsOut to get the expected output amount
          const amounts = await routerContract.getAmountsOut(amountIn, path);

          // Get USDT decimals
          const erc20Abi = [
            {
              "constant": true,
              "inputs": [],
              "name": "decimals",
              "outputs": [{"name": "", "type": "uint8"}],
              "payable": false,
              "stateMutability": "view",
              "type": "function"
            }
          ];

          const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, provider);
          const usdtDecimals = await usdtContract.decimals();

          // Convert the output amount to a decimal value
          const usdtAmount = ethers.utils.formatUnits(amounts[2], usdtDecimals);

          // Convert to a number for easier use
          token0PriceUSD = parseFloat(usdtAmount);
          console.log(`Token0 (${pair.token0.symbol}) price: $${token0PriceUSD}`);
        } catch (error: any) {
          console.error(`Error getting price for token0 (${pair.token0.symbol}):`, error.message || error);
        }
      }

      // Special case for stablecoins
      if (pair.token1.symbol === 'USDT' || pair.token1.symbol === 'USDC' || pair.token1.symbol === 'DAI') {
        token1PriceUSD = 1.0;
        console.log(`Token1 (${pair.token1.symbol}) is a stablecoin, setting price to $1.00`);
      }
      // If token is WKLC, get its price directly
      else if (pair.token1.id.toLowerCase() === WKLC_ADDRESS.toLowerCase()) {
        token1PriceUSD = await this.getKLCPriceFromRouter();
        console.log(`Token1 (${pair.token1.symbol}) is WKLC, price: $${token1PriceUSD}`);
      } else {
        // Try to get price via router (token -> WKLC -> USDT)
        try {
          // Amount of token1 to convert (1 token = 10^decimals)
          const amountIn = ethers.utils.parseUnits('1', pair.token1.decimals);

          // USDT address - using the correct address
          const usdtAddress = USDT_ADDRESS;

          // Path for the swap: token1 -> WKLC -> USDT
          const path = [pair.token1.id, WKLC_ADDRESS, usdtAddress];

          console.log(`Getting price for 1 ${pair.token1.symbol} using path:`, path);

          // Call getAmountsOut to get the expected output amount
          const amounts = await routerContract.getAmountsOut(amountIn, path);

          // Get USDT decimals
          const erc20Abi = [
            {
              "constant": true,
              "inputs": [],
              "name": "decimals",
              "outputs": [{"name": "", "type": "uint8"}],
              "payable": false,
              "stateMutability": "view",
              "type": "function"
            }
          ];

          const usdtContract = new ethers.Contract(usdtAddress, erc20Abi, provider);
          const usdtDecimals = await usdtContract.decimals();

          // Convert the output amount to a decimal value
          const usdtAmount = ethers.utils.formatUnits(amounts[2], usdtDecimals);

          // Convert to a number for easier use
          token1PriceUSD = parseFloat(usdtAmount);
          console.log(`Token1 (${pair.token1.symbol}) price: $${token1PriceUSD}`);
        } catch (error: any) {
          console.error(`Error getting price for token1 (${pair.token1.symbol}):`, error.message || error);
        }
      }

      // If we couldn't get prices directly, try to derive them from the pair
      if (token0PriceUSD === 0 && token1PriceUSD > 0) {
        // If we have token1 price but not token0 price, derive token0 price from the pair ratio
        const reserve0 = parseFloat(pair.reserve0);
        const reserve1 = parseFloat(pair.reserve1);

        if (reserve0 > 0 && reserve1 > 0) {
          token0PriceUSD = (token1PriceUSD * reserve1) / reserve0;
          console.log(`Derived token0 (${pair.token0.symbol}) price from pair ratio: $${token0PriceUSD}`);
        }
      } else if (token1PriceUSD === 0 && token0PriceUSD > 0) {
        // If we have token0 price but not token1 price, derive token1 price from the pair ratio
        const reserve0 = parseFloat(pair.reserve0);
        const reserve1 = parseFloat(pair.reserve1);

        if (reserve0 > 0 && reserve1 > 0) {
          token1PriceUSD = (token0PriceUSD * reserve0) / reserve1;
          console.log(`Derived token1 (${pair.token1.symbol}) price from pair ratio: $${token1PriceUSD}`);
        }
      }

      // Calculate the reserves in USD
      const reserve0 = parseFloat(pair.reserve0);
      const reserve1 = parseFloat(pair.reserve1);

      const reserve0USD = reserve0 * token0PriceUSD;
      const reserve1USD = reserve1 * token1PriceUSD;

      const totalReserveUSD = reserve0USD + reserve1USD;

      // Calculate the reserves in KLC
      const klcPrice = await this.getKLCPriceFromRouter();
      const totalReserveKLC = klcPrice > 0 ? totalReserveUSD / klcPrice : 0;

      console.log(`Calculated liquidity for pair ${pair.token0.symbol}/${pair.token1.symbol}:`, {
        reserve0: reserve0,
        reserve1: reserve1,
        token0PriceUSD: token0PriceUSD,
        token1PriceUSD: token1PriceUSD,
        reserve0USD: reserve0USD,
        reserve1USD: reserve1USD,
        totalReserveUSD: totalReserveUSD,
        totalReserveKLC: totalReserveKLC
      });

      return {
        reserveUSD: totalReserveUSD.toString(),
        reserveKLC: totalReserveKLC.toString()
      };
    } catch (error: any) {
      console.error(`Error calculating liquidity for pair ${pairAddress}:`, error.message || error);
      return { reserveUSD: '0', reserveKLC: '0' };
    }
  },

  // Calculate total liquidity from all pairs
  async calculateTotalLiquidity() {
    try {
      console.log('Calculating total liquidity from all pairs...');

      // Get all pairs from the subgraph
      const allPairs = await this.getPairs(100); // Get up to 100 pairs

      if (!allPairs || allPairs.length === 0) {
        console.log('No pairs found, cannot calculate total liquidity');
        return { totalLiquidityUSD: '0', totalLiquidityKLC: '0' };
      }

      console.log(`Found ${allPairs.length} pairs to calculate liquidity`);

      let totalLiquidityUSD = 0;
      let totalLiquidityKLC = 0;

      // Calculate liquidity for each pair
      for (const pair of allPairs) {
        try {
          // Log detailed pair data for debugging
          console.log(`Detailed pair data for ${pair.token0.symbol}/${pair.token1.symbol}:`, {
            id: pair.id,
            token0: {
              symbol: pair.token0.symbol,
              derivedKLC: pair.token0.derivedKLC,
              decimals: pair.token0.decimals
            },
            token1: {
              symbol: pair.token1.symbol,
              derivedKLC: pair.token1.derivedKLC,
              decimals: pair.token1.decimals
            },
            reserve0: pair.reserve0,
            reserve1: pair.reserve1,
            reserveUSD: pair.reserveUSD,
            reserveKLC: pair.reserveKLC,
            token0Price: pair.token0Price,
            token1Price: pair.token1Price
          });

          // Calculate the reserves in USD manually to verify
          const reserve0 = parseFloat(pair.reserve0);
          const reserve1 = parseFloat(pair.reserve1);

          // Get KLC price from the router
          const routerKLCPrice = await this.getKLCPriceFromRouter();

          // Special handling for WKLC/USDT pair
          if ((pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'USDT') ||
              (pair.token1.symbol === 'WKLC' && pair.token0.symbol === 'USDT')) {
            console.log('Special handling for WKLC/USDT pair in calculateTotalLiquidity');

            // Determine which token is WKLC and which is USDT
            let wklcReserve, usdtReserve;
            if (pair.token0.symbol === 'WKLC') {
              wklcReserve = reserve0;
              usdtReserve = reserve1;
              console.log(`WKLC is token0, reserve: ${wklcReserve}`);
              console.log(`USDT is token1, reserve: ${usdtReserve}`);
            } else {
              wklcReserve = reserve1;
              usdtReserve = reserve0;
              console.log(`WKLC is token1, reserve: ${wklcReserve}`);
              console.log(`USDT is token0, reserve: ${usdtReserve}`);
            }

            // Calculate USD values
            const wklcValueUSD = wklcReserve * routerKLCPrice;
            const usdtValueUSD = usdtReserve; // USDT is 1:1 with USD

            console.log(`WKLC value in USD: $${wklcValueUSD.toFixed(2)}`);
            console.log(`USDT value in USD: $${usdtValueUSD.toFixed(2)}`);

            const manualReserveUSD = wklcValueUSD + usdtValueUSD;
            console.log(`Total reserve in USD: $${manualReserveUSD.toFixed(2)}`);

            // Calculate reserves in KLC
            const manualReserveKLC = routerKLCPrice > 0 ? manualReserveUSD / routerKLCPrice : 0;

            console.log(`Manual calculation for ${pair.token0.symbol}/${pair.token1.symbol}:`, {
              reserve0: reserve0,
              reserve1: reserve1,
              token0DerivedKLC: parseFloat(pair.token0.derivedKLC || '0'),
              token1DerivedKLC: parseFloat(pair.token1.derivedKLC || '0'),
              routerKLCPrice: routerKLCPrice,
              manualReserveKLC: manualReserveKLC,
              manualReserveUSD: manualReserveUSD,
              subgraphReserveUSD: parseFloat(pair.reserveUSD || '0')
            });

            // Use our manually calculated reserveUSD instead of the subgraph value
            const pairLiquidityUSD = manualReserveUSD;
            totalLiquidityUSD += pairLiquidityUSD;

            // Calculate KLC equivalent
            totalLiquidityKLC += manualReserveKLC;

            console.log(`Pair ${pair.token0.symbol}/${pair.token1.symbol}: calculated reserveUSD = ${pairLiquidityUSD.toFixed(2)} (subgraph value: ${parseFloat(pair.reserveUSD || '0').toFixed(2)})`);

            continue; // Skip the rest of the loop for this pair
          }

          // Special handling for stablecoins
          let reserve0USD = 0;
          let reserve1USD = 0;

          // Check if token0 is a stablecoin
          if (pair.token0.symbol === 'USDT' || pair.token0.symbol === 'USDC' || pair.token0.symbol === 'DAI') {
            reserve0USD = reserve0; // 1:1 with USD
            console.log(`Token0 (${pair.token0.symbol}) is a stablecoin, using direct USD value: $${reserve0USD}`);
          } else {
            const token0DerivedKLC = parseFloat(pair.token0.derivedKLC || '0');
            reserve0USD = reserve0 * token0DerivedKLC * routerKLCPrice;
          }

          // Check if token1 is a stablecoin
          if (pair.token1.symbol === 'USDT' || pair.token1.symbol === 'USDC' || pair.token1.symbol === 'DAI') {
            reserve1USD = reserve1; // 1:1 with USD
            console.log(`Token1 (${pair.token1.symbol}) is a stablecoin, using direct USD value: $${reserve1USD}`);
          } else {
            const token1DerivedKLC = parseFloat(pair.token1.derivedKLC || '0');
            reserve1USD = reserve1 * token1DerivedKLC * routerKLCPrice;
          }

          // Calculate total reserves in USD
          const manualReserveUSD = reserve0USD + reserve1USD;

          // Calculate reserves in KLC
          const manualReserveKLC = routerKLCPrice > 0 ? manualReserveUSD / routerKLCPrice : 0;

          console.log(`Manual calculation for ${pair.token0.symbol}/${pair.token1.symbol}:`, {
            reserve0: reserve0,
            reserve1: reserve1,
            token0DerivedKLC: parseFloat(pair.token0.derivedKLC || '0'),
            token1DerivedKLC: parseFloat(pair.token1.derivedKLC || '0'),
            routerKLCPrice: routerKLCPrice,
            manualReserveKLC: manualReserveKLC,
            manualReserveUSD: manualReserveUSD,
            subgraphReserveUSD: parseFloat(pair.reserveUSD || '0')
          });

          // Use our manually calculated reserveUSD instead of the subgraph value
          const pairLiquidityUSD = manualReserveUSD;
          totalLiquidityUSD += pairLiquidityUSD;

          // Calculate KLC equivalent
          totalLiquidityKLC += manualReserveKLC;

          console.log(`Pair ${pair.token0.symbol}/${pair.token1.symbol}: calculated reserveUSD = ${pairLiquidityUSD.toFixed(2)} (subgraph value: ${parseFloat(pair.reserveUSD || '0').toFixed(2)})`);
        } catch (error: any) {
          console.error(`Error calculating liquidity for pair ${pair.token0?.symbol || 'unknown'}/${pair.token1?.symbol || 'unknown'}:`, error.message || error);
        }
      }

      console.log(`Total calculated liquidity: $${totalLiquidityUSD.toFixed(2)} (${totalLiquidityKLC.toFixed(2)} KLC)`);

      return {
        totalLiquidityUSD: totalLiquidityUSD.toString(),
        totalLiquidityKLC: totalLiquidityKLC.toString()
      };
    } catch (error: any) {
      console.error('Error calculating total liquidity:', error.message || error);
      return { totalLiquidityUSD: '0', totalLiquidityKLC: '0' };
    }
  },

  // Get pair day data for 24h volume calculations
  async getPairDayData(first = 10, skip = 0) {
    if (USE_MOCK_DATA) {
      return [];
    }

    // Get today's date ID (days since epoch)
    const today = Math.floor(Date.now() / 1000 / 86400);

    const query = gql`
      query getPairDayData($first: Int!, $skip: Int!, $date: Int!) {
        pairDayDatas(
          first: $first,
          skip: $skip,
          where: { date: $date },
          orderBy: volumeUSD,
          orderDirection: desc
        ) {
          id
          date
          pair {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          volumeUSD
          volumeToken0
          volumeToken1
          txCount
        }
      }
    `;

    try {
      const { pairDayDatas } = await dexClient.request(query, { first, skip, date: today });
      return pairDayDatas;
    } catch (error) {
      console.error('Error fetching pair day data:', error);
      return [];
    }
  },

  // Get router data
  async getRouter() {
    if (USE_MOCK_DATA) {
      return {
        id: '0x183f288bf7eebe1a3f318f4681df4a70ef32b2f3',
        address: '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3',
        totalSwaps: '1000',
        totalVolumeUSD: '500000',
        totalVolumeKLC: '250000'
      };
    }

    const query = gql`
      query {
        router(id: "0x183f288bf7eebe1a3f318f4681df4a70ef32b2f3") {
          id
          address
          factory
          WKLC
          totalSwaps
          totalVolumeUSD
          totalVolumeKLC
          createdAt
          updatedAt
        }
      }
    `;

    try {
      const { router } = await dexClient.request(query);
      return router;
    } catch (error) {
      console.error('Error fetching router:', error);
      return null;
    }
  },

  // Get router swaps
  async getRouterSwaps(first = 100, skip = 0) {
    if (USE_MOCK_DATA) {
      return [];
    }

    const query = gql`
      query getRouterSwaps($first: Int!, $skip: Int!) {
        routerSwaps(
          first: $first,
          skip: $skip,
          orderBy: timestamp,
          orderDirection: desc
        ) {
          id
          router {
            id
          }
          transactionHash
          sender
          recipient
          path
          amountIn
          amountOut
          amountInUSD
          amountOutUSD
          swapType
          timestamp
          blockNumber
        }
      }
    `;

    try {
      const { routerSwaps } = await dexClient.request(query, { first, skip });
      return routerSwaps;
    } catch (error) {
      console.error('Error fetching router swaps:', error);
      return [];
    }
  },

  // Get LP staking data
  async getLPStakingData() {
    if (USE_MOCK_DATA) {
      return {
        stakingPools: [{
          id: '0x2bd4b7f303c1f372689d52a55ec202e0cf831a26',
          totalStaked: '6642973370737734929062',
          rewardRate: '0',
          periodFinish: '1748028413',
          lastUpdateTime: '1747942013',
          stakingToken: { symbol: 'KSL', decimals: 18 },
          rewardsToken: { symbol: 'KSWAP', decimals: 18 },
          stakers: []
        }]
      };
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
          createdAt
          updatedAt
          stakingToken {
            id
            symbol
            name
            decimals
          }
          rewardsToken {
            id
            symbol
            name
            decimals
          }
        }
        stakers(first: 100) {
          id
          address
          stakedAmount
          rewards
          rewardPerTokenPaid
          lastAction
          lastActionTimestamp
          pool {
            id
          }
        }
        stakeEvents(first: 50) {
          id
          staker {
            address
          }
          pool {
            id
          }
          amount
          timestamp
          blockNumber
          transactionHash
        }
        rewardEvents(first: 50) {
          id
          staker {
            address
          }
          pool {
            id
          }
          amount
          timestamp
          blockNumber
          transactionHash
        }
      }
    `;

    try {
      const data = await dexClient.request(query);
      return data;
    } catch (error) {
      console.error('Error fetching LP staking data:', error);
      return {
        stakingPools: [],
        stakers: [],
        stakeEvents: [],
        rewardEvents: []
      };
    }
  },

  // Get swap transactions from subgraph
  async getSwaps(first: number = 10, skip: number = 0, userAddress?: string) {
    if (USE_MOCK_DATA) {
      return [];
    }

    const baseQuery = `
      swaps(
        first: $first
        skip: $skip
        orderBy: timestamp
        orderDirection: desc
        ${userAddress ? `where: { or: [{ sender: "${userAddress.toLowerCase()}" }, { to: "${userAddress.toLowerCase()}" }] }` : ''}
      ) {
        id
        transaction {
          id
          timestamp
        }
        timestamp
        pair {
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
        }
        sender
        to
        amount0In
        amount1In
        amount0Out
        amount1Out
        amountUSD
      }
    `;

    const query = gql`
      query GetSwaps($first: Int!, $skip: Int!) {
        ${baseQuery}
      }
    `;

    try {
      const result = await dexClient.request(query, { first, skip });
      console.log(`Fetched ${result.swaps?.length || 0} swaps from subgraph`);
      return result.swaps || [];
    } catch (error) {
      console.error('Error fetching swaps from subgraph:', error);
      return [];
    }
  },

  // Get DEX overview data for dashboard
  async getDexOverview() {
    try {
      // Get data from subgraph
      const [factory, dayData, pairs, pairDayData] = await Promise.all([
        this.getFactory(),
        this.getDexDayData(1),
        this.getPairs(100), // Fetch more pairs to get a more accurate total liquidity
        this.getPairDayData(100) // Get today's volume data for each pair
      ]);

      // First try to get KLC price from the subgraph
      let klcPrice = await this.getKLCPriceFromSubgraph();
      console.log(`KLC price: $${klcPrice}`);

      // Calculate total liquidity from pairs
      let totalLiquidityUSD = 0;
      let totalLiquidityKLC = 0;

      // Log the pairs data for debugging
      console.log(`Calculating total liquidity from ${pairs.length} pairs...`);

      // Create a factory object if it doesn't exist
      const factoryData = factory || {
        id: FACTORY_ADDRESS.toLowerCase(),
        address: FACTORY_ADDRESS,
        pairCount: '0',
        totalVolumeUSD: '0',
        totalVolumeKLC: '0',
        totalLiquidityUSD: '0',
        totalLiquidityKLC: '0',
        txCount: '0'
      };

      // Update factory data with calculated liquidity
      console.log('Factory data before updating liquidity:', {
        totalLiquidityUSD: factoryData.totalLiquidityUSD,
        totalLiquidityKLC: factoryData.totalLiquidityKLC
      });

      // Create a map of pair day data for quick lookup
      const pairDayDataMap = new Map();
      pairDayData.forEach((dayData: any) => {
        pairDayDataMap.set(dayData.pair.id, dayData);
      });

      // Update the reserveUSD values for each pair using the router contract
      const updatedPairs = await Promise.all(pairs.map(async (pair: any) => {
        try {
          // Calculate the reserves in USD manually
          const reserve0 = parseFloat(pair.reserve0);
          const reserve1 = parseFloat(pair.reserve1);

          // Get 24h volume data for this pair
          const dayData = pairDayDataMap.get(pair.id);
          const volume24h = dayData ? parseFloat(dayData.volumeUSD || '0') : 0;

          // Special handling for WKLC/USDT pair
          if ((pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'USDT') ||
              (pair.token1.symbol === 'WKLC' && pair.token0.symbol === 'USDT')) {
            console.log('Special handling for WKLC/USDT pair in getDexOverview');

            // Determine which token is WKLC and which is USDT
            let wklcReserve, usdtReserve;
            if (pair.token0.symbol === 'WKLC') {
              wklcReserve = reserve0;
              usdtReserve = reserve1;
              console.log(`WKLC is token0, reserve: ${wklcReserve}`);
              console.log(`USDT is token1, reserve: ${usdtReserve}`);
            } else {
              wklcReserve = reserve1;
              usdtReserve = reserve0;
              console.log(`WKLC is token1, reserve: ${wklcReserve}`);
              console.log(`USDT is token0, reserve: ${usdtReserve}`);
            }

            // Calculate USD values
            const wklcValueUSD = wklcReserve * klcPrice;
            const usdtValueUSD = usdtReserve; // USDT is 1:1 with USD

            console.log(`WKLC value in USD: $${wklcValueUSD.toFixed(2)}`);
            console.log(`USDT value in USD: $${usdtValueUSD.toFixed(2)}`);

            const reserveUSD = wklcValueUSD + usdtValueUSD;
            console.log(`Total reserve in USD: $${reserveUSD.toFixed(2)}`);

            // Calculate reserves in KLC
            const reserveKLC = klcPrice > 0 ? reserveUSD / klcPrice : 0;

            console.log(`Calculated liquidity for ${pair.token0.symbol}/${pair.token1.symbol}: $${reserveUSD.toFixed(2)}`);

            // Add to total liquidity
            totalLiquidityUSD += reserveUSD;
            totalLiquidityKLC += reserveKLC;

            // Return updated pair with calculated reserveUSD and 24h volume
            return {
              ...pair,
              reserveUSD: reserveUSD.toString(),
              reserveKLC: reserveKLC.toString(),
              volume24h: volume24h.toString()
            };
          }

          // Special handling for stablecoins
          let reserve0USD = 0;
          let reserve1USD = 0;

          // Check if token0 is a stablecoin
          if (pair.token0.symbol === 'USDT' || pair.token0.symbol === 'USDC' || pair.token0.symbol === 'DAI') {
            reserve0USD = reserve0; // 1:1 with USD
            console.log(`Token0 (${pair.token0.symbol}) is a stablecoin, using direct USD value: $${reserve0USD}`);
          } else {
            const token0DerivedKLC = parseFloat(pair.token0.derivedKLC || '0');
            reserve0USD = reserve0 * token0DerivedKLC * klcPrice;
          }

          // Check if token1 is a stablecoin
          if (pair.token1.symbol === 'USDT' || pair.token1.symbol === 'USDC' || pair.token1.symbol === 'DAI') {
            reserve1USD = reserve1; // 1:1 with USD
            console.log(`Token1 (${pair.token1.symbol}) is a stablecoin, using direct USD value: $${reserve1USD}`);
          } else {
            const token1DerivedKLC = parseFloat(pair.token1.derivedKLC || '0');
            reserve1USD = reserve1 * token1DerivedKLC * klcPrice;
          }

          // Calculate total reserves in USD
          const reserveUSD = reserve0USD + reserve1USD;

          // Calculate reserves in KLC
          const reserveKLC = klcPrice > 0 ? reserveUSD / klcPrice : 0;

          console.log(`Calculated liquidity for ${pair.token0.symbol}/${pair.token1.symbol}: $${reserveUSD.toFixed(2)}`);

          // Add to total liquidity
          totalLiquidityUSD += reserveUSD;
          totalLiquidityKLC += reserveKLC;

          // Return updated pair with calculated reserveUSD and 24h volume
          return {
            ...pair,
            reserveUSD: reserveUSD.toString(),
            reserveKLC: reserveKLC.toString(),
            volume24h: volume24h.toString()
          };
        } catch (error: any) {
          console.error(`Error calculating liquidity for pair ${pair.token0?.symbol || 'unknown'}/${pair.token1?.symbol || 'unknown'}:`, error.message || error);
          return pair;
        }
      }));

      console.log(`Total calculated liquidity: $${totalLiquidityUSD.toFixed(2)} (${totalLiquidityKLC.toFixed(2)} KLC)`);

      // Update with our calculated values
      factoryData.totalLiquidityUSD = totalLiquidityUSD.toString();
      factoryData.totalLiquidityKLC = totalLiquidityKLC.toString();

      console.log('Factory data after updating liquidity:', {
        totalLiquidityUSD: factoryData.totalLiquidityUSD,
        totalLiquidityKLC: factoryData.totalLiquidityKLC
      });

      // Create overview object
      const overview = {
        factory: factoryData,
        dayData: dayData && dayData.length > 0 ? dayData[0] : null,
        topPairs: updatedPairs,
        klcPrice
      };

      console.log('DEX overview data:', JSON.stringify({
        factoryId: overview.factory?.id,
        totalLiquidityUSD: overview.factory?.totalLiquidityUSD,
        totalLiquidityKLC: overview.factory?.totalLiquidityKLC,
        pairCount: overview.factory?.pairCount,
        klcPrice: overview.klcPrice
      }, null, 2));

      return overview;
    } catch (error: any) {
      console.error('Error fetching DEX overview:', error.message || error);
      return {
        factory: {
          id: FACTORY_ADDRESS.toLowerCase(),
          address: FACTORY_ADDRESS,
          pairCount: '0',
          totalVolumeUSD: '0',
          totalVolumeKLC: '0',
          totalLiquidityUSD: '0',
          totalLiquidityKLC: '0',
          txCount: '0'
        },
        dayData: null,
        topPairs: [],
        klcPrice: 0.001221
      };
    }
  },

  // Router related queries
  async getRouter() {
    if (USE_MOCK_DATA) {
      return {
        id: ROUTER_ADDRESS.toLowerCase(),
        address: ROUTER_ADDRESS,
        factory: FACTORY_ADDRESS,
        WKLC: WKLC_ADDRESS,
        totalSwaps: '1000',
        totalVolumeUSD: '500000',
        totalVolumeKLC: '250000',
        createdAt: '1625097600',
        updatedAt: '1625097600'
      };
    }

    const query = gql`
      query {
        router(id: "${ROUTER_ADDRESS.toLowerCase()}") {
          id
          address
          factory
          WKLC
          totalSwaps
          totalVolumeUSD
          totalVolumeKLC
          createdAt
          updatedAt
        }
      }
    `;

    try {
      const { router } = await dexClient.request(query);
      return router;
    } catch (error) {
      console.error('Error fetching router:', error);
      return null;
    }
  },

  async getRouterSwaps(first = 50, skip = 0) {
    if (USE_MOCK_DATA) {
      return [
        {
          id: '0x1234567890123456789012345678901234567890-0',
          router: {
            id: ROUTER_ADDRESS.toLowerCase()
          },
          transactionHash: '0x1234567890123456789012345678901234567890',
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x1234567890123456789012345678901234567890',
          path: [WKLC_ADDRESS, KSWAP_ADDRESS],
          amountIn: '1000000000000000000',
          amountOut: '5000000000000000000',
          amountInUSD: '1.22',
          amountOutUSD: '6.10',
          swapType: 'exactTokensForTokens',
          timestamp: '1625097600',
          blockNumber: '6880000'
        }
      ];
    }

    const query = gql`
      query getRouterSwaps($first: Int!, $skip: Int!) {
        routerSwaps(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
          id
          router {
            id
          }
          transactionHash
          sender
          recipient
          path
          amountIn
          amountOut
          amountInUSD
          amountOutUSD
          swapType
          timestamp
          blockNumber
        }
      }
    `;

    try {
      const { routerSwaps } = await dexClient.request(query, { first, skip });
      return routerSwaps;
    } catch (error) {
      console.error('Error fetching router swaps:', error);
      return [];
    }
  },

  async getTokensVestedEvents(first = 50, skip = 0) {
    if (USE_MOCK_DATA) {
      return [
        {
          id: '0x1234567890123456789012345678901234567890-0',
          vester: {
            id: TREASURY_VESTER_ADDRESS.toLowerCase()
          },
          amount: '1000000000000000000000',
          recipient: LIQUIDITY_POOL_MANAGER_ADDRESS,
          timestamp: '1625097600',
          blockNumber: '6880000',
          transactionHash: '0x1234567890123456789012345678901234567890'
        }
      ];
    }

    const query = gql`
      query getTokensVestedEvents($first: Int!, $skip: Int!) {
        tokensVestedEvents(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
          id
          vester {
            id
          }
          amount
          recipient
          timestamp
          blockNumber
          transactionHash
        }
      }
    `;

    try {
      const { tokensVestedEvents } = await dexClient.request(query, { first, skip });
      return tokensVestedEvents;
    } catch (error) {
      console.error('Error fetching tokens vested events:', error);
      return [];
    }
  }
};
