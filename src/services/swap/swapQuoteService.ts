import { ethers } from 'ethers';
import { multiRPCProviderService } from '../multichain/rpcProviderService';

/**
 * Router addresses for each supported chain
 */
const ROUTER_ADDRESSES: Record<number, string> = {
  3888: '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3',  // KalySwap Router
  56: '0x10ED43C718714eb63d5aA57B78B54704E256024E',    // PancakeSwap Router
  42161: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d', // Camelot V2 Router on Arbitrum
};

/**
 * WETH/Wrapped native token addresses for each chain
 */
const WETH_ADDRESSES: Record<number, string> = {
  3888: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',  // WKLC
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',    // WBNB
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
};

/**
 * Minimal Router ABI - only the functions we need for quotes
 */
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)',
  'function factory() external pure returns (address)',
  'function WETH() external pure returns (address)',
];

/**
 * Minimal Factory ABI - for checking if pair exists
 */
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

/**
 * Minimal Pair ABI - for getting reserves
 */
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

export interface SwapQuoteParams {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

export interface SwapQuoteResult {
  amountOut: string;
  amountOutMin: string; // With 0.5% slippage
  route: string[];
  priceImpact: string;
  executionPrice: string;
  fee: string;
}

/**
 * Swap Quote Service
 * Provides swap quotes for supported DEXs across multiple chains
 */
export class SwapQuoteService {
  /**
   * Get a swap quote for the given parameters
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
    const { chainId, tokenIn, tokenOut, amountIn } = params;

    // Validate chain is supported
    if (!multiRPCProviderService.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Validate router exists for chain
    const routerAddress = ROUTER_ADDRESSES[chainId];
    if (!routerAddress) {
      throw new Error(`No router configured for chain ${chainId}`);
    }

    // Get provider for chain
    const provider = multiRPCProviderService.getProvider(chainId);

    // Create router contract instance
    const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);

    try {
      // Determine the swap route
      const route = await this.getSwapRoute(chainId, tokenIn, tokenOut, router);

      console.log(`🔄 Getting swap quote on chain ${chainId}:`, {
        tokenIn,
        tokenOut,
        amountIn,
        route
      });

      // Get amounts out from router
      const amounts = await router.getAmountsOut(amountIn, route);

      // The last amount in the array is the output amount
      const amountOut = amounts[amounts.length - 1].toString();

      // Calculate slippage (0.5% default)
      const slippageTolerance = 0.005; // 0.5%
      const amountOutBN = ethers.BigNumber.from(amountOut);
      const slippageAmount = amountOutBN.mul(Math.floor(slippageTolerance * 10000)).div(10000);
      const amountOutMin = amountOutBN.sub(slippageAmount).toString();

      // Calculate price impact
      const priceImpact = await this.calculatePriceImpact(
        chainId,
        route,
        amountIn,
        amountOut,
        provider
      );

      // Calculate execution price (how much tokenOut per tokenIn)
      const amountInBN = ethers.BigNumber.from(amountIn);
      const executionPrice = amountOutBN.mul(ethers.constants.WeiPerEther).div(amountInBN).toString();

      // Calculate fee (0.3% for most DEXs, 0.25% for PancakeSwap)
      const feePercent = chainId === 56 ? 0.0025 : 0.003;
      const feeBN = amountInBN.mul(Math.floor(feePercent * 10000)).div(10000);
      const fee = feeBN.toString();

      return {
        amountOut,
        amountOutMin,
        route,
        priceImpact,
        executionPrice,
        fee
      };
    } catch (error: unknown) {
      console.error(`❌ Error getting swap quote on chain ${chainId}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide more helpful error messages
      if (errorMessage.includes('INSUFFICIENT_LIQUIDITY')) {
        throw new Error('Insufficient liquidity for this trading pair');
      }
      if (errorMessage.includes('INSUFFICIENT_INPUT_AMOUNT')) {
        throw new Error('Input amount is too small');
      }
      if (errorMessage.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        throw new Error('Output amount is too small');
      }

      throw new Error(`Failed to get swap quote: ${errorMessage}`);
    }
  }

  /**
   * Determine the best swap route (direct or through WETH)
   */
  private async getSwapRoute(
    chainId: number,
    tokenIn: string,
    tokenOut: string,
    router: ethers.Contract
  ): Promise<string[]> {
    const wethAddress = WETH_ADDRESSES[chainId];

    // Normalize addresses to lowercase
    const tokenInLower = tokenIn.toLowerCase();
    const tokenOutLower = tokenOut.toLowerCase();
    const wethLower = wethAddress.toLowerCase();

    // If either token is WETH, direct swap
    if (tokenInLower === wethLower || tokenOutLower === wethLower) {
      return [tokenIn, tokenOut];
    }

    // Check if direct pair exists
    try {
      const factoryAddress = await router.factory();
      const factory = new ethers.Contract(
        factoryAddress,
        FACTORY_ABI,
        router.provider
      );

      const pairAddress = await factory.getPair(tokenIn, tokenOut);
      
      // If pair exists (not zero address), use direct route
      if (pairAddress !== ethers.constants.AddressZero) {
        console.log(`✅ Direct pair exists: ${pairAddress}`);
        return [tokenIn, tokenOut];
      }
    } catch {
      // Pair doesn't exist or error checking, use WETH route
    }

    // Use WETH as intermediary
    console.log(`🔀 Using WETH route for swap`);
    return [tokenIn, wethAddress, tokenOut];
  }

  /**
   * Calculate price impact of the swap
   */
  private async calculatePriceImpact(
    chainId: number,
    route: string[],
    amountIn: string,
    amountOut: string,
    provider: ethers.providers.JsonRpcProvider
  ): Promise<string> {
    try {
      // For multi-hop swaps, calculate impact on first pair only (simplified)
      const tokenIn = route[0];
      const tokenOut = route[1];

      // Get factory and pair
      const routerAddress = ROUTER_ADDRESSES[chainId];
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
      const factoryAddress = await router.factory();
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      
      const pairAddress = await factory.getPair(tokenIn, tokenOut);
      
      if (pairAddress === ethers.constants.AddressZero) {
        return '0'; // No pair, can't calculate impact
      }

      // Get reserves
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();

      // Determine which reserve is which
      const isToken0 = token0.toLowerCase() === tokenIn.toLowerCase();
      const reserveIn = isToken0 ? reserves.reserve0 : reserves.reserve1;

      // Calculate price impact
      // Impact = (amountIn / reserveIn) * 100
      const amountInBN = ethers.BigNumber.from(amountIn);
      const reserveInBN = ethers.BigNumber.from(reserveIn.toString());

      const impact = amountInBN
        .mul(10000) // Multiply by 10000 for precision
        .div(reserveInBN);

      // Convert to percentage string (2 decimal places)
      const impactPercent = (impact.toNumber() / 100).toFixed(2);

      return impactPercent;
    } catch {
      return '0';
    }
  }

  /**
   * Get router address for a chain
   */
  getRouterAddress(chainId: number): string | null {
    return ROUTER_ADDRESSES[chainId] || null;
  }

  /**
   * Get WETH address for a chain
   */
  getWethAddress(chainId: number): string | null {
    return WETH_ADDRESSES[chainId] || null;
  }

  /**
   * Get all supported chains for swaps
   */
  getSupportedChains(): number[] {
    return Object.keys(ROUTER_ADDRESSES).map(Number);
  }
}

// Export singleton instance
export const swapQuoteService = new SwapQuoteService();

