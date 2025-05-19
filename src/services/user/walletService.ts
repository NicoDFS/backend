import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { Wallet, CreateWalletData, IWalletService } from '../../models/User';
import KalyWalletGenerator, { EncryptedWallet } from './walletGenerator';
import { prisma } from '../../lib/prisma';

// ERC20 ABI for token balance checking
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Token addresses on KalyChain
const TOKEN_ADDRESSES = {
  USDT: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
  USDC: '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9',
  DAI: '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6',
  WBTC: '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455',
  WKLC: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
  KSWAP: '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a'
};

/**
 * Wallet service implementation
 * Handles wallet creation, management, and balance checking
 */
export class WalletService implements IWalletService {
  private readonly provider: ethers.providers.JsonRpcProvider;

  constructor() {
    // Initialize provider for KalyChain
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.KALYCHAIN_RPC_URL || 'https://rpc.kalychain.io/rpc'
    );
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
   * Generate a new wallet for a user
   * @param userId User ID
   * @param password Password for encrypting the private key
   * @returns Created wallet
   */
  async generateWallet(userId: string, password: string): Promise<Wallet> {
    // Generate encrypted wallet
    const encryptedWallet = KalyWalletGenerator.generateEncryptedWallet(password);

    // Create wallet data
    const walletData: CreateWalletData = {
      userId,
      address: encryptedWallet.address,
      encryptedPrivateKey: encryptedWallet.encryptedPrivateKey,
      salt: encryptedWallet.salt,
      iv: encryptedWallet.iv,
      chainId: KalyWalletGenerator.KALYCHAIN_ID
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
   * Get wallet balances (KLC and tokens)
   * @param address Wallet address
   * @returns Object with KLC balance and token balances
   */
  async getWalletBalance(address: string): Promise<{
    klc: string;
    tokens: { symbol: string; balance: string; }[];
  }> {
    try {
      // Get KLC balance
      const klcBalance = await this.provider.getBalance(address);
      const klcBalanceFormatted = ethers.utils.formatEther(klcBalance);

      // Get token balances
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
              balance: formattedBalance
            };
          } catch (error) {
            console.error(`Error fetching ${symbol} balance:`, error);
            return {
              symbol,
              balance: '0'
            };
          }
        })
      );

      return {
        klc: klcBalanceFormatted,
        tokens: tokens.filter(t => parseFloat(t.balance) > 0) // Only return tokens with non-zero balance
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw new Error('Failed to fetch wallet balance');
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
