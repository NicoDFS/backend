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
const WKLC_USDT_PAIR_ADDRESS = '0x25FDDaF836d12dC5e285823a644bb86E0b79c8e2';
const USDT_ADDRESS = '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A';

// Helper functions
const getCurrentTimestamp = () => Math.floor(Date.now() / 1000);
const getDaysAgoTimestamp = (days: number) => getCurrentTimestamp() - (days * 24 * 60 * 60);
const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

const dexClient = getGraphQLClient('dex');

export const DexService = {
  /**
   * Get factory data from the v2-subgraph
   * @returns Factory data including pair count, volume, and liquidity metrics
   */
  async getFactory() {
    const query = gql`
      query {
        KalyswapFactory(id: "${FACTORY_ADDRESS.toLowerCase()}") {
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

    try {
      const result = await dexClient.request(query);
      const factory = result.KalyswapFactory;
      
      if (!factory) {
        console.warn('Factory not found in subgraph');
        return null;
      }

      console.log('Factory data from v2-subgraph:', JSON.stringify(factory, null, 2));
      return factory;
    } catch (error) {
      console.error('Error fetching factory data:', error);
      return null;
    }
  },

  /**
   * Get pairs data from the v2-subgraph
   * @param first Number of pairs to fetch
   * @param skip Number of pairs to skip
   * @param orderBy Field to order by
   * @param orderDirection Order direction (asc/desc)
   * @returns Array of pair data
   */
  async getPairs(first = 100, skip = 0, orderBy = 'reserveUSD', orderDirection = 'desc') {
    const query = gql`
      query getPairs($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        pairs(
          first: $first,
          skip: $skip,
          orderBy: $orderBy,
          orderDirection: $orderDirection,
          where: { reserveUSD_gt: "0" }
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
          reserveKLC
          reserveUSD
          token0Price
          token1Price
          volumeUSD
          volumeToken0
          volumeToken1
          txCount
          createdAtTimestamp
          createdAtBlockNumber
        }
      }
    `;

    try {
      const result = await dexClient.request(query, {
        first,
        skip,
        orderBy,
        orderDirection
      });

      const pairs = result.pairs || [];
      console.log(`Fetched ${pairs.length} pairs from v2-subgraph`);
      return pairs;
    } catch (error) {
      console.error('Error fetching pairs:', error);
      return [];
    }
  },

  /**
   * Get specific pair data by address
   * @param pairAddress The pair contract address
   * @returns Pair data or null if not found
   */
  async getPair(pairAddress: string) {
    const query = gql`
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
          reserveKLC
          reserveUSD
          token0Price
          token1Price
          volumeUSD
          volumeToken0
          volumeToken1
          txCount
          createdAtTimestamp
          createdAtBlockNumber
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { id: pairAddress.toLowerCase() });
      return result.pair;
    } catch (error) {
      console.error(`Error fetching pair ${pairAddress}:`, error);
      return null;
    }
  },

  /**
   * Get token data by address
   * @param tokenAddress The token contract address
   * @returns Token data or null if not found
   */
  async getToken(tokenAddress: string) {
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
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { id: tokenAddress.toLowerCase() });
      return result.token;
    } catch (error) {
      console.error(`Error fetching token ${tokenAddress}:`, error);
      return null;
    }
  },

  /**
   * Get bundle data (KLC price in USD)
   * @returns Bundle data with KLC price
   */
  async getBundle() {
    const query = gql`
      query {
        bundle(id: "1") {
          id
          klcPrice
        }
      }
    `;

    try {
      const result = await dexClient.request(query);
      return result.bundle;
    } catch (error) {
      console.error('Error fetching bundle data:', error);
      return null;
    }
  },

  /**
   * Get day data for KalySwap
   * @param first Number of day data entries to fetch
   * @param skip Number of entries to skip
   * @returns Array of day data
   */
  async getDexDayData(first = 30, skip = 0) {
    const query = gql`
      query getDayData($first: Int!, $skip: Int!) {
        kalyswapDayDatas(
          first: $first,
          skip: $skip,
          orderBy: date,
          orderDirection: desc
        ) {
          id
          date
          dailyVolumeUSD
          dailyVolumeKLC
          totalVolumeUSD
          totalVolumeKLC
          totalLiquidityUSD
          totalLiquidityKLC
          txCount
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { first, skip });
      return result.kalyswapDayDatas || [];
    } catch (error) {
      console.error('Error fetching day data:', error);
      return [];
    }
  },

  /**
   * Get pair day data
   * @param pairAddress The pair contract address
   * @param first Number of day data entries to fetch
   * @param skip Number of entries to skip
   * @returns Array of pair day data
   */
  async getPairDayData(pairAddress: string, first = 30, skip = 0) {
    const query = gql`
      query getPairDayData($pairAddress: Bytes!, $first: Int!, $skip: Int!) {
        pairDayDatas(
          where: { pairAddress: $pairAddress }
          first: $first,
          skip: $skip,
          orderBy: date,
          orderDirection: desc
        ) {
          id
          date
          pairAddress
          dailyVolumeToken0
          dailyVolumeToken1
          dailyVolumeUSD
          dailyTxns
          reserve0
          reserve1
          reserveUSD
          totalSupply
        }
      }
    `;

    try {
      const result = await dexClient.request(query, {
        pairAddress: pairAddress.toLowerCase(),
        first,
        skip
      });
      return result.pairDayDatas || [];
    } catch (error) {
      console.error(`Error fetching pair day data for ${pairAddress}:`, error);
      return [];
    }
  },

  /**
   * Get token day data
   * @param tokenAddress The token contract address
   * @param first Number of day data entries to fetch
   * @param skip Number of entries to skip
   * @returns Array of token day data
   */
  async getTokenDayData(tokenAddress: string, first = 30, skip = 0) {
    const query = gql`
      query getTokenDayData($tokenAddress: String!, $first: Int!, $skip: Int!) {
        tokenDayDatas(
          where: { token: $tokenAddress }
          first: $first,
          skip: $skip,
          orderBy: date,
          orderDirection: desc
        ) {
          id
          date
          dailyVolumeToken
          dailyVolumeKLC
          dailyVolumeUSD
          dailyTxns
          totalLiquidityToken
          totalLiquidityKLC
          totalLiquidityUSD
          priceUSD
        }
      }
    `;

    try {
      const result = await dexClient.request(query, {
        tokenAddress: tokenAddress.toLowerCase(),
        first,
        skip
      });
      return (result as any).tokenDayDatas || [];
    } catch (error) {
      console.error(`Error fetching token day data for ${tokenAddress}:`, error);
      return [];
    }
  },

  /**
   * Get swap transactions
   * @param first Number of swaps to fetch
   * @param skip Number of swaps to skip
   * @param userAddress Optional user address to filter by
   * @returns Array of swap transactions
   */
  async getSwaps(first = 100, skip = 0, userAddress?: string) {
    const whereClause = userAddress
      ? `where: { or: [{ from: "${userAddress.toLowerCase()}" }, { to: "${userAddress.toLowerCase()}" }] }`
      : '';

    const query = gql`
      query getSwaps($first: Int!, $skip: Int!) {
        swaps(
          ${whereClause}
          first: $first,
          skip: $skip,
          orderBy: timestamp,
          orderDirection: desc
        ) {
          id
          transaction {
            id
            blockNumber
            timestamp
          }
          pair {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
          }
          sender
          from
          to
          amount0In
          amount1In
          amount0Out
          amount1Out
          amountUSD
          logIndex
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { first, skip });
      return (result as any).swaps || [];
    } catch (error) {
      console.error('Error fetching swaps:', error);
      return [];
    }
  },

  /**
   * Get mint transactions (liquidity additions)
   * @param first Number of mints to fetch
   * @param skip Number of mints to skip
   * @param userAddress Optional user address to filter by
   * @returns Array of mint transactions
   */
  async getMints(first = 100, skip = 0, userAddress?: string) {
    const whereClause = userAddress
      ? `where: { to: "${userAddress.toLowerCase()}" }`
      : '';

    const query = gql`
      query getMints($first: Int!, $skip: Int!) {
        mints(
          ${whereClause}
          first: $first,
          skip: $skip,
          orderBy: timestamp,
          orderDirection: desc
        ) {
          id
          transaction {
            id
            blockNumber
            timestamp
          }
          pair {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
          }
          to
          liquidity
          amount0
          amount1
          amountUSD
          logIndex
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { first, skip });
      return (result as any).mints || [];
    } catch (error) {
      console.error('Error fetching mints:', error);
      return [];
    }
  },

  /**
   * Get burn transactions (liquidity removals)
   * @param first Number of burns to fetch
   * @param skip Number of burns to skip
   * @param userAddress Optional user address to filter by
   * @returns Array of burn transactions
   */
  async getBurns(first = 100, skip = 0, userAddress?: string) {
    const whereClause = userAddress
      ? `where: { sender: "${userAddress.toLowerCase()}" }`
      : '';

    const query = gql`
      query getBurns($first: Int!, $skip: Int!) {
        burns(
          ${whereClause}
          first: $first,
          skip: $skip,
          orderBy: timestamp,
          orderDirection: desc
        ) {
          id
          transaction {
            id
            blockNumber
            timestamp
          }
          pair {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
          }
          sender
          to
          liquidity
          amount0
          amount1
          amountUSD
          logIndex
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { first, skip });
      return (result as any).burns || [];
    } catch (error) {
      console.error('Error fetching burns:', error);
      return [];
    }
  },

  /**
   * Get DEX overview data for dashboard
   * @returns Comprehensive DEX statistics
   */
  async getDexOverview() {
    try {
      const [factory, dayData, pairs, bundle] = await Promise.all([
        this.getFactory(),
        this.getDexDayData(1),
        this.getPairs(100),
        this.getBundle()
      ]);

      const totalLiquidityUSD = factory?.totalLiquidityUSD || '0';
      const totalVolumeUSD = factory?.totalVolumeUSD || '0';
      const pairCount = factory?.pairCount || 0;
      const txCount = factory?.txCount || '0';
      const klcPrice = bundle?.klcPrice || '0';

      // Calculate 24h volume from day data
      const volume24h = dayData?.[0]?.dailyVolumeUSD || '0';

      return {
        totalLiquidityUSD,
        totalVolumeUSD,
        volume24h,
        pairCount,
        txCount,
        klcPrice,
        pairs: pairs.slice(0, 10), // Top 10 pairs
        dayData: dayData.slice(0, 7) // Last 7 days
      };
    } catch (error) {
      console.error('Error fetching DEX overview:', error);
      return {
        totalLiquidityUSD: '0',
        totalVolumeUSD: '0',
        volume24h: '0',
        pairCount: 0,
        txCount: '0',
        klcPrice: '0',
        pairs: [],
        dayData: []
      };
    }
  },

  /**
   * Get user's transaction history
   * @param userAddress User's wallet address
   * @param first Number of transactions to fetch
   * @param skip Number of transactions to skip
   * @returns Combined array of user's swaps, mints, and burns
   */
  async getUserTransactions(userAddress: string, first = 50, skip = 0) {
    try {
      const [swaps, mints, burns] = await Promise.all([
        this.getSwaps(first, skip, userAddress),
        this.getMints(first, skip, userAddress),
        this.getBurns(first, skip, userAddress)
      ]);

      // Combine and sort by timestamp
      const allTransactions = [
        ...swaps.map((tx: any) => ({ ...tx, type: 'swap' })),
        ...mints.map((tx: any) => ({ ...tx, type: 'mint' })),
        ...burns.map((tx: any) => ({ ...tx, type: 'burn' }))
      ].sort((a: any, b: any) =>
        parseInt(b.transaction.timestamp) - parseInt(a.transaction.timestamp)
      );

      return allTransactions.slice(0, first);
    } catch (error) {
      console.error(`Error fetching user transactions for ${userAddress}:`, error);
      return [];
    }
  },

  /**
   * Get top tokens by volume or liquidity
   * @param first Number of tokens to fetch
   * @param orderBy Field to order by (tradeVolumeUSD or totalLiquidity)
   * @returns Array of top tokens
   */
  async getTopTokens(first = 20, orderBy = 'tradeVolumeUSD') {
    const query = gql`
      query getTopTokens($first: Int!, $orderBy: String!) {
        tokens(
          first: $first,
          orderBy: $orderBy,
          orderDirection: desc,
          where: { totalLiquidity_gt: "1000" }
        ) {
          id
          symbol
          name
          decimals
          tradeVolume
          tradeVolumeUSD
          totalLiquidity
          derivedKLC
          txCount
        }
      }
    `;

    try {
      const result = await dexClient.request(query, { first, orderBy });
      return (result as any).tokens || [];
    } catch (error) {
      console.error('Error fetching top tokens:', error);
      return [];
    }
  },

  /**
   * Search for pairs by token symbols or addresses
   * @param searchTerm Token symbol or address to search for
   * @param first Number of results to return
   * @returns Array of matching pairs
   */
  async searchPairs(searchTerm: string, first = 10) {
    const query = gql`
      query searchPairs($searchTerm: String!, $first: Int!) {
        pairs(
          first: $first,
          where: {
            or: [
              { token0_: { symbol_contains_nocase: $searchTerm } },
              { token1_: { symbol_contains_nocase: $searchTerm } },
              { token0_: { id: $searchTerm } },
              { token1_: { id: $searchTerm } }
            ]
          },
          orderBy: reserveUSD,
          orderDirection: desc
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
          reserveUSD
          volumeUSD
          txCount
        }
      }
    `;

    try {
      const result = await dexClient.request(query, {
        searchTerm: searchTerm.toLowerCase(),
        first
      });
      return (result as any).pairs || [];
    } catch (error) {
      console.error(`Error searching pairs for "${searchTerm}":`, error);
      return [];
    }
  }
};
