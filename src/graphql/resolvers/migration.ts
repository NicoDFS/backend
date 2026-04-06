import { migrationService } from '../../services/migration/migrationService';
import { Context } from '../context';

const authenticate = async (context: Context) => {
  if (context.user) {
    return context.user;
  }
  throw new Error('Authentication required');
};

export const migrationResolvers = {
  Query: {
    walletMigrationStatus: async (_: any, __: any, context: Context) => {
      const user = await authenticate(context);
      return migrationService.getMigrationStatus(user.id);
    },
  },

  Mutation: {
    linkThirdwebWallet: async (
      _: any,
      { thirdwebAddress }: { thirdwebAddress: string },
      context: Context
    ) => {
      const user = await authenticate(context);
      await migrationService.linkThirdwebWallet(user.id, thirdwebAddress);
      return { success: true };
    },

    startWalletMigration: async (
      _: any,
      { oldWalletId, newWalletAddress }: { oldWalletId: string; newWalletAddress: string },
      context: Context
    ) => {
      const user = await authenticate(context);
      return migrationService.startMigration(user.id, oldWalletId, newWalletAddress);
    },

    migrateNativeTokens: async (
      _: any,
      { password, toAddress, chainId, reserveForTokenTransfers }: {
        password: string;
        toAddress: string;
        chainId?: number;
        reserveForTokenTransfers?: number;
      },
      context: Context
    ) => {
      const user = await authenticate(context);
      const txHash = await migrationService.migrateNativeTokens(
        user.id,
        password,
        toAddress,
        chainId || 3888,
        reserveForTokenTransfers || 0
      );
      return { txHash };
    },

    migrateTokens: async (
      _: any,
      { password, toAddress, tokenAddresses, chainId }: {
        password: string;
        toAddress: string;
        tokenAddresses: string[];
        chainId?: number;
      },
      context: Context
    ) => {
      const user = await authenticate(context);
      const txHashes = await migrationService.migrateTokens(
        user.id,
        password,
        toAddress,
        tokenAddresses,
        chainId || 3888
      );
      return { txHashes };
    },

    completeWalletMigration: async (_: any, __: any, context: Context) => {
      const user = await authenticate(context);
      await migrationService.completeMigration(user.id);
      return { success: true };
    },

    optOutWalletMigration: async (_: any, __: any, context: Context) => {
      const user = await authenticate(context);
      await migrationService.optOutMigration(user.id);
      return { success: true };
    },
  },
};
