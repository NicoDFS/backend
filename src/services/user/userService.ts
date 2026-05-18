import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, CreateUserData, IUserService, PasswordUtils } from '../../models/User';
import { prisma } from '../../lib/prisma';

/**
 * User service implementation
 * Handles user creation, authentication, and management
 */
export class UserService implements IUserService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'kalyswap-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  /**
   * Create a new user
   * @param data User creation data
   * @returns Created user
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Check if username already exists
    const existingUser = await this.getUserByUsername(data.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email }
      });
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    // Generate salt and hash password
    const salt = PasswordUtils.generateSalt();
    const passwordHash = PasswordUtils.hashPassword(data.password, salt);

    // Create new user in database
    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        salt
      }
    });

    return newUser;
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Get a user by username
   * @param username Username
   * @returns User or null if not found
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive' // Case-insensitive search
        }
      }
    });
  }

  /**
   * Validate a user's password
   * @param user User object
   * @param password Password to validate
   * @returns True if password is valid
   */
  validatePassword(user: User, password: string): boolean {
    return PasswordUtils.verifyPassword(password, user.passwordHash, user.salt);
  }

  /**
   * Generate a JWT authentication token for a user
   * @param user User object
   * @returns JWT token
   */
  generateAuthToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode a JWT token
   * @param token JWT token
   * @returns Decoded token payload or null if invalid
   */
  verifyToken(token: string): { id: string; username: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: string; username: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate a user by wallet address (for Thirdweb in-app wallet users).
   * Finds existing user by thirdwebWalletAddress or auto-creates one.
   */
  async authenticateWithWallet(walletAddress: string, email?: string): Promise<{ token: string; user: User }> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Find an existing user by thirdweb wallet address OR by the username we
    // derive from the wallet address. The username match catches legacy rows
    // created before thirdwebWalletAddress was populated — without it those
    // rows are invisible here and the create below collides on the unique
    // username constraint.
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { thirdwebWalletAddress: normalizedAddress },
          { username: normalizedAddress },
        ],
      },
    });

    if (user) {
      // Backfill thirdwebWalletAddress on legacy rows so future logins hit the
      // fast path and never reach the create branch.
      if (user.thirdwebWalletAddress !== normalizedAddress) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { thirdwebWalletAddress: normalizedAddress },
        });
      }
    } else {
      // Auto-create user — random password (user authenticates via wallet, never needs it)
      const salt = PasswordUtils.generateSalt();
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = PasswordUtils.hashPassword(randomPassword, salt);

      try {
        user = await prisma.user.create({
          data: {
            username: normalizedAddress,
            email: email || undefined,
            passwordHash,
            salt,
            thirdwebWalletAddress: normalizedAddress,
          },
        });
      } catch (err: any) {
        // Unique constraint violation — could be a concurrent request that
        // created the row, or the supplied email already belongs to another
        // account. Recover by field.
        if (err?.code === 'P2002') {
          const conflictFields: string[] = err?.meta?.target ?? [];

          // Re-check for a row matching this wallet (created by a concurrent
          // request, or pre-existing under the same username).
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { thirdwebWalletAddress: normalizedAddress },
                { username: normalizedAddress },
              ],
            },
          });

          if (user) {
            if (user.thirdwebWalletAddress !== normalizedAddress) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { thirdwebWalletAddress: normalizedAddress },
              });
            }
          } else if (conflictFields.includes('email')) {
            // The email belongs to a different account — create the wallet
            // user without it rather than failing the login.
            user = await prisma.user.create({
              data: {
                username: normalizedAddress,
                passwordHash,
                salt,
                thirdwebWalletAddress: normalizedAddress,
              },
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    const token = this.generateAuthToken(user);
    return { token, user };
  }

  /**
   * Get all users (for admin purposes)
   * @returns Array of users
   */
  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();

    return users.map(user => ({
      ...user,
      passwordHash: '[REDACTED]', // Don't expose password hashes
      salt: '[REDACTED]'          // Don't expose salts
    }));
  }
}

// Export singleton instance
export const userService = new UserService();
