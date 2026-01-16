-- CreateEnum
CREATE TYPE "TransportRecurrenceType" AS ENUM ('NONE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "TransportOccurrenceStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TransportTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fromLabel" TEXT NOT NULL,
    "fromAddress" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toLabel" TEXT NOT NULL,
    "toAddress" TEXT,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "allowOverbook" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recurrenceType" "TransportRecurrenceType" NOT NULL DEFAULT 'WEEKLY',
    "daysOfWeek" INTEGER[],
    "timeOfDay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TransportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportOccurrence" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "capacitySnapshot" INTEGER NOT NULL,
    "allowOverbookSnapshot" BOOLEAN NOT NULL,
    "status" "TransportOccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TransportOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBooking" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" "TransportBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TransportBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportOccurrence_departureAt_idx" ON "TransportOccurrence"("departureAt");

-- CreateIndex
CREATE INDEX "TransportOccurrence_templateId_idx" ON "TransportOccurrence"("templateId");

-- CreateIndex
CREATE INDEX "TransportOccurrence_status_idx" ON "TransportOccurrence"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportOccurrence_templateId_departureAt_key" ON "TransportOccurrence"("templateId", "departureAt");

-- CreateIndex
CREATE INDEX "TransportBooking_occurrenceId_idx" ON "TransportBooking"("occurrenceId");

-- CreateIndex
CREATE INDEX "TransportBooking_userId_idx" ON "TransportBooking"("userId");

-- CreateIndex
CREATE INDEX "TransportBooking_status_idx" ON "TransportBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportBooking_occurrenceId_userId_key" ON "TransportBooking"("occurrenceId", "userId");

-- AddForeignKey
ALTER TABLE "TransportOccurrence" ADD CONSTRAINT "TransportOccurrence_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TransportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportBooking" ADD CONSTRAINT "TransportBooking_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TransportOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportBooking" ADD CONSTRAINT "TransportBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
