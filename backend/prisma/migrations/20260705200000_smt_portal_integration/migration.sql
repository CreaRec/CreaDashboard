-- CreateEnum
CREATE TYPE "SmtSyncStatus" AS ENUM ('success', 'error', 'skipped');

-- CreateEnum
CREATE TYPE "WidgetId_new" AS ENUM ('electricityMonthly', 'electricityIntervals', 'electricityCurrent', 'water', 'gas', 'calendar', 'reminders', 'notes');

-- AlterTable: migrate WidgetId enum
ALTER TABLE "WidgetLayout" ALTER COLUMN "widgetId" TYPE "WidgetId_new" USING (
  CASE "widgetId"::text
    WHEN 'electricity' THEN 'electricityMonthly'::"WidgetId_new"
    ELSE "widgetId"::text::"WidgetId_new"
  END
);

DROP TYPE "WidgetId";
ALTER TYPE "WidgetId_new" RENAME TO "WidgetId";

-- AlterTable: add visibility
ALTER TABLE "WidgetLayout" ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ElectricityIntervalReading" (
    "id" TEXT NOT NULL,
    "esiid" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "kwh" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ElectricityIntervalReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityMeterSnapshot" (
    "id" TEXT NOT NULL,
    "esiid" TEXT NOT NULL,
    "readingKwh" DOUBLE PRECISION NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityMeterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmtSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SmtSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityIntervalReading_esiid_timestamp_key" ON "ElectricityIntervalReading"("esiid", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityMeterSnapshot_esiid_key" ON "ElectricityMeterSnapshot"("esiid");

-- Seed new electricity widgets (intervals + current hidden by default)
INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
VALUES
  ('electricityIntervals', -20, false, CURRENT_TIMESTAMP),
  ('electricityCurrent', -21, false, CURRENT_TIMESTAMP)
ON CONFLICT ("widgetId") DO NOTHING;

-- Two-phase position update avoids unique constraint violations when
-- widgets were reordered before migration (electricity may not be at 0).
UPDATE "WidgetLayout" SET "position" = -1, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityMonthly';
UPDATE "WidgetLayout" SET "position" = -2, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'water';
UPDATE "WidgetLayout" SET "position" = -3, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'gas';
UPDATE "WidgetLayout" SET "position" = -4, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'calendar';
UPDATE "WidgetLayout" SET "position" = -5, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'reminders';
UPDATE "WidgetLayout" SET "position" = -6, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'notes';
UPDATE "WidgetLayout" SET "position" = -7, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityIntervals';
UPDATE "WidgetLayout" SET "position" = -8, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityCurrent';

UPDATE "WidgetLayout" SET "position" = 0, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityMonthly';
UPDATE "WidgetLayout" SET "position" = 1, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'water';
UPDATE "WidgetLayout" SET "position" = 2, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'gas';
UPDATE "WidgetLayout" SET "position" = 3, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'calendar';
UPDATE "WidgetLayout" SET "position" = 4, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'reminders';
UPDATE "WidgetLayout" SET "position" = 5, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'notes';
UPDATE "WidgetLayout" SET "position" = 6, "visible" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityIntervals';
UPDATE "WidgetLayout" SET "position" = 7, "visible" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityCurrent';
