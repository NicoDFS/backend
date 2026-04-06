import { ethers } from 'ethers';
import { prisma } from '../../lib/prisma';
import { KalyWalletGenerator } from '../user/walletGenerator';
import { multiRPCProviderService } from '../multichain/rpcProviderService';
import { WalletMigrationStatus } from '@prisma/client';

/**
 * Migration service for transitioning users from internal wallets
 * to Thirdweb in-app wallets.
 */
export class MigrationService {

  /**
   * Link a Thirdweb in-app wallet address to a user account
   */
  async linkThirdwebWallet(userId: string, thirdwebAddress: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        thirdwebWalletAddress: thirdwebAddress,
        walletMigrationStatus: WalletMigrationStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Get the migration status for a user
   */
  async getMigrationStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        thirdwebWalletAddress: true,
        walletMigrationStatus: true,
        walletMigratedAt: true,
        wallets: {
          select: {
            id: true,
            address: true,
            chainId: true,
          },
        },
        walletMigrations: true,
      },
    });

    return user;
  }

  /**
   * Start a wallet migration — creates a WalletMigration record
   */
  async startMigration(userId: string, oldWalletId: string, newWalletAddress: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { id: oldWalletId },
    });

    if (!wallet) {
      throw new Error('Old wallet not found');
    }

    if (wallet.userId !== userId) {
      throw new Error('Wallet does not belong to this user');
    }

    const migration = await prisma.walletMigration.create({
      data: {
        userId,
        oldWalletAddress: wallet.address,
        newWalletAddress,
        oldWalletId,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { walletMigrationStatus: WalletMigrationStatus.IN_PROGRESS },
    });

    return migration;
  }

  /**
   * Transfer native tokens (KLC) from old internal wallet to new Thirdweb wallet.
   * Reserves gas for pending ERC-20 transfers if specified.
   */
  async migrateNativeTokens(
    userId: string,
    password: string,
    toAddress: string,
    chainId: number = 3888,
    reserveForTokenTransfers: number = 0
  ): Promise<string> {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, chainId },
    });

    if (!wallet) {
      throw new Error(`No internal wallet found for chain ${chainId}`);
    }

    const decryptedWallet = KalyWalletGenerator.decryptWallet(
      {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        salt: wallet.salt,
        iv: wallet.iv,
      },
      password
    );

    const provider = multiRPCProviderService.getProvider(chainId);
    const signer = new ethers.Wallet(decryptedWallet.privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    if (balance.isZero()) {
      throw new Error('No native tokens to transfer');
    }

    // Estimate gas dynamically (L2s like Arbitrum need more than 21000)
    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: toAddress,
      value: balance.div(2), // Use half balance for estimation
    });
    // Add 20% buffer to gas estimate
    const nativeGasLimit = gasEstimate.mul(120).div(100);
    const gasPrice = await provider.getGasPrice();
    const nativeGasCost = gasPrice.mul(nativeGasLimit);

    // Reserve gas for ERC-20 transfers (each ~100k gas, higher for L2s)
    const tokenGasPerTransfer = ethers.BigNumber.from(100000);
    const tokenGasReserve = gasPrice.mul(tokenGasPerTransfer).mul(reserveForTokenTransfers);

    const totalReserve = nativeGasCost.add(tokenGasReserve);
    const transferAmount = balance.sub(totalReserve);

    if (transferAmount.lte(0)) {
      throw new Error('Insufficient balance to cover gas costs');
    }

    const tx = await signer.sendTransaction({
      to: toAddress,
      value: transferAmount,
      gasLimit: nativeGasLimit,
      gasPrice,
    });

    await tx.wait(1);

    await prisma.walletMigration.updateMany({
      where: {
        userId,
        oldWalletAddress: wallet.address,
        newWalletAddress: toAddress,
      },
      data: { fundsTransferred: true },
    });

    return tx.hash;
  }

  /**
   * Transfer ERC-20 tokens from old wallet to new wallet
   */
  async migrateTokens(
    userId: string,
    password: string,
    toAddress: string,
    tokenAddresses: string[],
    chainId: number = 3888
  ): Promise<string[]> {
    const wallet = await prisma.wallet.findFirst({
      where: { userId, chainId },
    });

    if (!wallet) {
      throw new Error(`No internal wallet found for chain ${chainId}`);
    }

    // Decrypt the private key
    const decryptedWallet = KalyWalletGenerator.decryptWallet(
      {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        salt: wallet.salt,
        iv: wallet.iv,
      },
      password
    );

    const provider = multiRPCProviderService.getProvider(chainId);
    const signer = new ethers.Wallet(decryptedWallet.privateKey, provider);

    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
    ];

    const txHashes: string[] = [];
    const errors: string[] = [];

    console.log(`[Migration] Transferring ${tokenAddresses.length} tokens from ${wallet.address} to ${toAddress} on chain ${chainId}`);

    for (const tokenAddress of tokenAddresses) {
      try {
        console.log(`[Migration] Processing token: ${tokenAddress}`);
        const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const balance = await contract.balanceOf(wallet.address);
        console.log(`[Migration] Token ${tokenAddress} balance: ${balance.toString()}`);

        if (balance.gt(0)) {
          // Estimate gas for this specific transfer to avoid failures
          let gasLimit;
          try {
            const estimated = await contract.estimateGas.transfer(toAddress, balance);
            gasLimit = estimated.mul(130).div(100); // 30% buffer
          } catch (estimateErr) {
            console.error(`[Migration] Gas estimation failed for ${tokenAddress}, using default:`, estimateErr);
            gasLimit = ethers.BigNumber.from(100000);
          }

          // Check we have enough native balance for gas
          const nativeBalance = await provider.getBalance(wallet.address);
          const gasPrice = await provider.getGasPrice();
          const gasCost = gasPrice.mul(gasLimit);

          if (nativeBalance.lt(gasCost)) {
            const err = `Insufficient gas to transfer token ${tokenAddress} (need ${ethers.utils.formatEther(gasCost)}, have ${ethers.utils.formatEther(nativeBalance)})`;
            console.error(`[Migration] ${err}`);
            errors.push(err);
            continue; // Skip this token, try the next
          }

          console.log(`[Migration] Transferring ${balance.toString()} of ${tokenAddress} (gasLimit: ${gasLimit.toString()})...`);
          const tx = await contract.transfer(toAddress, balance, { gasLimit });
          const receipt = await tx.wait(1);
          console.log(`[Migration] Token ${tokenAddress} transferred, tx: ${tx.hash}, status: ${receipt.status}`);
          txHashes.push(tx.hash);
        }
      } catch (tokenErr) {
        const errMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
        console.error(`[Migration] Failed to transfer token ${tokenAddress}:`, errMsg);
        errors.push(`${tokenAddress}: ${errMsg}`);
        // Continue with next token instead of aborting
      }
    }

    if (errors.length > 0) {
      console.warn(`[Migration] ${errors.length} token transfer(s) failed:`, errors);
    }

    // Update migration record
    if (txHashes.length > 0) {
      await prisma.walletMigration.updateMany({
        where: {
          userId,
          oldWalletAddress: wallet.address,
          newWalletAddress: toAddress,
        },
        data: { tokensTransferred: true },
      });
    }

    return txHashes;
  }

  /**
   * Mark migration as complete
   */
  async completeMigration(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletMigrationStatus: WalletMigrationStatus.COMPLETED,
        walletMigratedAt: new Date(),
      },
    });

    // Mark all pending migrations as completed
    await prisma.walletMigration.updateMany({
      where: { userId, completedAt: null },
      data: { completedAt: new Date() },
    });
  }

  /**
   * Opt out of migration (user wants to keep using external wallets only)
   */
  async optOutMigration(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { walletMigrationStatus: WalletMigrationStatus.OPTED_OUT },
    });
  }
}

export const migrationService = new MigrationService();
