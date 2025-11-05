-- CreateTable
CREATE TABLE "public_events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "backgroundImageUrl" TEXT,
    "externalRegistrationUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_events_slug_key" ON "public_events"("slug");

-- CreateIndex
CREATE INDEX "public_events_isPublished_orderIndex_idx" ON "public_events"("isPublished", "orderIndex");

-- CreateIndex
CREATE INDEX "public_events_startTime_idx" ON "public_events"("startTime");

-- CreateIndex
CREATE INDEX "public_events_endTime_idx" ON "public_events"("endTime");
