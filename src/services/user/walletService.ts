import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { Wallet, CreateWalletData, IWalletService } from '../../models/User';
import KalyWalletGenerator, { EncryptedWallet } from './walletGenerator';
import { prisma } from '../../lib/prisma';
import { multiRPCProviderService } from '../multichain/rpcProviderService';
import { multichainTokenService } from '../multichain/tokenService';

// Legacy token addresses - now handled by multichainTokenService
// Keeping for backward compatibility during migration

/**
 * Wallet service implementation
 * Handles wallet creation, management, and balance checking
 */
export class WalletService implements IWalletService {
  constructor() {
    // No longer need a single provider - using multiRPCProviderService
  }

  /**
   * Create a new wallet for a user
   * @param data Wallet creation data
   * @returns Created wallet
   */
  async createWallet(data: CreateWalletData): Promise<Wallet> {
    // Check if wallet address already exists
    const existingWallet = await this.getWalletByAddress(data.address);
    if (existingWallet) {
      throw new Error('Wallet address already exists');
    }

    // Create new wallet in database
    const newWallet = await prisma.wallet.create({
      data: {
        address: data.address,
        encryptedPrivateKey: data.encryptedPrivateKey,
        salt: data.salt,
        iv: data.iv,
        chainId: data.chainId,
        userId: data.userId
      }
    });

    return newWallet;
  }

