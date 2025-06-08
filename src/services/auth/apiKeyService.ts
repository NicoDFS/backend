import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface CreateApiKeyData {
  name: string;
  permissions: string[];
  userId: string;
  expiresAt?: Date;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export enum ApiKeyPermissions {
  READ_PUBLIC = 'READ_PUBLIC',
  READ_USER = 'READ_USER', 
  WRITE_USER = 'WRITE_USER',
  ADMIN = 'ADMIN'
}

/**
 * API Key Service
 * Handles API key generation, validation, and management
 */
export class ApiKeyService {
  private readonly API_KEY_LENGTH = 64;
  private readonly PREFIX_LENGTH = 8;

  /**
   * Generate a new API key
   * @param data API key creation data
   * @returns Object containing the API key and database record
   */
  async generateApiKey(data: CreateApiKeyData): Promise<{ apiKey: string; record: ApiKey }> {
    // Generate a random API key
    const apiKey = this.generateRandomKey();
    const prefix = apiKey.substring(0, this.PREFIX_LENGTH);
    
    // Hash the API key for storage
    const keyHash = this.hashApiKey(apiKey);

    // Create the API key record
    const record = await prisma.apiKey.create({
      data: {
        name: data.name,
        keyHash,
        prefix,
        permissions: data.permissions,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });

    return {
      apiKey: `kaly_${apiKey}`, // Add prefix for identification
      record: record as ApiKey
    };
  }

  /**
   * Validate an API key
   * @param apiKey The API key to validate
   * @returns Validation result with API key data if valid
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      // Remove the 'kaly_' prefix if present
      const cleanKey = apiKey.startsWith('kaly_') ? apiKey.substring(5) : apiKey;
      
      // Hash the provided key
      const keyHash = this.hashApiKey(cleanKey);

      // Find the API key in the database
      const record = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: { user: true }
      });

      if (!record) {
        return { isValid: false, error: 'Invalid API key' };
      }

      if (!record.isActive) {
        return { isValid: false, error: 'API key is inactive' };
      }

      if (record.expiresAt && record.expiresAt < new Date()) {
        return { isValid: false, error: 'API key has expired' };
      }

      // Update last used timestamp
      await this.updateLastUsed(record.id);

      return {
        isValid: true,
        apiKey: record as ApiKey
      };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Check if an API key has a specific permission
   * @param apiKey API key record
   * @param permission Permission to check
   * @returns True if the API key has the permission
   */
  hasPermission(apiKey: ApiKey, permission: ApiKeyPermissions): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes(ApiKeyPermissions.ADMIN);
  }

  /**
   * Get all API keys for a user
   * @param userId User ID
   * @returns Array of API key records (without sensitive data)
   */
  async getUserApiKeys(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        keyHash: false // Exclude the hash for security
      }
    });

    return apiKeys;
  }

  /**
   * Revoke an API key
   * @param apiKeyId API key ID
   * @param userId User ID (for authorization)
   * @returns Updated API key record
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<ApiKey> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false }
    });

    return updatedKey as ApiKey;
  }

  /**
   * Delete an API key
   * @param apiKeyId API key ID
   * @param userId User ID (for authorization)
   */
  async deleteApiKey(apiKeyId: string, userId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId }
    });
  }

  /**
   * Generate a random API key
   * @returns Random string
   */
  private generateRandomKey(): string {
    return crypto.randomBytes(this.API_KEY_LENGTH / 2).toString('hex');
  }

  /**
   * Hash an API key for secure storage
   * @param apiKey The API key to hash
   * @returns Hashed API key
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Update the last used timestamp for an API key
   * @param apiKeyId API key ID
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() }
    });
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
