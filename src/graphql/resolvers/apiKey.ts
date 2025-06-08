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

export const apiKeyResolvers = {
  Query: {
    // Get current user's API keys
    myApiKeys: async (_: any, __: any, context: Context) => {
      const user = await authenticate(context);
      
      const apiKeys = await context.apiKeyService.getUserApiKeys(user.id);
      
      return apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        permissions: key.permissions,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt?.toISOString(),
        expiresAt: key.expiresAt?.toISOString(),
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString()
      }));
    },

    // Get specific API key by ID
    apiKey: async (_: any, { id }: { id: string }, context: Context) => {
      const user = await authenticate(context);
      
      const apiKeys = await context.apiKeyService.getUserApiKeys(user.id);
      const apiKey = apiKeys.find(key => key.id === id);
      
      if (!apiKey) {
        throw new Error('API key not found');
      }

      return {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        isActive: apiKey.isActive,
        lastUsedAt: apiKey.lastUsedAt?.toISOString(),
        expiresAt: apiKey.expiresAt?.toISOString(),
        createdAt: apiKey.createdAt.toISOString(),
        updatedAt: apiKey.updatedAt.toISOString()
      };
    }
  },

  Mutation: {
    // Create a new API key
    createApiKey: async (
      _: any, 
      { name, permissions, expiresAt }: { 
        name: string; 
        permissions: ApiKeyPermissions[]; 
        expiresAt?: string 
      }, 
      context: Context
    ) => {
      const user = await authenticate(context);
      
      // Only allow creating API keys with permissions the user has
      // For now, we'll allow all permissions for authenticated users
      // In the future, you might want to restrict this based on user roles
      
      const expirationDate = expiresAt ? new Date(expiresAt) : undefined;
      
      const result = await context.apiKeyService.generateApiKey({
        name,
        permissions,
        userId: user.id,
        expiresAt: expirationDate
      });

      return {
        apiKey: result.apiKey,
        record: {
          id: result.record.id,
          name: result.record.name,
          prefix: result.record.prefix,
          permissions: result.record.permissions,
          isActive: result.record.isActive,
          lastUsedAt: result.record.lastUsedAt?.toISOString(),
          expiresAt: result.record.expiresAt?.toISOString(),
          createdAt: result.record.createdAt.toISOString(),
          updatedAt: result.record.updatedAt.toISOString()
        }
      };
    },

    // Revoke an API key (set inactive)
    revokeApiKey: async (_: any, { id }: { id: string }, context: Context) => {
      const user = await authenticate(context);
      
      const revokedKey = await context.apiKeyService.revokeApiKey(id, user.id);
      
      return {
        id: revokedKey.id,
        name: revokedKey.name,
        prefix: revokedKey.prefix,
        permissions: revokedKey.permissions,
        isActive: revokedKey.isActive,
        lastUsedAt: revokedKey.lastUsedAt?.toISOString(),
        expiresAt: revokedKey.expiresAt?.toISOString(),
        createdAt: revokedKey.createdAt.toISOString(),
        updatedAt: revokedKey.updatedAt.toISOString()
      };
    },

    // Delete an API key permanently
    deleteApiKey: async (_: any, { id }: { id: string }, context: Context) => {
      const user = await authenticate(context);
      
      await context.apiKeyService.deleteApiKey(id, user.id);
      
      return true;
    }
  }
};

// Export the permission checking function for use in other resolvers
export { checkPermission, authenticate };
