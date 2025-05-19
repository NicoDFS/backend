import { ethers } from 'ethers';
import * as crypto from 'crypto';

export interface EncryptedWallet {
  address: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  chainId?: number;
}

/**
 * KalyChain Wallet Generator
 * Generates and manages EVM-compatible wallets for KalyChain
 */
export class KalyWalletGenerator {
  // KalyChain chain ID
  static readonly KALYCHAIN_ID = 3888;

  /**
   * Generate a cryptographically secure salt
   * @returns Hex-encoded salt string
   */
  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate an initialization vector for encryption
   * @returns Hex-encoded IV string
   */
  static generateIV(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Encrypt a private key
   * @param privateKey Private key to encrypt
   * @param password Password for encryption
   * @param salt Salt for key derivation
   * @param ivHex Initialization vector as hex string
   * @returns Encrypted private key as hex string
   */
  static encryptPrivateKey(
    privateKey: string,
    password: string,
    salt: string,
    ivHex: string
  ): string {
    // Derive encryption key from password
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iterations
      32,     // key length
      'sha256'
    );

    // Convert hex IV to buffer
    const iv = Buffer.from(ivHex, 'hex');

    // Create cipher and encrypt
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
    encryptedPrivateKey += cipher.final('hex');

    return encryptedPrivateKey;
  }

  /**
   * Generate a new KalyChain wallet with encrypted private key
   * @param password - Password used to encrypt the private key
   * @returns EncryptedWallet object with address and encrypted details
   */
  static generateEncryptedWallet(password: string): EncryptedWallet {
    // Create a new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();

    // Generate a cryptographically secure salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Generate an initialization vector
    const iv = crypto.randomBytes(16);

    // Derive an encryption key from the password using PBKDF2
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      100000,  // iterations
      32,      // key length
      'sha256' // hash algorithm
    );

    // Create a cipher using AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    // Encrypt the private key
    let encryptedPrivateKey = cipher.update(wallet.privateKey, 'utf8', 'hex');
    encryptedPrivateKey += cipher.final('hex');

    return {
      address: wallet.address,
      encryptedPrivateKey,
      salt,
      iv: iv.toString('hex'),
      chainId: this.KALYCHAIN_ID
    };
  }

  /**
   * Decrypt the private key using the provided password
   * @param encryptedWallet - The encrypted wallet object
   * @param password - Password used to decrypt the private key
   * @returns Decrypted Ethereum wallet
   */
  static decryptWallet(encryptedWallet: EncryptedWallet, password: string): ethers.Wallet {
    // Derive the key using the same method as encryption
    const key = crypto.pbkdf2Sync(
      password,
      encryptedWallet.salt,
      100000,
      32,
      'sha256'
    );

    // Create a decipher
    const iv = Buffer.from(encryptedWallet.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Decrypt the private key
    let decryptedPrivateKey = decipher.update(encryptedWallet.encryptedPrivateKey, 'hex', 'utf8');
    decryptedPrivateKey += decipher.final('utf8');

    // Create and return a wallet from the decrypted private key
    const wallet = new ethers.Wallet(decryptedPrivateKey);

    return wallet;
  }

  /**
   * Export wallet as JSON keystore file (compatible with standard wallets)
   * @param encryptedWallet - The encrypted wallet object
   * @param password - Password used to decrypt the private key
   * @param newPassword - New password for the keystore file (can be the same as original)
   * @returns Promise with JSON keystore string
   */
  static async exportWalletToKeystore(
    encryptedWallet: EncryptedWallet,
    password: string,
    newPassword: string
  ): Promise<string> {
    try {
      // First decrypt the wallet with the original password
      const wallet = this.decryptWallet(encryptedWallet, password);

      // Then encrypt it in keystore format with the new password
      const keystore = await wallet.encrypt(newPassword);

      return keystore;
    } catch (error) {
      throw new Error(`Failed to export wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default KalyWalletGenerator;
