-- CreateEnum
CREATE TYPE "public"."TransportDirection" AS ENUM ('GO', 'RETURN');

-- CreateEnum
CREATE TYPE "public"."TransportRunStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TransportAssignmentStatus" AS ENUM ('ASSIGNED', 'WAITLISTED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."PresenceMark" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- AlterTable
ALTER TABLE "public"."AppSetting" ADD COLUMN     "planWindowCloseHourLocal" INTEGER NOT NULL DEFAULT 23,
ADD COLUMN     "planWindowCloseMinuteLocal" INTEGER NOT NULL DEFAULT 59,
ADD COLUMN     "planWindowCloseWeekday" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "planWindowOpenHourLocal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "planWindowOpenWeekday" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "public"."School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "public"."TransportDirection" NOT NULL,
    "originLabel" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "targetTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "daysOfWeek" INTEGER[],
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "defaultDriverId" TEXT,
    "defaultVehicle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportWeekPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportWeekPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportPlanEntry" (
    "id" TEXT NOT NULL,
    "weekPlanId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "public"."TransportDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportRun" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "plannedTime" TIMESTAMP(3) NOT NULL,
    "status" "public"."TransportRunStatus" NOT NULL DEFAULT 'PLANNED',
    "vehicle" TEXT,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportRunAssignment" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "public"."TransportAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRunAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransportPresence" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mark" "public"."PresenceMark",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResidenceWeekPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidenceWeekPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResidenceNight" (
    "id" TEXT NOT NULL,
    "weekPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "confirmedPresent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidenceNight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "public"."School"("name");

-- CreateIndex
CREATE INDEX "TransportTemplate_destinationId_idx" ON "public"."TransportTemplate"("destinationId");

-- CreateIndex
CREATE INDEX "TransportTemplate_activeFrom_activeTo_idx" ON "public"."TransportTemplate"("activeFrom", "activeTo");

-- CreateIndex
CREATE INDEX "TransportWeekPlan_weekStartDate_idx" ON "public"."TransportWeekPlan"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "TransportWeekPlan_studentId_weekStartDate_key" ON "public"."TransportWeekPlan"("studentId", "weekStartDate");

-- CreateIndex
CREATE INDEX "TransportPlanEntry_date_idx" ON "public"."TransportPlanEntry"("date");

-- CreateIndex
CREATE INDEX "TransportPlanEntry_templateId_date_idx" ON "public"."TransportPlanEntry"("templateId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TransportPlanEntry_weekPlanId_templateId_date_key" ON "public"."TransportPlanEntry"("weekPlanId", "templateId", "date");

-- CreateIndex
CREATE INDEX "TransportRun_date_idx" ON "public"."TransportRun"("date");

-- CreateIndex
CREATE INDEX "TransportRun_status_idx" ON "public"."TransportRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRun_templateId_date_plannedTime_key" ON "public"."TransportRun"("templateId", "date", "plannedTime");

-- CreateIndex
CREATE INDEX "TransportRunAssignment_studentId_idx" ON "public"."TransportRunAssignment"("studentId");

-- CreateIndex
CREATE INDEX "TransportRunAssignment_runId_idx" ON "public"."TransportRunAssignment"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRunAssignment_runId_studentId_key" ON "public"."TransportRunAssignment"("runId", "studentId");

-- CreateIndex
CREATE INDEX "TransportPresence_runId_idx" ON "public"."TransportPresence"("runId");

-- CreateIndex
CREATE INDEX "TransportPresence_studentId_idx" ON "public"."TransportPresence"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportPresence_runId_studentId_key" ON "public"."TransportPresence"("runId", "studentId");

-- CreateIndex
CREATE INDEX "ResidenceWeekPlan_weekStartDate_idx" ON "public"."ResidenceWeekPlan"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "ResidenceWeekPlan_studentId_weekStartDate_key" ON "public"."ResidenceWeekPlan"("studentId", "weekStartDate");

-- CreateIndex
CREATE INDEX "ResidenceNight_date_idx" ON "public"."ResidenceNight"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ResidenceNight_weekPlanId_date_key" ON "public"."ResidenceNight"("weekPlanId", "date");

-- AddForeignKey
ALTER TABLE "public"."TransportTemplate" ADD CONSTRAINT "TransportTemplate_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "public"."School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportTemplate" ADD CONSTRAINT "TransportTemplate_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportWeekPlan" ADD CONSTRAINT "TransportWeekPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportPlanEntry" ADD CONSTRAINT "TransportPlanEntry_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "public"."TransportWeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportPlanEntry" ADD CONSTRAINT "TransportPlanEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."TransportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportRun" ADD CONSTRAINT "TransportRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."TransportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportRun" ADD CONSTRAINT "TransportRun_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportRunAssignment" ADD CONSTRAINT "TransportRunAssignment_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."TransportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportRunAssignment" ADD CONSTRAINT "TransportRunAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportPresence" ADD CONSTRAINT "TransportPresence_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."TransportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TransportPresence" ADD CONSTRAINT "TransportPresence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceWeekPlan" ADD CONSTRAINT "ResidenceWeekPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidenceNight" ADD CONSTRAINT "ResidenceNight_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "public"."ResidenceWeekPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
