import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { prisma } from '../../lib/prisma';
import { TransactionStatus, TransactionType } from '@prisma/client';

/**
 * Transaction service for tracking wallet transactions
 */
export class TransactionService {
  private readonly provider: ethers.providers.JsonRpcProvider;

  constructor() {
    // Initialize provider for KalyChain
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.KALYCHAIN_RPC_URL || 'https://rpc.kalychain.io/rpc'
    );
  }

  /**
   * Create a new transaction record
   * @param data Transaction data
   * @returns Created transaction
   */
  async createTransaction(data: {
    type: TransactionType;
    status: TransactionStatus;
    hash?: string;
    fromAddress: string;
    toAddress?: string;
    amount: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    fee?: string;
    blockNumber?: number;
    userId: string;
    walletId: string;
  }) {
    return await prisma.transaction.create({
      data
    });
  }

  /**
   * Get transactions for a user
   * @param userId User ID
   * @param limit Maximum number of transactions to return
   * @param offset Pagination offset
   * @returns Array of transactions
   */
  async getTransactionsByUserId(userId: string, limit = 20, offset = 0) {
    return await prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Get transactions for a wallet
   * @param walletId Wallet ID
   * @param limit Maximum number of transactions to return
   * @param offset Pagination offset
   * @returns Array of transactions
   */
  async getTransactionsByWalletId(walletId: string, limit = 20, offset = 0) {
    return await prisma.transaction.findMany({
      where: { walletId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Get transactions by wallet address
   * @param address Wallet address
   * @param limit Maximum number of transactions to return
   * @param offset Pagination offset
   * @returns Array of transactions
   */
  async getTransactionsByAddress(address: string, limit = 20, offset = 0) {
    const wallet = await prisma.wallet.findFirst({
      where: {
        address: {
          equals: address,
          mode: 'insensitive'
        }
      }
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return this.getTransactionsByWalletId(wallet.id, limit, offset);
  }

  /**
   * Get a transaction by hash
   * @param hash Transaction hash
   * @returns Transaction or null if not found
   */
  async getTransactionByHash(hash: string) {
    return await prisma.transaction.findUnique({
      where: { hash }
    });
  }

  /**
   * Update transaction status
   * @param id Transaction ID
   * @param status New status
   * @returns Updated transaction
   */
  async updateTransactionStatus(id: string, status: TransactionStatus) {
    return await prisma.transaction.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Track a new send transaction
   * @param data Transaction data
   * @returns Created transaction
   */
  async trackSendTransaction(data: {
    hash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    fee?: string;
    userId: string;
    walletId: string;
  }) {
    return this.createTransaction({
      ...data,
      type: TransactionType.SEND,
      status: TransactionStatus.PENDING
    });
  }

  /**
   * Track a new swap transaction
   * @param data Swap transaction data
   * @returns Created transaction
   */
  async trackSwapTransaction(data: {
    hash: string;
    fromAddress: string;
    toAddress?: string;
    amount: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    fee?: string;
    userId: string;
    walletId: string;
    // Additional swap-specific data
    fromTokenSymbol?: string;
    toTokenSymbol?: string;
    fromAmount?: string;
    toAmount?: string;
    slippage?: string;
    priceImpact?: string;
  }) {
    return this.createTransaction({
      hash: data.hash,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      amount: data.amount,
      tokenAddress: data.tokenAddress,
      tokenSymbol: data.tokenSymbol,
      tokenDecimals: data.tokenDecimals,
      fee: data.fee,
      userId: data.userId,
      walletId: data.walletId,
      type: TransactionType.SWAP,
      status: TransactionStatus.PENDING
    });
  }

  /**
   * Track a new receive transaction
   * @param data Transaction data
   * @returns Created transaction
   */
  async trackReceiveTransaction(data: {
    hash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    fee?: string;
    userId: string;
    walletId: string;
  }) {
    return this.createTransaction({
      ...data,
      type: TransactionType.RECEIVE,
      status: TransactionStatus.PENDING
    });
  }

  /**
   * Confirm a pending transaction
   * @param hash Transaction hash
   * @param blockNumber Block number
   * @returns Updated transaction
   */
  async confirmTransaction(hash: string, blockNumber: number) {
    const transaction = await this.getTransactionByHash(hash);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.CONFIRMED,
        blockNumber
      }
    });
  }

  /**
   * Mark a transaction as failed
   * @param hash Transaction hash
   * @returns Updated transaction
   */
  async failTransaction(hash: string) {
    const transaction = await this.getTransactionByHash(hash);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED
      }
    });
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
