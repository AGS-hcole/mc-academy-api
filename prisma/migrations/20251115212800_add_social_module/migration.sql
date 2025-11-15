-- CreateEnum
CREATE TYPE "SocialTargetType" AS ENUM ('SESSION', 'TOURNAMENT');

-- CreateTable
CREATE TABLE "SocialTarget" (
    "id" TEXT NOT NULL,
    "type" "SocialTargetType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLike" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialComment" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialTarget_type_entityId_key" ON "SocialTarget"("type", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLike_targetId_userId_key" ON "SocialLike"("targetId", "userId");

-- AddForeignKey
ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SocialTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SocialTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SocialComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
