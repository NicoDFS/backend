import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';
import KalyWalletGenerator, { EncryptedWallet } from './walletGenerator';
import { walletService } from './walletService';
import { transactionService } from './transactionService';
import { TransactionStatus } from '../../models/User';

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
  asset: string;
  password: string;
  chainId: number;
  gasLimit?: string;
  gasPrice?: string;
}

// Asset to contract address mapping for KalyChain
const ASSET_ADDRESSES: { [key: string]: string | null } = {
  'KLC': null, // Native token
  'USDT': '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
  // Add more tokens as needed
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
  private provider: ethers.providers.Provider;

  constructor() {
    this.provider = getProvider();
  }

  /**
   * Send a transaction (native KLC or ERC20 token)
   * @param input Transaction input parameters
   * @param userId User ID for authentication
   * @returns Transaction response
   */
  async sendTransaction(input: SendTransactionInput, userId: string): Promise<TransactionResponse> {
    try {
      // Get and validate wallet
      const wallet = await this.getAndValidateWallet(input.walletId, userId, input.password);

      // Create ethers wallet instance
      const ethersWallet = new ethers.Wallet(wallet.privateKey, this.provider);

      // Map asset symbol to contract address
      const tokenAddress = ASSET_ADDRESSES[input.asset.toUpperCase()];
      if (tokenAddress === undefined) {
        throw new Error(`Unsupported asset: ${input.asset}`);
      }

      // Prepare transaction based on type (native or token)
      let transaction: ethers.providers.TransactionRequest;
      let tokenSymbol = input.asset.toUpperCase();
      let tokenDecimals = 18;

      if (tokenAddress) {
        // ERC20 token transfer
        const tokenResult = await this.prepareTokenTransaction(
          tokenAddress,
          input.toAddress,
          input.amount,
          ethersWallet
        );
        transaction = tokenResult.transaction;
        tokenSymbol = tokenResult.symbol;
        tokenDecimals = tokenResult.decimals;
      } else {
        // Native KLC transfer
        transaction = await this.prepareNativeTransaction(
          input.toAddress,
          input.amount,
          ethersWallet
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
          throw new Error(`Gas estimation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Get gas price if not provided
      if (!transaction.gasPrice) {
        transaction.gasPrice = await this.provider.getGasPrice();
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
   * Get and validate wallet with password
   */
  private async getAndValidateWallet(walletId: string, userId: string, password: string) {
    // Get user wallets and find the specific wallet
    const userWallets = await walletService.getWalletsByUserId(userId);
    const dbWallet = userWallets.find(w => w.id === walletId);

    if (!dbWallet) {
      throw new Error('Wallet not found or does not belong to user');
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
   * Prepare native KLC transaction
   */
  private async prepareNativeTransaction(
    toAddress: string,
    amount: string,
    wallet: ethers.Wallet
  ): Promise<ethers.providers.TransactionRequest> {
    // Convert amount from KLC to wei (18 decimals)
    const amountInWei = ethers.utils.parseEther(amount);

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
    wallet: ethers.Wallet
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
   * Get transaction status and update database
   */
  async updateTransactionStatus(hash: string): Promise<void> {
    try {
      const receipt = await this.provider.getTransactionReceipt(hash);
      if (receipt) {
        const dbTransaction = await transactionService.getTransactionByHash(hash);
        if (dbTransaction) {
          const status = receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED;
          await transactionService.updateTransactionStatus(dbTransaction.id, status);
        }
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
    }
  }
}

// Export singleton instance
export const transactionSenderService = new TransactionSenderService();
