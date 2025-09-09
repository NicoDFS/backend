import { ethers } from 'ethers';
import { multiRPCProviderService } from '../multichain/rpcProviderService';
import KalyWalletGenerator, { EncryptedWallet } from './walletGenerator';
import { walletService } from './walletService';
import { transactionService } from './transactionService';
import { TransactionStatus } from '@prisma/client';

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

export interface SendTransactionInput {
  walletId: string;
  toAddress: string;
  amount: string;
  asset: string; // For native KLC use 'KLC', for ERC20 tokens use contract address
  password: string;
  chainId: number;
  gasLimit?: string;
  gasPrice?: string;
}

export interface SendContractTransactionInput {
  walletId: string;
  toAddress: string;
  value: string;
  data: string;
  password: string;
  chainId: number;
  gasLimit?: string;
  gasPrice?: string;
}

// Helper function to check if an address is a valid Ethereum address
const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export interface TransactionResponse {
  id: string;
  hash: string;
  status: string;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  blockNumber?: number;
  timestamp?: string;
}

export class TransactionSenderService {
  constructor() {
    // No longer need a single provider - we'll use multiRPCProviderService
  }

  /**
   * Send a transaction (native token or ERC20 token) on any supported chain
   * @param input Transaction input parameters
   * @param userId User ID for authentication
   * @returns Transaction response
   */
  async sendTransaction(input: SendTransactionInput, userId: string): Promise<TransactionResponse> {
    try {
      // Validate chain is supported
      if (!multiRPCProviderService.isChainSupported(input.chainId)) {
        throw new Error(`Unsupported chain ID: ${input.chainId}`);
      }

      // Get and validate wallet
      const wallet = await this.getAndValidateWallet(input.walletId, userId, input.password, input.chainId);

      // Get provider for the specific chain
      const provider = multiRPCProviderService.getProvider(input.chainId);

      // Create ethers wallet instance with chain-specific provider
      const ethersWallet = new ethers.Wallet(wallet.privateKey, provider);

      // Get chain configuration
      const chainConfig = multiRPCProviderService.getChainConfig(input.chainId);

      // Determine if this is a native token transfer or ERC20 token transfer
      const isNativeToken = input.asset.toUpperCase() === chainConfig.symbol ||
                           input.asset === '0x0000000000000000000000000000000000000000' ||
                           !isValidAddress(input.asset);

      // Prepare transaction based on type (native or token)
      let transaction: ethers.providers.TransactionRequest;
      let tokenSymbol = input.asset.toUpperCase();
      let tokenDecimals = chainConfig.decimals;
      let tokenAddress: string | null = null;

      if (!isNativeToken) {
        // ERC20 token transfer - use the asset as contract address
        tokenAddress = input.asset;
        const tokenResult = await this.prepareTokenTransaction(
          tokenAddress,
          input.toAddress,
          input.amount,
          ethersWallet,
          input.chainId
        );
        transaction = tokenResult.transaction;
        tokenSymbol = tokenResult.symbol;
        tokenDecimals = tokenResult.decimals;
      } else {
        // Native token transfer (KLC, BNB, ETH)
        tokenAddress = null;
        tokenSymbol = chainConfig.symbol;
        transaction = await this.prepareNativeTransaction(
          input.toAddress,
          input.amount,
          ethersWallet,
          input.chainId
        );
      }

      // Apply gas settings if provided
      if (input.gasLimit) {
        transaction.gasLimit = ethers.BigNumber.from(input.gasLimit);
      }
      if (input.gasPrice) {
        transaction.gasPrice = ethers.BigNumber.from(input.gasPrice);
      }

      // Estimate gas if not provided
      if (!transaction.gasLimit) {
        try {
          transaction.gasLimit = await ethersWallet.estimateGas(transaction);
        } catch (error) {
          console.warn('Gas estimation failed, using fallback gas limit:', error);
          // Use fallback gas limits based on transaction type and chain
          if (tokenAddress) {
            // ERC20 transfer - needs more gas
            transaction.gasLimit = input.chainId === 42161 ?
              ethers.BigNumber.from(200000) : // Arbitrum needs less gas
              ethers.BigNumber.from(100000);   // BSC/KalyChain
          } else {
            // Native token transfer - needs less gas
            transaction.gasLimit = ethers.BigNumber.from(21000);
          }
        }
      }

      // Get gas price if not provided
      if (!transaction.gasPrice) {
        let gasPrice = await provider.getGasPrice();

        // Apply chain-specific gas price adjustments
        if (input.chainId === 56) { // BSC
          // BSC often needs slightly higher gas price for faster confirmation
          gasPrice = gasPrice.mul(110).div(100); // 10% increase
        } else if (input.chainId === 42161) { // Arbitrum
          // Arbitrum has different gas mechanics, but provider should handle this
          // Keep the provider's gas price
        }

        transaction.gasPrice = gasPrice;
      }

      // Calculate fee
      const fee = transaction.gasLimit!.mul(transaction.gasPrice!);

      // Check balance for native transactions
      if (!tokenAddress) {
        const balance = await ethersWallet.getBalance();
        const amountInWei = ethers.utils.parseEther(input.amount);
        const totalRequired = amountInWei.add(fee);
        if (balance.lt(totalRequired)) {
          throw new Error('Insufficient balance for transaction and gas fees');
        }
      }

      // Send transaction
      const txResponse = await ethersWallet.sendTransaction(transaction);

      // Create transaction record in database
      const dbTransaction = await transactionService.trackSendTransaction({
        hash: txResponse.hash,
        fromAddress: wallet.address,
        toAddress: input.toAddress,
        amount: input.amount,
        tokenAddress: tokenAddress || undefined,
        tokenSymbol,
        tokenDecimals,
        fee: fee.toString(),
        userId,
        walletId: input.walletId
      });

      // Return response
      return {
        id: dbTransaction.id,
        hash: txResponse.hash,
        status: 'PENDING',
        gasPrice: transaction.gasPrice!.toString(),
        fee: fee.toString(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send a contract transaction (arbitrary contract call) on any supported chain
   * @param input Contract transaction input parameters
   * @param userId User ID for authentication
   * @returns Transaction response
   */
  async sendContractTransaction(input: SendContractTransactionInput, userId: string): Promise<TransactionResponse> {
    try {
      // Validate chain is supported
      if (!multiRPCProviderService.isChainSupported(input.chainId)) {
        throw new Error(`Unsupported chain ID: ${input.chainId}`);
      }

      // Get and validate wallet
      const wallet = await this.getAndValidateWallet(input.walletId, userId, input.password, input.chainId);

      // Get provider for the specific chain
      const provider = multiRPCProviderService.getProvider(input.chainId);

      // Create ethers wallet instance with chain-specific provider
      const ethersWallet = new ethers.Wallet(wallet.privateKey, provider);

      // Prepare contract transaction
      const transaction: ethers.providers.TransactionRequest = {
        to: input.toAddress,
        value: input.value ? ethers.BigNumber.from(input.value) : ethers.BigNumber.from(0),
        data: input.data,
        from: wallet.address
      };

      // Apply gas settings if provided
      if (input.gasLimit) {
        transaction.gasLimit = ethers.BigNumber.from(input.gasLimit);
      } else {
        // Estimate gas for contract call
        try {
          const estimatedGas = await provider.estimateGas(transaction);
          transaction.gasLimit = estimatedGas.mul(120).div(100); // Add 20% buffer
        } catch (gasError) {
          console.warn('Gas estimation failed, using default:', gasError);
          transaction.gasLimit = ethers.BigNumber.from(500000); // Default gas limit for contract calls
        }
      }

      if (input.gasPrice) {
        transaction.gasPrice = ethers.BigNumber.from(input.gasPrice);
      } else {
        // Get current gas price from chain-specific provider
        const gasPrice = await provider.getGasPrice();
        transaction.gasPrice = gasPrice;
      }

      // Calculate estimated fee
      const fee = transaction.gasLimit!.mul(transaction.gasPrice!);

      console.log('📝 Sending contract transaction:', {
        to: transaction.to,
        value: transaction.value?.toString(),
        data: transaction.data?.slice(0, 10) + '...',
        gasLimit: transaction.gasLimit?.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        estimatedFee: ethers.utils.formatEther(fee) + ' KLC'
      });

      // Send transaction
      const txResponse = await ethersWallet.sendTransaction(transaction);

      // Create transaction record in database
      const dbTransaction = await transactionService.trackContractTransaction({
        hash: txResponse.hash,
        fromAddress: wallet.address,
        toAddress: input.toAddress,
        value: input.value,
        data: input.data,
        fee: fee.toString(),
        userId,
        walletId: input.walletId
      });

      // Return response
      return {
        id: dbTransaction.id,
        hash: txResponse.hash,
        status: 'PENDING',
        gasPrice: transaction.gasPrice!.toString(),
        fee: fee.toString(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Contract transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get and validate wallet with password and chain compatibility
   */
  private async getAndValidateWallet(walletId: string, userId: string, password: string, chainId: number) {
    // Get user wallets and find the specific wallet
    const userWallets = await walletService.getWalletsByUserId(userId);
    const dbWallet = userWallets.find(w => w.id === walletId);

    if (!dbWallet) {
      throw new Error('Wallet not found or does not belong to user');
    }

    // Validate wallet is for the correct chain
    if (dbWallet.chainId !== chainId) {
      throw new Error(`Wallet is for chain ${dbWallet.chainId}, but transaction is for chain ${chainId}`);
    }

    // Decrypt wallet with password
    const encryptedWallet: EncryptedWallet = {
      address: dbWallet.address,
      encryptedPrivateKey: dbWallet.encryptedPrivateKey,
      salt: dbWallet.salt,
      iv: dbWallet.iv,
      chainId: dbWallet.chainId
    };

    try {
      const decryptedWallet = KalyWalletGenerator.decryptWallet(encryptedWallet, password);
      return {
        address: dbWallet.address,
        privateKey: decryptedWallet.privateKey
      };
    } catch (error) {
      throw new Error('Invalid password');
    }
  }

  /**
   * Prepare native token transaction (KLC, BNB, ETH)
   */
  private async prepareNativeTransaction(
    toAddress: string,
    amount: string,
    wallet: ethers.Wallet,
    chainId: number
  ): Promise<ethers.providers.TransactionRequest> {
    // Get chain config for proper decimals
    const chainConfig = multiRPCProviderService.getChainConfig(chainId);

    // Convert amount to wei using chain-specific decimals
    const amountInWei = ethers.utils.parseUnits(amount, chainConfig.decimals);

    return {
      to: toAddress,
      value: amountInWei,
      from: wallet.address
    };
  }

  /**
   * Prepare ERC20 token transaction
   */
  private async prepareTokenTransaction(
    tokenAddress: string,
    toAddress: string,
    amount: string,
    wallet: ethers.Wallet,
    chainId: number
  ) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Get token info
    const [symbol, decimals, balance] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.balanceOf(wallet.address)
    ]);

    // Convert amount to proper decimals
    const amountBN = ethers.utils.parseUnits(amount, decimals);

    // Check token balance
    if (balance.lt(amountBN)) {
      throw new Error(`Insufficient ${symbol} balance`);
    }

    // Prepare transfer transaction
    const data = tokenContract.interface.encodeFunctionData('transfer', [toAddress, amountBN]);

    return {
      transaction: {
        to: tokenAddress,
        data,
        from: wallet.address,
        value: ethers.BigNumber.from(0)
      },
      symbol,
      decimals
    };
  }

  /**
   * Get transaction status and update database (multichain)
   */
  async updateTransactionStatus(hash: string, chainId: number): Promise<void> {
    try {
      // Get provider for the specific chain
      const provider = multiRPCProviderService.getProvider(chainId);

      const receipt = await provider.getTransactionReceipt(hash);
      if (receipt) {
        const dbTransaction = await transactionService.getTransactionByHash(hash);
        if (dbTransaction) {
          const status = receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED;
          await transactionService.updateTransactionStatus(dbTransaction.id, status);
        }
      }
    } catch (error) {
      console.error(`Error updating transaction status for chain ${chainId}:`, error);
    }
  }
}

// Export singleton instance
export const transactionSenderService = new TransactionSenderService();
