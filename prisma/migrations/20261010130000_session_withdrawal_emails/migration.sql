CREATE TABLE "SessionWithdrawalEmail" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "replacements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SessionWithdrawalEmail_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SessionWithdrawalEmail_sentAt_availableAt_idx" ON "SessionWithdrawalEmail"("sentAt", "availableAt");