  /**
   * Generate a new wallet for a user on a specific chain
   * @param userId User ID
   * @param password Password for encrypting the private key
   * @param chainId Chain ID (defaults to KalyChain)
   * @returns Created wallet
   */
  async generateWallet(userId: string, password: string, chainId: number = 3888): Promise<Wallet> {
    // Validate chain is supported
    if (!multiRPCProviderService.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Generate encrypted wallet (same private key works on all EVM chains)
    const encryptedWallet = KalyWalletGenerator.generateEncryptedWallet(password);

    // Create wallet data
    const walletData: CreateWalletData = {
      userId,
      address: encryptedWallet.address,
      encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
      salt: encryptedWallet.salt,
      iv: encryptedWallet.iv,
      chainId // Now supports multiple chains
    };

    // Create and return wallet
    return this.createWallet(walletData);
  }

  /**
   * Import an existing wallet for a user on a specific chain
   * @param privateKey Private key to import
   * @param password Password for encrypting the private key
   * @param userId User ID
   * @param chainId Chain ID (defaults to KalyChain)
   * @returns Imported wallet
   */
  async importWallet(privateKey: string, password: string, userId: string, chainId: number = 3888): Promise<Wallet> {
    // Validate chain is supported
    if (!multiRPCProviderService.isChainSupported(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Import and encrypt wallet
    const encryptedWallet = KalyWalletGenerator.importEncryptedWallet(privateKey, password);

    // Create wallet data
    const walletData: CreateWalletData = {
      userId,
      address: encryptedWallet.address,
      encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
      salt: encryptedWallet.salt,
      iv: encryptedWallet.iv,
      chainId // Now supports multiple chains
    };

    // Create and return wallet
    return this.createWallet(walletData);
  }

  /**
   * Get all wallets for a user
   * @param userId User ID
   * @returns Array of wallets
   */
  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return await prisma.wallet.findMany({
      where: { userId }
    });
  }

  /**
   * Get wallets for a user on a specific chain
   * @param userId User ID
   * @param chainId Chain ID
   * @returns Array of wallets for the specified chain
   */
  async getWalletsByUserIdAndChain(userId: string, chainId: number): Promise<Wallet[]> {
    return await prisma.wallet.findMany({
      where: {
        userId,
        chainId
      }
    });
  }

  /**
   * Get a wallet by address
   * @param address Wallet address
   * @returns Wallet or null if not found
   */
  async getWalletByAddress(address: string): Promise<Wallet | null> {
    return await prisma.wallet.findFirst({
      where: {
        address: {
          equals: address,
          mode: 'insensitive' // Case-insensitive search
        }
      }
    });
  }

  /**
   * Get wallet balances for a specific chain
   * @param address Wallet address
   * @param chainId Chain ID (defaults to KalyChain)
   * @returns Object with native token balance and ERC20 token balances
   */
  async getWalletBalance(address: string, chainId: number = 3888): Promise<{
    native: { symbol: string; balance: string; formattedBalance: string; };
    tokens: { symbol: string; balance: string; address: string; formattedBalance: string; decimals: number; name: string; }[];
  }> {
    try {
      // Validate chain is supported
      if (!multiRPCProviderService.isChainSupported(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Get all token balances using multichain token service
      const allBalances = await multichainTokenService.getAllTokenBalances(chainId, address);

      // Separate native token from ERC20 tokens
      const nativeBalance = allBalances.find(balance =>
        balance.address === '0x0000000000000000000000000000000000000000'
      );

      const tokenBalances = allBalances.filter(balance =>
        balance.address !== '0x0000000000000000000000000000000000000000' &&
        parseFloat(balance.formattedBalance) > 0 // Only return tokens with non-zero balance
      );

      if (!nativeBalance) {
        throw new Error(`Failed to get native token balance for chain ${chainId}`);
      }

      return {
        native: {
          symbol: nativeBalance.symbol,
          balance: nativeBalance.balance,
          formattedBalance: nativeBalance.formattedBalance
        },
        tokens: tokenBalances.map(token => ({
          symbol: token.symbol,
          balance: token.balance,
          address: token.address,
          formattedBalance: token.formattedBalance,
          decimals: token.decimals,
          name: token.name
        }))
      };
    } catch (error) {
      console.error(`Error fetching wallet balance for chain ${chainId}:`, error);
      throw new Error(`Failed to fetch wallet balance for chain ${chainId}`);
    }
  }

  /**
   * Get token balances from KalyScan API
   * @param address Wallet address
   * @returns Array of token balances
   */
  private async getTokenBalancesFromAPI(address: string): Promise<{ symbol: string; balance: string; address: string; }[]> {
    try {
      const response = await fetch(
        `https://kalyscan.io/api/v2/addresses/${address}/tokens?type=ERC-20%2CERC-721%2CERC-1155`
      );

      if (!response.ok) {
        console.warn('KalyScan API request failed, falling back to hardcoded tokens');
        return this.getTokenBalancesFromHardcodedList(address);
      }

      const data = await response.json();

      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Invalid API response format, falling back to hardcoded tokens');
        return this.getTokenBalancesFromHardcodedList(address);
      }

      // Process tokens from API
      console.log(`Processing ${data.items.length} items from KalyScan API for address ${address}`);
      console.log('Sample API response item:', JSON.stringify(data.items[0], null, 2));

      const tokens = data.items
        .filter((item: any) => item.token && item.token.type === 'ERC-20') // Only ERC-20 tokens
        .map((item: any) => {
          const token = item.token;
          const balance = item.value;
          const decimals = parseInt(token.decimals) || 18;

          // Format balance using ethers
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);

          // Use address_hash instead of address based on API response structure
          const tokenAddress = token.address_hash || token.address || '';
          console.log(`Processing token: ${token.symbol}, address: "${tokenAddress}", balance: ${formattedBalance}`);

          return {
            symbol: token.symbol || 'UNKNOWN',
            balance: formattedBalance,
            address: tokenAddress
          };
        })
        .filter((token: any) => {
          // Filter out tokens with invalid addresses
          const address = token.address;
          const isValid = address &&
                         typeof address === 'string' &&
                         address.trim() !== '' &&
                         address.length >= 40 && // Minimum length for Ethereum address
                         address.startsWith('0x');

          if (!isValid) {
            console.log(`Filtering out invalid token: ${token.symbol} with address: "${address}"`);
          }

          return isValid;
        });

      console.log(`Returning ${tokens.length} valid tokens after filtering`);
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens from KalyScan API:', error);
      // Fallback to hardcoded token list
      return this.getTokenBalancesFromHardcodedList(address);
    }
  }

  /**
   * Fallback method to get token balances from hardcoded list
   * @param address Wallet address
   * @returns Array of token balances
   */
  private async getTokenBalancesFromHardcodedList(address: string): Promise<{ symbol: string; balance: string; address: string; }[]> {
    console.log(`Using fallback hardcoded token list for address ${address}`);
    const tokens = await Promise.all(
      Object.entries(TOKEN_ADDRESSES).map(async ([symbol, tokenAddress]) => {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            this.provider
          );

          const balance = await tokenContract.balanceOf(address);
          const decimals = await tokenContract.decimals();
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);

          return {
            symbol,
            balance: formattedBalance,
            address: tokenAddress
          };
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
          return {
            symbol,
            balance: '0',
            address: tokenAddress
          };
        }
      })
    );

