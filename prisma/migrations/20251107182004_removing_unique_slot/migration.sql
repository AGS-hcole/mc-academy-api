/*
  Warnings:

  - A unique constraint covering the columns `[siteId,date,startTime,endTime]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Session_siteId_date_slot_key";

-- CreateIndex
CREATE UNIQUE INDEX "Session_siteId_date_startTime_endTime_key" ON "public"."Session"("siteId", "date", "startTime", "endTime");
