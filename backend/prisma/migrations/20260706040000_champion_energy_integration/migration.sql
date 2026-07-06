-- AlterEnum
ALTER TYPE "WidgetId" ADD VALUE IF NOT EXISTS 'electricityBills' BEFORE 'electricityIntervals';

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