    return tokens;
  }

  /**
   * Get wallet transactions from KalyScan API
   * @param address Wallet address
   * @param limit Maximum number of transactions to return
   * @returns Array of transactions
   */
  async getWalletTransactions(address: string, limit = 10): Promise<{
    id: string;
    type: string;
    status: string;
    hash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    fee: string;
    blockNumber: number;
    timestamp: string;
  }[]> {
    try {
      // Try with simplified API call first
      const response = await fetch(
        `https://kalyscan.io/api/v2/addresses/${address}/transactions`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KalySwap/1.0'
          }
        }
      );

      if (!response.ok) {
        console.warn(`KalyScan API request failed for transactions with status ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.items || !Array.isArray(data.items)) {
        console.warn('Invalid transaction API response format');
        return [];
      }

      // Process transactions from API
      const transactions = data.items.slice(0, limit).map((item: any, index: number) => {
        // Determine transaction type based on method and transaction_types
        // Only use valid enum values: SEND, RECEIVE, SWAP, STAKE, UNSTAKE, CLAIM_REWARD, PROVIDE_LIQUIDITY, REMOVE_LIQUIDITY
        let type = 'SEND'; // Default to SEND for most transactions

        if (item.method) {
          switch (item.method.toLowerCase()) {
            case 'stake':
              type = 'STAKE';
              break;
            case 'withdraw':
            case 'unstake':
              type = 'UNSTAKE';
              break;
            case 'transferremote':
              type = 'SEND'; // Bridge transfers are essentially sends
              break;
            case 'create':
              type = 'SEND'; // Token creation involves sending KLC
              break;
            case 'approve':
              type = 'SEND'; // Approvals are contract interactions
              break;
            case 'deposit':
              type = 'SWAP'; // Wrapping tokens is like swapping
              break;
            case 'addliquidity':
            case 'addliquidityeth':
              type = 'PROVIDE_LIQUIDITY';
              break;
            case 'removeliquidity':
            case 'removeliquidityeth':
              type = 'REMOVE_LIQUIDITY';
              break;
            case 'claimreward':
            case 'getreward':
              type = 'CLAIM_REWARD';
              break;
            default:
              // Determine based on transaction direction and wallet address
              if (item.from?.hash?.toLowerCase() === address.toLowerCase()) {
                type = 'SEND';
              } else if (item.to?.hash?.toLowerCase() === address.toLowerCase()) {
                type = 'RECEIVE';
              } else {
                type = 'SEND'; // Default fallback
              }
          }
        } else {
          // For transactions without method (simple transfers)
          if (item.from?.hash?.toLowerCase() === address.toLowerCase()) {
            type = 'SEND';
          } else if (item.to?.hash?.toLowerCase() === address.toLowerCase()) {
            type = 'RECEIVE';
          }
        }

        // Format amount (convert from wei to ether for display)
        const amount = item.value ? ethers.utils.formatEther(item.value) : '0';

        // Format fee
        const fee = item.fee?.value ? ethers.utils.formatEther(item.fee.value) : '0';

        return {
          id: item.hash || `tx-${index}`,
          type,
          status: item.status === 'ok' ? 'CONFIRMED' : 'FAILED',
          hash: item.hash,
          fromAddress: item.from?.hash || '',
          toAddress: item.to?.hash || '',
          amount,
          tokenAddress: undefined, // Would need token transfer data for this
          tokenSymbol: undefined,
          tokenDecimals: undefined,
          fee,
          blockNumber: item.block_number || 0,
          timestamp: item.timestamp || new Date().toISOString()
        };
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions from KalyScan API:', error);
      return [];
    }
  }

  /**
   * Export wallet as JSON keystore and private key
   * @param wallet Wallet object
   * @param password Password to decrypt the wallet
   * @returns Object with JSON keystore string and private key
   */
  async exportWallet(wallet: Wallet, password: string): Promise<{ keystore: string; privateKey: string }> {
    try {
      const encryptedWallet: EncryptedWallet = {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        salt: wallet.salt,
        iv: wallet.iv,
        chainId: wallet.chainId
      };

      // Decrypt the wallet to get the private key
      const decryptedWallet = KalyWalletGenerator.decryptWallet(encryptedWallet, password);
      const privateKey = decryptedWallet.privateKey;

      // Also generate the keystore for backward compatibility
      const keystore = await KalyWalletGenerator.exportWalletToKeystore(
        encryptedWallet,
        password,
        password // Use same password for keystore
      );

      return {
        keystore,
        privateKey
      };
    } catch (error) {
      throw new Error(`Failed to export wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all wallets (for admin purposes)
   * @returns Array of wallets with sensitive data redacted
   */
  async getAllWallets(): Promise<Omit<Wallet, 'encryptedPrivateKey' | 'salt' | 'iv'>[]> {
    const wallets = await prisma.wallet.findMany();

    return wallets.map(wallet => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { encryptedPrivateKey, salt, iv, ...safeWallet } = wallet;
      return safeWallet;
    });
  }
}

// Export singleton instance
export const walletService = new WalletService();
