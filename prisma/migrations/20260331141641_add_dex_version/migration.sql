-- AlterTable
ALTER TABLE "FairlaunchProject" ADD COLUMN     "dexVersion" TEXT NOT NULL DEFAULT 'v2';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dexVersion" TEXT NOT NULL DEFAULT 'v2';
