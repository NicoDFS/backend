import { ethers } from 'ethers';
import * as crypto from 'crypto';

/**
 * User model interface
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet model interface
 */
export interface Wallet {
  id: string;
  userId: string;
  address: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  chainId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation data
 */
export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
}

/**
 * Wallet creation data
 */
export interface CreateWalletData {
  userId: string;
  address: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  chainId: number;
}

/**
 * User authentication data
 */
export interface AuthData {
  token: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

/**
 * User service interface
 */
export interface IUserService {
  createUser(data: CreateUserData): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  validatePassword(user: User, password: string): boolean;
  generateAuthToken(user: User): string;
}

/**
 * Wallet service interface
 */
export interface IWalletService {
  createWallet(data: CreateWalletData): Promise<Wallet>;
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  getWalletByAddress(address: string): Promise<Wallet | null>;
  getWalletBalance(address: string): Promise<{
    klc: string;
    tokens: { symbol: string; balance: string; address: string; }[];
  }>;
  exportWallet(wallet: Wallet, password: string): Promise<string>;
}

/**
 * Helper functions for password hashing
 */
export class PasswordUtils {
  /**
   * Generate a salt for password hashing
   */
  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash a password with the given salt
   */
  static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iterations
      64,     // key length
      'sha512'
    ).toString('hex');
  }

  /**
   * Verify a password against a hash
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const newHash = this.hashPassword(password, salt);
    return newHash === hash;
  }
}
