import { userService } from '../../services/user/userService';
import { walletService } from '../../services/user/walletService';
import { transactionService } from '../../services/user/transactionService';
import { transactionSenderService } from '../../services/user/transactionSender';
import { ethers } from 'ethers';
import KalyWalletGenerator from '../../services/user/walletGenerator';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Context } from '../context';
import { ApiKeyPermissions } from '../../services/auth/apiKeyService';

// Enhanced authentication middleware that supports both JWT and API Key
const authenticate = async (context: Context) => {
  if (context.user) {
    return context.user;
  }
  throw new Error('Authentication required');
};

// Check if user has permission (for API key auth)
const checkPermission = (context: Context, requiredPermission: ApiKeyPermissions) => {
  if (context.authType === 'apikey' && context.apiKey) {
    if (!context.apiKeyService.hasPermission(context.apiKey, requiredPermission)) {
      throw new Error(`Insufficient permissions. Required: ${requiredPermission}`);
    }
  }
  // JWT users have all permissions by default
};

export const userResolvers = {
  Query: {
    // Get current authenticated user
    me: async (_: any, __: any, context: Context) => {
      const user = await authenticate(context);
      checkPermission(context, ApiKeyPermissions.READ_USER);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    },

    // Get user by ID
    user: async (_: any, { id }: { id: string }) => {
      const user = await userService.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    },

    // Get user by username
    userByUsername: async (_: any, { username }: { username: string }) => {
      const user = await userService.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    },

    // Get wallet by address
    wallet: async (_: any, { address }: { address: string }) => {
      const wallet = await walletService.getWalletByAddress(address);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      return {
        id: wallet.id,
        address: wallet.address,
        chainId: wallet.chainId,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString()
      };
    },

    // Get wallet balance (multichain support)
    walletBalance: async (_: any, { address, chainId = 3888 }: { address: string; chainId?: number }) => {
      return await walletService.getWalletBalance(address, chainId);
    },

    // Export wallet as keystore and private key
    exportWallet: async (_: any, { walletId, password }: { walletId: string, password: string }, context: any) => {
      // Authenticate user
      const user = await authenticate(context);

      // Get all user wallets
      const userWallets = await walletService.getWalletsByUserId(user.id);

      // Find the specific wallet
      const wallet = userWallets.find(w => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found or does not belong to user');
      }

      // Export wallet
      const result = await walletService.exportWallet(wallet, password);
      return {
        keystore: result.keystore,
        privateKey: result.privateKey
      };
    },

    // Admin: Get all users
    allUsers: async () => {
      const users = await userService.getAllUsers();
      return users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }));
    },

    // Admin: Get all wallets
    allWallets: async () => {
      const wallets = await walletService.getAllWallets();
      return wallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address,
        chainId: wallet.chainId,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString()
      }));
    },

    // Get transactions for a user
    userTransactions: async (_: any, { limit, offset }: { limit?: number, offset?: number }, context: any) => {
      // Authenticate user
      const user = await authenticate(context);

      // Get transactions
      const transactions = await transactionService.getTransactionsByUserId(user.id, limit, offset);

      return transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        hash: tx.hash,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        tokenSymbol: tx.tokenSymbol,
        tokenDecimals: tx.tokenDecimals,
        fee: tx.fee,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp.toISOString()
      }));
    },

    // Get transactions for a wallet
    walletTransactions: async (_: any, { walletId, limit, offset }: { walletId: string, limit?: number, offset?: number }, context: any) => {
      // Authenticate user
      const user = await authenticate(context);

      // Get user wallets
      const userWallets = await walletService.getWalletsByUserId(user.id);

      // Check if wallet belongs to user
      const wallet = userWallets.find(w => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found or does not belong to user');
      }

      // Get transactions
      const transactions = await transactionService.getTransactionsByWalletId(walletId, limit, offset);

      return transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        hash: tx.hash,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        tokenSymbol: tx.tokenSymbol,
        tokenDecimals: tx.tokenDecimals,
        fee: tx.fee,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp.toISOString()
      }));
    }
  },

  Mutation: {
    // Register a new user
    register: async (_: any, { username, email, password }: { username: string, email?: string, password: string }) => {
      try {
        // Create user
        const user = await userService.createUser({ username, email, password });

        // Generate auth token
        const token = userService.generateAuthToken(user);

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
          }
        };
      } catch (error) {
        throw new Error(`Registration failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Login user
    login: async (_: any, { username, password }: { username: string, password: string }) => {
      try {
        // Find user
        const user = await userService.getUserByUsername(username);
        if (!user) {
          throw new Error('Invalid username or password');
        }

        // Validate password
        const isValid = userService.validatePassword(user, password);
        if (!isValid) {
          throw new Error('Invalid username or password');
        }

        // Generate auth token
        const token = userService.generateAuthToken(user);

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString()
          }
        };
      } catch (error) {
        throw new Error(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Create a new wallet for the authenticated user (multichain support)
    createWallet: async (_: any, { password, chainId = 3888 }: { password: string; chainId?: number }, context: Context) => {
      try {
        // Authenticate user
        const user = await authenticate(context);
        checkPermission(context, ApiKeyPermissions.WRITE_USER);

        // Generate wallet for specified chain
        const wallet = await walletService.generateWallet(user.id, password, chainId);

        return {
          id: wallet.id,
          address: wallet.address,
          chainId: wallet.chainId,
          createdAt: wallet.createdAt.toISOString(),
          updatedAt: wallet.updatedAt.toISOString()
        };
      } catch (error) {
        throw new Error(`Wallet creation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Import an existing wallet using private key (multichain support)
    importWallet: async (_: any, { privateKey, password, chainId = 3888 }: { privateKey: string; password: string; chainId?: number }, context: any) => {
      try {
        // Authenticate user
        const user = await authenticate(context);

        // Import wallet for specified chain using wallet service
        const wallet = await walletService.importWallet(privateKey, password, user.id, chainId);

        return {
          id: wallet.id,
          address: wallet.address,
          chainId: wallet.chainId,
          createdAt: wallet.createdAt.toISOString(),
          updatedAt: wallet.updatedAt.toISOString()
        };
      } catch (error) {
        throw new Error(`Wallet import failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Track a send transaction
    trackSendTransaction: async (_: any, {
      walletId,
      hash,
      toAddress,
      amount,
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      fee
    }: {
      walletId: string,
      hash: string,
      toAddress: string,
      amount: string,
      tokenAddress?: string,
      tokenSymbol?: string,
      tokenDecimals?: number,
      fee?: string
    }, context: any) => {
      try {
        // Authenticate user
        const user = await authenticate(context);

        // Get user wallets
        const userWallets = await walletService.getWalletsByUserId(user.id);

        // Check if wallet belongs to user
        const wallet = userWallets.find(w => w.id === walletId);
        if (!wallet) {
          throw new Error('Wallet not found or does not belong to user');
        }

        // Track transaction
        const transaction = await transactionService.trackSendTransaction({
          hash,
          fromAddress: wallet.address,
          toAddress,
          amount,
          tokenAddress,
          tokenSymbol,
          tokenDecimals,
          fee,
          userId: user.id,
          walletId
        });

        return {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          hash: transaction.hash,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          amount: transaction.amount,
          tokenAddress: transaction.tokenAddress,
          tokenSymbol: transaction.tokenSymbol,
          tokenDecimals: transaction.tokenDecimals,
          fee: transaction.fee,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp.toISOString()
        };
      } catch (error) {
        throw new Error(`Failed to track transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Track a swap transaction
    trackSwapTransaction: async (_: any, {
      walletId,
      hash,
      fromAddress,
      toAddress,
      amount,
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      fee
    }: {
      walletId: string,
      hash: string,
      fromAddress: string,
      toAddress?: string,
      amount: string,
      tokenAddress?: string,
      tokenSymbol?: string,
      tokenDecimals?: number,
      fee?: string
    }, context: any) => {
      try {
        // Authenticate user
        const user = await authenticate(context);

        // Get user wallets
        const userWallets = await walletService.getWalletsByUserId(user.id);

        // Check if wallet belongs to user
        const wallet = userWallets.find(w => w.id === walletId);
        if (!wallet) {
          throw new Error('Wallet not found or does not belong to user');
        }

        // Track swap transaction
        const transaction = await transactionService.trackSwapTransaction({
          hash,
          fromAddress,
          toAddress,
          amount,
          tokenAddress,
          tokenSymbol,
          tokenDecimals,
          fee,
          userId: user.id,
          walletId
        });

        return {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          hash: transaction.hash,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          amount: transaction.amount,
          tokenAddress: transaction.tokenAddress,
          tokenSymbol: transaction.tokenSymbol,
          tokenDecimals: transaction.tokenDecimals,
          fee: transaction.fee,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp.toISOString()
        };
      } catch (error) {
        throw new Error(`Failed to track swap transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Update transaction status
    updateTransactionStatus: async (_: any, {
      hash,
      status,
      blockNumber
    }: {
      hash: string,
      status: string,
      blockNumber?: number
    }, context: any) => {
      try {
        // Authenticate user
        await authenticate(context);

        let transaction;

        // Update transaction status
        if (status === 'CONFIRMED' && blockNumber) {
          transaction = await transactionService.confirmTransaction(hash, blockNumber);
        } else if (status === 'FAILED') {
          transaction = await transactionService.failTransaction(hash);
        } else {
          throw new Error('Invalid status or missing blockNumber for CONFIRMED status');
        }

        return {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          hash: transaction.hash,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          amount: transaction.amount,
          tokenAddress: transaction.tokenAddress,
          tokenSymbol: transaction.tokenSymbol,
          tokenDecimals: transaction.tokenDecimals,
          fee: transaction.fee,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp.toISOString()
        };
      } catch (error) {
        throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Send a transaction (native KLC or ERC20 token)
    sendTransaction: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        // Authenticate user
        const user = await authenticate(context);
        checkPermission(context, ApiKeyPermissions.WRITE_USER);

        // Send transaction using the transaction sender service
        const result = await transactionSenderService.sendTransaction(input, user.id);

        return result;
      } catch (error) {
        throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    // Send a contract transaction
    sendContractTransaction: async (_: any, { input }: { input: any }, context: Context) => {
      try {
        // Authenticate user
        const user = await authenticate(context);
        checkPermission(context, ApiKeyPermissions.WRITE_USER);

        // Send contract transaction
        const result = await transactionSenderService.sendContractTransaction(input, user.id);

        return result;
      } catch (error) {
        throw new Error(`Contract transaction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  },

  User: {
    // Resolve wallets for a user
    wallets: async (parent: { id: string }) => {
      const wallets = await walletService.getWalletsByUserId(parent.id);
      return wallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address,
        chainId: wallet.chainId,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString()
      }));
    },

    // Resolve transactions for a user
    transactions: async (parent: { id: string }, { limit, offset }: { limit?: number, offset?: number }) => {
      const transactions = await transactionService.getTransactionsByUserId(parent.id, limit, offset);

      return transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        hash: tx.hash,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        tokenSymbol: tx.tokenSymbol,
        tokenDecimals: tx.tokenDecimals,
        fee: tx.fee,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp.toISOString()
      }));
    }
  },

  Wallet: {
    // Resolve balance for a wallet (multichain support)
    balance: async (parent: { address: string; chainId: number }) => {
      return await walletService.getWalletBalance(parent.address, parent.chainId);
    },

    // Resolve transactions for a wallet using KalyScan API
    transactions: async (parent: { address: string }, { limit }: { limit?: number }) => {
      const transactions = await walletService.getWalletTransactions(parent.address, limit || 10);
      return transactions;
    }
  }
};
