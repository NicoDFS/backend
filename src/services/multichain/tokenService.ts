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
  private readonly API_RATE_LIMIT = 2000; // 2 seconds between API calls (free tier is 2/sec max)

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
   * Get ALL tokens from BSC using BSCScan API (Free Tier)
   * Discovers all tokens by getting transaction history, then checking balances
   */
  private async getBSCTokensFromAPI(address: string): Promise<TokenBalance[]> {
    try {
      // Check rate limiting
      const endpoint = 'bscscan-tokenlist';
      if (!this.canMakeApiCall(endpoint)) {
        console.warn('BSCScan API rate limited, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(56, address);
      }

      // Get BSC-specific API key from environment
      const apiKey = process.env.BSCSCAN_API_KEY;
      if (!apiKey) {
        console.warn('BSCSCAN_API_KEY not found in environment, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(56, address);
      }

      // Step 1: Get all token transactions to discover what tokens this address has interacted with
      const tokentxUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&apikey=${apiKey}`;

      const tokentxResponse = await fetch(tokentxUrl, {
        headers: { 'User-Agent': 'KalySwap/1.0' }
      });

      if (!tokentxResponse.ok) {
        console.warn('BSCScan tokentx API request failed, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(56, address);
      }

      const tokentxData = await tokentxResponse.json();

      if (tokentxData.status !== '1' || !tokentxData.result || !Array.isArray(tokentxData.result)) {
        console.warn('Invalid BSCScan tokentx API response, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(56, address);
      }

      // Step 2: Extract unique token contracts from transactions
      const uniqueTokens = new Map<string, {symbol: string, name: string, decimals: number, address: string}>();

      for (const tx of tokentxData.result) {
        if (tx.contractAddress && tx.tokenSymbol && tx.tokenName && tx.tokenDecimal) {
          const contractAddress = tx.contractAddress.toLowerCase();
          if (!uniqueTokens.has(contractAddress)) {
            uniqueTokens.set(contractAddress, {
              symbol: tx.tokenSymbol,
              name: tx.tokenName,
              decimals: parseInt(tx.tokenDecimal),
              address: tx.contractAddress // Keep original case
            });
          }
        }
      }

      console.log(`BSCScan: Found ${uniqueTokens.size} unique tokens from transaction history for ${address}`);

      // Step 3: Check current balance for each unique token
      const tokenBalances: TokenBalance[] = [];
      const tokens = Array.from(uniqueTokens.values());

      // Batch balance requests (max 5 at a time to avoid rate limits)
      const batchSize = 5;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);

        const batchPromises = batch.map(async (token) => {
          try {
            const balanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${token.address}&address=${address}&tag=latest&apikey=${apiKey}`;

            const response = await fetch(balanceUrl, {
              headers: { 'User-Agent': 'KalySwap/1.0' }
            });

            if (!response.ok) return null;

            const data = await response.json();

            if (data.status !== '1' || !data.result) return null;

            const balance = data.result;
            const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);

            // Only return tokens with balance > 0
            if (parseFloat(formattedBalance) > 0) {
              return {
                symbol: token.symbol,
                balance: balance.toString(),
                address: token.address,
                decimals: token.decimals,
                name: token.name,
                formattedBalance
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error fetching balance for ${token.symbol} (${token.address}):`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter((result: any) => result !== null) as TokenBalance[];
        tokenBalances.push(...validResults);

        // Add delay between batches to respect rate limits
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`BSCScan API: Found ${tokenBalances.length} tokens with balances for ${address}`);
      return tokenBalances;
    } catch (error) {
      console.error('Error fetching tokens from BSCScan API:', error);
      return this.getTokensFromPredefinedList(56, address);
    }
  }

  /**
   * Get ALL tokens from Arbitrum using Arbiscan API (Free Tier)
   * Discovers all tokens by getting transaction history, then checking balances
   */
  private async getArbitrumTokensFromAPI(address: string): Promise<TokenBalance[]> {
    try {
      // Check rate limiting for tokentx call
      const tokentxEndpoint = 'arbiscan-tokentx';
      if (!this.canMakeApiCall(tokentxEndpoint)) {
        console.warn('Arbiscan tokentx API rate limited, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(42161, address);
      }

      // Get Arbitrum-specific API key from environment
      const apiKey = process.env.ARBISCAN_API_KEY;
      if (!apiKey) {
        console.warn('ARBISCAN_API_KEY not found in environment, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(42161, address);
      }

      // Step 1: Get all token transactions to discover what tokens this address has interacted with
      const tokentxUrl = `https://api.arbiscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&apikey=${apiKey}`;

      const tokentxResponse = await fetch(tokentxUrl, {
        headers: { 'User-Agent': 'KalySwap/1.0' }
      });

      if (!tokentxResponse.ok) {
        console.warn('Arbiscan tokentx API request failed, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(42161, address);
      }

      const tokentxData = await tokentxResponse.json();

      if (tokentxData.status !== '1' || !tokentxData.result || !Array.isArray(tokentxData.result)) {
        console.warn('Invalid Arbiscan tokentx API response, falling back to predefined tokens');
        return this.getTokensFromPredefinedList(42161, address);
      }

      // Step 2: Extract unique token contracts from transactions
      const uniqueTokens = new Map<string, {symbol: string, name: string, decimals: number, address: string}>();

      for (const tx of tokentxData.result) {
        if (tx.contractAddress && tx.tokenSymbol && tx.tokenName && tx.tokenDecimal) {
          const contractAddress = tx.contractAddress.toLowerCase();
          if (!uniqueTokens.has(contractAddress)) {
            uniqueTokens.set(contractAddress, {
              symbol: tx.tokenSymbol,
              name: tx.tokenName,
              decimals: parseInt(tx.tokenDecimal),
              address: tx.contractAddress // Keep original case
            });
          }
        }
      }

      console.log(`Arbiscan: Found ${uniqueTokens.size} unique tokens from transaction history for ${address}`);

      // Step 3: Check current balance for each unique token
      const tokenBalances: TokenBalance[] = [];
      const tokens = Array.from(uniqueTokens.values());

      // Batch balance requests (max 2 at a time to respect 2/sec rate limit)
      const batchSize = 2;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);

        const batchPromises = batch.map(async (token) => {
          try {
            // Check rate limiting for individual balance calls
            const balanceEndpoint = `arbiscan-balance-${token.address}`;
            if (!this.canMakeApiCall(balanceEndpoint)) {
              console.warn(`Arbiscan balance API rate limited for ${token.symbol}, skipping`);
              return null;
            }

            const balanceUrl = `https://api.arbiscan.io/api?module=account&action=tokenbalance&contractaddress=${token.address}&address=${address}&tag=latest&apikey=${apiKey}`;

            const response = await fetch(balanceUrl, {
              headers: { 'User-Agent': 'KalySwap/1.0' }
            });

            if (!response.ok) {
              console.warn(`Arbiscan balance API request failed for ${token.symbol}: ${response.status}`);
              return null;
            }

            const data = await response.json();

            if (data.status !== '1' || !data.result) {
              console.warn(`Arbiscan balance API returned invalid data for ${token.symbol}:`, data);
              return null;
            }

            const balance = data.result;
            const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);

            // Only return tokens with balance > 0
            if (parseFloat(formattedBalance) > 0) {
              return {
                symbol: token.symbol,
                balance: balance.toString(),
                address: token.address,
                decimals: token.decimals,
                name: token.name,
                formattedBalance
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error fetching balance for ${token.symbol} (${token.address}):`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter((result: any) => result !== null) as TokenBalance[];
        tokenBalances.push(...validResults);

        // Add delay between batches to respect rate limits (2 calls per second max)
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
        }
      }

      console.log(`Arbiscan API: Found ${tokenBalances.length} tokens with balances for ${address}`);
      return tokenBalances;
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

  /**
   * Get list of popular BSC tokens for free tier API calls
   */
  private getBSCTokenList(): Array<{symbol: string, address: string, decimals: number, name: string}> {
    return [
      { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, name: 'Tether USD' },
      { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, name: 'USD Coin' },
      { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, name: 'Binance USD' },
      { symbol: 'ETH', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, name: 'Ethereum Token' },
      { symbol: 'BTCB', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, name: 'BTCB Token' },
      { symbol: 'ADA', address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', decimals: 18, name: 'Cardano Token' },
      { symbol: 'DOT', address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', decimals: 18, name: 'Polkadot Token' },
      { symbol: 'LINK', address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals: 18, name: 'ChainLink Token' },
      { symbol: 'UNI', address: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1', decimals: 18, name: 'Uniswap' },
      { symbol: 'LTC', address: '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', decimals: 18, name: 'Litecoin Token' },
      { symbol: 'DOGE', address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals: 8, name: 'Dogecoin' },
      { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, name: 'PancakeSwap Token' }
    ];
  }

  /**
   * Get list of popular Arbitrum tokens for free tier API calls
   */
  private getArbitrumTokenList(): Array<{symbol: string, address: string, decimals: number, name: string}> {
    return [
      { symbol: 'USDC', address: '0xA0b86a33E6441b8435b662303c0f479c7e2f9f0D', decimals: 6, name: 'USD Coin' },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, name: 'Tether USD' },
      { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, name: 'Wrapped Ether' },
      { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, name: 'Wrapped BTC' },
      { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, name: 'Arbitrum' },
      { symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18, name: 'ChainLink Token' },
      { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', decimals: 18, name: 'Uniswap' },
      { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, name: 'Dai Stablecoin' },
      { symbol: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18, name: 'GMX' },
      { symbol: 'MAGIC', address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', decimals: 18, name: 'MAGIC' }
    ];
  }
}

// Export singleton instance
export const multichainTokenService = new MultichainTokenService();
