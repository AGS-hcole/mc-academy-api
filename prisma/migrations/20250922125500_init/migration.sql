-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "SessionSlot" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "FormulaType" AS ENUM ('MORNING', 'AFTERNOON', 'FULL');

-- CreateEnum
CREATE TYPE "NotifyChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "fftLicenseNumber" TEXT,
    "formula" "FormulaType" NOT NULL,
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "resetPasswordToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "privacyConsentAt" TIMESTAMP(3),
    "photoConsentAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "avatarData" BYTEA,
    "avatarMime" TEXT,
    "backgroundData" BYTEA,
    "backgroundMime" TEXT,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySMS" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" "SessionSlot" NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "isCanceled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "comment" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outOfContract" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayPeriod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "region" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HolidayPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "responseCutoffWeekday" INTEGER NOT NULL DEFAULT 5,
    "responseCutoffHourLocal" INTEGER NOT NULL DEFAULT 18,
    "publishWeekday" INTEGER NOT NULL DEFAULT 6,
    "publishHourLocal" INTEGER NOT NULL DEFAULT 20,
    "autogenWeekday" INTEGER NOT NULL DEFAULT 5,
    "autogenHourLocal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_fftLicenseNumber_key" ON "User"("fftLicenseNumber");

-- CreateIndex
CREATE INDEX "User_lastname_firstname_idx" ON "User"("lastname", "firstname");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE INDEX "Session_date_slot_idx" ON "Session"("date", "slot");

-- CreateIndex
CREATE INDEX "Session_siteId_date_idx" ON "Session"("siteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Session_siteId_date_slot_key" ON "Session"("siteId", "date", "slot");

-- CreateIndex
CREATE INDEX "Attendance_userId_sessionId_idx" ON "Attendance"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "Attendance_outOfContract_idx" ON "Attendance"("outOfContract");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_userId_key" ON "Attendance"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "HolidayPeriod_startDate_endDate_idx" ON "HolidayPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "HolidayPeriod_isActive_idx" ON "HolidayPeriod"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
