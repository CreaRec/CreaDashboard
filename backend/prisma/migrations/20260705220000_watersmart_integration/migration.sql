-- Replace water widget with waterMonthly + waterDaily; add water tables

CREATE TYPE "WidgetId_new" AS ENUM (
  'electricityMonthly',
  'electricityIntervals',
  'electricityCurrent',
  'waterMonthly',
  'waterDaily',
  'gas',
  'calendar',
  'reminders',
  'notes'
);

ALTER TABLE "WidgetLayout" ALTER COLUMN "widgetId" TYPE "WidgetId_new" USING (
  CASE "widgetId"::text
    WHEN 'water' THEN 'waterMonthly'::"WidgetId_new"
    ELSE "widgetId"::text::"WidgetId_new"
  END
);

DROP TYPE "WidgetId";
ALTER TYPE "WidgetId_new" RENAME TO "WidgetId";

CREATE TABLE "WaterDailyReading" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "gallons" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WaterDailyReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaterSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WaterSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaterDailyReading_accountNumber_date_key" ON "WaterDailyReading"("accountNumber", "date");

INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
VALUES ('waterDaily', -30, false, CURRENT_TIMESTAMP)
ON CONFLICT ("widgetId") DO NOTHING;

UPDATE "WidgetLayout" SET "position" = -1, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityMonthly';
UPDATE "WidgetLayout" SET "position" = -2, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'waterMonthly';
UPDATE "WidgetLayout" SET "position" = -3, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'waterDaily';
UPDATE "WidgetLayout" SET "position" = -4, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'gas';
UPDATE "WidgetLayout" SET "position" = -5, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'calendar';
UPDATE "WidgetLayout" SET "position" = -6, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'reminders';
UPDATE "WidgetLayout" SET "position" = -7, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'notes';
UPDATE "WidgetLayout" SET "position" = -8, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityIntervals';
UPDATE "WidgetLayout" SET "position" = -9, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityCurrent';

UPDATE "WidgetLayout" SET "position" = 0, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityMonthly';
UPDATE "WidgetLayout" SET "position" = 1, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'waterMonthly';
UPDATE "WidgetLayout" SET "position" = 2, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'waterDaily';
UPDATE "WidgetLayout" SET "position" = 3, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'gas';
UPDATE "WidgetLayout" SET "position" = 4, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'calendar';
UPDATE "WidgetLayout" SET "position" = 5, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'reminders';
UPDATE "WidgetLayout" SET "position" = 6, "visible" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'notes';
UPDATE "WidgetLayout" SET "position" = 7, "visible" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityIntervals';
UPDATE "WidgetLayout" SET "position" = 8, "visible" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "widgetId" = 'electricityCurrent';
