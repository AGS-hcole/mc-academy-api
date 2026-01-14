-- CreateEnum
CREATE TYPE "ResidenceStayStatus" AS ENUM ('PLANNED', 'CANCELED');

-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN "residenceCutoffHourLocal" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "residenceCutoffMinuteLocal" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Manor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "enforceCapacity" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidenceStay" (
    "id" TEXT NOT NULL,
    "manorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "ResidenceStayStatus" NOT NULL DEFAULT 'PLANNED',
    "overCapacity" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidenceStay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manor_name_key" ON "Manor"("name");

-- CreateIndex
CREATE INDEX "Manor_isActive_idx" ON "Manor"("isActive");

-- CreateIndex
CREATE INDEX "ResidenceStay_date_idx" ON "ResidenceStay"("date");

-- CreateIndex
CREATE INDEX "ResidenceStay_manorId_date_idx" ON "ResidenceStay"("manorId", "date");

-- CreateIndex
CREATE INDEX "ResidenceStay_userId_date_idx" ON "ResidenceStay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ResidenceStay_manorId_userId_date_key" ON "ResidenceStay"("manorId", "userId", "date");

-- AddForeignKey
ALTER TABLE "ResidenceStay" ADD CONSTRAINT "ResidenceStay_manorId_fkey" FOREIGN KEY ("manorId") REFERENCES "Manor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidenceStay" ADD CONSTRAINT "ResidenceStay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
