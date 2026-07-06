-- Atmos Energy gas integration: GasSyncLog + split gas widget into gasMonthly/gasBills

CREATE TABLE "GasSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GasSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "WidgetId_new" AS ENUM (
  'electricityMonthly',
  'electricityIntervals',
  'electricityCurrent',
  'waterMonthly',
  'waterBills',
  'waterDaily',
  'gasMonthly',
  'gasBills',
  'calendar',
  'reminders',
  'notes'
);

ALTER TABLE "WidgetLayout" ALTER COLUMN "widgetId" TYPE "WidgetId_new" USING (
  CASE
    WHEN "widgetId"::text = 'gas' THEN 'gasMonthly'::"WidgetId_new"
    ELSE "widgetId"::text::"WidgetId_new"
  END
);

DROP TYPE "WidgetId";
ALTER TYPE "WidgetId_new" RENAME TO "WidgetId";

INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
SELECT 'gasBills', COALESCE(MAX("position"), 0) + 1, true, CURRENT_TIMESTAMP
FROM "WidgetLayout"
ON CONFLICT ("widgetId") DO NOTHING;
