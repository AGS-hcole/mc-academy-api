/*
  Warnings:

  - You are about to drop the `ParentPlayer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Player` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ParentPlayer" DROP CONSTRAINT "ParentPlayer_parentUserId_fkey";

-- DropForeignKey
ALTER TABLE "ParentPlayer" DROP CONSTRAINT "ParentPlayer_playerId_fkey";

-- DropTable
DROP TABLE "ParentPlayer";

-- DropTable
DROP TABLE "Player";

-- CreateTable
CREATE TABLE "ParentChild" (
    "parentUserId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("parentUserId","childUserId")
);

-- CreateIndex
CREATE INDEX "ParentChild_parentUserId_idx" ON "ParentChild"("parentUserId");

-- CreateIndex
CREATE INDEX "ParentChild_childUserId_idx" ON "ParentChild"("childUserId");

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
