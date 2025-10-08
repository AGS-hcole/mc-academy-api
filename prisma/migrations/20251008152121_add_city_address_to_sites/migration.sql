-- Migration: Add city and address fields to Site table
-- Add address and city columns to Site table

ALTER TABLE "Site" ADD COLUMN "address" TEXT;
ALTER TABLE "Site" ADD COLUMN "city" TEXT;
