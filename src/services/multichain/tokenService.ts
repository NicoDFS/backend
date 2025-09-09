import { ethers } from 'ethers';
import { multiRPCProviderService, TokenInfo } from './rpcProviderService';

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

export interface ChainTokenList {
  chainId: number;
  tokens: TokenInfo[];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
  decimals: number;
  name: string;
  formattedBalance: string;
}

/**
 * Multichain Token Service
 * Manages token information and balances across supported chains
 */
export class MultichainTokenService {
  private chainTokens: Map<number, TokenInfo[]> = new Map();
  private apiCallTimestamps = new Map<string, number>();
  private readonly API_RATE_LIMIT = 2000; // 2 seconds between API calls per endpoint

  constructor() {
    this.initializeTokenLists();
  }

  /**
   * Check if we can make an API call (rate limiting)
   */
  private canMakeApiCall(endpoint: string): boolean {
    const lastCall = this.apiCallTimestamps.get(endpoint);
    const now = Date.now();

    if (!lastCall || (now - lastCall) >= this.API_RATE_LIMIT) {
      this.apiCallTimestamps.set(endpoint, now);
      return true;
    }

    return false;
  }

  /**
   * Initialize token lists for each supported chain
   */
  private initializeTokenLists() {
    // KalyChain tokens
    this.chainTokens.set(3888, [
      {
        symbol: 'USDT',
        address: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
        decimals: 6,
        name: 'Tether USD'
      },
      {
        symbol: 'USDC',
        address: '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9',
        decimals: 6,
        name: 'USD Coin'
      },
      {
        symbol: 'DAI',
        address: '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6',
        decimals: 18,
        name: 'Dai Stablecoin'
      },
      {
        symbol: 'WKLC',
        address: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
        decimals: 18,
        name: 'Wrapped KLC'
      },
      {
        symbol: 'KSWAP',
        address: '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a',
        decimals: 18,
        name: 'KalySwap Token'
      }
    ]);

    // BSC tokens
    this.chainTokens.set(56, [
      {
        symbol: 'USDT',
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        name: 'Tether USD'
      },
      {
        symbol: 'USDC',
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        decimals: 18,
        name: 'USD Coin'
      },
      {
        symbol: 'BUSD',
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        decimals: 18,
        name: 'Binance USD'
      },
      {
        symbol: 'WBNB',
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        decimals: 18,
        name: 'Wrapped BNB'
      },
      {
        symbol: 'CAKE',
        address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
        decimals: 18,
        name: 'PancakeSwap Token'
      }
    ]);

    // Arbitrum tokens
    this.chainTokens.set(42161, [
      {
        symbol: 'USDT',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        name: 'Tether USD'
      },
      {
        symbol: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
        name: 'USD Coin'
      },
      {
        symbol: 'WETH',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        decimals: 18,
        name: 'Wrapped Ether'
      },
      {
        symbol: 'ARB',
        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        decimals: 18,
        name: 'Arbitrum'
      },
      {
        symbol: 'DAI',
        address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        decimals: 18,
        name: 'Dai Stablecoin'
      }
    ]);
  }

  /**
   * Get token list for a specific chain
   */
  getTokensForChain(chainId: number): TokenInfo[] {
    const tokens = this.chainTokens.get(chainId);
    if (!tokens) {
      return [];
    }
    return [...tokens]; // Return copy to prevent mutation
  }

  /**
   * Get all supported tokens across all chains
   */
  getAllTokens(): ChainTokenList[] {
    const result: ChainTokenList[] = [];
    
    for (const [chainId, tokens] of this.chainTokens) {
      result.push({
        chainId,
        tokens: [...tokens]
      });
    }
    
    return result;
  }

  /**
   * Find token by address on a specific chain
   */
  findTokenByAddress(chainId: number, address: string): TokenInfo | null {
    const tokens = this.getTokensForChain(chainId);
    return tokens.find(token => 
      token.address.toLowerCase() === address.toLowerCase()
    ) || null;
  }

