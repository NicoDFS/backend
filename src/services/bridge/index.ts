import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import axios from 'axios';
import { KALYCHAIN_DOMAIN, KALYCHAIN_TOKENS, KALYCHAIN_WARP_ROUTES } from '../../config/chain';

// Shapes returned by the bridge subgraph (see subgraphs/bridge/schema.graphql)
interface SubgraphToken {
  id: string;
  symbol: string;
  name: string;
  decimals?: number;
}

interface SubgraphTokenTransfer {
  id: string;
  messageId: string;
  token: SubgraphToken | null;
  sender: string;
  recipient: string;
  amount: string;
  originDomain: number | string;
  destinationDomain: number | string;
  timestamp: number | string;
  txHash: string;
  direction: 'incoming' | 'outgoing';
}

interface SubgraphBridgeMessage {
  id: string;
  messageId: string;
  sender: string;
  recipient: string;
  originDomain: number | string;
  destinationDomain: number | string;
  status: string;
  dispatchTimestamp: number | string;
  deliveryTimestamp: number | string | null;
  dispatchTxHash: string | null;
  deliveryTxHash: string | null;
  token: SubgraphToken | null;
  amount: string | null;
}

interface SubgraphBridgeStats {
  totalMessages: string;
  totalMessagesDelivered: string;
  totalTokenTransfers: string;
  totalTokensOut: string;
  totalTokensIn: string;
  lastUpdated: string;
}

interface SubgraphTokenTotals extends SubgraphToken {
  totalBridgedIn: string;
  totalBridgedOut: string;
}

const bridgeClient = getGraphQLClient('bridge');

// Hyperlane domain id -> chain name. KalyChain's domain is its chain id (3890).
const chainIdToName: Record<string, string> = {
  '0': 'unknown',
  '1': 'ethereum',
  '56': 'bsc',
  '137': 'polygon',
  '42161': 'arbitrum',
  [String(KALYCHAIN_DOMAIN)]: 'kalychain',
};

// KalyChain-side (HypERC20 synthetic) token addresses -> metadata. The bridge subgraph only
// indexes KalyChain-side contracts, so remote-chain addresses never show up here.
const tokenAddressToInfo: Record<string, { symbol: string, name: string, decimals: number }> = Object.fromEntries(
  Object.values(KALYCHAIN_TOKENS)
    .filter(t => t.symbol !== 'WKMT')
    .map(t => [t.address.toLowerCase(), { symbol: t.symbol, name: t.name, decimals: t.decimals }]),
);

// Map of token symbols to CoinGecko IDs
const tokenToCoinGeckoId: Record<string, string> = {
  'ETH': 'ethereum',
  'WBTC': 'wrapped-bitcoin',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai'
};

