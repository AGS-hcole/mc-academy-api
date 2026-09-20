-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'parent';

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentPlayer" (
    "parentUserId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Player_lastname_firstname_idx" ON "Player"("lastname", "firstname");

-- CreateIndex
CREATE UNIQUE INDEX "ParentPlayer_parentUserId_playerId_key" ON "ParentPlayer"("parentUserId", "playerId");

-- CreateIndex
CREATE INDEX "ParentPlayer_parentUserId_idx" ON "ParentPlayer"("parentUserId");

-- CreateIndex
CREATE INDEX "ParentPlayer_playerId_idx" ON "ParentPlayer"("playerId");

-- AddForeignKey
ALTER TABLE "ParentPlayer" ADD CONSTRAINT "ParentPlayer_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentPlayer" ADD CONSTRAINT "ParentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
