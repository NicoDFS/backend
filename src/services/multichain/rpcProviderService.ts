import { ethers } from 'ethers';

export interface ChainInfo {
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
  blockExplorer: string;
  isTestnet: boolean;
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
}

/**
 * Multi-chain RPC Provider Service
 * Manages RPC providers for KalyChain, BSC, and Arbitrum
 */
export class MultiRPCProviderService {
  private providers: Map<number, ethers.providers.JsonRpcProvider> = new Map();
  private chainConfigs: Map<number, ChainInfo> = new Map();

  constructor() {
    this.initializeChainConfigs();
    this.initializeProviders();
  }

  /**
   * Initialize chain configurations
   */
  private initializeChainConfigs() {
    // KalyChain configuration
    this.chainConfigs.set(3888, {
      chainId: 3888,
      name: 'KalyChain',
      symbol: 'KLC',
      decimals: 18,
      rpcUrl: 'https://rpc.kalychain.io/rpc',
      blockExplorer: 'https://kalyscan.io',
      isTestnet: false
    });

    // BSC configuration
    this.chainConfigs.set(56, {
      chainId: 56,
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      decimals: 18,
      rpcUrl: 'https://bsc.nownodes.io/38c9312e-ab3b-43cc-9f00-da2b23125a28',
      blockExplorer: 'https://bscscan.com',
      isTestnet: false
    });

    // Arbitrum configuration
    this.chainConfigs.set(42161, {
      chainId: 42161,
      name: 'Arbitrum One',
      symbol: 'ETH',
      decimals: 18,
      rpcUrl: 'https://arbitrum.nownodes.io/38c9312e-ab3b-43cc-9f00-da2b23125a28',
      blockExplorer: 'https://arbiscan.io',
      isTestnet: false
    });
  }

  /**
   * Initialize RPC providers for all supported chains
   */
  private initializeProviders() {
    for (const [chainId, config] of this.chainConfigs) {
      try {
        const provider = new ethers.providers.JsonRpcProvider({
          url: config.rpcUrl,
          timeout: 30000, // 30 second timeout
        });

        // Set network info to avoid auto-detection
        provider._network = {
          name: config.name.toLowerCase().replace(/\s+/g, '-'),
          chainId: config.chainId,
          ensAddress: undefined
        };

        this.providers.set(chainId, provider);
        console.log(`✅ Initialized RPC provider for ${config.name} (${chainId})`);
      } catch (error) {
        console.error(`❌ Failed to initialize provider for chain ${chainId}:`, error);
      }
    }
  }

  /**
   * Get RPC provider for a specific chain
   */
  getProvider(chainId: number): ethers.providers.JsonRpcProvider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Array.from(this.chainConfigs.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * Get chain configuration
   */
  getChainConfig(chainId: number): ChainInfo {
    const config = this.chainConfigs.get(chainId);
    if (!config) {
      throw new Error(`Unknown chain ID: ${chainId}`);
    }
    return config;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): ChainInfo[] {
    return Array.from(this.chainConfigs.values());
  }

  /**
   * Check if chain is supported
   */
  isChainSupported(chainId: number): boolean {
    return this.chainConfigs.has(chainId);
  }

  /**
   * Get native token info for a chain
   */
  getNativeToken(chainId: number): TokenInfo {
    const config = this.getChainConfig(chainId);
    return {
      symbol: config.symbol,
      address: '0x0000000000000000000000000000000000000000', // Native token address
      decimals: config.decimals,
      name: config.symbol === 'KLC' ? 'KalyCoin' : 
            config.symbol === 'BNB' ? 'BNB' : 
            config.symbol === 'ETH' ? 'Ether' : config.symbol
    };
  }

  /**
   * Health check for a specific provider
   */
  async healthCheck(chainId: number): Promise<boolean> {
    try {
      const provider = this.getProvider(chainId);
      const blockNumber = await provider.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      console.error(`Health check failed for chain ${chainId}:`, error);
      return false;
    }
  }

  /**
   * Health check for all providers
   */
  async healthCheckAll(): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    
    for (const chainId of this.chainConfigs.keys()) {
      const isHealthy = await this.healthCheck(chainId);
      results.set(chainId, isHealthy);
    }
    
    return results;
  }

  /**
   * Get gas price for a specific chain
   */
  async getGasPrice(chainId: number): Promise<ethers.BigNumber> {
    const provider = this.getProvider(chainId);
    return await provider.getGasPrice();
  }

  /**
   * Estimate gas for a transaction on a specific chain
   */
  async estimateGas(chainId: number, transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
    const provider = this.getProvider(chainId);
    return await provider.estimateGas(transaction);
  }

  /**
   * Get transaction count (nonce) for an address on a specific chain
   */
  async getTransactionCount(chainId: number, address: string): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getTransactionCount(address, 'pending');
  }

  /**
   * Get balance for an address on a specific chain
   */
  async getBalance(chainId: number, address: string): Promise<ethers.BigNumber> {
    const provider = this.getProvider(chainId);
    return await provider.getBalance(address);
  }

  /**
   * Get formatted balance for an address on a specific chain
   */
  async getFormattedBalance(chainId: number, address: string): Promise<string> {
    const balance = await this.getBalance(chainId, address);
    const config = this.getChainConfig(chainId);
    return ethers.utils.formatUnits(balance, config.decimals);
  }

  /**
   * Wait for transaction confirmation on a specific chain
   */
  async waitForTransaction(chainId: number, txHash: string, confirmations: number = 1): Promise<ethers.providers.TransactionReceipt> {
    const provider = this.getProvider(chainId);
    return await provider.waitForTransaction(txHash, confirmations);
  }

  /**
   * Get transaction receipt on a specific chain
   */
  async getTransactionReceipt(chainId: number, txHash: string): Promise<ethers.providers.TransactionReceipt | null> {
    const provider = this.getProvider(chainId);
    return await provider.getTransactionReceipt(txHash);
  }

  /**
   * Get current block number for a specific chain
   */
  async getBlockNumber(chainId: number): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getBlockNumber();
  }
}

// Export singleton instance
export const multiRPCProviderService = new MultiRPCProviderService();
