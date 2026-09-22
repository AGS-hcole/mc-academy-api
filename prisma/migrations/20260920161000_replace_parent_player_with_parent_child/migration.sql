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

-- Data migration: keep only links where Player references an existing User
INSERT INTO "ParentChild" ("parentUserId", "childUserId", "createdAt")
SELECT pp."parentUserId", p."userId", pp."createdAt"
FROM "ParentPlayer" pp
JOIN "Player" p ON p."id" = pp."playerId"
WHERE p."userId" IS NOT NULL
ON CONFLICT ("parentUserId", "childUserId") DO NOTHING;

-- Drop old FKs/tables
DROP TABLE IF EXISTS "ParentPlayer";
DROP TABLE IF EXISTS "Player";
