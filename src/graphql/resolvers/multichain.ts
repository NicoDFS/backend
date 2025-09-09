import { multiRPCProviderService } from '../../services/multichain/rpcProviderService';
import { multichainTokenService } from '../../services/multichain/tokenService';
import { Context } from '../context';

export const multichainResolvers = {
  Query: {
    /**
     * Get all supported chains
     */
    supportedChains: async () => {
      try {
        return multiRPCProviderService.getSupportedChains();
      } catch (error) {
        console.error('Error fetching supported chains:', error);
        throw new Error('Failed to fetch supported chains');
      }
    },

    /**
     * Get wallets for a specific chain
     */
    walletsByChain: async (_: any, { chainId }: { chainId: number }, context: Context) => {
      try {
        // Ensure user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Validate chain is supported
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        // Get wallets for the user on the specified chain
        const { walletService } = await import('../../services/user/walletService');
        return await walletService.getWalletsByUserIdAndChain(context.user.id, chainId);
      } catch (error) {
        console.error(`Error fetching wallets for chain ${chainId}:`, error);
        throw error;
      }
    },

    /**
     * Get wallet balance with chain support
     */
    walletBalance: async (_: any, { address, chainId = 3888 }: { address: string; chainId?: number }) => {
      try {
        // Validate chain is supported
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const { walletService } = await import('../../services/user/walletService');
        return await walletService.getWalletBalance(address, chainId);
      } catch (error) {
        console.error(`Error fetching balance for address ${address} on chain ${chainId}:`, error);
        throw error;
      }
    },


  },

  Mutation: {
    /**
     * Create wallet with chain support
     */
    createWallet: async (_: any, { password, chainId = 3888 }: { password: string; chainId?: number }, context: Context) => {
      try {
        // Ensure user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Validate chain is supported
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        // Create wallet using wallet service
        const { walletService } = await import('../../services/user/walletService');
        return await walletService.generateWallet(context.user.id, password, chainId);
      } catch (error) {
        console.error(`Error creating wallet for chain ${chainId}:`, error);
        throw error;
      }
    },

    /**
     * Import wallet with chain support
     */
    importWallet: async (_: any, { privateKey, password, chainId = 3888 }: { privateKey: string; password: string; chainId?: number }, context: Context) => {
      try {
        // Ensure user is authenticated
        if (!context.user) {
          throw new Error('Authentication required');
        }

        // Validate chain is supported
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        // Import wallet using wallet service
        const { walletService } = await import('../../services/user/walletService');
        return await walletService.importWallet(privateKey, password, context.user.id, chainId);
      } catch (error) {
        console.error(`Error importing wallet for chain ${chainId}:`, error);
        throw error;
      }
    },
  },

  // Field resolvers
  Wallet: {
    /**
     * Get wallet balance with chain support
     */
    balance: async (wallet: any) => {
      try {
        const { walletService } = await import('../../services/user/walletService');
        return await walletService.getWalletBalance(wallet.address, wallet.chainId);
      } catch (error) {
        console.error(`Error fetching balance for wallet ${wallet.address} on chain ${wallet.chainId}:`, error);
        // Return empty balance instead of throwing error
        const chainConfig = multiRPCProviderService.getChainConfig(wallet.chainId);
        return {
          native: {
            symbol: chainConfig.symbol,
            balance: '0',
            formattedBalance: '0.0'
          },
          tokens: []
        };
      }
    },
  },


};

// Health check resolvers for multichain
export const multichainHealthResolvers = {
  Query: {
    /**
     * Health check for all chains
     */
    chainsHealth: async () => {
      try {
        const healthResults = await multiRPCProviderService.healthCheckAll();
        const chains = multiRPCProviderService.getSupportedChains();
        
        return chains.map(chain => ({
          chainId: chain.chainId,
          name: chain.name,
          isHealthy: healthResults.get(chain.chainId) || false,
          rpcUrl: chain.rpcUrl
        }));
      } catch (error) {
        console.error('Error checking chains health:', error);
        throw new Error('Failed to check chains health');
      }
    },

    /**
     * Health check for a specific chain
     */
    chainHealth: async (_: any, { chainId }: { chainId: number }) => {
      try {
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const isHealthy = await multiRPCProviderService.healthCheck(chainId);
        const chainConfig = multiRPCProviderService.getChainConfig(chainId);
        
        return {
          chainId: chainConfig.chainId,
          name: chainConfig.name,
          isHealthy,
          rpcUrl: chainConfig.rpcUrl
        };
      } catch (error) {
        console.error(`Error checking health for chain ${chainId}:`, error);
        throw error;
      }
    },
  },
};

// Token-related resolvers
export const multichainTokenResolvers = {
  Query: {
    /**
     * Get tokens for a specific chain
     */
    tokensForChain: async (_: any, { chainId }: { chainId: number }) => {
      try {
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        return multichainTokenService.getTokensForChain(chainId);
      } catch (error) {
        console.error(`Error fetching tokens for chain ${chainId}:`, error);
        throw error;
      }
    },

    /**
     * Get all tokens across all chains
     */
    allChainTokens: async () => {
      try {
        return multichainTokenService.getAllTokens();
      } catch (error) {
        console.error('Error fetching all chain tokens:', error);
        throw new Error('Failed to fetch all chain tokens');
      }
    },

    /**
     * Validate token contract
     */
    validateToken: async (_: any, { chainId, tokenAddress }: { chainId: number; tokenAddress: string }) => {
      try {
        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        return await multichainTokenService.validateTokenContract(chainId, tokenAddress);
      } catch (error) {
        console.error(`Error validating token ${tokenAddress} on chain ${chainId}:`, error);
        return null;
      }
    },
  },

  Mutation: {
    /**
     * Add custom token to a chain
     */
    addCustomToken: async (_: any, { chainId, token }: { chainId: number; token: any }, context: Context) => {
      try {
        // Ensure user is authenticated (optional - you might want admin-only)
        if (!context.user) {
          throw new Error('Authentication required');
        }

        if (!multiRPCProviderService.isChainSupported(chainId)) {
          throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        // Validate token contract first
        const validatedToken = await multichainTokenService.validateTokenContract(chainId, token.address);
        if (!validatedToken) {
          throw new Error('Invalid token contract');
        }

        // Add token to the chain
        multichainTokenService.addCustomToken(chainId, validatedToken);
        
        return validatedToken;
      } catch (error) {
        console.error(`Error adding custom token to chain ${chainId}:`, error);
        throw error;
      }
    },
  },
};
