-- CreateEnum
CREATE TYPE "WalletMigrationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OPTED_OUT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "thirdwebWalletAddress" TEXT,
ADD COLUMN     "walletMigratedAt" TIMESTAMP(3),
ADD COLUMN     "walletMigrationStatus" "WalletMigrationStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "WalletMigration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldWalletAddress" TEXT NOT NULL,
    "newWalletAddress" TEXT NOT NULL,
    "oldWalletId" TEXT NOT NULL,
    "fundsTransferred" BOOLEAN NOT NULL DEFAULT false,
    "tokensTransferred" BOOLEAN NOT NULL DEFAULT false,
    "positionsTransferred" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletMigration_userId_idx" ON "WalletMigration"("userId");

-- AddForeignKey
ALTER TABLE "WalletMigration" ADD CONSTRAINT "WalletMigration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
