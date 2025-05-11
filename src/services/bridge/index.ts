import { gql } from 'graphql-request';
import { getGraphQLClient } from '../graphql-client';
import axios from 'axios';

// Use the bridge and dex subgraph clients
const bridgeClient = getGraphQLClient('bridge');
const dexClient = getGraphQLClient('dex');

// Define a type for our USDT baseline values
interface UsdtBaselineValues {
  rawIn: string;
  rawOut: string;
  correctedIn: string;
  correctedOut: string;
  lastUpdate: number;
}

// Create a global variable to store USDT baseline values
let usdtBaselineValues: UsdtBaselineValues | null = null;

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
  '0x0000000000000000000000000000000000000000': { symbol: 'KLC', name: 'KalyChain', decimals: 18 },
  '0xf670a2d32a2b25e181b26abb02614a20ea1ea2d9': { symbol: 'KLC', name: 'KalyChain', decimals: 18 },
  '0xfdbb253753dde60b11211b169dc872aae672879b': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0x0e2318b62a096ac68ad2d7f37592cbf0ca9c4ddb': { symbol: 'BNB', name: 'Binance Coin', decimals: 18 },
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': { symbol: 'BNB', name: 'Binance Coin', decimals: 18 },
  '0x9c3c9283d3e44854697cd22d3faa240cfb032889': { symbol: 'POL', name: 'Polygon', decimals: 18 },
  '0x0000000000000000000000000000000000001010': { symbol: 'POL', name: 'Polygon', decimals: 18 },
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': { symbol: 'POL', name: 'Polygon', decimals: 18 },

  // Stablecoins
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },

  '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },

  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': { symbol: 'DAI', name: 'Binance-Peg DAI', decimals: 18 },

  // Bitcoin tokens
  '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },

  // Wrapped tokens
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc3': { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },

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

// Helper function to get KLC price from DEX subgraph
const getKLCPriceFromDex = async (): Promise<number> => {
  try {
    // Get KLC price in USD from a stablecoin pair (USDT/WKLC)
    const klcPriceQuery = gql`
      query {
        pair(id: "0x25fddaf836d12dc5e285823a644bb86e0b79c8e2") {
          token0 {
            symbol
          }
          token1 {
            symbol
          }
          token0Price
          token1Price
          reserve0
          reserve1
        }
      }
    `;

    const pairData = await dexClient.request(klcPriceQuery) as any;
    const pair = pairData.pair;

    console.log('WKLC/USDT pair data:', JSON.stringify(pair, null, 2));

    // Determine which token is WKLC and which is USDT
    let klcPriceInUSD = 0;
    if (pair) {
      // Log the raw price data for debugging
      console.log(`Raw pair data - token0: ${pair.token0.symbol}, token1: ${pair.token1.symbol}`);
      console.log(`Raw prices - token0Price: ${pair.token0Price}, token1Price: ${pair.token1Price}`);

      if (pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'USDT') {
        // token1Price is the price of token0 in terms of token1
        // So this is WKLC price in USDT
        klcPriceInUSD = parseFloat(pair.token1Price);
        console.log(`WKLC is token0, price calculation: ${pair.token1Price} (token1Price)`);
      } else if (pair.token0.symbol === 'USDT' && pair.token1.symbol === 'WKLC') {
        // token0Price is the price of token1 in terms of token0
        // So this is WKLC price in USDT
        klcPriceInUSD = parseFloat(pair.token0Price);
        console.log(`WKLC is token1, price calculation: ${pair.token0Price} (token0Price)`);
      }

      // Calculate price manually from reserves as a sanity check
      if (pair.reserve0 && pair.reserve1) {
        const reserve0 = parseFloat(pair.reserve0);
        const reserve1 = parseFloat(pair.reserve1);

        if (pair.token0.symbol === 'WKLC' && reserve0 > 0) {
          const manualPrice = reserve1 / reserve0;
          console.log(`Manual price calculation (reserve1/reserve0): ${manualPrice}`);
        } else if (pair.token1.symbol === 'WKLC' && reserve1 > 0) {
          const manualPrice = reserve0 / reserve1;
          console.log(`Manual price calculation (reserve0/reserve1): ${manualPrice}`);
        }
      }
    }

    console.log(`KLC price in USD from DEX: $${klcPriceInUSD}`);

    // Sanity check - KLC price should be very small (around $0.001)
    // If it's too high or too low, use the fallback price
    const MIN_REASONABLE_PRICE = 0.0001;  // $0.0001
    const MAX_REASONABLE_PRICE = 0.01;    // $0.01

    if (!klcPriceInUSD ||
        klcPriceInUSD === 0 ||
        isNaN(klcPriceInUSD) ||
        klcPriceInUSD < MIN_REASONABLE_PRICE ||
        klcPriceInUSD > MAX_REASONABLE_PRICE) {

      console.log(`KLC price from DEX (${klcPriceInUSD}) is outside reasonable range or invalid`);
      klcPriceInUSD = 0.001221; // Current price from CoinGecko
      console.log(`Using fallback KLC price: $${klcPriceInUSD}`);
    }

    return klcPriceInUSD;
  } catch (error) {
    console.error('Error fetching KLC price from DEX:', error);
    return 0.001221; // Fallback to current price
  }
};

