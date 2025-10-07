import { swapQuoteService } from '../../services/swap/swapQuoteService';

/**
 * Chain names for display
 */
const CHAIN_NAMES: Record<number, string> = {
  3888: 'KalyChain',
  56: 'BNB Smart Chain',
  42161: 'Arbitrum One',
};

/**
 * GraphQL resolvers for swap quote queries
 */
export const swapResolvers = {
  Query: {
    /**
     * Get a swap quote for a given token pair and amount
     *
     * @param chainId - The chain ID (3888, 56, or 42161)
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param amountIn - Input amount in wei (as string)
     * @returns SwapQuote with amountOut, route, priceImpact, etc.
     */
    swapQuote: async (
      _: unknown,
      args: {
        chainId: number;
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
      }
    ) => {
      const { chainId, tokenIn, tokenOut, amountIn } = args;

      console.log(`📊 Swap quote request:`, {
        chainId,
        tokenIn,
        tokenOut,
        amountIn,
      });

      try {
        // Validate inputs
        if (!chainId || !tokenIn || !tokenOut || !amountIn) {
          throw new Error('Missing required parameters');
        }

        // Validate addresses are valid Ethereum addresses
        if (!tokenIn.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid tokenIn address');
        }
        if (!tokenOut.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid tokenOut address');
        }

        // Validate amountIn is a valid number
        if (isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
          throw new Error('Invalid amountIn: must be a positive number');
        }

        // Get quote from service
        const quote = await swapQuoteService.getSwapQuote({
          chainId,
          tokenIn,
          tokenOut,
          amountIn,
        });

        console.log(`✅ Swap quote result:`, quote);

        return quote;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error getting swap quote:`, error);
        throw new Error(`Failed to get swap quote: ${errorMessage}`);
      }
    },

    /**
     * Get router configuration for a specific chain
     *
     * @param chainId - The chain ID (3888, 56, or 42161)
     * @returns SwapRouterConfig with router address, WETH address, etc.
     */
    swapRouterConfig: async (
      _: unknown,
      args: { chainId: number }
    ) => {
      const { chainId } = args;

      console.log(`🔧 Router config request for chain ${chainId}`);

      try {
        // Validate chainId
        if (!chainId) {
          throw new Error('Missing chainId parameter');
        }

        // Get router and WETH addresses
        const routerAddress = swapQuoteService.getRouterAddress(chainId);
        const wethAddress = swapQuoteService.getWethAddress(chainId);

        if (!routerAddress || !wethAddress) {
          throw new Error(`Chain ${chainId} is not supported for swaps`);
        }

        const config = {
          chainId,
          routerAddress,
          wethAddress,
          chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
        };

        console.log(`✅ Router config:`, config);

        return config;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error getting router config:`, error);
        throw new Error(`Failed to get router config: ${errorMessage}`);
      }
    },
  },
};

