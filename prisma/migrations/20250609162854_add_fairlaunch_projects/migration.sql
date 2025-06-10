-- CreateTable
CREATE TABLE "FairlaunchProject" (
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
    "buybackRate" TEXT NOT NULL,
    "sellingAmount" TEXT NOT NULL,
    "softCap" TEXT NOT NULL,
    "liquidityPercent" TEXT NOT NULL,
    "fairlaunchStart" TIMESTAMP(3) NOT NULL,
    "fairlaunchEnd" TIMESTAMP(3) NOT NULL,
    "isWhitelist" BOOLEAN NOT NULL DEFAULT false,
    "referrer" TEXT,
    "contractAddress" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FairlaunchProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FairlaunchProject_contractAddress_key" ON "FairlaunchProject"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "FairlaunchProject_transactionHash_key" ON "FairlaunchProject"("transactionHash");

-- CreateIndex
CREATE INDEX "FairlaunchProject_userId_idx" ON "FairlaunchProject"("userId");

-- CreateIndex
CREATE INDEX "FairlaunchProject_contractAddress_idx" ON "FairlaunchProject"("contractAddress");

-- CreateIndex
CREATE INDEX "FairlaunchProject_transactionHash_idx" ON "FairlaunchProject"("transactionHash");

-- AddForeignKey
ALTER TABLE "FairlaunchProject" ADD CONSTRAINT "FairlaunchProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