  /**
   * Find token by symbol on a specific chain
   */
  findTokenBySymbol(chainId: number, symbol: string): TokenInfo | null {
    const tokens = this.getTokensForChain(chainId);
    return tokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase()
    ) || null;
  }

  /**
   * Get native token balance for an address on a specific chain
   */
  async getNativeTokenBalance(chainId: number, address: string): Promise<TokenBalance> {
    const provider = multiRPCProviderService.getProvider(chainId);
    const nativeToken = multiRPCProviderService.getNativeToken(chainId);
    
    const balance = await provider.getBalance(address);
    const formattedBalance = ethers.utils.formatUnits(balance, nativeToken.decimals);
    
    return {
      symbol: nativeToken.symbol,
      balance: balance.toString(),
      address: nativeToken.address,
      decimals: nativeToken.decimals,
      name: nativeToken.name,
      formattedBalance
    };
  }

  /**
   * Get ERC20 token balance for an address on a specific chain
   */
  async getTokenBalance(chainId: number, address: string, tokenAddress: string): Promise<TokenBalance | null> {
    try {
      const provider = multiRPCProviderService.getProvider(chainId);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Get token info and balance
      const [balance, decimals, symbol, name] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.name()
      ]);
      
      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      
      return {
        symbol,
        balance: balance.toString(),
        address: tokenAddress,
        decimals,
        name,
        formattedBalance
      };
    } catch (error) {
      console.error(`Error getting token balance for ${tokenAddress} on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get all token balances (native + ERC20) for an address on a specific chain
   */
  async getAllTokenBalances(chainId: number, address: string): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];
    
    try {
      // Get native token balance
      const nativeBalance = await this.getNativeTokenBalance(chainId, address);
      balances.push(nativeBalance);
      
      // Get ALL ERC20 token balances using explorer APIs to discover any token
      const tokenBalances = await this.discoverAllTokenBalances(chainId, address);
      balances.push(...tokenBalances);
      
      return balances;
    } catch (error) {
      console.error(`Error getting token balances for ${address} on chain ${chainId}:`, error);
      return balances; // Return what we have so far
    }
  }

  /**
   * Add custom token to a chain's token list
   */
  addCustomToken(chainId: number, token: TokenInfo): void {
    const tokens = this.chainTokens.get(chainId) || [];
    
    // Check if token already exists
    const exists = tokens.some(t => 
      t.address.toLowerCase() === token.address.toLowerCase()
    );
    
    if (!exists) {
      tokens.push(token);
      this.chainTokens.set(chainId, tokens);
    }
  }

  /**
   * Discover ALL tokens that an address holds using blockchain explorer APIs
   */
  private async discoverAllTokenBalances(chainId: number, address: string): Promise<TokenBalance[]> {
    switch (chainId) {
      case 3888: // KalyChain
        return this.getKalyChainTokensFromAPI(address);
      case 56: // BSC
        return this.getBSCTokensFromAPI(address);
      case 42161: // Arbitrum
        return this.getArbitrumTokensFromAPI(address);
      default:
        console.warn(`No token discovery method for chain ${chainId}, falling back to predefined list`);
        return this.getTokensFromPredefinedList(chainId, address);
    }
  }

  /**
   * Get ALL tokens from KalyChain using KalyScan API (existing working method)
   */
  private async getKalyChainTokensFromAPI(address: string): Promise<TokenBalance[]> {
    try {
      // Check rate limiting
      const endpoint = 'kalyscan-tokens';
      if (!this.canMakeApiCall(endpoint)) {
        console.warn('KalyScan API rate limited, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(3888, address);
      }

      const response = await fetch(
        `https://kalyscan.io/api/v2/addresses/${address}/tokens?type=ERC-20%2CERC-721%2CERC-1155`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KalySwap/1.0'
          }
        }
      );

      if (!response.ok) {
        console.warn('KalyScan API request failed, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(3888, address);
      }

      const data = await response.json();

      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Invalid KalyScan API response format, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(3888, address);
      }

      const tokens = data.items
        .filter((item: any) => item.token && item.token.type === 'ERC-20') // Only ERC-20 tokens
        .map((item: any) => {
          const token = item.token;
          const balance = item.value;
          const decimals = parseInt(token.decimals) || 18;

          // Format balance using ethers
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);
          const tokenAddress = token.address_hash || token.address || '';

          return {
            symbol: token.symbol || 'UNKNOWN',
            balance: balance.toString(),
            address: tokenAddress,
            decimals,
            name: token.name || 'Unknown Token',
            formattedBalance
          };
        })
        .filter((token: any) => {
          // Filter out tokens with invalid addresses and zero balances
          const address = token.address;
          const isValidAddress = address &&
                               typeof address === 'string' &&
                               address.trim() !== '' &&
                               address.length >= 40 &&
                               address.startsWith('0x');
          const hasBalance = parseFloat(token.formattedBalance) > 0;

          return isValidAddress && hasBalance;
        });

      console.log(`KalyScan: Found ${tokens.length} tokens with balances for ${address}`);
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens from KalyScan API:', error);
      return this.getTokensFromPredefinedList(3888, address);
    }
  }

  /**
   * Get ALL tokens from BSC using BSCScan API
   */
  private async getBSCTokensFromAPI(address: string): Promise<TokenBalance[]> {
    try {
      // Check rate limiting
      const endpoint = 'bscscan-tokenlist';
      if (!this.canMakeApiCall(endpoint)) {
        console.warn('BSCScan API rate limited, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(56, address);
      }

      // BSCScan API endpoint for token balances (using free tier without API key)
      const response = await fetch(
        `https://api.bscscan.com/api?module=account&action=tokenlist&address=${address}`,
        {
          headers: {
            'User-Agent': 'KalySwap/1.0'
          }
        }
      );

      if (!response.ok) {
        console.warn(`BSCScan API request failed with status ${response.status}, falling back to predefined tokens`);
        return this.getTokensFromPredefinedList(56, address);
      }

      const data = await response.json();

      // BSCScan returns status '0' for errors, '1' for success
      if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
        console.warn(`Invalid BSCScan API response: ${data.message || 'Unknown error'}, falling back to predefined tokens`);
        return this.getTokensFromPredefinedList(56, address);
      }

      const tokens = data.result
        .map((item: any) => {
          const balance = item.balance;
          const decimals = parseInt(item.decimals) || 18;
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);

          return {
            symbol: item.symbol || 'UNKNOWN',
            balance: balance.toString(),
            address: item.contractAddress,
            decimals,
            name: item.name || 'Unknown Token',
            formattedBalance
          };
        })
        .filter((token: any) => parseFloat(token.formattedBalance) > 0); // Only tokens with balance

      console.log(`BSCScan: Found ${tokens.length} tokens with balances for ${address}`);
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens from BSCScan API:', error);
      return this.getTokensFromPredefinedList(56, address);
    }
  }

  /**
   * Get ALL tokens from Arbitrum using Arbiscan API
   */
  private async getArbitrumTokensFromAPI(address: string): Promise<TokenBalance[]> {
    try {
      // Check rate limiting
      const endpoint = 'arbiscan-tokenlist';
      if (!this.canMakeApiCall(endpoint)) {
        console.warn('Arbiscan API rate limited, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(42161, address);
      }

      // Arbiscan API endpoint for token balances (using free tier without API key)
      const response = await fetch(
        `https://api.arbiscan.io/api?module=account&action=tokenlist&address=${address}`,
        {
          headers: {
            'User-Agent': 'KalySwap/1.0'
          }
        }
      );

      if (!response.ok) {
        console.warn(`Arbiscan API request failed with status ${response.status}, falling back to predefined tokens`);
        return this.getTokensFromPredefinedList(42161, address);
      }

      const data = await response.json();

      // Arbiscan returns status '0' for errors, '1' for success
      if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
        console.warn(`Invalid Arbiscan API response: ${data.message || 'Unknown error'}, falling back to predefined tokens`);
        return this.getTokensFromPredefinedList(42161, address);
      }

      const tokens = data.result
        .map((item: any) => {
          const balance = item.balance;
          const decimals = parseInt(item.decimals) || 18;
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);

          return {
            symbol: item.symbol || 'UNKNOWN',
            balance: balance.toString(),
            address: item.contractAddress,
            decimals,
            name: item.name || 'Unknown Token',
            formattedBalance
          };
        })
        .filter((token: any) => parseFloat(token.formattedBalance) > 0); // Only tokens with balance

      console.log(`Arbiscan: Found ${tokens.length} tokens with balances for ${address}`);
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens from Arbiscan API:', error);
      return this.getTokensFromPredefinedList(42161, address);
    }
  }

  /**
   * Fallback method: get tokens from predefined list (for when APIs fail)
   */
  private async getTokensFromPredefinedList(chainId: number, address: string): Promise<TokenBalance[]> {
    console.log(`Using fallback predefined token list for chain ${chainId}`);
    const tokens = this.getTokensForChain(chainId);
    const tokenBalancePromises = tokens.map(token =>
      this.getTokenBalance(chainId, address, token.address)
    );

    const tokenBalances = await Promise.allSettled(tokenBalancePromises);
    const results: TokenBalance[] = [];

    for (const result of tokenBalances) {
      if (result.status === 'fulfilled' && result.value && parseFloat(result.value.formattedBalance) > 0) {
        results.push(result.value);
      }
    }

    return results;
  }

  /**
   * Validate token contract on a specific chain
   */
  async validateTokenContract(chainId: number, tokenAddress: string): Promise<TokenInfo | null> {
    try {
      const provider = multiRPCProviderService.getProvider(chainId);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      // Try to get token info
      const [decimals, symbol, name] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.name()
      ]);

      return {
        symbol,
        address: tokenAddress,
        decimals,
        name
      };
    } catch (error) {
      console.error(`Invalid token contract ${tokenAddress} on chain ${chainId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const multichainTokenService = new MultichainTokenService();
