-- Migration: Add start and end times to sessions
-- Add startTime and endTime columns to Session table

ALTER TABLE "Session" ADD COLUMN "startTime" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "endTime" TIMESTAMP(3);

-- Update existing sessions with default times based on slot
UPDATE "Session" 
SET 
  "startTime" = "date" + INTERVAL '9 hours',
  "endTime" = "date" + INTERVAL '12 hours'
WHERE "slot" = 'AM';

UPDATE "Session" 
SET 
  "startTime" = "date" + INTERVAL '14 hours',
  "endTime" = "date" + INTERVAL '17 hours'
WHERE "slot" = 'PM';