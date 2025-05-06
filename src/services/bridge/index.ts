import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import axios from 'axios';

// Use the bridge subgraph client
const bridgeClient = getGraphQLClient('bridge');

// Map of chain IDs to names
const chainIdToName: Record<string, string> = {
  '0': 'unknown',
  '1': 'ethereum',
  '56': 'bsc',
  '137': 'polygon',
  '42161': 'arbitrum',
  '3888': 'kalychain'
};

// Map of token addresses to known symbols and names
const tokenAddressToInfo: Record<string, { symbol: string, name: string, decimals: number }> = {
  // Native tokens
  '0x8a1abbb167b149f2493c8141091028fd812da6e4': { symbol: 'KLC', name: 'KalyChain', decimals: 18 },
  '0xfdbb253753dde60b11211b169dc872aae672879b': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0x0e2318b62a096ac68ad2d7f37592cbf0ca9c4ddb': { symbol: 'BNB', name: 'Binance Coin', decimals: 18 },
  '0x9c3c9283d3e44854697cd22d3faa240cfb032889': { symbol: 'POL', name: 'Polygon', decimals: 18 },

  // Stablecoins
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },

  // Other tokens
  '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },

  // Add more tokens as needed
};

// Map of token symbols to CoinGecko IDs
const tokenToCoinGeckoId: Record<string, string> = {
  'KLC': 'kalychain',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'POL': 'polygon',
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
    // For now, use fallback prices to avoid rate limiting issues
    // We'll implement proper API calls in production
    console.log('Using fallback token prices due to CoinGecko API rate limits');

    const fallbackPrices = {
      'KLC': 0.1,
      'ETH': 3000,
      'BNB': 500,
      'POL': 0.5,
      'WBTC': 60000,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
    };

    // Update cache
    tokenPriceCache = fallbackPrices;
    lastPriceFetch = now;

    return fallbackPrices;

    /* Commented out for now to avoid rate limiting
    // Get list of token IDs to fetch
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
    */
  } catch (error: any) {
    console.error('Error fetching token prices:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }

    // Return last cached prices if available, or fallback prices
    if (Object.keys(tokenPriceCache).length > 0) {
      console.log('Using cached token prices after error:', tokenPriceCache);
      return tokenPriceCache;
    }

    // Fallback prices if API call fails
    console.log('Using fallback token prices after error');
    const fallbackPrices = {
      'KLC': 0.1,
      'ETH': 3000,
      'BNB': 500,
      'POL': 0.5,
      'WBTC': 60000,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
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

    // Combine with decimal point
    return `${integerPart.toString()}.${fractionalStr}`;
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
  async getBridges(limit = 100) {
    const query = gql`
      query GetBridgeMessages($limit: Int!) {
        bridgeMessages(first: $limit, orderBy: dispatchTimestamp, orderDirection: desc) {
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
      const data = await bridgeClient.request(query, { limit }) as any;

      // Transform the data to match the expected format in the frontend
      const messages = data.bridgeMessages.map((message: any) => {
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
      });

      // Filter messages to only include those to/from KalyChain (domain 3888)
      const filteredMessages = messages.filter((message: any) => {
        return message.sourceChain === 'Kalychain' || message.destinationChain === 'Kalychain';
      });

      return filteredMessages;
    } catch (error) {
      console.error('Error fetching bridge messages:', error);
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
      const data = await bridgeClient.request(query, { id }) as any;

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
      const data = await bridgeClient.request(query) as any;

      if (!data.bridgeStats) {
        throw new Error('No bridge stats found');
      }

      // Get token prices
      const tokenPrices = await getTokenPrices();

      // Process tokens to use our mapping for unknown tokens
      const processedTokens = data.tokens.map((token: any) => {
        let tokenInfo;
        if (token.symbol === '???' || token.name.includes('Unknown')) {
          tokenInfo = getTokenInfo(token.id);

          // Format the amounts with proper decimals
          const totalBridgedIn = formatTokenAmount(token.totalBridgedIn, tokenInfo.decimals);
          const totalBridgedOut = formatTokenAmount(token.totalBridgedOut, tokenInfo.decimals);

          // Calculate USD values
          const tokenPrice = tokenPrices[tokenInfo.symbol] || 0;
          const totalBridgedInUSD = parseFloat(totalBridgedIn) * tokenPrice;
          const totalBridgedOutUSD = parseFloat(totalBridgedOut) * tokenPrice;

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

        // Default to 18 decimals for tokens not in our mapping
        const decimals = 18;

        // Format the amounts with proper decimals
        const totalBridgedIn = formatTokenAmount(token.totalBridgedIn, decimals);
        const totalBridgedOut = formatTokenAmount(token.totalBridgedOut, decimals);

        // Get token symbol from mapping if available
        const symbol = token.symbol === '???' ? 'Unknown' : token.symbol;

        // Calculate USD values
        const tokenPrice = tokenPrices[symbol] || 0;
        const totalBridgedInUSD = parseFloat(totalBridgedIn) * tokenPrice;
        const totalBridgedOutUSD = parseFloat(totalBridgedOut) * tokenPrice;

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
      processedTokens.forEach((token: any) => {
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

      // Format adjusted volumes
      const formattedAdjustedVolumeIn = formatTokenAmount(adjustedVolumeIn.toString(), 18);
      const formattedAdjustedVolumeOut = formatTokenAmount(adjustedVolumeOut.toString(), 18);

      // Calculate total volume (formatted)
      const totalVolume = (
        BigInt(totalTokensIn) + BigInt(totalTokensOut)
      ).toString();

      // Calculate adjusted total volume
      const adjustedTotalVolume = (adjustedVolumeIn + adjustedVolumeOut).toString();

      const formattedTotalVolume = formatTokenAmount(adjustedTotalVolume, 18);

      // Calculate total USD volume
      let totalVolumeUSD = 0;
      processedTokens.forEach((token: any) => {
        totalVolumeUSD += parseFloat(token.totalBridgedInUSD) + parseFloat(token.totalBridgedOutUSD);
      });

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

  // This method would use contract addresses and warp routes from the contracts/bridge folder
  async getWarpRoutes() {
    // In a real implementation, this would read from the contract addresses and warp routes
    // For now, we'll return a placeholder
    return [
      {
        id: '1',
        sourceChain: 'kalychain',
        destinationChain: 'ethereum',
        tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
        status: 'active'
      },
      {
        id: '2',
        sourceChain: 'kalychain',
        destinationChain: 'bsc',
        tokenAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        status: 'active'
      }
    ];
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