// Cache for token prices (to avoid too many API calls)
let tokenPriceCache: Record<string, number> = {};
let lastPriceFetch = 0;
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get token prices
const getTokenPrices = async (): Promise<Record<string, number>> => {
  const now = Date.now();

  // Return cached prices if they're still fresh
  if (Object.keys(tokenPriceCache).length > 0 && now - lastPriceFetch < PRICE_CACHE_TTL) {
    console.log('Using cached token prices:', tokenPriceCache);
    return tokenPriceCache;
  }

  try {

    // Get list of token IDs to fetch from CoinGecko
    const tokenIds = Object.values(tokenToCoinGeckoId).join(',');
    console.log('Fetching prices for tokens:', tokenIds);

    // Fetch prices from CoinGecko
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds}&vs_currencies=usd`
    );

    console.log('CoinGecko API response:', response.data);

    // Process response into a simpler format
    const prices: Record<string, number> = {};

    // Map CoinGecko IDs back to our token symbols
    for (const [symbol, geckoId] of Object.entries(tokenToCoinGeckoId)) {
      if (response.data[geckoId]) {
        prices[symbol] = response.data[geckoId].usd;
      }
    }


    // Add stablecoins with fixed prices
    if (!prices['USDC']) prices['USDC'] = 1;
    if (!prices['USDT']) prices['USDT'] = 1;
    if (!prices['DAI']) prices['DAI'] = 1;

    console.log('Processed token prices:', prices);

    // Update cache
    tokenPriceCache = prices;
    lastPriceFetch = now;

    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }

    // Return last cached prices if available, or fallback prices
    if (Object.keys(tokenPriceCache).length > 0) {
      console.log('Using cached token prices after error:', tokenPriceCache);
      return tokenPriceCache;
    }

    // Fallback prices if API call fails - only stablecoins
    console.log('Using fallback prices after error - only stablecoins available');
    const fallbackPrices = {
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
      // No hardcoded prices for volatile tokens like KLC, ETH, BNB, etc.
    };

    // Update cache
    tokenPriceCache = fallbackPrices;
    lastPriceFetch = now;

    return fallbackPrices;
  }
};

// Helper function to get chain name from ID
const getChainName = (chainId: string): string => {
  const chainName = chainIdToName[chainId] || `chain-${chainId}`;
  // Capitalize the first letter
  return chainName.charAt(0).toUpperCase() + chainName.slice(1);
};

// Helper function to get token info
const getTokenInfo = (tokenAddress: string): { symbol: string, name: string, decimals: number } => {
  return tokenAddressToInfo[tokenAddress.toLowerCase()] || { symbol: '???', name: 'Unknown Token', decimals: 18 };
};

// Helper function to format token amount with proper decimals
const formatTokenAmount = (amount: string | null, decimals: number = 18): string => {
  if (!amount) return '0';

  try {
    // Convert from wei to token units
    const amountBN = BigInt(amount);
    const divisor = BigInt(10) ** BigInt(decimals);

    // Integer part
    const integerPart = amountBN / divisor;

    // Fractional part (with proper padding)
    const fractionalPart = amountBN % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

    // For small values (integer part is 0), show more decimal places
    let significantDecimals = 6; // Show up to 6 decimal places for small values

    if (integerPart === BigInt(0)) {
      // Find the first non-zero digit in the fractional part
      let firstNonZero = 0;
      for (let i = 0; i < fractionalStr.length; i++) {
        if (fractionalStr[i] !== '0') {
          firstNonZero = i;
          break;
        }
      }

      // Show at least the first non-zero digit plus a few more
      significantDecimals = Math.max(firstNonZero + 3, 6);
      significantDecimals = Math.min(significantDecimals, decimals); // Don't exceed available decimals
    } else {
      // For larger values, 6 decimal places is enough
      significantDecimals = Math.min(6, decimals);
    }

    // Truncate to the appropriate number of decimal places
    const truncatedFractionalStr = fractionalStr.substring(0, significantDecimals);

    // Remove trailing zeros
    let cleanFractionalStr = truncatedFractionalStr;
    while (cleanFractionalStr.length > 0 && cleanFractionalStr.charAt(cleanFractionalStr.length - 1) === '0') {
      cleanFractionalStr = cleanFractionalStr.substring(0, cleanFractionalStr.length - 1);
    }

    // If all fractional digits were zeros, don't show decimal point
    if (cleanFractionalStr.length === 0) {
      return integerPart.toString();
    }

    // Combine with decimal point
    return `${integerPart.toString()}.${cleanFractionalStr}`;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return amount;
  }
};

// Helper function to format status
const formatStatus = (status: string): string => {
  switch (status) {
    case 'dispatched': return 'dispatched';
    case 'delivered': return 'delivered';
    case 'in_merkle_tree': return 'pending';
    default: return status;
  }
};

export const BridgeService = {
  // Use bridge subgraph for bridge data
  async getBridges(limit = 10, skip = 0) {
    // Query token transfers instead of bridge messages to get token and amount information
    const query = gql`
      query GetTokenTransfers($limit: Int!, $skip: Int!) {
        tokenTransfers(first: $limit, skip: $skip, orderBy: timestamp, orderDirection: desc) {
          id
          messageId
          token {
            id
            symbol
            name
            decimals
          }
          sender
          recipient
          amount
          originDomain
          destinationDomain
          timestamp
          txHash
          direction
        }
      }
    `;

    try {
      const data = await bridgeClient.request<{ tokenTransfers: SubgraphTokenTransfer[] }>(query, { limit, skip });

      // Transform the data to match the expected format in the frontend
      const transfers = data.tokenTransfers.map((transfer) => {
        // Get token info - either from the token object or from our mapping
        let tokenInfo: { symbol: string | null, name: string | null, decimals: number } = { symbol: null, name: null, decimals: 18 };
        if (transfer.token) {
          // Use our mapping if the symbol is ??? or Unknown
          if (transfer.token.symbol === '???' || transfer.token.name.includes('Unknown')) {
            tokenInfo = getTokenInfo(transfer.token.id);
          } else {
            tokenInfo = {
              symbol: transfer.token.symbol,
              name: transfer.token.name,
              decimals: transfer.token.decimals || 18 // Use token decimals or default to 18
            };
          }
        }

        // Format the amount with proper decimals
        const formattedAmount = transfer.amount && tokenInfo
          ? formatTokenAmount(transfer.amount.toString(), tokenInfo.decimals)
          : null;

        // Determine source and destination chains based on direction
        let sourceChain, destinationChain;
        if (transfer.direction === 'outgoing') {
          sourceChain = getChainName(String(KALYCHAIN_DOMAIN));
          destinationChain = getChainName(transfer.destinationDomain.toString());
        } else {
          sourceChain = getChainName(transfer.originDomain.toString());
          destinationChain = getChainName(String(KALYCHAIN_DOMAIN));
        }

        // Map to the Bridge format
        return {
          id: transfer.id,
          sourceChain: sourceChain,
          destinationChain: destinationChain,
          sender: transfer.sender,
          recipient: transfer.recipient,
          amount: formattedAmount,
          rawAmount: transfer.amount ? transfer.amount.toString() : null,
          status: transfer.direction === 'outgoing' ? 'dispatched' : 'delivered', // Infer status from direction
          originTxHash: transfer.txHash,
          destinationTxHash: null, // Not available in token transfers
          timestamp: transfer.timestamp.toString(),
          token: tokenInfo
        };
      });

      // Filter transfers to only include those to/from KalyChain
      // This is redundant since all transfers in the subgraph involve KalyChain,
      // but we'll keep it for consistency
      const filteredTransfers = transfers.filter((transfer) => {
        return transfer.sourceChain === 'Kalychain' || transfer.destinationChain === 'Kalychain';
      });

      return filteredTransfers;
    } catch (error) {
      console.error('Error fetching token transfers:', error);
      return [];
    }
  },

  async getBridge(id: string) {
    const query = gql`
      query GetBridgeMessage($id: ID!) {
        bridgeMessage(id: $id) {
          id
          messageId
          sender
          recipient
          originDomain
          destinationDomain
          status
          dispatchTimestamp
          deliveryTimestamp
          dispatchTxHash
          deliveryTxHash
          token {
            id
            symbol
            name
          }
          amount
        }
      }
    `;

    try {
      const data = await bridgeClient.request<{ bridgeMessage: SubgraphBridgeMessage | null }>(query, { id });

      if (!data.bridgeMessage) {
        return null;
      }

      const message = data.bridgeMessage;

      // Get token info - either from the token object or from our mapping
      let tokenInfo: { symbol: string | null, name: string | null, decimals: number } = { symbol: null, name: null, decimals: 18 };
      if (message.token) {
        // Use our mapping if the symbol is ??? or Unknown
        if (message.token.symbol === '???' || message.token.name.includes('Unknown')) {
          tokenInfo = getTokenInfo(message.token.id);
        } else {
          tokenInfo = {
            symbol: message.token.symbol,
            name: message.token.name,
            decimals: 18 // Default to 18 decimals if not in our mapping
          };
        }
      }

      // Format the amount with proper decimals
      const formattedAmount = message.amount && tokenInfo
        ? formatTokenAmount(message.amount.toString(), tokenInfo.decimals)
        : null;

      // Transform the data to match the expected format in the frontend
      return {
        id: message.id,
        sourceChain: getChainName(message.originDomain.toString()),
        destinationChain: getChainName(message.destinationDomain.toString()),
        sender: message.sender,
        recipient: message.recipient,
        amount: formattedAmount,
        rawAmount: message.amount ? message.amount.toString() : null,
        status: formatStatus(message.status),
        originTxHash: message.dispatchTxHash,
        destinationTxHash: message.deliveryTxHash,
        timestamp: message.dispatchTimestamp.toString(),
        token: message.token ? tokenInfo : null
      };
    } catch (error) {
      console.error(`Error fetching bridge message ${id}:`, error);
      return null;
    }
  },

  async getBridgeStats() {
    const query = gql`
      query GetBridgeStats {
        bridgeStats(id: "1") {
          totalMessages
          totalMessagesDelivered
          totalTokenTransfers
          totalTokensOut
          totalTokensIn
          lastUpdated
        }
        tokens {
          id
          symbol
          name
          totalBridgedIn
          totalBridgedOut
        }
      }
    `;

    try {
      const data = await bridgeClient.request<{ bridgeStats: SubgraphBridgeStats | null; tokens: SubgraphTokenTotals[] }>(query);

      if (!data.bridgeStats) {
        throw new Error('No bridge stats found');
      }

      // Get token prices
      const tokenPrices = await getTokenPrices();

      // Process tokens to use our mapping for unknown tokens
      const processedTokens = data.tokens.map((token) => {
        let tokenInfo;

        if (token.symbol === '???' || token.name.includes('Unknown')) {
          tokenInfo = getTokenInfo(token.id);

          // Format the amounts with proper decimals
          const totalBridgedIn = formatTokenAmount(token.totalBridgedIn, tokenInfo.decimals);
          const totalBridgedOut = formatTokenAmount(token.totalBridgedOut, tokenInfo.decimals);

          // Calculate USD values
          const tokenPrice = tokenPrices[tokenInfo.symbol] || 0;

          // Parse the formatted amount correctly for USD calculation
          // Remove any trailing zeros and parse as float
          const parsedBridgedIn = parseFloat(totalBridgedIn);
          const parsedBridgedOut = parseFloat(totalBridgedOut);

          const totalBridgedInUSD = parsedBridgedIn * tokenPrice;
          const totalBridgedOutUSD = parsedBridgedOut * tokenPrice;

          console.log(`Token: ${tokenInfo.symbol}, Price: $${tokenPrice}, Amount In: ${parsedBridgedIn}, USD In: $${totalBridgedInUSD.toFixed(2)}, Amount Out: ${parsedBridgedOut}, USD Out: $${totalBridgedOutUSD.toFixed(2)}`);

          return {
            ...token,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            totalBridgedIn,
            totalBridgedOut,
            totalBridgedInUSD: totalBridgedInUSD.toFixed(2),
            totalBridgedOutUSD: totalBridgedOutUSD.toFixed(2),
            tokenPrice,
            rawTotalBridgedIn: token.totalBridgedIn,
            rawTotalBridgedOut: token.totalBridgedOut
          };
        }

        // Get token info from our mapping if available
        tokenInfo = getTokenInfo(token.id);
        const decimals = tokenInfo.symbol !== '???' ? tokenInfo.decimals : 18;

        // Format the amounts with proper decimals
        const totalBridgedIn = formatTokenAmount(token.totalBridgedIn, decimals);
        const totalBridgedOut = formatTokenAmount(token.totalBridgedOut, decimals);

        // Get token symbol from mapping if available
        const symbol = token.symbol === '???' ? 'Unknown' : token.symbol;

        // Calculate USD values
        const tokenPrice = tokenPrices[symbol] || 0;

        // Parse the formatted amount correctly for USD calculation
        // Remove any trailing zeros and parse as float
        const parsedBridgedIn = parseFloat(totalBridgedIn);
        const parsedBridgedOut = parseFloat(totalBridgedOut);

        const totalBridgedInUSD = parsedBridgedIn * tokenPrice;
        const totalBridgedOutUSD = parsedBridgedOut * tokenPrice;

        console.log(`Token: ${symbol}, Price: $${tokenPrice}, Amount In: ${parsedBridgedIn}, USD In: $${totalBridgedInUSD.toFixed(2)}, Amount Out: ${parsedBridgedOut}, USD Out: $${totalBridgedOutUSD.toFixed(2)}`);

        return {
          ...token,
          totalBridgedIn,
          totalBridgedOut,
          totalBridgedInUSD: totalBridgedInUSD.toFixed(2),
          totalBridgedOutUSD: totalBridgedOutUSD.toFixed(2),
          tokenPrice,
          rawTotalBridgedIn: token.totalBridgedIn,
          rawTotalBridgedOut: token.totalBridgedOut
        };
      });

      // Format the total volume with proper decimals (assuming 18 decimals for total)
      const totalTokensIn = data.bridgeStats.totalTokensIn || '0';
      const totalTokensOut = data.bridgeStats.totalTokensOut || '0';

      // Calculate adjusted volume by summing individual token volumes
      // This helps avoid counting test transactions or other outliers
      let adjustedVolumeIn = BigInt(0);
      let adjustedVolumeOut = BigInt(0);

      // Maximum transfer size to consider (in wei) - 1,000 tokens with 18 decimals
      const MAX_TRANSFER_SIZE = BigInt('1000000000000000000000');

      // Calculate adjusted volume from individual token transfers
      processedTokens.forEach((token) => {
        // Convert string to BigInt for calculations
        const tokenIn = BigInt(token.rawTotalBridgedIn || '0');
        const tokenOut = BigInt(token.rawTotalBridgedOut || '0');

        // Only count transfers below the maximum size
        if (tokenIn < MAX_TRANSFER_SIZE) {
          adjustedVolumeIn += tokenIn;
        }

        if (tokenOut < MAX_TRANSFER_SIZE) {
          adjustedVolumeOut += tokenOut;
        }
      });

      const formattedVolumeIn = formatTokenAmount(totalTokensIn, 18);
      const formattedVolumeOut = formatTokenAmount(totalTokensOut, 18);

      // Calculate total volume (formatted)
      const totalVolume = (
        BigInt(totalTokensIn) + BigInt(totalTokensOut)
      ).toString();

      // Calculate adjusted total volume
      const adjustedTotalVolume = (adjustedVolumeIn + adjustedVolumeOut).toString();

      const formattedTotalVolume = formatTokenAmount(adjustedTotalVolume, 18);

      // Calculate total USD volume with proper precision
      let totalVolumeUSD = 0;
      processedTokens.forEach((token) => {
        // Make sure we're adding the correct USD values
        if (token.totalBridgedInUSD) {
          totalVolumeUSD += parseFloat(token.totalBridgedInUSD);
        }
        if (token.totalBridgedOutUSD) {
          totalVolumeUSD += parseFloat(token.totalBridgedOutUSD);
        }
      });

      console.log(`Total USD Volume: $${totalVolumeUSD.toFixed(2)}`);

      // Transform the data to match the expected format in the frontend
      return {
        totalMessages: parseInt(data.bridgeStats.totalMessages),
        totalVolume: formattedTotalVolume,
        totalVolumeUSD: totalVolumeUSD.toFixed(2),
        totalTokenTransfers: parseInt(data.bridgeStats.totalTokenTransfers),
        rawTotalVolume: totalVolume,
        chainStats: [
          {
            chain: 'kalychain',
            messagesIn: parseInt(data.bridgeStats.totalMessagesDelivered),
            messagesOut: parseInt(data.bridgeStats.totalMessages),
            volumeIn: formattedVolumeIn,
            volumeOut: formattedVolumeOut,
            rawVolumeIn: totalTokensIn,
            rawVolumeOut: totalTokensOut
          }
        ],
        tokens: processedTokens
      };
    } catch (error) {
      console.error('Error fetching bridge stats:', error);
      return {
        totalMessages: 0,
        totalVolume: '0',
        totalVolumeUSD: '0.00',
        totalTokenTransfers: 0,
        rawTotalVolume: '0',
        chainStats: [
          {
            chain: 'kalychain',
            messagesIn: 0,
            messagesOut: 0,
            volumeIn: '0',
            volumeOut: '0',
            rawVolumeIn: '0',
            rawVolumeOut: '0'
          }
        ],
        tokens: []
      };
    }
  },

  // Live warp routes out of KalyChain (config/chain.ts is the single source; keep the frontend list in sync)
  async getWarpRoutes() {
    return KALYCHAIN_WARP_ROUTES.map(route => ({
      id: route.id,
      sourceChain: 'kalychain',
      destinationChain: route.destinationChain,
      tokenAddress: KALYCHAIN_TOKENS[route.token].address,
      tokenSymbol: route.token,
      status: 'active',
    }));
  },

  // Method to get combined bridge data
  async getBridgeOverview() {
    const [stats, routes] = await Promise.all([
      this.getBridgeStats(),
      this.getWarpRoutes()
    ]);

    return {
      stats,
      routes
    };
  }
};
