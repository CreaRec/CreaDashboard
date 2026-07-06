-- Champion Energy integration: ChampionSyncLog + electricityBills widget
-- Recreate enum (ADD VALUE + INSERT cannot run in the same transaction in PostgreSQL)

CREATE TYPE "WidgetId_new" AS ENUM (
  'electricityMonthly',
  'electricityBills',
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
  "widgetId"::text::"WidgetId_new"
);

DROP TYPE "WidgetId";
ALTER TYPE "WidgetId_new" RENAME TO "WidgetId";

INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
SELECT 'electricityBills', COALESCE(MAX("position"), 0) + 1, true, CURRENT_TIMESTAMP
FROM "WidgetLayout"
ON CONFLICT ("widgetId") DO NOTHING;

-- CreateTable
CREATE TABLE "ChampionSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChampionSyncLog_pkey" PRIMARY KEY ("id")
);
