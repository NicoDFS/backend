-- CreateEnum
CREATE TYPE "ApiKeyPermission" AS ENUM ('READ_PUBLIC', 'READ_USER', 'WRITE_USER', 'ADMIN');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "whitepaperUrl" TEXT,
    "githubUrl" TEXT,
    "discordUrl" TEXT,
    "telegramUrl" TEXT,
    "twitterUrl" TEXT,
    "additionalSocialUrl" TEXT,
    "saleToken" TEXT NOT NULL,
    "baseToken" TEXT NOT NULL,
    "tokenRate" TEXT NOT NULL,
    "liquidityRate" TEXT NOT NULL,
    "minContribution" TEXT,
    "maxContribution" TEXT,
    "softCap" TEXT NOT NULL,
    "hardCap" TEXT NOT NULL,
    "liquidityPercent" TEXT NOT NULL,
    "presaleStart" TIMESTAMP(3) NOT NULL,
    "presaleEnd" TIMESTAMP(3) NOT NULL,
    "lpLockDuration" TEXT NOT NULL,
    "lpRecipient" TEXT,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_contractAddress_key" ON "Project"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Project_transactionHash_key" ON "Project"("transactionHash");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_contractAddress_idx" ON "Project"("contractAddress");

-- CreateIndex
CREATE INDEX "Project_transactionHash_idx" ON "Project"("transactionHash");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