// Helper function to get token prices
const getTokenPrices = async (): Promise<Record<string, number>> => {
  const now = Date.now();

  // Return cached prices if they're still fresh
  if (Object.keys(tokenPriceCache).length > 0 && now - lastPriceFetch < PRICE_CACHE_TTL) {
    console.log('Using cached token prices:', tokenPriceCache);
    return tokenPriceCache;
  }

  try {
    // Get KLC price from DEX
    const klcPrice = await getKLCPriceFromDex();

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

    // Override KLC price with the one from DEX if available
    if (klcPrice > 0) {
      console.log(`Using KLC price from DEX: $${klcPrice}`);
      prices['KLC'] = klcPrice;
    } else if (!prices['KLC']) {
      // If KLC price is not available from either source, use fallback
      prices['KLC'] = 0.001221;
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
      'KLC': 0.001221, // Updated to current price
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
      const data = await bridgeClient.request(query, { limit, skip }) as any;

      // Transform the data to match the expected format in the frontend
      const transfers = data.tokenTransfers.map((transfer: any) => {
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
          sourceChain = getChainName('3888'); // KalyChain
          destinationChain = getChainName(transfer.destinationDomain.toString());
        } else {
          sourceChain = getChainName(transfer.originDomain.toString());
          destinationChain = getChainName('3888'); // KalyChain
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

      // Filter transfers to only include those to/from KalyChain (domain 3888)
      // This is redundant since all transfers in the subgraph involve KalyChain,
      // but we'll keep it for consistency
      const filteredTransfers = transfers.filter((transfer: any) => {
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

        // Special handling for USDT token with incorrect decimal values
        if (token.id.toLowerCase() === '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a') {
          tokenInfo = getTokenInfo(token.id);

          // Ensure we have the correct token info
          if (tokenInfo.symbol === '???') {
            // If token info is not found in our mapping, use the known values
            tokenInfo = {
              symbol: 'USDT',
              name: 'Tether USD',
              decimals: 6
            };
          }

          // The issue is that we have a transaction with 18 decimals instead of 6
          // We need to identify and remove the problematic transaction

          // Store the known correct values as of the fix time
          const KNOWN_CORRECT_IN = BigInt('266436500');  // 266.4365 USDT with 6 decimals
          const KNOWN_CORRECT_OUT = BigInt('0');         // 0 USDT

          // Get the current raw values
          const currentRawIn = BigInt(token.totalBridgedIn);
          const currentRawOut = BigInt(token.totalBridgedOut);

          console.log(`USDT current raw values - In: ${currentRawIn.toString()}, Out: ${currentRawOut.toString()}`);

          // Check if the problematic transaction is still in the data
          // If the out amount is very large (> 1e18), it likely still includes the problematic tx
          const hasProblematicTx = currentRawOut > BigInt('1000000000000000000');

          let correctedBridgedIn: bigint;
          let correctedBridgedOut: bigint;

          if (hasProblematicTx) {
            // If the problematic transaction is still there, use our known correct values
            // This is the first run after the fix
            console.log('USDT still has problematic transaction, using known correct values');
            correctedBridgedIn = KNOWN_CORRECT_IN;
            correctedBridgedOut = KNOWN_CORRECT_OUT;

            // Store the baseline for future calculations
            if (usdtBaselineValues === null) {
              usdtBaselineValues = {
                rawIn: currentRawIn.toString(),
                rawOut: currentRawOut.toString(),
                correctedIn: KNOWN_CORRECT_IN.toString(),
                correctedOut: KNOWN_CORRECT_OUT.toString(),
                lastUpdate: Date.now()
              };
            }
          } else {
            // The problematic transaction is no longer in the data
            // This means we're in a subsequent run after the fix

            if (usdtBaselineValues !== null) {
              // Calculate deltas from the baseline values
              const baselineRawIn = BigInt(usdtBaselineValues.rawIn);
              const baselineRawOut = BigInt(usdtBaselineValues.rawOut);
              const baselineCorrectedIn = BigInt(usdtBaselineValues.correctedIn);
              const baselineCorrectedOut = BigInt(usdtBaselineValues.correctedOut);

              // Calculate changes since the baseline
              const rawInDelta = currentRawIn - baselineRawIn;
              const rawOutDelta = currentRawOut - baselineRawOut;

              console.log(`USDT raw deltas since baseline - In: ${rawInDelta.toString()}, Out: ${rawOutDelta.toString()}`);

              // Apply the deltas to the baseline corrected values
              correctedBridgedIn = baselineCorrectedIn + rawInDelta;
              correctedBridgedOut = baselineCorrectedOut + rawOutDelta;

              // Update the baseline with current values
              usdtBaselineValues = {
                rawIn: currentRawIn.toString(),
                rawOut: currentRawOut.toString(),
                correctedIn: correctedBridgedIn.toString(),
                correctedOut: correctedBridgedOut.toString(),
                lastUpdate: Date.now()
              };
            } else {
              // If we don't have baseline values but the problematic tx is gone,
              // just use the current values
              console.log('USDT no baseline values but problematic tx is gone, using current values');
              correctedBridgedIn = currentRawIn;
              correctedBridgedOut = currentRawOut;
            }
          }

          console.log(`USDT corrected values - In: ${correctedBridgedIn.toString()}, Out: ${correctedBridgedOut.toString()}`);

          // If the correction makes the value negative, set to 0
          if (correctedBridgedOut < BigInt(0)) {
            correctedBridgedOut = BigInt(0);
          }

          // Format the corrected amounts
          const totalBridgedIn = formatTokenAmount(correctedBridgedIn.toString(), tokenInfo.decimals);
          const totalBridgedOut = formatTokenAmount(correctedBridgedOut.toString(), tokenInfo.decimals);

          // Calculate USD values
          const tokenPrice = tokenPrices[tokenInfo.symbol] || 0;

          // Parse the formatted amount correctly for USD calculation
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
            rawTotalBridgedIn: correctedBridgedIn.toString(),
            rawTotalBridgedOut: correctedBridgedOut.toString()
          };
        }

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

      // Calculate total volume (formatted)
      const totalVolume = (
        BigInt(totalTokensIn) + BigInt(totalTokensOut)
      ).toString();

      // Calculate adjusted total volume
      const adjustedTotalVolume = (adjustedVolumeIn + adjustedVolumeOut).toString();

      const formattedTotalVolume = formatTokenAmount(adjustedTotalVolume, 18);

      // Calculate total USD volume with proper precision
      let totalVolumeUSD = 0;
      processedTokens.forEach((token: any) => {
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
