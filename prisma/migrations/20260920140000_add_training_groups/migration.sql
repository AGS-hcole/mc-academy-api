-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "TrainingGroupSchedule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingGroupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingGroup_siteId_idx" ON "TrainingGroup"("siteId");

-- CreateIndex
CREATE INDEX "TrainingGroup_isActive_idx" ON "TrainingGroup"("isActive");

-- CreateIndex
CREATE INDEX "TrainingGroupMember_userId_idx" ON "TrainingGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingGroupSchedule_groupId_dayOfWeek_startTime_endTime_key" ON "TrainingGroupSchedule"("groupId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "TrainingGroupSchedule_groupId_dayOfWeek_idx" ON "TrainingGroupSchedule"("groupId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TrainingGroupSchedule_dayOfWeek_startTime_endTime_idx" ON "TrainingGroupSchedule"("dayOfWeek", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupSchedule" ADD CONSTRAINT "TrainingGroupSchedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
