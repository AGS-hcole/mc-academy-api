-- CreateEnum
CREATE TYPE "PairingMethod" AS ENUM ('BALANCED', 'RANDOM');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "pairingMethod" "PairingMethod" DEFAULT 'BALANCED';

-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN "rankSnapshot" INTEGER,
ADD COLUMN "seed" INTEGER;

-- AlterTable
ALTER TABLE "TournamentTeam" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notes" TEXT;
